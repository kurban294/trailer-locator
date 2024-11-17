-- First check if the types exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
  END IF;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_profile(uuid);
DROP FUNCTION IF EXISTS profiles_api(uuid);

-- Create the function with the correct types
CREATE OR REPLACE FUNCTION get_profile(user_id uuid)
RETURNS TABLE (
    id uuid,
    role user_role,
    status user_status,  -- Changed from text to user_status
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
    SELECT 
        p.id,
        p.role::user_role,
        p.status::user_status,  -- Cast status to user_status
        p.first_name,
        p.last_name,
        p.created_at,
        p.updated_at
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
    role user_role,
    status user_status,  -- Changed from text to user_status
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
    'admin'::user_role,
    'active'::user_status  -- Cast to user_status
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'::user_role,
    status = 'active'::user_status
RETURNING *;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Verify your profile
SELECT * FROM profiles WHERE id = 'f057a4b2-01e0-47f8-af95-bf5dbed60deb';
