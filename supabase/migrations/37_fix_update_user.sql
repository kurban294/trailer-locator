-- Drop and recreate the update_user function
DROP FUNCTION IF EXISTS update_user;

CREATE OR REPLACE FUNCTION update_user(
    user_id UUID,
    new_first_name TEXT,
    new_last_name TEXT,
    new_role user_role,
    new_status user_status
)
RETURNS SETOF user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Check if the user making the request is an admin (optimized)
    SELECT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'::user_role
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only administrators can update users';
    END IF;

    -- Update the user with a single query
    RETURN QUERY
    UPDATE profiles
    SET 
        first_name = new_first_name,
        last_name = new_last_name,
        role = new_role,
        status = new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id
    RETURNING *;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$;
