-- First, disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including the ones we missed before)
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by admin users." ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admin users." ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by users who own them." ON profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow admins to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- List all existing policies (run this to see if we missed any)
SELECT * FROM pg_policies WHERE tablename = 'profiles';

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

-- Create new policies with unique names
CREATE POLICY "profiles_read_policy" 
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_update_own_policy"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_admin_policy"
ON profiles FOR ALL
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    )
);
