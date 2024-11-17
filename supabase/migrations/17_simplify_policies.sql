-- First, disable RLS temporarily to avoid recursion during setup
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies and functions
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP FUNCTION IF EXISTS is_admin(uuid);
DROP FUNCTION IF EXISTS get_users_with_profiles();

-- Create a materialized view for admin users that we'll refresh periodically
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT id
FROM profiles
WHERE role = 'admin'::user_role;

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_id_idx ON admin_users(id);

-- Function to refresh admin users view
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_users;
END;
$$;

-- Function to check if user is admin using the materialized view
CREATE OR REPLACE FUNCTION is_admin_from_view(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id
  );
$$;

-- Create the users view function
CREATE OR REPLACE FUNCTION get_users_with_profiles()
RETURNS TABLE (
    id uuid,
    email varchar(255),
    role user_role,
    status user_status,
    first_name text,
    last_name text,
    created_at timestamptz,
    updated_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF is_admin_from_view(auth.uid()) THEN
        RETURN QUERY
        SELECT 
            p.id,
            u.email::varchar(255),
            p.role,
            p.status,
            p.first_name,
            p.last_name,
            p.created_at,
            p.updated_at
        FROM profiles p
        JOIN auth.users u ON u.id = p.id;
    ELSE
        RETURN QUERY
        SELECT 
            p.id,
            u.email::varchar(255),
            p.role,
            p.status,
            p.first_name,
            p.last_name,
            p.created_at,
            p.updated_at
        FROM profiles p
        JOIN auth.users u ON u.id = p.id
        WHERE p.id = auth.uid();
    END IF;
END;
$$;

-- Create a function to update profiles
CREATE OR REPLACE FUNCTION update_profile(
    target_user_id uuid,
    new_first_name text,
    new_last_name text,
    new_role user_role,
    new_status user_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() = target_user_id OR is_admin_from_view(auth.uid()) THEN
        UPDATE profiles
        SET 
            first_name = new_first_name,
            last_name = new_last_name,
            role = new_role,
            status = new_status,
            updated_at = now()
        WHERE id = target_user_id;
        
        -- Refresh admin users view if role changed
        PERFORM refresh_admin_users();
    ELSE
        RAISE EXCEPTION 'Not authorized';
    END IF;
END;
$$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "Users can view own or all profiles if admin"
ON profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = id OR is_admin_from_view(auth.uid())
);

-- No direct update policy - all updates go through the function
CREATE POLICY "No direct updates"
ON profiles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_users_with_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile(uuid, text, text, user_role, user_status) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_from_view(uuid) TO authenticated;

-- Initial refresh of admin users
SELECT refresh_admin_users();
