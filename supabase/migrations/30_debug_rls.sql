-- Drop all existing policies
DROP POLICY IF EXISTS "Profiles can be created by admins" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admins" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert access for admin users" ON profiles;
DROP POLICY IF EXISTS "Enable update access for admin users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role only" ON profiles;
DROP POLICY IF EXISTS "Enable update for admins and self" ON profiles;
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create a single policy that allows everything for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
ON profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
