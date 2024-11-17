-- Function to create a new user and their profile
CREATE OR REPLACE FUNCTION create_new_user(
    new_email varchar(255),
    new_password text,
    new_first_name text,
    new_last_name text,
    new_role user_role,
    new_status user_status
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_user json;
BEGIN
    -- Check if caller is admin
    IF NOT is_admin_from_view(auth.uid()) THEN
        RAISE EXCEPTION 'Only administrators can create new users';
    END IF;

    -- Create the user in auth.users
    new_user := supabase_auth.create_user(
        json_build_object(
            'email', new_email,
            'password', new_password,
            'email_confirm', true
        )
    );

    -- Create the profile
    INSERT INTO profiles (
        id,
        first_name,
        last_name,
        role,
        status,
        created_at,
        updated_at
    ) VALUES (
        (new_user->>'id')::uuid,
        new_first_name,
        new_last_name,
        new_role,
        new_status,
        now(),
        now()
    );

    -- Refresh admin users view if new user is admin
    IF new_role = 'admin' THEN
        PERFORM refresh_admin_users();
    END IF;

    RETURN new_user;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_new_user(varchar(255), text, text, text, user_role, user_status) TO authenticated;
