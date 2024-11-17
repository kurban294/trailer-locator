-- Check if the profile exists and has the correct role
SELECT 
    au.id,
    au.email,
    p.role,
    p.status,
    p.first_name,
    p.last_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'kurban294@gmail.com';

-- If the profile doesn't exist or needs to be updated, run this:
INSERT INTO profiles (id, role, status)
SELECT 
    id,
    'admin',
    'active'
FROM auth.users 
WHERE email = 'kurban294@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET role = 'admin', status = 'active';
