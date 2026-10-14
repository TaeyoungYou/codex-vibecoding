-- Cron/pg_net are hosted/local Supabase extensions, not part of plain Postgres.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create function guestbook_private.invoke_media_cleanup() returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text; v_id bigint;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name='guestbook_cleanup_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='guestbook_cleanup_secret';
  if v_url is null or v_secret is null then raise exception 'cleanup vault configuration required'; end if;
  select net.http_post(url:=v_url,headers:=jsonb_build_object('Content-Type','application/json','x-cleanup-secret',v_secret),
    body:='{}'::jsonb,timeout_milliseconds:=25000) into v_id;
  return v_id;
end $$;
revoke all on function guestbook_private.invoke_media_cleanup() from public,anon,authenticated,service_role;
-- Scheduling is deliberately opt-in AFTER Vault secrets and the Edge Function
-- have been configured. An unapplied schedule must not be reported as running.
-- select cron.schedule('guestbook-media-cleanup','* * * * *',
--   'select guestbook_private.invoke_media_cleanup()');
