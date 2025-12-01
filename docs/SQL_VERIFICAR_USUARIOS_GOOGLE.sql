
-- Script para verificar el estado de usuarios de Google
-- Ejecutar en Supabase SQL Editor

-- 1. Ver todos los usuarios de Google
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data->>'name' as nombre,
  raw_user_meta_data->>'iss' as provider
FROM auth.users 
WHERE raw_user_meta_data->>'iss' = 'https://accounts.google.com'
ORDER BY created_at DESC;

-- 2. Verificar si tienen contraseña configurada
-- (Si encrypted_password es NULL o vacío, no tienen contraseña)
SELECT 
  email,
  CASE 
    WHEN encrypted_password IS NULL THEN 'Sin contraseña'
    WHEN encrypted_password = '' THEN 'Sin contraseña'
    ELSE 'Con contraseña'
  END as estado_password,
  email_confirmed_at IS NOT NULL as email_verificado
FROM auth.users 
WHERE raw_user_meta_data->>'iss' = 'https://accounts.google.com'
ORDER BY email;

-- 3. Ver intentos recientes de envío de correos
SELECT 
  email,
  confirmation_sent_at,
  recovery_sent_at,
  email_change_sent_at
FROM auth.users 
WHERE raw_user_meta_data->>'iss' = 'https://accounts.google.com'
ORDER BY email;

-- 4. Verificar el usuario específico (Jorge)
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmation_sent_at,
  recovery_sent_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'jorgepereznoyagh@gmail.com';

-- 5. Ver todos los usuarios de Google con sus datos completos
SELECT 
  email,
  raw_user_meta_data->>'name' as nombre,
  email_confirmed_at as fecha_verificacion,
  created_at as fecha_creacion,
  last_sign_in_at as ultimo_inicio_sesion,
  CASE 
    WHEN encrypted_password IS NULL OR encrypted_password = '' THEN '❌ Sin contraseña'
    ELSE '✅ Con contraseña'
  END as estado
FROM auth.users 
WHERE raw_user_meta_data->>'iss' = 'https://accounts.google.com'
ORDER BY created_at DESC;

-- 6. Contar usuarios por estado
SELECT 
  COUNT(*) as total_usuarios_google,
  COUNT(CASE WHEN encrypted_password IS NULL OR encrypted_password = '' THEN 1 END) as sin_password,
  COUNT(CASE WHEN encrypted_password IS NOT NULL AND encrypted_password != '' THEN 1 END) as con_password,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as email_verificado
FROM auth.users 
WHERE raw_user_meta_data->>'iss' = 'https://accounts.google.com';

-- 7. Ver usuarios de Google que han intentado recuperar contraseña
SELECT 
  email,
  recovery_sent_at,
  recovery_sent_at > NOW() - INTERVAL '24 hours' as correo_reciente
FROM auth.users 
WHERE raw_user_meta_data->>'iss' = 'https://accounts.google.com'
  AND recovery_sent_at IS NOT NULL
ORDER BY recovery_sent_at DESC;

-- 8. OPCIONAL: Enviar correo de recuperación manualmente (desde Supabase Dashboard)
-- NO ejecutar este query, solo para referencia
-- Para enviar correo manualmente:
-- 1. Ve a Authentication → Users
-- 2. Busca el usuario por email
-- 3. Haz clic en el usuario
-- 4. Haz clic en "Send password recovery"

-- 9. Ver logs de autenticación recientes (últimas 24 horas)
-- Este query solo funciona si tienes acceso a la tabla de logs
-- SELECT * FROM auth.audit_log_entries 
-- WHERE created_at > NOW() - INTERVAL '24 hours'
-- ORDER BY created_at DESC;

-- 10. Verificar configuración de email en Supabase
-- Esto se hace desde el Dashboard, no con SQL:
-- Authentication → Email → Verificar que esté habilitado
-- Authentication → Email Templates → Verificar plantillas
