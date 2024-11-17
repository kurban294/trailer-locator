-- First, drop all existing policies
DROP POLICY IF EXISTS "Profiles can be created by admins" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admins" ON profiles;

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id
    AND role = 'admin'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies using the function
CREATE POLICY "Enable read access for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for admin users"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR auth.uid() = id  -- Allow users to insert their own profile
);

CREATE POLICY "Enable update access for admin users"
ON profiles FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR auth.uid() = id  -- Allow users to update their own profile
)
WITH CHECK (
  is_admin(auth.uid())
  OR auth.uid() = id  -- Allow users to update their own profile
);
