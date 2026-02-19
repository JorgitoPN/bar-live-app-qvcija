
# Documentación Técnica: Sistema de Verificación de Cuenta con Token

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE VERIFICACIÓN                     │
└─────────────────────────────────────────────────────────────┘

1. REGISTRO
   ├─ Usuario completa formulario
   ├─ Se crea cuenta en auth.users
   ├─ Se llama a request-verification-token
   └─ Usuario redirigido a verificar-cuenta-token

2. ENVÍO DE TOKEN
   ├─ Edge Function genera token de 6 dígitos
   ├─ Token guardado en verification_tokens
   ├─ Email enviado vía Resend
   └─ Token expira en 1 hora

3. VALIDACIÓN
   ├─ Usuario introduce token en app
   ├─ Se llama a validate-verification-token
   ├─ Se verifica token en BD
   └─ Se retorna resultado

4. VERIFICACIÓN
   ├─ Se llama a verify-account-with-token
   ├─ Se actualiza email_confirmed_at en auth.users
   ├─ Se actualiza email_verified en usuarios
   ├─ Token marcado como usado
   └─ Usuario puede iniciar sesión
```

## 🗄️ Esquema de Base de Datos

### Tabla: verification_tokens

```sql
CREATE TABLE verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  ip_address text,
  user_agent text
);
```

**Índices:**
```sql
CREATE INDEX idx_verification_tokens_email_token 
  ON verification_tokens(email, token) 
  WHERE used = false;

CREATE INDEX idx_verification_tokens_expires_at 
  ON verification_tokens(expires_at) 
  WHERE used = false;
```

**RLS Policies:**
```sql
-- Usuarios pueden ver sus propios tokens
CREATE POLICY "Users can view their own verification tokens"
  ON verification_tokens FOR SELECT USING (true);

-- Service role puede gestionar todos los tokens
CREATE POLICY "Service role can manage verification tokens"
  ON verification_tokens FOR ALL USING (true);
```

## 🔧 Edge Functions

### 1. request-verification-token

**Endpoint:** `POST /functions/v1/request-verification-token`

**Autenticación:** No requerida (público)

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Response Success (200):**
```json
{
  "success": true
}
```

**Response Error (404):**
```json
{
  "error": "Usuario no encontrado"
}
```

**Response Error (400):**
```json
{
  "error": "El email ya está verificado"
}
```

**Lógica:**
1. Valida que el email esté presente
2. Normaliza el email (lowercase, trim)
3. Busca el usuario en auth.users
4. Verifica que el email no esté ya confirmado
5. Genera token aleatorio de 6 dígitos
6. Guarda token en BD con expiración de 1 hora
7. Envía email con token vía Resend
8. Retorna éxito

**Variables de Entorno Requeridas:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

### 2. validate-verification-token

**Endpoint:** `POST /functions/v1/validate-verification-token`

**Autenticación:** No requerida (público)

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "123456"
}
```

**Response Success (200):**
```json
{
  "valid": true
}
```

**Response Error (200):**
```json
{
  "valid": false,
  "error": "Token inválido o no encontrado"
}
```

**Lógica:**
1. Valida email y token
2. Busca token en BD (email + token + no usado)
3. Verifica que no haya expirado
4. Retorna validez

### 3. verify-account-with-token

**Endpoint:** `POST /functions/v1/verify-account-with-token`

**Autenticación:** No requerida (público)

**Request Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "123456"
}
```

**Response Success (200):**
```json
{
  "success": true
}
```

**Response Error (200):**
```json
{
  "success": false,
  "error": "Token inválido o expirado"
}
```

**Lógica:**
1. Valida token (igual que validate-verification-token)
2. Busca usuario en auth.users
3. Actualiza email_confirmed_at usando Admin API
4. Actualiza email_verified en tabla usuarios
5. Marca token como usado
6. Retorna éxito

## 📧 Configuración de Email

### Resend Configuration

**API Key:** Configurada en Supabase Edge Functions Secrets
- Variable: `RESEND_API_KEY`
- Formato: `re_xxxxxxxxxxxxx`

**Dominio verificado:** barliveapp.es

**Remitente:** BarLive <noreply@barliveapp.es>

### Plantilla de Email

**Características:**
- HTML responsive
- Gradiente de marca (#14b8a6 → #06b6d4)
- Código en fuente monoespaciada grande
- Instrucciones paso a paso
- Notas de seguridad
- Enlaces a soporte

**Personalización:**
- Token dinámico de 6 dígitos
- Año actual en footer
- Enlaces a términos y privacidad

## 🔍 Monitoreo y Debugging

### Consultas SQL Útiles

**Ver tokens recientes:**
```sql
SELECT 
  email,
  token,
  used,
  expires_at,
  created_at,
  used_at
FROM verification_tokens
ORDER BY created_at DESC
LIMIT 20;
```

**Tokens activos (no usados, no expirados):**
```sql
SELECT 
  email,
  token,
  expires_at,
  created_at
FROM verification_tokens
WHERE used = false 
  AND expires_at > NOW()
ORDER BY created_at DESC;
```

**Usuarios no verificados:**
```sql
SELECT 
  id,
  email,
  nombre,
  email_verified,
  fecha_registro
FROM usuarios
WHERE email_verified = false
ORDER BY fecha_registro DESC;
```

**Tasa de verificación:**
```sql
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(*) FILTER (WHERE email_verified = true) as verificados,
  COUNT(*) FILTER (WHERE email_verified = false) as no_verificados,
  ROUND(
    COUNT(*) FILTER (WHERE email_verified = true) * 100.0 / COUNT(*),
    2
  ) as tasa_verificacion_porcentaje
FROM usuarios;
```

**Tokens por día:**
```sql
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as tokens_generados,
  COUNT(*) FILTER (WHERE used = true) as tokens_usados,
  COUNT(*) FILTER (WHERE used = false AND expires_at > NOW()) as tokens_activos,
  COUNT(*) FILTER (WHERE used = false AND expires_at <= NOW()) as tokens_expirados
FROM verification_tokens
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

### Logs de Edge Functions

**Ver logs en Supabase Dashboard:**
1. Ve a Edge Functions
2. Selecciona la función
3. Ve a la pestaña "Logs"

**Buscar errores:**
```
[RequestVerificationToken] ❌
[ValidateVerificationToken] ❌
[VerifyAccountWithToken] ❌
```

**Buscar éxitos:**
```
[RequestVerificationToken] ✅
[ValidateVerificationToken] ✅
[VerifyAccountWithToken] ✅
```

## 🛠️ Tareas de Administración

### Verificar manualmente un usuario

```sql
-- 1. Actualizar auth.users (requiere Admin API)
-- Esto debe hacerse desde Supabase Dashboard o usando Admin API

-- 2. Actualizar tabla usuarios
UPDATE usuarios
SET email_verified = true
WHERE email = 'usuario@ejemplo.com';
```

### Invalidar todos los tokens de un usuario

```sql
UPDATE verification_tokens
SET used = true,
    used_at = NOW()
WHERE email = 'usuario@ejemplo.com'
  AND used = false;
```

### Limpiar tokens expirados

```sql
-- Ver cuántos tokens expirados hay
SELECT COUNT(*) 
FROM verification_tokens
WHERE used = false 
  AND expires_at < NOW();

-- Eliminar tokens expirados (más de 7 días)
DELETE FROM verification_tokens
WHERE expires_at < NOW() - INTERVAL '7 days';
```

### Reenviar código manualmente

Si un usuario reporta que no recibió el código:

1. Verifica que el email sea correcto
2. Revisa los logs de la Edge Function
3. Comprueba que Resend esté funcionando
4. Solicita al usuario que revise spam
5. Si es necesario, genera un nuevo código desde la app

## 🚨 Troubleshooting

### Problema: Usuario no recibe correo

**Diagnóstico:**
1. Verificar logs de `request-verification-token`
2. Comprobar estado de Resend API
3. Verificar dominio verificado en Resend
4. Revisar RESEND_API_KEY en secrets

**Solución:**
```sql
-- Ver último intento de envío
SELECT * FROM verification_tokens
WHERE email = 'usuario@ejemplo.com'
ORDER BY created_at DESC
LIMIT 1;
```

### Problema: Token inválido

**Diagnóstico:**
1. Verificar que el token existe en BD
2. Comprobar que no esté usado
3. Verificar que no haya expirado
4. Revisar que el email coincida

**Solución:**
```sql
-- Ver estado del token
SELECT 
  token,
  used,
  expires_at,
  expires_at > NOW() as es_valido,
  created_at
FROM verification_tokens
WHERE email = 'usuario@ejemplo.com'
  AND token = '123456';
```

### Problema: Error al verificar cuenta

**Diagnóstico:**
1. Revisar logs de `verify-account-with-token`
2. Verificar permisos de Service Role Key
3. Comprobar que el usuario existe en auth.users

**Solución:**
```sql
-- Verificar usuario en auth.users
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'usuario@ejemplo.com';

-- Verificar usuario en tabla usuarios
SELECT id, email, email_verified
FROM usuarios
WHERE email = 'usuario@ejemplo.com';
```

## 📊 Métricas Recomendadas

### KPIs a Monitorear

1. **Tasa de verificación:**
   - % de usuarios que verifican su cuenta
   - Tiempo promedio hasta verificación
   - Usuarios que nunca verifican

2. **Rendimiento de emails:**
   - Tasa de entrega
   - Tiempo de entrega
   - Tasa de apertura (si se implementa tracking)

3. **Uso de tokens:**
   - Tokens generados por día
   - Tokens usados vs expirados
   - Intentos de reenvío

4. **Errores:**
   - Fallos de envío de email
   - Tokens inválidos
   - Errores de verificación

### Dashboard SQL

```sql
-- Resumen completo
SELECT 
  'Total Usuarios' as metrica,
  COUNT(*)::text as valor
FROM usuarios
UNION ALL
SELECT 
  'Usuarios Verificados',
  COUNT(*)::text
FROM usuarios
WHERE email_verified = true
UNION ALL
SELECT 
  'Usuarios No Verificados',
  COUNT(*)::text
FROM usuarios
WHERE email_verified = false
UNION ALL
SELECT 
  'Tokens Generados (últimos 7 días)',
  COUNT(*)::text
FROM verification_tokens
WHERE created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'Tokens Usados (últimos 7 días)',
  COUNT(*)::text
FROM verification_tokens
WHERE used = true
  AND created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'Tasa de Verificación',
  ROUND(
    COUNT(*) FILTER (WHERE email_verified = true) * 100.0 / NULLIF(COUNT(*), 0),
    2
  )::text || '%'
FROM usuarios;
```

## 🔐 Seguridad

### Medidas Implementadas

1. **Tokens de un solo uso**
   - Marcados como `used = true` después de verificación
   - No se pueden reutilizar

2. **Expiración temporal**
   - 1 hora de validez
   - Limpia automáticamente tokens antiguos

3. **Validación en servidor**
   - Toda la lógica crítica en Edge Functions
   - No se confía en el cliente

4. **Rate limiting** (recomendado implementar)
   - Limitar solicitudes por IP
   - Limitar solicitudes por email
   - Prevenir abuso

5. **Auditoría**
   - Campos para IP y User Agent
   - Timestamps de todas las operaciones
   - Logs detallados

### Recomendaciones de Seguridad

1. **Implementar rate limiting:**
```sql
-- Crear tabla para tracking de rate limiting
CREATE TABLE verification_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempts integer DEFAULT 1,
  window_start timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);
```

2. **Monitorear patrones sospechosos:**
- Múltiples solicitudes del mismo email
- Múltiples solicitudes de la misma IP
- Intentos de fuerza bruta

3. **Alertas automáticas:**
- Email cuando se detecta actividad sospechosa
- Notificación a admins de intentos fallidos repetidos

## 🔄 Mantenimiento

### Tareas Diarias
- Revisar logs de Edge Functions
- Monitorear tasa de entrega de emails
- Verificar que Resend esté funcionando

### Tareas Semanales
- Limpiar tokens expirados (>7 días)
- Revisar métricas de verificación
- Analizar usuarios no verificados

### Tareas Mensuales
- Revisar y optimizar plantilla de email
- Actualizar documentación si hay cambios
- Analizar tendencias de verificación

### Script de Limpieza Automática

```sql
-- Crear función para limpiar tokens antiguos
CREATE OR REPLACE FUNCTION cleanup_old_verification_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Programar ejecución diaria (requiere pg_cron extension)
-- SELECT cron.schedule(
--   'cleanup-verification-tokens',
--   '0 2 * * *', -- 2 AM diario
--   'SELECT cleanup_old_verification_tokens();'
-- );
```

## 🧪 Testing

### Test Manual

1. **Registro y verificación completa:**
```bash
# 1. Registrar usuario
# 2. Verificar que se recibe email
# 3. Copiar código de 6 dígitos
# 4. Introducir código en app
# 5. Verificar que cuenta queda verificada
```

2. **Token expirado:**
```sql
-- Forzar expiración de token para testing
UPDATE verification_tokens
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE email = 'test@ejemplo.com'
  AND used = false;
```

3. **Token ya usado:**
```sql
-- Marcar token como usado para testing
UPDATE verification_tokens
SET used = true,
    used_at = NOW()
WHERE email = 'test@ejemplo.com'
  AND token = '123456';
```

### Test Automatizado (Recomendado)

```typescript
// Ejemplo de test con Jest
describe('Verification Token System', () => {
  it('should generate and send verification token', async () => {
    const response = await fetch('/functions/v1/request-verification-token', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ejemplo.com' })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should validate correct token', async () => {
    // ... test implementation
  });

  it('should reject expired token', async () => {
    // ... test implementation
  });
});
```

## 📈 Optimizaciones

### Performance

1. **Índices de BD:**
   - Ya implementados para búsquedas rápidas
   - Índices parciales (WHERE used = false)

2. **Caché de templates:**
   - Considerar cachear plantilla de email
   - Reducir tiempo de generación

3. **Batch processing:**
   - Si hay muchos usuarios, procesar en lotes
   - Queue de emails para evitar rate limits

### Escalabilidad

1. **Horizontal scaling:**
   - Edge Functions escalan automáticamente
   - Sin estado, fácil de escalar

2. **Database optimization:**
   - Particionamiento de tabla si crece mucho
   - Archivado de tokens antiguos

3. **Email delivery:**
   - Resend maneja el escalado
   - Considerar backup provider

## 🔧 Configuración de Producción

### Variables de Entorno

```bash
# Supabase
SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend
RESEND_API_KEY=re_...
```

### Verificación de Configuración

```bash
# 1. Verificar que las Edge Functions estén desplegadas
supabase functions list

# 2. Verificar que las variables estén configuradas
# En Supabase Dashboard → Project Settings → Edge Functions → Secrets

# 3. Verificar que el dominio esté verificado en Resend
# En Resend Dashboard → Domains → barliveapp.es
```

## 📞 Soporte

### Para Usuarios
- Email: soporte@barliveapp.es
- Tiempo de respuesta: 24-48 horas

### Para Desarrolladores
- Revisar logs en Supabase Dashboard
- Consultar esta documentación
- Revisar código fuente en GitHub

### Escalación
1. Nivel 1: Soporte básico (email)
2. Nivel 2: Soporte técnico (desarrolladores)
3. Nivel 3: Administradores de sistema

## 📚 Referencias

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Resend Documentation](https://resend.com/docs)
- [Edge Functions Documentation](https://supabase.com/docs/guides/functions)

---

**Última actualización:** Enero 2025
**Versión:** 1.0
**Autor:** Sistema BarLive
