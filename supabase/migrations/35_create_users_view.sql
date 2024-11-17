-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles can be created by admins" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admins" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert access for admin users" ON profiles;
DROP POLICY IF EXISTS "Enable update access for admin users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role only" ON profiles;
DROP POLICY IF EXISTS "Enable update for admins and self" ON profiles;

-- Temporarily disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create a view for fetching users
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.role,
    p.status,
    p.created_at,
    p.updated_at
FROM profiles p;

-- Grant access to the view
GRANT SELECT ON user_profiles TO authenticated;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role
  );
$$;

-- Create secure function to fetch users
CREATE OR REPLACE FUNCTION fetch_users()
RETURNS SETOF user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only allow authenticated users to fetch users
  IF auth.role() = 'authenticated' THEN
    RETURN QUERY SELECT * FROM user_profiles ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'Not authenticated';
  END IF;
END;
$$;
