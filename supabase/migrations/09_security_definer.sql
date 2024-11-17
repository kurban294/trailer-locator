-- First, disable RLS completely
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "authenticated_access" ON profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_policy" ON profiles;

-- Create a security definer function to handle profile access
CREATE OR REPLACE FUNCTION get_profile(user_id uuid)
RETURNS TABLE (
    id uuid,
    role text,
    status text,
    first_name text,
    last_name text,
    created_at timestamptz,
    updated_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM profiles p
    WHERE p.id = user_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_profile(uuid) TO authenticated;

-- Make sure your profile exists as admin
INSERT INTO profiles (id, role, status)
VALUES (
    'f057a4b2-01e0-47f8-af95-bf5dbed60deb',
    'admin',
    'active'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin',
    status = 'active'
RETURNING *;

-- Create API for profile access
DROP FUNCTION IF EXISTS profiles_api(uuid);
CREATE FUNCTION profiles_api(user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
    id uuid,
    role text,
    status text,
    first_name text,
    last_name text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM get_profile(user_id);
$$;

-- Verify your profile using the new function
SELECT * FROM profiles_api('f057a4b2-01e0-47f8-af95-bf5dbed60deb');
