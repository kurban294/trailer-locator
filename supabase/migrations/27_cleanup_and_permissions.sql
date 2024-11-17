-- Drop unused functions
DROP FUNCTION IF EXISTS admin_create_user(text, text, text, text, user_role, user_status);

-- Update RLS policies for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for inserting profiles (admin only)
DROP POLICY IF EXISTS "Profiles can be created by admins" ON profiles;
CREATE POLICY "Profiles can be created by admins"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy for viewing profiles (all authenticated users)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Policy for updating profiles (admin only)
DROP POLICY IF EXISTS "Profiles can be updated by admins" ON profiles;
CREATE POLICY "Profiles can be updated by admins"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
