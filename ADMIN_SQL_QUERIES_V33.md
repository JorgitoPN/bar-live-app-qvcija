
# Queries SQL para Administradores - Fix v33
## Diagnóstico y Mantenimiento

## 🔍 Queries de Diagnóstico

### 1. Ver Estado de Todos los Usuarios de Google

```sql
SELECT 
  u.id,
  u.email,
  u.provider,
  u.password_hash,
  u.email_verified,
  u.created_at,
  CASE 
    WHEN au.encrypted_password IS NOT NULL AND au.encrypted_password != '' 
    THEN 'HAS_PASSWORD' 
    ELSE 'NO_PASSWORD' 
  END as auth_password_status,
  CASE
    WHEN u.provider = 'google' AND (u.password_hash IS NULL OR u.password_hash = '') 
    THEN 'NEEDS_PASSWORD_SETUP'
    WHEN u.provider = 'google' AND u.password_hash = 'SET'
    THEN 'PASSWORD_CONFIGURED'
    ELSE 'NORMAL_USER'
  END as user_status
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE u.provider = 'google'
ORDER BY u.created_at DESC;
```

---

### 2. Encontrar Usuarios con Inconsistencias

```sql
-- Usuarios que tienen contraseña en auth.users pero no está marcada en usuarios
SELECT 
  u.id,
  u.email,
  u.provider,
  u.password_hash as usuarios_password_hash,
  'HAS_PASSWORD_IN_AUTH' as auth_status,
  'INCONSISTENT' as status
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE au.encrypted_password IS NOT NULL 
  AND au.encrypted_password != ''
  AND (u.password_hash IS NULL OR u.password_hash = '');
```

---

### 3. Ver Usuarios que Configuraron Contraseña Recientemente

```sql
SELECT 
  u.id,
  u.email,
  u.provider,
  u.password_hash,
  u.updated_at,
  pt.created_at as token_created,
  pt.used_at as password_set_at
FROM usuarios u
LEFT JOIN password_tokens pt ON pt.email = u.email AND pt.used = true
WHERE u.provider = 'google'
  AND u.password_hash = 'SET'
ORDER BY u.updated_at DESC
LIMIT 20;
```

---

### 4. Ver Tokens de Contraseña Activos

```sql
SELECT 
  id,
  email,
  token,
  created_at,
  expires_at,
  used,
  used_at,
  CASE 
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN used = true THEN 'USED'
    ELSE 'ACTIVE'
  END as status
FROM password_tokens
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

### 5. Estadísticas de Usuarios por Tipo

```sql
SELECT 
  provider,
  COUNT(*) as total_users,
  COUNT(CASE WHEN password_hash = 'SET' THEN 1 END) as users_with_password,
  COUNT(CASE WHEN password_hash IS NULL OR password_hash = '' THEN 1 END) as users_without_password,
  COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users
FROM usuarios
GROUP BY provider
ORDER BY total_users DESC;
```

---

## 🔧 Queries de Mantenimiento

### 1. Corregir Usuario Específico con Inconsistencia

```sql
-- Actualizar un usuario específico que tiene contraseña pero no está marcada
UPDATE usuarios u
SET 
  password_hash = 'SET',
  email_verified = true,
  updated_at = NOW()
FROM auth.users au
WHERE u.id = au.id
  AND u.email = 'usuario@ejemplo.com'  -- ⚠️ CAMBIAR EMAIL
  AND au.encrypted_password IS NOT NULL
  AND au.encrypted_password != ''
  AND (u.password_hash IS NULL OR u.password_hash = '');

-- Verificar el cambio
SELECT 
  email,
  provider,
  password_hash,
  email_verified,
  updated_at
FROM usuarios
WHERE email = 'usuario@ejemplo.com';  -- ⚠️ CAMBIAR EMAIL
```

---

### 2. Corregir TODOS los Usuarios con Inconsistencias

```sql
-- ⚠️ CUIDADO: Esto afecta a múltiples usuarios
-- Ejecutar primero el SELECT para ver qué usuarios se afectarán

-- Ver usuarios que se actualizarán:
SELECT 
  u.email,
  u.provider,
  u.password_hash as current_password_hash
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE au.encrypted_password IS NOT NULL 
  AND au.encrypted_password != ''
  AND (u.password_hash IS NULL OR u.password_hash = '');

-- Si todo se ve bien, ejecutar el UPDATE:
UPDATE usuarios u
SET 
  password_hash = 'SET',
  email_verified = true,
  updated_at = NOW()
FROM auth.users au
WHERE u.id = au.id
  AND au.encrypted_password IS NOT NULL
  AND au.encrypted_password != ''
  AND (u.password_hash IS NULL OR u.password_hash = '');
```

---

### 3. Limpiar Tokens Expirados

```sql
-- Ver tokens que se eliminarán (más de 7 días)
SELECT 
  id,
  email,
  created_at,
  expires_at,
  used
FROM password_tokens
WHERE created_at < NOW() - INTERVAL '7 days';

-- Eliminar tokens antiguos
DELETE FROM password_tokens
WHERE created_at < NOW() - INTERVAL '7 days';
```

---

### 4. Resetear Estado de Usuario (Emergencia)

```sql
-- ⚠️ SOLO USAR EN EMERGENCIAS
-- Esto permite que un usuario de Google configure contraseña nuevamente

UPDATE usuarios
SET 
  password_hash = NULL,
  updated_at = NOW()
WHERE email = 'usuario@ejemplo.com'  -- ⚠️ CAMBIAR EMAIL
  AND provider = 'google';

-- Verificar el cambio
SELECT 
  email,
  provider,
  password_hash,
  email_verified
FROM usuarios
WHERE email = 'usuario@ejemplo.com';  -- ⚠️ CAMBIAR EMAIL
```

---

### 5. Verificar Función Helper

```sql
-- Probar la función has_auth_password
SELECT 
  u.email,
  u.provider,
  u.password_hash,
  has_auth_password(u.id) as has_password_in_auth
FROM usuarios u
WHERE u.provider = 'google'
LIMIT 10;
```

---

## 📊 Queries de Monitoreo

### 1. Actividad de Configuración de Contraseñas (Últimos 7 Días)

```sql
SELECT 
  DATE(pt.created_at) as date,
  COUNT(*) as tokens_created,
  COUNT(CASE WHEN pt.used = true THEN 1 END) as passwords_set,
  COUNT(CASE WHEN pt.expires_at < NOW() AND pt.used = false THEN 1 END) as expired_unused
FROM password_tokens pt
WHERE pt.created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(pt.created_at)
ORDER BY date DESC;
```

---

### 2. Usuarios de Google por Estado

```sql
SELECT 
  CASE
    WHEN password_hash = 'SET' THEN 'Con contraseña configurada'
    WHEN password_hash IS NULL OR password_hash = '' THEN 'Sin contraseña'
    ELSE 'Otro estado'
  END as estado,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentaje
FROM usuarios
WHERE provider = 'google'
GROUP BY 
  CASE
    WHEN password_hash = 'SET' THEN 'Con contraseña configurada'
    WHEN password_hash IS NULL OR password_hash = '' THEN 'Sin contraseña'
    ELSE 'Otro estado'
  END;
```

---

### 3. Tasa de Éxito de Configuración de Contraseñas

```sql
SELECT 
  COUNT(*) as total_tokens_enviados,
  COUNT(CASE WHEN used = true THEN 1 END) as contraseñas_configuradas,
  COUNT(CASE WHEN expires_at < NOW() AND used = false THEN 1 END) as tokens_expirados,
  ROUND(
    COUNT(CASE WHEN used = true THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  ) as tasa_exito_porcentaje
FROM password_tokens
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

### 4. Usuarios con Múltiples Intentos de Configuración

```sql
SELECT 
  pt.email,
  COUNT(*) as intentos,
  MAX(pt.created_at) as ultimo_intento,
  COUNT(CASE WHEN pt.used = true THEN 1 END) as exitosos,
  u.password_hash
FROM password_tokens pt
LEFT JOIN usuarios u ON u.email = pt.email
WHERE pt.created_at > NOW() - INTERVAL '30 days'
GROUP BY pt.email, u.password_hash
HAVING COUNT(*) > 1
ORDER BY intentos DESC;
```

---

## 🚨 Queries de Alerta

### 1. Detectar Usuarios Bloqueados por Múltiples Intentos Fallidos

```sql
-- Usuarios con más de 5 tokens en las últimas 24 horas
SELECT 
  email,
  COUNT(*) as intentos_24h,
  MAX(created_at) as ultimo_intento
FROM password_tokens
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY email
HAVING COUNT(*) > 5
ORDER BY intentos_24h DESC;
```

---

### 2. Detectar Tokens Sospechosos

```sql
-- Tokens creados pero nunca usados (más de 3 días)
SELECT 
  id,
  email,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as horas_desde_creacion
FROM password_tokens
WHERE used = false
  AND created_at < NOW() - INTERVAL '3 days'
  AND expires_at > NOW()
ORDER BY created_at ASC;
```

---

### 3. Verificar Integridad de Datos

```sql
-- Usuarios en auth.users que no están en usuarios
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN usuarios u ON u.id = au.id
WHERE u.id IS NULL;

-- Usuarios en usuarios que no están en auth.users
SELECT 
  u.id,
  u.email,
  u.created_at
FROM usuarios u
LEFT JOIN auth.users au ON au.id = u.id
WHERE au.id IS NULL;
```

---

## 📝 Notas Importantes

### ⚠️ Precauciones al Ejecutar Queries

1. **Siempre hacer backup antes de UPDATE/DELETE masivos**
2. **Ejecutar SELECT primero para ver qué se afectará**
3. **Usar transacciones para cambios críticos:**
   ```sql
   BEGIN;
   -- Tu query aquí
   -- Verificar resultados
   COMMIT; -- o ROLLBACK si algo salió mal
   ```

### 🔒 Permisos Requeridos

- Lectura: Cualquier usuario con acceso a la base de datos
- Escritura: Solo administradores con permisos de UPDATE/DELETE
- Funciones: Requiere permisos EXECUTE

### 📅 Mantenimiento Recomendado

- **Diario:** Verificar queries de monitoreo
- **Semanal:** Limpiar tokens expirados
- **Mensual:** Revisar estadísticas y tasas de éxito
- **Trimestral:** Auditoría completa de integridad de datos

---

## 🎯 Casos de Uso Comunes

### Usuario Reporta: "Sigue pidiendo configurar contraseña"

```sql
-- 1. Verificar estado del usuario
SELECT 
  u.email,
  u.provider,
  u.password_hash,
  CASE 
    WHEN au.encrypted_password IS NOT NULL AND au.encrypted_password != '' 
    THEN 'HAS_PASSWORD' 
    ELSE 'NO_PASSWORD' 
  END as auth_status
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'usuario@ejemplo.com';

-- 2. Si tiene contraseña en auth pero no en usuarios, corregir:
UPDATE usuarios u
SET password_hash = 'SET', email_verified = true
FROM auth.users au
WHERE u.id = au.id
  AND u.email = 'usuario@ejemplo.com'
  AND au.encrypted_password IS NOT NULL;
```

### Usuario Reporta: "No puedo configurar contraseña"

```sql
-- 1. Ver tokens recientes del usuario
SELECT 
  id,
  email,
  token,
  created_at,
  expires_at,
  used,
  CASE 
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN used = true THEN 'USED'
    ELSE 'ACTIVE'
  END as status
FROM password_tokens
WHERE email = 'usuario@ejemplo.com'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Si hay tokens expirados, el usuario puede solicitar uno nuevo
-- No se requiere acción del admin
```

### Auditoría: "¿Cuántos usuarios han configurado contraseña?"

```sql
SELECT 
  'Total usuarios Google' as metrica,
  COUNT(*) as valor
FROM usuarios
WHERE provider = 'google'

UNION ALL

SELECT 
  'Con contraseña configurada' as metrica,
  COUNT(*) as valor
FROM usuarios
WHERE provider = 'google' AND password_hash = 'SET'

UNION ALL

SELECT 
  'Sin contraseña' as metrica,
  COUNT(*) as valor
FROM usuarios
WHERE provider = 'google' AND (password_hash IS NULL OR password_hash = '');
```

---

## ✅ Verificación Post-Fix

Después de aplicar el fix, ejecutar estas queries para confirmar:

```sql
-- 1. Verificar que la migración se aplicó
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc 
  WHERE proname = 'has_auth_password'
) as funcion_existe;

-- 2. Verificar que no hay inconsistencias
SELECT COUNT(*) as usuarios_inconsistentes
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE au.encrypted_password IS NOT NULL 
  AND au.encrypted_password != ''
  AND (u.password_hash IS NULL OR u.password_hash = '');

-- 3. Verificar estadísticas generales
SELECT 
  provider,
  COUNT(*) as total,
  COUNT(CASE WHEN password_hash = 'SET' THEN 1 END) as con_password
FROM usuarios
GROUP BY provider;
```

**Resultados Esperados:**
- `funcion_existe`: true
- `usuarios_inconsistentes`: 0
- Estadísticas coherentes con la base de usuarios
