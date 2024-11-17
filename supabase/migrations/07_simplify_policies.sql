-- First, completely disable RLS and drop all policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    -- Drop all policies for the profiles table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    END LOOP;
END $$;

-- First verify your profile exists with admin role
SELECT * FROM profiles WHERE id = 'f057a4b2-01e0-47f8-af95-bf5dbed60deb';

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

-- Verify the policy
SELECT * FROM pg_policies WHERE tablename = 'profiles';
