
# 🔄 Checklist de Migración: V5 → V6

## 📋 Resumen de Cambios

El Sistema de Autenticación V6.0 introduce mejoras significativas en diseño, UX y seguridad. Esta guía te ayudará a migrar de V5 a V6 sin problemas.

## ⚠️ Cambios Importantes

### 1. Rutas Actualizadas

| V5 | V6 | Estado |
|----|----|----|
| `/auth/login-v5` | `/auth/login-v6` | ✅ Actualizado |
| `/auth/registro-v5` | `/auth/registro-v6` | ✅ Actualizado |
| `/auth/recuperar-password-v5` | `/auth/recuperar-password-v6` | ✅ Actualizado |
| N/A | `/auth/verificar-email-v6` | 🆕 Nuevo |

### 2. Base de Datos

**Nueva Tabla:**
- `password_tokens` - Almacena tokens de recuperación

**Cambios en Tablas Existentes:**
- Ninguno (100% compatible con V5)

### 3. Edge Functions

**Actualizadas:**
- `request-password-token` - Lógica mejorada
- `validate-password-token` - Validación más robusta
- `update-password-with-token` - Auto-login añadido

## 📝 Checklist de Migración

### Fase 1: Preparación (30 min)

- [ ] **Backup de Base de Datos**
  ```bash
  pg_dump -h db.embntaqwlwmgazvrglaf.supabase.co -U postgres -d postgres > backup_pre_v6.sql
  ```

- [ ] **Revisar Documentación**
  - [ ] Leer `AUTH_V6_SYSTEM_COMPLETE.md`
  - [ ] Leer `SETUP_AUTH_V6_QUICK_GUIDE.md`

- [ ] **Verificar Requisitos**
  - [ ] Supabase CLI instalado
  - [ ] Acceso a Supabase Dashboard
  - [ ] Acceso a Resend Dashboard
  - [ ] Node.js y npm actualizados

### Fase 2: Base de Datos (15 min)

- [ ] **Crear Tabla `password_tokens`**
  ```sql
  -- Ejecutar en Supabase SQL Editor
  CREATE TABLE IF NOT EXISTS public.password_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
  );
  ```

- [ ] **Crear Índices**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_password_tokens_email ON public.password_tokens(email);
  CREATE INDEX IF NOT EXISTS idx_password_tokens_token ON public.password_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_password_tokens_expires_at ON public.password_tokens(expires_at);
  CREATE INDEX IF NOT EXISTS idx_password_tokens_used ON public.password_tokens(used);
  ```

- [ ] **Habilitar RLS**
  ```sql
  ALTER TABLE public.password_tokens ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Service role can manage password tokens"
    ON public.password_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  ```

- [ ] **Verificar Creación**
  ```sql
  SELECT * FROM password_tokens LIMIT 1;
  ```

### Fase 3: Edge Functions (20 min)

- [ ] **Verificar Edge Functions Existentes**
  ```bash
  supabase functions list
  ```

- [ ] **Las funciones ya están actualizadas en el código**
  - `request-password-token`
  - `validate-password-token`
  - `update-password-with-token`

- [ ] **Verificar Secrets**
  ```bash
  supabase secrets list
  ```

- [ ] **Configurar RESEND_API_KEY si no existe**
  ```bash
  supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
  ```

### Fase 4: Configuración de Email (15 min)

- [ ] **Verificar Dominio en Resend**
  - [ ] Ir a Resend Dashboard → Domains
  - [ ] Verificar que `barliveapp.es` esté verificado
  - [ ] Estado: ✅ Verified

- [ ] **Verificar DNS Records**
  - [ ] SPF: `v=spf1 include:_spf.resend.com ~all`
  - [ ] DKIM: Configurado automáticamente
  - [ ] DMARC: `v=DMARC1; p=none;`

- [ ] **Probar Envío de Email**
  ```bash
  curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/request-password-token \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -d '{"email":"tu-email@example.com"}'
  ```

### Fase 5: Código de la App (10 min)

- [ ] **Actualizar Rutas en Código**
  - Los archivos ya están creados:
    - `app/auth/login-v6.tsx` ✅
    - `app/auth/registro-v6.tsx` ✅
    - `app/auth/recuperar-password-v6.tsx` ✅
    - `app/auth/verificar-email-v6.tsx` ✅

- [ ] **Actualizar Redirecciones**
  - `app/auth/index.tsx` ya redirige a `/auth/login-v6`

- [ ] **Verificar Imports**
  - Todos los imports están correctos

### Fase 6: Testing (30 min)

#### Test 1: Registro
- [ ] Abrir app en `/auth/registro-v6`
- [ ] Completar formulario con datos válidos
- [ ] Verificar que se envíe email de verificación
- [ ] Verificar redirección a `/auth/verificar-email-v6`
- [ ] Verificar que llegue el email
- [ ] Hacer clic en enlace de verificación
- [ ] Verificar que se pueda iniciar sesión

#### Test 2: Login
- [ ] Abrir app en `/auth/login-v6`
- [ ] Ingresar credenciales válidas
- [ ] Verificar login exitoso
- [ ] Verificar redirección a `/explorar`

#### Test 3: Recuperación de Contraseña
- [ ] Abrir app en `/auth/recuperar-password-v6`
- [ ] **Paso 1:** Ingresar email válido
- [ ] Verificar que llegue email con token
- [ ] **Paso 2:** Ingresar token de 6 dígitos
- [ ] Verificar validación exitosa
- [ ] **Paso 3:** Ingresar nueva contraseña
- [ ] Verificar actualización exitosa
- [ ] Verificar auto-login
- [ ] Verificar redirección a `/explorar`

#### Test 4: Casos de Error
- [ ] Login con email inválido
- [ ] Login con contraseña incorrecta
- [ ] Registro con email existente
- [ ] Registro con contraseña débil
- [ ] Token inválido en recuperación
- [ ] Token expirado en recuperación

### Fase 7: Monitoreo (Continuo)

- [ ] **Configurar Alertas**
  - [ ] Errores en Edge Functions
  - [ ] Fallos de envío de email
  - [ ] Tokens expirados sin usar

- [ ] **Revisar Logs Diariamente**
  ```bash
  supabase functions logs request-password-token --tail
  supabase functions logs validate-password-token --tail
  supabase functions logs update-password-with-token --tail
  ```

- [ ] **Limpiar Tokens Expirados Semanalmente**
  ```sql
  DELETE FROM password_tokens
  WHERE expires_at < now() - interval '1 hour';
  ```

## 🔄 Rollback Plan

Si necesitas volver a V5:

1. **Restaurar Rutas:**
   ```typescript
   // En app/auth/index.tsx
   return <Redirect href="/auth/login-v5" />;
   ```

2. **Mantener Tabla:**
   - No elimines `password_tokens`
   - Puede ser útil para análisis

3. **Edge Functions:**
   - Las funciones V6 son compatibles con V5
   - No es necesario revertir

## 📊 Métricas de Éxito

Después de la migración, monitorea:

- **Tasa de Registro Exitoso:** > 95%
- **Tasa de Login Exitoso:** > 98%
- **Tasa de Recuperación Exitosa:** > 90%
- **Tiempo de Entrega de Email:** < 30 segundos
- **Tasa de Tokens Expirados:** < 5%

## 🎯 Post-Migración

- [ ] **Documentar Cambios**
  - [ ] Actualizar README
  - [ ] Actualizar documentación de API
  - [ ] Actualizar guías de usuario

- [ ] **Comunicar a Usuarios**
  - [ ] Anunciar mejoras
  - [ ] Explicar nuevo flujo de recuperación
  - [ ] Destacar mejoras de seguridad

- [ ] **Capacitar al Equipo**
  - [ ] Compartir documentación V6
  - [ ] Explicar nuevos flujos
  - [ ] Demostrar troubleshooting

## ✅ Verificación Final

- [ ] Todos los tests pasan
- [ ] No hay errores en logs
- [ ] Emails se entregan correctamente
- [ ] Auto-login funciona
- [ ] Redirecciones funcionan
- [ ] UX es fluida
- [ ] Performance es buena
- [ ] Seguridad está implementada

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs de Edge Functions
2. Verifica la configuración de Resend
3. Consulta `AUTH_V6_SYSTEM_COMPLETE.md`
4. Contacta al equipo de desarrollo

## 🎉 ¡Migración Completada!

Una vez completados todos los pasos:

- [ ] Marcar migración como completada
- [ ] Actualizar versión en documentación
- [ ] Celebrar con el equipo 🎊

---

**Tiempo Estimado Total:** 2 horas  
**Dificultad:** Media  
**Riesgo:** Bajo (con rollback plan)

**Versión:** 6.0.0  
**Fecha:** 2025
