-- List all policies on the profiles table
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- List all triggers on the profiles table
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name,
    nspname AS schema_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE tgrelid = 'profiles'::regclass;
