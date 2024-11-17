-- Create a function to get all users with their profiles
CREATE OR REPLACE FUNCTION get_users_with_profiles()
RETURNS TABLE (
    id uuid,
    email text,
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
    RETURN QUERY
    SELECT 
        p.id,
        u.email,
        p.role,
        p.status,
        p.first_name,
        p.last_name,
        p.created_at,
        p.updated_at
    FROM profiles p
    JOIN auth.users u ON u.id = p.id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_profiles() TO authenticated;

-- Test the function
SELECT * FROM get_users_with_profiles();
