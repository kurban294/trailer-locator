-- Create admin_create_user function
CREATE OR REPLACE FUNCTION admin_create_user(
    user_email text,
    user_password text,
    user_first_name text,
    user_last_name text,
    user_role user_role,
    user_status user_status
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_user_id uuid;
    result json;
BEGIN
    -- Check if caller is admin
    IF NOT is_admin_from_view(auth.uid()) THEN
        RAISE EXCEPTION 'Only administrators can create new users';
    END IF;

    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();

    -- Insert into auth.users using raw SQL
    EXECUTE format(
        'INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_user_meta_data
        ) VALUES (
            %L,
            %L,
            %L,
            %L,
            %L,
            %L,
            %L,
            %L,
            %L,
            %L
        )',
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        user_email,
        crypt(user_password, gen_salt('bf')),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        json_build_object(
            'first_name', user_first_name,
            'last_name', user_last_name
        )::text
    );

    -- Create profile
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
        user_first_name,
        user_last_name,
        user_role,
        user_status,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Return the created user info
    SELECT json_build_object(
        'id', new_user_id,
        'email', user_email,
        'first_name', user_first_name,
        'last_name', user_last_name,
        'role', user_role,
        'status', user_status
    ) INTO result;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_create_user(text, text, text, text, user_role, user_status) TO authenticated;

-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;
