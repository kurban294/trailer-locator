-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create a function to check if a user is an admin without using RLS
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id 
    AND role = 'admin'::user_role
  );
$$;

-- Create new policies that avoid recursion
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);

CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
);

CREATE POLICY "Admins can update all profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
);

-- Update the get_users_with_profiles function to use is_admin
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
    IF is_admin(auth.uid()) THEN
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_with_profiles() TO authenticated;
