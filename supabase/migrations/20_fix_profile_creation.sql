-- Drop the old function
DROP FUNCTION IF EXISTS create_new_user(varchar(255), text, text, text, user_role, user_status);

-- Create the function with profile upsert
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
    new_user_id uuid;
BEGIN
    -- Check if caller is admin
    IF NOT is_admin_from_view(auth.uid()) THEN
        RAISE EXCEPTION 'Only administrators can create new users';
    END IF;

    -- Check if user already exists
    SELECT id::uuid, raw_user_meta_data
    INTO new_user_id, new_user
    FROM auth.users
    WHERE email = new_email;

    -- If user doesn't exist, create them
    IF new_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            new_email,
            crypt(new_password, gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            json_build_object('first_name', new_first_name, 'last_name', new_last_name),
            now(),
            now(),
            encode(gen_random_bytes(32), 'base64'),
            null,
            null,
            null
        ) RETURNING id::uuid, raw_user_meta_data INTO new_user_id, new_user;
    ELSE
        RAISE EXCEPTION 'User with email % already exists', new_email;
    END IF;

    -- Create or update the profile
    INSERT INTO profiles (
        id,
        first_name,
        last_name,
        role,
        status,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        new_first_name,
        new_last_name,
        new_role,
        new_status,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = now();

    -- Refresh admin users view if new user is admin
    IF new_role = 'admin' THEN
        PERFORM refresh_admin_users();
    END IF;

    RETURN json_build_object(
        'id', new_user_id,
        'email', new_email,
        'first_name', new_first_name,
        'last_name', new_last_name,
        'role', new_role,
        'status', new_status
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_new_user(varchar(255), text, text, text, user_role, user_status) TO authenticated;
