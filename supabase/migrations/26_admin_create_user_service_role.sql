-- Create admin_create_user function using service_role API
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

    -- Call Supabase's service_role API to create user
    WITH new_auth_user AS (
        SELECT data->>'id' as user_id
        FROM http((
            'POST',
            current_setting('app.settings.service_role_url') || '/auth/v1/admin/users',
            ARRAY[http_header('apikey', current_setting('app.settings.service_role_key'))],
            'application/json',
            json_build_object(
                'email', user_email,
                'password', user_password,
                'email_confirm', true,
                'user_metadata', json_build_object(
                    'first_name', user_first_name,
                    'last_name', user_last_name
                )
            )::text
        )::http_request)
    )
    SELECT user_id::uuid INTO new_user_id FROM new_auth_user;

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

-- Create extension for making HTTP requests if it doesn't exist
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Set up service role settings
ALTER DATABASE postgres SET "app.settings.service_role_key" = current_setting('supabase_auth.jwt_secret');
ALTER DATABASE postgres SET "app.settings.service_role_url" = 'http://auth.local';
