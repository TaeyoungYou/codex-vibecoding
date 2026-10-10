CREATE ROLE calendar_runtime WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;

CREATE SCHEMA calendar_private;
REVOKE ALL ON SCHEMA calendar_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA calendar_private TO calendar_runtime;

CREATE TABLE calendar_private.events (
  id uuid PRIMARY KEY,
  event_date date NOT NULL CHECK (event_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200 AND title !~ '^[[:space:]]*$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calendar_private.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_private.events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE calendar_private.events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE calendar_private.events TO calendar_runtime;

CREATE POLICY calendar_runtime_select ON calendar_private.events FOR SELECT TO calendar_runtime USING (true);
CREATE POLICY calendar_runtime_insert ON calendar_private.events FOR INSERT TO calendar_runtime WITH CHECK (true);
CREATE POLICY calendar_runtime_delete ON calendar_private.events FOR DELETE TO calendar_runtime USING (true);

CREATE INDEX events_date_created_id_idx ON calendar_private.events (event_date, created_at, id);

CREATE FUNCTION calendar_private.notify_events_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM pg_catalog.pg_notify('calendar_events_changed', 'changed');
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION calendar_private.notify_events_changed() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION calendar_private.notify_events_changed() TO calendar_runtime;

CREATE TRIGGER calendar_events_changed
AFTER INSERT OR UPDATE OR DELETE ON calendar_private.events
FOR EACH STATEMENT EXECUTE FUNCTION calendar_private.notify_events_changed();

COMMENT ON SCHEMA calendar_private IS 'Local calendar only. Never expose through the Data API.';
COMMENT ON ROLE calendar_runtime IS 'Local calendar runtime only. Configure its password through a hidden psql password prompt; never store passwords in migrations.';
