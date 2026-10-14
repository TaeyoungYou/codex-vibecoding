create function guestbook_private.enqueue_expired_media(p_before timestamptz) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with expired as (
    select id from guestbook_private.media_assets where status='prepared'
      and created_at<least(p_before,now()-interval '24 hours') for update skip locked
  ), marked as (
    update guestbook_private.media_assets a set status='delete_pending' from expired e where a.id=e.id returning a.id
  ) insert into guestbook_private.media_cleanup_jobs(asset_id) select id from marked on conflict(asset_id) do nothing;
  get diagnostics n = row_count; return n;
end $$;
create function guestbook_private.claim_media_cleanup_job(p_lease_seconds integer,p_max_attempts integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare j guestbook_private.media_cleanup_jobs; a guestbook_private.media_assets;
begin
  if p_lease_seconds not between 30 and 600 or p_max_attempts not between 1 and 20 then
    raise sqlstate 'PT400' using message='invalid worker settings'; end if;
  update guestbook_private.media_cleanup_jobs set status='failed',claim_token=null,lease_until=null
    where attempts>=p_max_attempts and (status='pending' or (status='processing' and lease_until<now()));
  select * into j from guestbook_private.media_cleanup_jobs
    where attempts<p_max_attempts and ((status='pending' and next_attempt_at<=now()) or (status='processing' and lease_until<now()))
    order by created_at limit 1 for update skip locked;
  if not found then return null; end if;
  select * into a from guestbook_private.media_assets where id=j.asset_id for update;
  if a.status<>'delete_pending' or exists(select 1 from public.entry_images where asset_id=a.id)
    or exists(select 1 from public.entry_drawings where asset_id=a.id) then
    update guestbook_private.media_cleanup_jobs set status='failed',last_error='asset still referenced' where id=j.id;
    return null;
  end if;
  update guestbook_private.media_cleanup_jobs set status='processing',attempts=attempts+1,
    claim_token=gen_random_uuid(),lease_until=now()+make_interval(secs=>p_lease_seconds)
    where id=j.id returning * into j;
  return jsonb_build_object('id',j.id,'bucket','guestbook-media','objectPath',a.object_path,
    'claimToken',j.claim_token,'attempts',j.attempts,'leaseUntil',j.lease_until);
end $$;
create function guestbook_private.complete_media_cleanup_job(p_id uuid,p_claim_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_asset uuid;
begin
  update guestbook_private.media_cleanup_jobs set status='done',completed_at=now(),claim_token=null,lease_until=null
    where id=p_id and status='processing' and claim_token=p_claim_token and lease_until>now() returning asset_id into v_asset;
  if not found then return false; end if;
  update guestbook_private.media_assets set status='deleted' where id=v_asset and status='delete_pending';
  return true;
end $$;
create function guestbook_private.retry_media_cleanup_job(p_id uuid,p_claim_token uuid,p_error text,p_delay_seconds integer,p_max_attempts integer) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update guestbook_private.media_cleanup_jobs set
    status=case when attempts>=p_max_attempts then 'failed' else 'pending' end,
    next_attempt_at=now()+make_interval(secs=>greatest(1,least(p_delay_seconds,86400))),
    claim_token=null,lease_until=null,last_error=left(p_error,120)
    where id=p_id and status='processing' and claim_token=p_claim_token and lease_until>now();
  return found;
end $$;
create function guestbook_private.purge_completed_media_cleanup_jobs(p_before timestamptz) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from guestbook_private.media_cleanup_jobs where status='done' and completed_at<least(p_before,now()-interval '7 days');
  get diagnostics n = row_count; return n;
end $$;
create function guestbook_private.requeue_failed_media_cleanup_job(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update guestbook_private.media_cleanup_jobs set status='pending',attempts=0,next_attempt_at=now(),last_error=null
    where id=p_id and status='failed'; return found;
end $$;

create function public.enqueue_expired_media(p_before timestamptz) returns integer
language sql security invoker set search_path = '' as $$ select guestbook_private.enqueue_expired_media(p_before) $$;
create function public.claim_media_cleanup_job(p_lease_seconds integer,p_max_attempts integer) returns jsonb
language sql security invoker set search_path = '' as $$ select guestbook_private.claim_media_cleanup_job(p_lease_seconds,p_max_attempts) $$;
create function public.complete_media_cleanup_job(p_id uuid,p_claim_token uuid) returns boolean
language sql security invoker set search_path = '' as $$ select guestbook_private.complete_media_cleanup_job(p_id,p_claim_token) $$;
create function public.retry_media_cleanup_job(p_id uuid,p_claim_token uuid,p_error text,p_delay_seconds integer,p_max_attempts integer) returns boolean
language sql security invoker set search_path = '' as $$ select guestbook_private.retry_media_cleanup_job(p_id,p_claim_token,p_error,p_delay_seconds,p_max_attempts) $$;
create function public.purge_completed_media_cleanup_jobs(p_before timestamptz) returns integer
language sql security invoker set search_path = '' as $$ select guestbook_private.purge_completed_media_cleanup_jobs(p_before) $$;
create function public.requeue_failed_media_cleanup_job(p_id uuid) returns boolean
language sql security invoker set search_path = '' as $$ select guestbook_private.requeue_failed_media_cleanup_job(p_id) $$;

revoke all on function guestbook_private.enqueue_expired_media(timestamptz),guestbook_private.claim_media_cleanup_job(integer,integer),
  guestbook_private.complete_media_cleanup_job(uuid,uuid),guestbook_private.retry_media_cleanup_job(uuid,uuid,text,integer,integer),
  guestbook_private.purge_completed_media_cleanup_jobs(timestamptz),guestbook_private.requeue_failed_media_cleanup_job(uuid)
  from public,anon,authenticated;
grant execute on function guestbook_private.enqueue_expired_media(timestamptz),guestbook_private.claim_media_cleanup_job(integer,integer),
  guestbook_private.complete_media_cleanup_job(uuid,uuid),guestbook_private.retry_media_cleanup_job(uuid,uuid,text,integer,integer),
  guestbook_private.purge_completed_media_cleanup_jobs(timestamptz),guestbook_private.requeue_failed_media_cleanup_job(uuid) to service_role;
revoke all on function public.enqueue_expired_media(timestamptz),public.claim_media_cleanup_job(integer,integer),
  public.complete_media_cleanup_job(uuid,uuid),public.retry_media_cleanup_job(uuid,uuid,text,integer,integer),
  public.purge_completed_media_cleanup_jobs(timestamptz),public.requeue_failed_media_cleanup_job(uuid) from public,anon,authenticated;
grant execute on function public.enqueue_expired_media(timestamptz),public.claim_media_cleanup_job(integer,integer),
  public.complete_media_cleanup_job(uuid,uuid),public.retry_media_cleanup_job(uuid,uuid,text,integer,integer),
  public.purge_completed_media_cleanup_jobs(timestamptz),public.requeue_failed_media_cleanup_job(uuid) to service_role;
