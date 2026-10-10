CREATE TABLE calendar_private.web_sessions (
  id text PRIMARY KEY CHECK (id ~ '^[0-9a-f]{64}$'),
  csrf text NOT NULL CHECK (csrf ~ '^[0-9a-f]{64}$'),
  auth_data text CHECK (octet_length(auth_data) <= 32768),
  expires_at timestamptz NOT NULL
);
CREATE INDEX web_sessions_expiry_idx ON calendar_private.web_sessions (expires_at);

CREATE TABLE calendar_private.web_limits (
  bucket text PRIMARY KEY CHECK (octet_length(bucket) <= 160),
  hits integer NOT NULL CHECK (hits > 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX web_limits_expiry_idx ON calendar_private.web_limits (expires_at);

ALTER TABLE calendar_private.web_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_private.web_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_private.web_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_private.web_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON calendar_private.web_sessions, calendar_private.web_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_private.web_sessions, calendar_private.web_limits TO calendar_runtime;
CREATE POLICY runtime_web_sessions ON calendar_private.web_sessions FOR ALL TO calendar_runtime USING (true) WITH CHECK (true);
CREATE POLICY runtime_web_limits ON calendar_private.web_limits FOR ALL TO calendar_runtime USING (true) WITH CHECK (true);
