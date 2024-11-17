-- Create function to update user
CREATE OR REPLACE FUNCTION update_user(
    user_id UUID,
    new_first_name TEXT,
    new_last_name TEXT,
    new_role user_role,
    new_status user_status
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_user user_profiles;
BEGIN
    -- Check if the user making the request is an admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only administrators can update users';
    END IF;

    -- Update the user
    UPDATE profiles
    SET 
        first_name = new_first_name,
        last_name = new_last_name,
        role = new_role,
        status = new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id
    RETURNING 
        id,
        first_name,
        last_name,
        role,
        status,
        created_at,
        updated_at
    INTO updated_user;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    RETURN updated_user;
END;
$$;
