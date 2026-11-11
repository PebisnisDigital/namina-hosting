-- READ ONLY. Run only in the existing NAMANA project xglpwdgygzhjsmiwkzgj.
-- Returns configuration/permission metadata, never website content or credentials.
begin transaction read only;
set local statement_timeout = '15s';

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') as anonymous_table_read,
       has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE') as client_direct_write
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and starts_with(c.relname, 'namana_') and c.relkind = 'r'
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and starts_with(tablename, 'namana_'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
-- Inspect ALL Storage policies: an existing broad permissive policy can override tenant isolation.

select p.oid::regprocedure as function_signature, p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anonymous_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as client_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and starts_with(p.proname, 'namana_')
order by p.proname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'namana-media';

select tgname, pg_get_triggerdef(oid) as definition
from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

select to_regclass('supabase_migrations.schema_migrations') as migration_registry;
rollback;
