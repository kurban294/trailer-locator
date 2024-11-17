-- First, drop dependent objects
DROP MATERIALIZED VIEW IF EXISTS admin_users;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;

-- Now clean up the profiles table and its policies
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

-- Update the profiles table structure without dropping it
ALTER TABLE profiles 
  ALTER COLUMN role SET DEFAULT 'user'::user_role,
  ALTER COLUMN status SET DEFAULT 'active'::user_status,
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for now
CREATE POLICY "Allow all operations for authenticated users"
ON profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Recreate the admin_users materialized view
CREATE MATERIALIZED VIEW admin_users AS
SELECT id, first_name, last_name
FROM profiles
WHERE role = 'admin'::user_role;

-- Recreate the audit logs policy
CREATE POLICY "Admins can view all audit logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::user_role
  )
);

-- Insert a test admin user if needed
INSERT INTO profiles (id, first_name, last_name, role, status)
SELECT 
    auth.uid(),
    'Admin',
    'User',
    'admin',
    'active'
WHERE 
    NOT EXISTS (
        SELECT 1 FROM profiles WHERE role = 'admin'
    )
    AND 
    auth.uid() IS NOT NULL;
