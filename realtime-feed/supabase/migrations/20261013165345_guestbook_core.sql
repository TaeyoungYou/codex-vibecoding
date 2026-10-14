-- Public reads; all writes use narrow RPC wrappers. Privileged implementations
-- live in an unexposed schema and check auth.uid() themselves.
create schema guestbook_private;
revoke all on schema guestbook_private from public;
grant usage on schema guestbook_private to authenticated, service_role;

-- Match JavaScript String.trim(), including tabs, newlines and Unicode spaces.
create function guestbook_private.trim_whitespace(p_value text) returns text
language sql immutable set search_path = '' as $$
  select btrim(p_value, (select string_agg(chr(n),'') from unnest(
    array[9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279]
  ) n))
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.entries (
  id uuid primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  body text not null check (char_length(body) <= 1000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_cursor_idx on public.entries(created_at desc, id desc);
create index entries_author_idx on public.entries(author_id);

create table guestbook_private.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  entry_id uuid not null,
  kind text not null check (kind in ('image','drawing_preview')),
  object_path text not null unique,
  status text not null default 'prepared' check (status in ('prepared','attached','delete_pending','deleted')),
  verified boolean not null default false,
  bytes integer check (bytes between 1 and 1048576),
  width integer check (width between 1 and 1600),
  height integer check (height between 1 and 1600),
  created_at timestamptz not null default now()
);
create index media_assets_entry_idx on guestbook_private.media_assets(entry_id);
create index media_assets_expiry_idx on guestbook_private.media_assets(created_at) where status = 'prepared';
create table public.entry_images (
  entry_id uuid not null references public.entries(id) on delete cascade,
  asset_id uuid not null unique references guestbook_private.media_assets(id),
  position integer not null check (position between 0 and 4),
  object_path text not null, width integer not null, height integer not null, bytes integer not null,
  primary key (entry_id, position)
);
create table public.entry_drawings (
  entry_id uuid primary key references public.entries(id) on delete cascade,
  asset_id uuid not null unique references guestbook_private.media_assets(id),
  object_path text not null, width integer not null, height integer not null, bytes integer not null
);
create table guestbook_private.drawing_strokes (
  entry_id uuid primary key references public.entries(id) on delete cascade,
  strokes_json text not null check (octet_length(strokes_json) <= 524288)
);
create table guestbook_private.media_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references guestbook_private.media_assets(id),
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz, claim_token uuid, completed_at timestamptz,
  last_error text, created_at timestamptz not null default now()
);
create index cleanup_pending_idx on guestbook_private.media_cleanup_jobs(next_attempt_at, created_at) where status = 'pending';
create index cleanup_processing_idx on guestbook_private.media_cleanup_jobs(lease_until) where status = 'processing';

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.entry_images enable row level security;
alter table public.entry_drawings enable row level security;
alter table guestbook_private.media_assets enable row level security;
alter table guestbook_private.drawing_strokes enable row level security;
alter table guestbook_private.media_cleanup_jobs enable row level security;
revoke all on public.profiles, public.entries, public.entry_images, public.entry_drawings from anon, authenticated;
revoke all on all tables in schema guestbook_private from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.entries, public.entry_images, public.entry_drawings to anon, authenticated;
create policy profiles_read_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy entries_public_read on public.entries for select to anon, authenticated using (true);
create policy images_public_read on public.entry_images for select to anon, authenticated using (true);
create policy drawings_public_read on public.entry_drawings for select to anon, authenticated using (true);

create function guestbook_private.set_nickname(p_nickname text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_name text := guestbook_private.trim_whitespace(p_nickname);
begin
  if v_uid is null then raise sqlstate 'PT401' using message = 'authentication required'; end if;
  if v_name is null or char_length(v_name) not between 2 and 16 then
    raise sqlstate 'PT400' using message = 'invalid nickname';
  end if;
  insert into public.profiles(id, nickname) values(v_uid, v_name)
    on conflict(id) do update set nickname = excluded.nickname, updated_at = now();
  return jsonb_build_object('id',v_uid,'nickname',v_name);
end $$;
create function public.set_nickname(p_nickname text) returns jsonb
language sql security invoker set search_path = '' as $$ select guestbook_private.set_nickname(p_nickname) $$;

create function public.read_entry(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'authorId', e.author_id, 'nickname', e.nickname, 'text', e.body,
    'version', e.version, 'createdAt', e.created_at, 'updatedAt', e.updated_at,
    'images', coalesce((select jsonb_agg(jsonb_build_object('id',i.asset_id,'url',i.object_path,
      'width',i.width,'height',i.height,'bytes',i.bytes) order by i.position)
      from public.entry_images i where i.entry_id=e.id), '[]'::jsonb),
    'drawing', (select jsonb_build_object('id',d.asset_id,'url',d.object_path,
      'width',d.width,'height',d.height,'bytes',d.bytes) from public.entry_drawings d where d.entry_id=e.id)
  ) from public.entries e where e.id=p_id
$$;
create function public.list_entries(p_before_created_at timestamptz default null, p_before_id uuid default null) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with page as (
    select e.id,e.created_at from public.entries e
    where p_before_created_at is null or (e.created_at,e.id)<(p_before_created_at,p_before_id)
    order by e.created_at desc,e.id desc limit 20
  ) select jsonb_build_object(
    'entries',coalesce((select jsonb_agg(public.read_entry(p.id) order by p.created_at desc,p.id desc) from page p),'[]'::jsonb),
    'nextCursor',case when (select count(*) from page)=20 then
      (select jsonb_build_object('createdAt',p.created_at,'id',p.id) from page p order by p.created_at,p.id limit 1)
      else null end
  )
$$;
create function guestbook_private.read_entry_for_edit(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message='authentication required'; end if;
  if not exists(select 1 from public.entries where id=p_id and author_id=auth.uid()) then
    raise sqlstate 'PT403' using message='owner required';
  end if;
  return public.read_entry(p_id) || jsonb_build_object('strokesJson',
    (select strokes_json from guestbook_private.drawing_strokes where entry_id=p_id));
end $$;
create function public.read_entry_for_edit(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$ select guestbook_private.read_entry_for_edit(p_id) $$;

create function guestbook_private.validate_drawing(p_json text) returns void
language plpgsql immutable set search_path = '' as $$
declare d jsonb; s jsonb; p jsonb;
begin
  if p_json is null or octet_length(p_json)>524288 then raise sqlstate 'PT400' using message='invalid drawing'; end if;
  begin d := p_json::jsonb; exception when others then raise sqlstate 'PT400' using message='invalid drawing'; end;
  if (d->>'formatVersion')::text is distinct from '1' or (d->>'width')::text is distinct from '900'
    or (d->>'height')::text is distinct from '600' or jsonb_typeof(d->'strokes') is distinct from 'array'
    then raise sqlstate 'PT400' using message='invalid drawing'; end if;
  for s in select value from jsonb_array_elements(d->'strokes') loop
    if coalesce(s->>'tool','') not in ('pen','eraser') or coalesce(s->>'color','') !~ '^#[0-9A-Fa-f]{6}$'
      or jsonb_typeof(s->'widthPx') is distinct from 'number' or (s->>'widthPx')::numeric not between 1 and 40
      or jsonb_typeof(s->'points') is distinct from 'array' or jsonb_array_length(s->'points')=0
      then raise sqlstate 'PT400' using message='invalid stroke'; end if;
    for p in select value from jsonb_array_elements(s->'points') loop
      if jsonb_typeof(p->'x') is distinct from 'number' or jsonb_typeof(p->'y') is distinct from 'number'
        or (p->>'x')::numeric not between 0 and 1 or (p->>'y')::numeric not between 0 and 1
        then raise sqlstate 'PT400' using message='invalid point'; end if;
    end loop;
  end loop;
end $$;

create function guestbook_private.reserve_media_upload(p_entry_id uuid,p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a guestbook_private.media_assets; v_uid uuid:=auth.uid(); v_id uuid:=gen_random_uuid();
begin
  if v_uid is null then raise sqlstate 'PT401' using message='authentication required'; end if;
  if p_entry_id is null or p_kind not in ('image','drawing_preview') then raise sqlstate 'PT400' using message='invalid media'; end if;
  if exists(select 1 from public.entries where id=p_entry_id and author_id<>v_uid) then
    raise sqlstate 'PT403' using message='owner required'; end if;
  insert into guestbook_private.media_assets(id,owner_id,entry_id,kind,object_path)
    values(v_id,v_uid,p_entry_id,p_kind,v_uid::text||'/'||p_entry_id::text||'/'||v_id::text||'.webp') returning * into a;
  return jsonb_build_object('assetId',a.id,'bucket','guestbook-media','objectPath',a.object_path);
end $$;
create function public.reserve_media_upload(p_entry_id uuid,p_kind text) returns jsonb
language sql security invoker set search_path = '' as $$ select guestbook_private.reserve_media_upload(p_entry_id,p_kind) $$;

create function guestbook_private.read_media_upload(p_asset_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a guestbook_private.media_assets;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message='authentication required'; end if;
  select * into a from guestbook_private.media_assets where id=p_asset_id and owner_id=auth.uid() and status='prepared';
  if not found then raise sqlstate 'PT403' using message='owner required'; end if;
  return jsonb_build_object('assetId',a.id,'ownerId',a.owner_id,'bucket','guestbook-media','objectPath',a.object_path,'kind',a.kind);
end $$;
create function public.read_media_upload(p_asset_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$ select guestbook_private.read_media_upload(p_asset_id) $$;

create function guestbook_private.verify_media_upload(p_asset_id uuid,p_owner_id uuid,p_bytes integer,p_width integer,p_height integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update guestbook_private.media_assets set verified=true,bytes=p_bytes,width=p_width,height=p_height
    where id=p_asset_id and owner_id=p_owner_id and status='prepared'
      and (kind='image' or (p_width=900 and p_height=600));
  if not found then raise sqlstate 'PT400' using message='invalid media'; end if;
end $$;
create function public.verify_media_upload(p_asset_id uuid,p_owner_id uuid,p_bytes integer,p_width integer,p_height integer) returns void
language sql security invoker set search_path = '' as $$ select guestbook_private.verify_media_upload(p_asset_id,p_owner_id,p_bytes,p_width,p_height) $$;

create function guestbook_private.can_upload(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from guestbook_private.media_assets a
    where a.object_path=p_path and a.owner_id=auth.uid() and a.status='prepared' and not a.verified)
$$;

create function guestbook_private.queue_detached_media(p_entry_id uuid,p_keep uuid[]) returns void
language plpgsql set search_path = '' as $$
begin
  with detached as (
    update guestbook_private.media_assets set status='delete_pending'
    where entry_id=p_entry_id and status='attached' and not(id=any(p_keep)) returning id
  ) insert into guestbook_private.media_cleanup_jobs(asset_id) select id from detached on conflict(asset_id) do nothing;
end $$;
create function guestbook_private.entry_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform guestbook_private.queue_detached_media(old.id,'{}'::uuid[]); return old; end $$;
create trigger entries_queue_files before delete on public.entries for each row execute function guestbook_private.entry_deleted();

create function guestbook_private.save_entry(p_id uuid,p_expected_version integer,p_text text,p_image_asset_ids uuid[],p_drawing jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid:=auth.uid(); e public.entries; v_nickname text; a guestbook_private.media_assets;
  v_drawing_id uuid; v_keep uuid[]; v_asset_id uuid; v_pos integer:=0; v_total bigint:=0; o storage.objects;
begin
  if v_uid is null then raise sqlstate 'PT401' using message='authentication required'; end if;
  if p_id is null or p_text is null or char_length(p_text)>1000 or p_image_asset_ids is null
    or cardinality(p_image_asset_ids)>5 or array_position(p_image_asset_ids,null) is not null
    or cardinality(p_image_asset_ids)<>(select count(distinct x) from unnest(p_image_asset_ids) x)
    then raise sqlstate 'PT400' using message='invalid entry'; end if;
  -- Serialize create/update/delete for the same UUID, including pre-created uploads.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into e from public.entries where id=p_id for update;
  if found then
    if e.author_id<>v_uid then raise sqlstate 'PT403' using message='owner required'; end if;
    if p_expected_version is null or e.version<>p_expected_version then raise sqlstate 'PT409' using message='version conflict'; end if;
  elsif p_expected_version is not null then raise sqlstate 'PT409' using message='entry removed'; end if;
  select nickname into v_nickname from public.profiles where id=v_uid;
  if not found then raise sqlstate 'PT401' using message='profile required'; end if;
  if p_drawing is not null then
    begin v_drawing_id:=(p_drawing->>'previewAssetId')::uuid;
    exception when others then raise sqlstate 'PT400' using message='invalid drawing'; end;
    if v_drawing_id is null then raise sqlstate 'PT400' using message='invalid drawing'; end if;
    perform guestbook_private.validate_drawing(p_drawing->>'strokesJson');
  end if;
  v_keep:=p_image_asset_ids || case when v_drawing_id is null then '{}'::uuid[] else array[v_drawing_id] end;
  if guestbook_private.trim_whitespace(p_text)='' and cardinality(v_keep)=0 then raise sqlstate 'PT400' using message='empty entry'; end if;
  foreach v_asset_id in array v_keep loop
    select * into a from guestbook_private.media_assets where id=v_asset_id for update;
    if not found or a.owner_id<>v_uid or a.entry_id<>p_id or a.status not in ('prepared','attached') or not a.verified
      or (v_asset_id=v_drawing_id and a.kind<>'drawing_preview')
      or (v_asset_id=any(p_image_asset_ids) and a.kind<>'image')
      then raise sqlstate 'PT400' using message='invalid asset'; end if;
    select * into o from storage.objects where bucket_id='guestbook-media' and name=a.object_path;
    if not found or (o.metadata->>'size')::bigint is distinct from a.bytes::bigint
      or o.metadata->>'mimetype' is distinct from 'image/webp' then raise sqlstate 'PT400' using message='missing or invalid object'; end if;
    if a.kind='image' then v_total:=v_total+a.bytes; end if;
  end loop;
  if v_total>5242880 then raise sqlstate 'PT400' using message='images too large'; end if;
  if e.id is null then
    insert into public.entries(id,author_id,nickname,body) values(p_id,v_uid,v_nickname,p_text);
  else
    update public.entries set body=p_text,version=version+1,updated_at=now() where id=p_id;
  end if;
  delete from public.entry_images where entry_id=p_id;
  delete from public.entry_drawings where entry_id=p_id;
  delete from guestbook_private.drawing_strokes where entry_id=p_id;
  foreach v_asset_id in array p_image_asset_ids loop
    select * into a from guestbook_private.media_assets where id=v_asset_id;
    insert into public.entry_images values(p_id,a.id,v_pos,a.object_path,a.width,a.height,a.bytes);
    v_pos:=v_pos+1;
  end loop;
  if v_drawing_id is not null then
    select * into a from guestbook_private.media_assets where id=v_drawing_id;
    insert into public.entry_drawings values(p_id,a.id,a.object_path,a.width,a.height,a.bytes);
    insert into guestbook_private.drawing_strokes values(p_id,p_drawing->>'strokesJson');
  end if;
  update guestbook_private.media_assets set status='attached' where id=any(v_keep);
  perform guestbook_private.queue_detached_media(p_id,v_keep);
  return public.read_entry(p_id);
end $$;
create function public.save_entry(p_id uuid,p_expected_version integer,p_text text,p_image_asset_ids uuid[],p_drawing jsonb) returns jsonb
language sql security invoker set search_path = '' as $$ select guestbook_private.save_entry(p_id,p_expected_version,p_text,p_image_asset_ids,p_drawing) $$;

create function guestbook_private.delete_entry(p_id uuid,p_expected_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.entries;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message='authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into e from public.entries where id=p_id for update;
  if not found then raise sqlstate 'PT409' using message='entry removed'; end if;
  if e.author_id<>auth.uid() then raise sqlstate 'PT403' using message='owner required'; end if;
  if p_expected_version is null or e.version<>p_expected_version then raise sqlstate 'PT409' using message='version conflict'; end if;
  delete from public.entries where id=p_id;
end $$;
create function public.delete_entry(p_id uuid,p_expected_version integer) returns void
language sql security invoker set search_path = '' as $$ select guestbook_private.delete_entry(p_id,p_expected_version) $$;

-- New functions have PUBLIC EXECUTE by default. Remove it explicitly.
revoke all on all functions in schema guestbook_private from public, anon, authenticated;
grant execute on function guestbook_private.set_nickname(text), guestbook_private.read_entry_for_edit(uuid),
  guestbook_private.reserve_media_upload(uuid,text), guestbook_private.read_media_upload(uuid), guestbook_private.can_upload(text),
  guestbook_private.save_entry(uuid,integer,text,uuid[],jsonb), guestbook_private.delete_entry(uuid,integer) to authenticated;
grant execute on function guestbook_private.verify_media_upload(uuid,uuid,integer,integer,integer) to service_role;
revoke all on function public.set_nickname(text), public.read_entry_for_edit(uuid),public.reserve_media_upload(uuid,text),
  public.read_media_upload(uuid),public.verify_media_upload(uuid,uuid,integer,integer,integer),
  public.save_entry(uuid,integer,text,uuid[],jsonb),public.delete_entry(uuid,integer),
  public.read_entry(uuid),public.list_entries(timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.set_nickname(text),public.read_entry_for_edit(uuid),public.reserve_media_upload(uuid,text),
  public.read_media_upload(uuid),public.save_entry(uuid,integer,text,uuid[],jsonb),public.delete_entry(uuid,integer) to authenticated;
grant execute on function public.read_entry(uuid),public.list_entries(timestamptz,uuid) to anon,authenticated,service_role;
grant execute on function public.verify_media_upload(uuid,uuid,integer,integer,integer) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('guestbook-media','guestbook-media',true,1048576,array['image/webp']);
create policy guestbook_reserved_upload on storage.objects for insert to authenticated
  with check (bucket_id='guestbook-media' and guestbook_private.can_upload(name));
-- Deliberately no UPDATE/DELETE policy: replacement always uses a new asset.
alter publication supabase_realtime add table public.entries;
