-- Drop and recreate the profiles table
DROP TABLE IF EXISTS profiles;

-- Recreate the table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    role user_role DEFAULT 'user'::user_role,
    status user_status DEFAULT 'active'::user_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
