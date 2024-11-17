-- Display current users and their roles
SELECT 
    au.id,
    au.email,
    p.role,
    p.status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id;

-- Make a user admin (replace YOUR_EMAIL with your email)
UPDATE profiles 
SET role = 'admin'
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'YOUR_EMAIL'
);

-- Verify the change
SELECT 
    au.id,
    au.email,
    p.role,
    p.status,
    p.first_name,
    p.last_name
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE p.role = 'admin';
