-- First, drop all existing policies and functions
DROP POLICY IF EXISTS "Profiles can be created by admins" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admins" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert access for admin users" ON profiles;
DROP POLICY IF EXISTS "Enable update access for admin users" ON profiles;
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Temporarily disable RLS to ensure we can create the first admin
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create simple policies
CREATE POLICY "Enable read access for all authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for service role only"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow service role to insert
  auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Enable update for admins and self"
ON profiles FOR UPDATE
TO authenticated
USING (
  -- Allow updates if user is updating their own profile
  auth.uid() = id
  OR 
  -- Or if the user doing the update is an admin (direct table check)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
