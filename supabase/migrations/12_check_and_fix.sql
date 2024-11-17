-- First check if the type exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_profile(uuid);
DROP FUNCTION IF EXISTS profiles_api(uuid);

-- Alter the profiles table if needed
DO $$ 
BEGIN
  -- Check if we need to alter the column type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role' 
    AND data_type = 'text'
  ) THEN
    -- Alter the column type
    ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
  END IF;
END $$;

-- Create the function with the correct type
CREATE OR REPLACE FUNCTION get_profile(user_id uuid)
RETURNS TABLE (
    id uuid,
    role user_role,
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
    SELECT 
        p.id,
        p.role::user_role,
        p.status,
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
    'admin'::user_role,
    'active'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'::user_role,
    status = 'active'
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
