-- Check all users and their roles
SELECT 
    au.id,
    au.email,
    p.role,
    p.first_name,
    p.last_name,
    p.status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;
