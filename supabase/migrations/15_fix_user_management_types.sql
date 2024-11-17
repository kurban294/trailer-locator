-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_users_with_profiles();

-- Create the function with the correct types
CREATE OR REPLACE FUNCTION get_users_with_profiles()
RETURNS TABLE (
    id uuid,
    email varchar(255),  -- Changed from text to varchar(255) to match auth.users
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
        u.email::varchar(255),  -- Explicit cast to ensure type matching
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
