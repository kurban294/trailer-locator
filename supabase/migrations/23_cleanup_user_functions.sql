-- Drop the unused functions
DROP FUNCTION IF EXISTS create_new_user(varchar(255), text, text, text, user_role, user_status);

-- Keep only the necessary profile-related functions and policies
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
    -- Check if caller is admin
    IF NOT is_admin_from_view(auth.uid()) THEN
        RAISE EXCEPTION 'Only administrators can update user profiles';
    END IF;

    -- Update the profile
    UPDATE profiles
    SET
        first_name = new_first_name,
        last_name = new_last_name,
        role = new_role,
        status = new_status,
        updated_at = now()
    WHERE id = target_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_profile(uuid, text, text, user_role, user_status) TO authenticated;
