-- First, completely disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all known policies explicitly
DROP POLICY IF EXISTS "authenticated_access" ON profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_policy" ON profiles;
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

-- Update or create your profile as admin
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

-- Enable RLS with a single, simple policy
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Single policy for authenticated users
CREATE POLICY "authenticated_access"
ON profiles
FOR ALL
TO authenticated
USING (true);

-- Verify the policy and your profile
SELECT * FROM pg_policies WHERE tablename = 'profiles';
SELECT * FROM profiles WHERE id = 'f057a4b2-01e0-47f8-af95-bf5dbed60deb';
