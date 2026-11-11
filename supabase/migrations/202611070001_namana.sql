-- Additive NAMANA namespace. Apply only to the verified NAMANA project.
create table public.namana_profiles (
  user_id uuid primary key references auth.users(id), display_name text not null default '',
  email text not null, status text not null default 'active' check(status in ('active','inactive'))
);
create table public.namana_roles (
  user_id uuid primary key references public.namana_profiles(user_id), role text not null check(role = 'superadmin')
);
create table public.namana_templates (
  code text primary key, active boolean not null default true
);
insert into public.namana_templates(code) values ('ORIGINAL');
create table public.namana_settings (
  id boolean primary key default true check(id), image_bytes bigint not null default 5242880,
  video_bytes bigint not null default 20971520, quota_bytes bigint not null default 104857600,
  max_video_seconds integer not null default 120, max_dimension integer not null default 3840
);
insert into public.namana_settings(id) values(true);
create table public.namana_sites (
  id uuid primary key default gen_random_uuid(), owner_id uuid unique not null references public.namana_profiles(user_id),
  slug text unique not null check(slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$' and slug not in ('admin','api','login','logout','dashboard','studio','preview','assets','auth','settings','checkout','register','help','www','new','demo','canvas','privacy','terms','support')),
  template_id text not null default 'ORIGINAL' references public.namana_templates(code),
  status text not null default 'active' check(status in ('active','suspended')),
  suspension_reason text, published_version_id uuid, published_revision integer, updated_at timestamptz not null default now()
);
create table public.namana_drafts (
  site_id uuid primary key references public.namana_sites(id), content jsonb not null,
  revision integer not null default 1, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table public.namana_versions (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.namana_sites(id),
  content jsonb not null, revision integer not null, created_at timestamptz not null default now(), created_by uuid references auth.users(id), unique(site_id,id)
);
alter table public.namana_sites add constraint namana_published_same_site foreign key(id,published_version_id) references public.namana_versions(site_id,id);
create table public.namana_assets (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.namana_sites(id),
  storage_path text unique not null, mime text not null, bytes bigint not null check(bytes > 0),
  verified boolean not null default false, metadata jsonb, created_at timestamptz not null default now()
);
create index namana_assets_site on public.namana_assets(site_id);
create table public.namana_preview_tokens (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.namana_sites(id),
  token_hash text unique not null, content jsonb not null, expires_at timestamptz not null, revoked_at timestamptz
);
create table public.namana_audit (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
  action text not null, site_id uuid references public.namana_sites(id), details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.namana_rpc_limits(user_id uuid primary key references auth.users(id), window_at timestamptz not null, requests integer not null);
alter table public.namana_rpc_limits enable row level security;
revoke all on public.namana_rpc_limits from public,anon,authenticated;

create function public.namana_sync_profile() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.namana_profiles(user_id,email) values(new.id,coalesce(new.email,'')) on conflict(user_id) do update set email=excluded.email;
 return new;
end $$;
create trigger namana_auth_profile after insert or update of email on auth.users for each row execute function public.namana_sync_profile();
-- Do not alter existing Auth users. Profiles may also be provisioned by the invitation API.
create function public.namana_is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.namana_roles r join public.namana_profiles p using(user_id) where r.user_id=auth.uid() and p.status='active' and r.role='superadmin')
$$;
create function public.namana_can_edit(p_site uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.namana_sites s where s.id=p_site and (public.namana_is_admin() or (s.owner_id=auth.uid() and exists(select 1 from public.namana_profiles p where p.user_id=auth.uid() and p.status='active'))))
$$;
create function public.namana_asset_ids(p_content jsonb) returns uuid[] language sql immutable set search_path=public,pg_temp as $$
 select coalesce(array_agg(distinct value::uuid),'{}'::uuid[]) from (
 select p_content#>>'{identity,portraitAssetId}' value union all
 select p_content#>>'{background,desktopVideoAssetId}' union all select p_content#>>'{background,mobileVideoAssetId}' union all select p_content#>>'{background,posterAssetId}' union all
 select c->>'imageAssetId' from jsonb_array_elements(p_content->'cards') c
 ) a where value is not null
$$;
create function public.namana_valid_link(p_link text) returns boolean language sql immutable as $$
 select p_link = '' or (p_link ~ '^(https://[^/[:space:]@]+([/?#].*)?|mailto:[^[:space:]@]+@[^[:space:]@]+|tel:[+0-9()-]+)$' and p_link !~ '[[:space:][:cntrl:]]')
$$;
create function public.namana_exact_keys(obj jsonb,keys text[]) returns boolean language sql immutable as $$
 select case when jsonb_typeof(obj)='object' then obj ?& keys and (select count(*) from jsonb_object_keys(obj))=cardinality(keys) else false end
$$;
create function public.namana_validate(p_content jsonb,p_site uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb; ids uuid[]; aid uuid;
begin
 if not coalesce(public.namana_exact_keys(p_content,array['schemaVersion','template','identity','wallet','background','theme','cards'])
 and public.namana_exact_keys(p_content->'identity',array['displayName','profession','bio','portraitAssetId'])
 and public.namana_exact_keys(p_content->'wallet',array['color','materialPreset','animationPreset'])
 and public.namana_exact_keys(p_content->'background',array['desktopVideoAssetId','mobileVideoAssetId','posterAssetId','overlayOpacity','focalX','focalY'])
 and public.namana_exact_keys(p_content->'theme',array['accent','fontPreset']),false) then raise exception 'invalid_content_keys'; end if;
 if not coalesce(
 jsonb_typeof(p_content)='object' and p_content->'schemaVersion'='1'::jsonb and p_content->>'template'='ORIGINAL'
 and jsonb_typeof(p_content->'identity')='object' and jsonb_typeof(p_content->'wallet')='object' and jsonb_typeof(p_content->'background')='object' and jsonb_typeof(p_content->'theme')='object'
 and jsonb_typeof(p_content#>'{identity,displayName}')='string' and length(p_content#>>'{identity,displayName}') between 1 and 60
 and jsonb_typeof(p_content#>'{identity,profession}')='string' and length(p_content#>>'{identity,profession}')<=70
 and jsonb_typeof(p_content#>'{identity,bio}')='string' and length(p_content#>>'{identity,bio}')<=300
 and p_content#>>'{wallet,color}' ~ '^#[0-9a-fA-F]{6}$' and p_content#>>'{theme,accent}' ~ '^#[0-9a-fA-F]{6}$'
 and p_content#>>'{wallet,materialPreset}' in ('original','matte') and p_content#>>'{wallet,animationPreset}' in ('normal','minimal')
 and p_content#>>'{theme,fontPreset}' in ('original','system')
 and jsonb_typeof(p_content#>'{background,overlayOpacity}')='number' and (p_content#>>'{background,overlayOpacity}')::numeric between 0.25 and 0.85
 and jsonb_typeof(p_content#>'{background,focalX}')='number' and (p_content#>>'{background,focalX}')::numeric between 0 and 100
 and jsonb_typeof(p_content#>'{background,focalY}')='number' and (p_content#>>'{background,focalY}')::numeric between 0 and 100
 and jsonb_typeof(p_content->'cards')='array' and jsonb_array_length(p_content->'cards') between 1 and 24
 and octet_length(p_content::text)<=100000, false) then raise exception 'invalid_content'; end if;
 if not exists(select 1 from jsonb_array_elements(p_content->'cards') item where item->'visible'='true'::jsonb) then raise exception 'visible_card_required'; end if;
 if (select count(distinct item->>'id') from jsonb_array_elements(p_content->'cards') item) <> jsonb_array_length(p_content->'cards') then raise exception 'duplicate_card_id'; end if;
 for c in select * from jsonb_array_elements(p_content->'cards') loop
  if not public.namana_exact_keys(c,array['id','type','title','subtitle','description','visible','color','imageAssetId','link']) then raise exception 'invalid_card_keys'; end if;
  if not coalesce(jsonb_typeof(c)='object' and c->>'id' ~ '^[0-9a-fA-F-]{36}$'
   and c->>'type' in ('profile','experience','skills','contact')
   and jsonb_typeof(c->'title')='string' and length(c->>'title') between 1 and 48
   and jsonb_typeof(c->'subtitle')='string' and length(c->>'subtitle')<=100
   and jsonb_typeof(c->'description')='string' and length(c->>'description')<=1200
   and jsonb_typeof(c->'visible')='boolean' and c->>'color' ~ '^#[0-9a-fA-F]{6}$'
   and jsonb_typeof(c->'link')='string' and length(c->>'link')<=500 and public.namana_valid_link(c->>'link'),false) then raise exception 'invalid_card'; end if;
  perform (c->>'id')::uuid;
 end loop;
 ids:=public.namana_asset_ids(p_content);
 foreach aid in array ids loop
  if not exists(select 1 from public.namana_assets a where a.id=aid and a.site_id=p_site and a.verified) then raise exception 'invalid_asset_ownership'; end if;
 end loop;
 if exists(select 1 from public.namana_assets a where a.id=any(ids) and (
  (a.id in ((p_content#>>'{background,desktopVideoAssetId}')::uuid,(p_content#>>'{background,mobileVideoAssetId}')::uuid) and a.mime<>'video/mp4') or
  (a.id in ((p_content#>>'{identity,portraitAssetId}')::uuid,(p_content#>>'{background,posterAssetId}')::uuid) and a.mime not like 'image/%') or
  (a.id in (select (item->>'imageAssetId')::uuid from jsonb_array_elements(p_content->'cards') item) and a.mime not like 'image/%')
 )) then raise exception 'invalid_asset_type'; end if;
end $$;

create function public.namana_check_rate() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'forbidden'; end if;
 insert into public.namana_rpc_limits(user_id,window_at,requests) values(auth.uid(),now(),1)
 on conflict(user_id) do update set requests=case when namana_rpc_limits.window_at<now()-interval '1 minute' then 1 else namana_rpc_limits.requests+1 end,
 window_at=case when namana_rpc_limits.window_at<now()-interval '1 minute' then now() else namana_rpc_limits.window_at end returning requests into n;
 if n>180 then raise exception 'rate_limit'; end if;
end $$;
create function public.namana_provision(p_owner uuid,p_slug text,p_content jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare sid uuid;
begin
 if not public.namana_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 perform public.namana_check_rate();
 if not exists(select 1 from public.namana_templates where code='ORIGINAL' and active) then raise exception 'template_inactive'; end if;
 insert into public.namana_sites(owner_id,slug) values(p_owner,p_slug) returning id into sid;
 perform public.namana_validate(p_content,sid);
 insert into public.namana_drafts(site_id,content,updated_by) values(sid,p_content,auth.uid());
 insert into public.namana_audit(actor_id,action,site_id) values(auth.uid(),'provision',sid);
 return sid;
end $$;
create function public.namana_save(p_site uuid,p_revision integer,p_content jsonb) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare rev integer;
begin
 if not public.namana_can_edit(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 perform public.namana_check_rate();
 perform 1 from public.namana_sites where id=p_site for update;
 perform public.namana_validate(p_content,p_site);
 update public.namana_drafts set content=p_content, revision=revision+1,updated_at=now(),updated_by=auth.uid() where site_id=p_site and revision=p_revision returning revision into rev;
 if rev is null then raise exception 'revision_conflict' using errcode='40001'; end if;
 update public.namana_sites set updated_at=now() where id=p_site;
 insert into public.namana_audit(actor_id,action,site_id) values(auth.uid(),'save',p_site);
 return rev;
end $$;
create function public.namana_publish(p_site uuid,p_revision integer) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.namana_drafts; vid uuid; s public.namana_sites;
begin
 if not public.namana_can_edit(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 perform public.namana_check_rate();
 select * into s from public.namana_sites where id=p_site for update;
 if s.status<>'active' or not exists(select 1 from public.namana_profiles where user_id=s.owner_id and status='active') then raise exception 'site_suspended'; end if;
 select * into d from public.namana_drafts where site_id=p_site for update;
 if d.revision<>p_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
 perform public.namana_validate(d.content,p_site);
 insert into public.namana_versions(site_id,content,revision,created_by) values(p_site,d.content,d.revision,auth.uid()) returning id into vid;
 update public.namana_sites set published_version_id=vid,published_revision=d.revision,updated_at=now() where id=p_site;
 insert into public.namana_audit(actor_id,action,site_id,details) values(auth.uid(),'publish',p_site,jsonb_build_object('version',vid));
 return vid;
end $$;
create function public.namana_restore(p_site uuid,p_version uuid,p_revision integer) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb; rev integer;
begin
 if not public.namana_can_edit(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 select content into c from public.namana_versions where id=p_version and site_id=p_site;
 if c is null then raise exception 'version_not_found'; end if;
 rev:=public.namana_save(p_site,p_revision,c);
 insert into public.namana_audit(actor_id,action,site_id,details) values(auth.uid(),'restore',p_site,jsonb_build_object('version',p_version));
 return rev;
end $$;
create function public.namana_public_site(p_slug text) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('content',v.content,'slug',s.slug) from public.namana_sites s join public.namana_versions v on v.id=s.published_version_id join public.namana_profiles p on p.user_id=s.owner_id where s.slug=p_slug and s.status='active' and p.status='active'
$$;
create function public.namana_create_preview(p_site uuid,p_revision integer) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''); c jsonb;
begin
 if not public.namana_can_edit(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 select content into c from public.namana_drafts where site_id=p_site and revision=p_revision;
 perform public.namana_check_rate();
 if c is null then raise exception 'revision_conflict'; end if;
 insert into public.namana_preview_tokens(site_id,token_hash,content,expires_at) values(p_site,encode(sha256(convert_to(token,'UTF8')),'hex'),c,now()+interval '1 hour');
 insert into public.namana_audit(actor_id,action,site_id) values(auth.uid(),'create_preview',p_site);
 return token;
end $$;
create function public.namana_preview(p_token text) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('content',t.content) from public.namana_preview_tokens t join public.namana_sites s on s.id=t.site_id join public.namana_profiles p on p.user_id=s.owner_id where t.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and t.revoked_at is null and t.expires_at>now() and s.status='active' and p.status='active'
$$;
create function public.namana_revoke_previews(p_site uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.namana_can_edit(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 update public.namana_preview_tokens set revoked_at=now() where site_id=p_site and revoked_at is null;
 insert into public.namana_audit(actor_id,action,site_id) values(auth.uid(),'revoke_previews',p_site);
end $$;
create function public.namana_admin_site(p_site uuid,p_slug text,p_status text,p_reason text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.namana_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_status='suspended' and length(trim(coalesce(p_reason,'')))<3 then raise exception 'suspension_reason_required'; end if;
 update public.namana_sites set slug=p_slug,status=p_status,suspension_reason=left(p_reason,500),updated_at=now() where id=p_site;
 insert into public.namana_audit(actor_id,action,site_id,details) values(auth.uid(),'admin_site',p_site,jsonb_build_object('status',p_status,'slug',p_slug,'reason',left(p_reason,500)));
end $$;
create function public.namana_account(p_name text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or length(p_name)>100 then raise exception 'forbidden'; end if;
 update public.namana_profiles set display_name=p_name where user_id=auth.uid();
end $$;
create function public.namana_admin_client(p_user uuid,p_status text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.namana_is_admin() or p_user=auth.uid() then raise exception 'forbidden'; end if;
 update public.namana_profiles set status=p_status where user_id=p_user;
 insert into public.namana_audit(actor_id,action,details) values(auth.uid(),'client_status',jsonb_build_object('user',p_user,'status',p_status));
end $$;
create function public.namana_admin_settings(p_settings jsonb,p_active boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.namana_is_admin() then raise exception 'forbidden'; end if;
 if not coalesce((p_settings->>'image_bytes')::bigint between 100000 and 10485760 and (p_settings->>'video_bytes')::bigint between 100000 and 52428800 and (p_settings->>'quota_bytes')::bigint between 1000000 and 10737418240 and (p_settings->>'max_video_seconds')::int between 1 and 600 and (p_settings->>'max_dimension')::int between 320 and 7680,false) then raise exception 'invalid_limits'; end if;
 update public.namana_settings set image_bytes=(p_settings->>'image_bytes')::bigint,video_bytes=(p_settings->>'video_bytes')::bigint,quota_bytes=(p_settings->>'quota_bytes')::bigint,max_video_seconds=(p_settings->>'max_video_seconds')::int,max_dimension=(p_settings->>'max_dimension')::int;
 update public.namana_templates set active=p_active where code='ORIGINAL';
 insert into public.namana_audit(actor_id,action,details) values(auth.uid(),'settings',p_settings);
end $$;
create function public.namana_reserve_asset(p_site uuid,p_mime text,p_bytes bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare lim public.namana_settings; aid uuid:=gen_random_uuid(); path text;
begin
 if not public.namana_can_edit(p_site) then raise exception 'forbidden' using errcode='42501'; end if;
 perform public.namana_check_rate();
 perform 1 from public.namana_sites where id=p_site for update;
 select * into lim from public.namana_settings;
 if p_mime not in ('image/jpeg','image/png','image/webp','video/mp4') or p_bytes<=0 or p_bytes>(case when p_mime='video/mp4' then lim.video_bytes else lim.image_bytes end) then raise exception 'invalid_file'; end if;
 if p_bytes+(select coalesce(sum(bytes),0) from public.namana_assets where site_id=p_site)>lim.quota_bytes then raise exception 'quota_exceeded'; end if;
 path:=p_site::text||'/'||aid::text||case p_mime when 'video/mp4' then '.mp4' when 'image/png' then '.png' when 'image/webp' then '.webp' else '.jpg' end;
 insert into public.namana_assets(id,site_id,storage_path,mime,bytes) values(aid,p_site,path,p_mime,p_bytes);
 return jsonb_build_object('id',aid,'storage_path',path);
end $$;
create function public.namana_asset_access(p_asset uuid,p_token text default null) returns text language sql stable security definer set search_path=public,pg_temp as $$
 select a.storage_path from public.namana_assets a where a.id=p_asset and a.verified and (
 public.namana_can_edit(a.site_id) or exists(select 1 from public.namana_sites s join public.namana_versions v on s.published_version_id=v.id join public.namana_profiles p on s.owner_id=p.user_id where s.id=a.site_id and s.status='active' and p.status='active' and a.id=any(public.namana_asset_ids(v.content))) or
 exists(select 1 from public.namana_preview_tokens t join public.namana_sites s on s.id=t.site_id join public.namana_profiles p on p.user_id=s.owner_id where t.site_id=a.site_id and s.status='active' and p.status='active' and t.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and t.expires_at>now() and t.revoked_at is null and a.id=any(public.namana_asset_ids(t.content))))
$$;

-- No client gets table writes. All writes use checked server-side transactions.
do $$ declare tab text; begin
 foreach tab in array array['profiles','roles','templates','settings','sites','drafts','versions','assets','preview_tokens','audit'] loop
  execute format('alter table public.namana_%I enable row level security',tab);
  execute format('revoke all on public.namana_%I from anon, authenticated',tab);
  execute format('grant select on public.namana_%I to authenticated',tab);
  execute format('grant all on public.namana_%I to service_role',tab);
 end loop;
end $$;
grant usage,select on sequence public.namana_audit_id_seq to service_role;
create policy namana_profiles_read on public.namana_profiles for select to authenticated using(user_id=auth.uid() or public.namana_is_admin());
create policy namana_roles_read on public.namana_roles for select to authenticated using(user_id=auth.uid());
create policy namana_sites_read on public.namana_sites for select to authenticated using(public.namana_can_edit(id));
create policy namana_drafts_read on public.namana_drafts for select to authenticated using(public.namana_can_edit(site_id));
create policy namana_versions_read on public.namana_versions for select to authenticated using(public.namana_can_edit(site_id));
create policy namana_assets_read on public.namana_assets for select to authenticated using(public.namana_can_edit(site_id));
create policy namana_preview_read on public.namana_preview_tokens for select to authenticated using(public.namana_can_edit(site_id));
create policy namana_audit_read on public.namana_audit for select to authenticated using(public.namana_is_admin());
create policy namana_templates_read on public.namana_templates for select to authenticated using(true);
create policy namana_settings_read on public.namana_settings for select to authenticated using(true);

-- Revoke default PUBLIC execution for every function in this migration.
do $$ declare fn record; begin
 for fn in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname like 'namana_%' loop
  execute format('revoke all on function %s from public, anon, authenticated',fn.sig);
 end loop;
end $$;
grant execute on function public.namana_is_admin(),public.namana_can_edit(uuid),public.namana_asset_ids(jsonb) to authenticated;
grant execute on function public.namana_provision(uuid,text,jsonb), public.namana_save(uuid,integer,jsonb),public.namana_publish(uuid,integer), public.namana_restore(uuid,uuid,integer), public.namana_create_preview(uuid,integer), public.namana_revoke_previews(uuid), public.namana_admin_site(uuid,text,text,text),public.namana_account(text),public.namana_admin_client(uuid,text),public.namana_admin_settings(jsonb,boolean),public.namana_reserve_asset(uuid,text,bigint) to authenticated;
grant execute on function public.namana_public_site(text),public.namana_preview(text),public.namana_asset_access(uuid,text) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('namana-media','namana-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4']);
create policy namana_storage_insert on storage.objects for insert to authenticated with check(bucket_id='namana-media' and exists(select 1 from public.namana_assets a where a.storage_path=name and not a.verified and public.namana_can_edit(a.site_id)));
create policy namana_storage_read on storage.objects for select to authenticated using(bucket_id='namana-media' and exists(select 1 from public.namana_assets a where a.storage_path=name and public.namana_can_edit(a.site_id)));

-- Durable endpoint rate limit; only the server service role may call it.
create table public.namana_api_limits(key text primary key, window_at timestamptz not null, requests integer not null);
alter table public.namana_api_limits enable row level security;
revoke all on public.namana_api_limits from public,anon,authenticated;
create function public.namana_api_rate(p_key text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 insert into public.namana_api_limits(key,window_at,requests) values(p_key,now(),1)
 on conflict(key) do update set requests=case when namana_api_limits.window_at < now()-interval '1 minute' then 1 else namana_api_limits.requests+1 end,
 window_at=case when namana_api_limits.window_at < now()-interval '1 minute' then now() else namana_api_limits.window_at end returning requests into n;
 if n>120 then raise exception 'rate_limit'; end if;
end $$;
revoke all on function public.namana_api_rate(text) from public,anon,authenticated;
grant execute on function public.namana_api_rate(text) to service_role;

create function public.namana_sitemap() returns table(slug text,updated_at timestamptz) language sql stable security definer set search_path=public,pg_temp as $$
 select s.slug,s.updated_at from public.namana_sites s join public.namana_profiles p on p.user_id=s.owner_id where s.published_version_id is not null and s.status='active' and p.status='active'
$$;
revoke all on function public.namana_sitemap() from public;
grant execute on function public.namana_sitemap() to anon,authenticated;
