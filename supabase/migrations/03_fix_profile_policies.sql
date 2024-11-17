-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by admin users." ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by admin users." ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by users who own them." ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new, simplified policies
CREATE POLICY "Allow users to view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Allow users to update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to insert new profiles
CREATE POLICY "Allow admins to insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Verify your current profile
SELECT 
    au.email,
    p.role,
    p.status
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.id = auth.uid();
