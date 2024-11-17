-- Update auth settings to allow all email domains
INSERT INTO auth.config (id, config)
VALUES (
  'default',
  jsonb_build_object(
    'mailer_autoconfirm', false,
    'smtp_admin_email', 'admin@example.com',
    'smtp_max_frequency', 60,
    'smtp_sender_name', 'Trailer Locator',
    'site_url', 'http://localhost:5173',
    'jwt_exp', 3600,
    'mailer_secure_email_change_enabled', true,
    'mailer_secure_password_reset_enabled', true,
    'external_email_enabled', true,
    'external_phone_enabled', false,
    'disable_signup', false,
    'enable_signup', true
  )
)
ON CONFLICT (id) DO UPDATE
SET config = EXCLUDED.config;

-- Enable all email domains by removing restrictions
UPDATE auth.config
SET config = config - 'allowed_email_domains'
WHERE id = 'default';

-- Ensure the SECURITY DEFINER function can still work with auth schema
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO postgres;
