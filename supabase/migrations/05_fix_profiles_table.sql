-- First, disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by admin users." ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admin users." ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by users who own them." ON profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow admins to insert profiles" ON profiles;

-- Make sure your profile exists and is set as admin
INSERT INTO profiles (id, role, status, first_name, last_name)
VALUES (
    'f057a4b2-01e0-47f8-af95-bf5dbed60deb',  -- your user ID
    'admin',
    'active',
    'Admin',  -- you can change this
    'User'    -- you can change this
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin',
    status = 'active';

-- Verify the profile
SELECT * FROM profiles WHERE id = 'f057a4b2-01e0-47f8-af95-bf5dbed60deb';

-- Now add a simple RLS policy
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow admin to insert/update any profile
CREATE POLICY "Admins can manage all profiles"
ON profiles FOR ALL
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    )
);
