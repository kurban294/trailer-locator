-- Drop existing functions
DROP FUNCTION IF EXISTS get_profile(uuid);
DROP FUNCTION IF EXISTS profiles_api(uuid);

-- Create the function with the correct type
CREATE OR REPLACE FUNCTION get_profile(user_id uuid)
RETURNS TABLE (
    id uuid,
    role user_role,  -- Using user_role type
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_profile(uuid) TO authenticated;

-- Create the API function with correct types
CREATE FUNCTION profiles_api(user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
    id uuid,
    role user_role,  -- Using user_role type
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

-- Make sure your profile exists as admin
INSERT INTO profiles (id, role, status)
VALUES (
    'f057a4b2-01e0-47f8-af95-bf5dbed60deb',
    'admin'::user_role,  -- Explicitly cast to user_role
    'active'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'::user_role,
    status = 'active'
RETURNING *;

-- Verify it works
SELECT * FROM profiles_api('f057a4b2-01e0-47f8-af95-bf5dbed60deb');
