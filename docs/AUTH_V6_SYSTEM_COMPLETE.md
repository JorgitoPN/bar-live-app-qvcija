
# 🔐 Sistema de Autenticación V6.0 - BarLive

## 📋 Descripción General

El Sistema de Autenticación V6.0 es una reimplementación completa y mejorada de todas las páginas y flujos relacionados con la autenticación de usuarios en BarLive. Este sistema utiliza autenticación basada en tokens para la recuperación de contraseñas y ofrece una experiencia de usuario moderna y fluida.

## ✨ Características Principales

### 1. **Diseño Moderno y Consistente**
- Interfaz limpia y minimalista
- Animaciones suaves y transiciones fluidas
- Gradientes personalizados en headers
- Iconos consistentes en toda la aplicación
- Feedback visual inmediato para todas las acciones

### 2. **Validación en Tiempo Real**
- Validación de email con regex
- Validación de contraseña con requisitos de seguridad
- Indicador de fortaleza de contraseña
- Mensajes de error claros y específicos
- Animaciones de shake para errores

### 3. **Sistema de Recuperación de Contraseña con Token**
- Tokens de 6 dígitos numéricos
- Expiración de 15 minutos
- Uso único (single-use)
- Validación en tiempo real
- Auto-login después de cambio exitoso

### 4. **Seguridad Mejorada**
- Encriptación de extremo a extremo
- Tokens seguros almacenados en base de datos
- No revelación de existencia de emails
- Auditoría de IP y User Agent
- Políticas RLS en todas las tablas

## 📱 Páginas Implementadas

### 1. Login V6 (`/auth/login-v6`)

**Características:**
- Validación de email y contraseña
- Detección de usuarios de Google
- Opción de "Olvidaste tu contraseña"
- Enlace a registro
- Indicadores visuales de validación
- Auto-focus en campos

**Flujo:**
1. Usuario ingresa email y contraseña
2. Sistema valida formato de email
3. Sistema verifica si es usuario de Google
4. Si es Google, ofrece configurar contraseña
5. Si no, intenta login con Supabase Auth
6. Si email no verificado, ofrece reenviar correo
7. Si credenciales incorrectas, muestra error
8. Si exitoso, redirige a `/explorar`

### 2. Registro V6 (`/auth/registro-v6`)

**Características:**
- Campos: Nombre, Email, Contraseña, Confirmar Contraseña
- Validación en tiempo real de todos los campos
- Indicador de fortaleza de contraseña
- Checkbox de términos y condiciones
- Verificación de email existente
- Envío automático de correo de verificación

**Requisitos de Contraseña:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número

**Flujo:**
1. Usuario completa formulario
2. Sistema valida todos los campos
3. Sistema verifica que email no exista
4. Sistema crea usuario en Supabase Auth
5. Sistema envía correo de verificación
6. Redirige a pantalla de verificación

### 3. Recuperación de Contraseña V6 (`/auth/recuperar-password-v6`)

**Características:**
- Flujo de 3 pasos en una sola pantalla
- Paso 1: Ingreso de email
- Paso 2: Ingreso de token de 6 dígitos
- Paso 3: Nueva contraseña
- Validación en cada paso
- Opción de solicitar nuevo código
- Auto-validación al completar token

**Flujo Completo:**

**Paso 1: Email**
1. Usuario ingresa email
2. Sistema valida formato
3. Sistema llama a Edge Function `request-password-token`
4. Edge Function genera token de 6 dígitos
5. Edge Function guarda token en DB con expiración de 15 min
6. Edge Function envía email con token
7. Sistema avanza a Paso 2

**Paso 2: Token**
1. Usuario ve instrucciones claras
2. Usuario ingresa 6 dígitos del token
3. Sistema auto-valida al completar 6 dígitos
4. Sistema llama a Edge Function `validate-password-token`
5. Edge Function verifica token y expiración
6. Si válido, avanza a Paso 3
7. Si inválido, muestra error y opción de reenviar

**Paso 3: Nueva Contraseña**
1. Usuario ingresa nueva contraseña
2. Usuario confirma contraseña
3. Sistema valida requisitos de seguridad
4. Sistema llama a Edge Function `update-password-with-token`
5. Edge Function actualiza contraseña en Supabase Auth
6. Edge Function marca token como usado
7. Sistema auto-login del usuario
8. Redirige a `/explorar`

### 4. Verificación de Email V6 (`/auth/verificar-email-v6`)

**Características:**
- Diseño atractivo con animaciones
- Instrucciones paso a paso
- Consejos útiles
- Botón de reenvío con countdown
- Enlace para volver a login

**Flujo:**
1. Usuario llega después de registro
2. Ve email al que se envió verificación
3. Puede reenviar correo después de 60 segundos
4. Sigue instrucciones para verificar
5. Después de verificar, puede iniciar sesión

## 🗄️ Base de Datos

### Tabla: `password_tokens`

```sql
CREATE TABLE public.password_tokens (
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

**Índices:**
- `idx_password_tokens_email` en `email`
- `idx_password_tokens_token` en `token`
- `idx_password_tokens_expires_at` en `expires_at`
- `idx_password_tokens_used` en `used`

**RLS Policies:**
- Solo `service_role` puede acceder

## ⚡ Edge Functions

### 1. `request-password-token`

**Propósito:** Generar y enviar token de recuperación

**Input:**
```typescript
{
  email: string
}
```

**Output:**
```typescript
{
  success: boolean
}
```

**Proceso:**
1. Valida email
2. Verifica si usuario existe (sin revelar al cliente)
3. Genera token de 6 dígitos
4. Guarda en DB con expiración de 15 min
5. Envía email con token usando Resend
6. Retorna success (siempre true por seguridad)

### 2. `validate-password-token`

**Propósito:** Validar token ingresado por usuario

**Input:**
```typescript
{
  email: string,
  token: string
}
```

**Output:**
```typescript
{
  valid: boolean,
  error?: string
}
```

**Proceso:**
1. Busca token en DB
2. Verifica que no esté usado
3. Verifica que no haya expirado
4. Retorna resultado

### 3. `update-password-with-token`

**Propósito:** Actualizar contraseña usando token válido

**Input:**
```typescript
{
  email: string,
  token: string,
  newPassword: string
}
```

**Output:**
```typescript
{
  success: boolean,
  error?: string
}
```

**Proceso:**
1. Valida token (igual que validate)
2. Busca usuario en Supabase Auth
3. Actualiza contraseña usando Admin API
4. Marca token como usado
5. Retorna resultado

## 📧 Plantilla de Email

### Código de Recuperación

**Asunto:** `Barlive - Código de recuperación`

**Contenido:**
- Header con gradiente y logo
- Título claro
- Token de 6 dígitos destacado
- Tiempo de expiración (15 minutos)
- Aviso de seguridad
- Footer con información de contacto

**Características:**
- Diseño responsive
- Compatible con todos los clientes de email
- Solo texto y HTML (sin imágenes externas)
- Accesible y legible

## 🎨 Diseño y UX

### Colores

```typescript
colors = {
  primary: '#14b8a6',        // Teal 400
  secondary: '#06b6d4',      // Cyan 500
  headerGradientStart: '#14b8a6',
  headerGradientEnd: '#06b6d4',
  text: '#11181C',
  textSecondary: '#6B7280',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',
}
```

### Animaciones

1. **Fade In:** Entrada suave de elementos
2. **Shake:** Error en validación
3. **Pulse:** Indicador de acción requerida
4. **Slide:** Transición entre pasos

### Iconos

- **Login:** `person.fill` / `person`
- **Registro:** `person.badge.plus.fill` / `person_add`
- **Email:** `envelope.fill` / `email`
- **Contraseña:** `lock.fill` / `lock`
- **Verificación:** `checkmark.circle.fill` / `check_circle`
- **Error:** `exclamationmark.circle.fill` / `error`
- **Seguridad:** `lock.shield.fill` / `security`

## 🔒 Seguridad

### Mejores Prácticas Implementadas

1. **Tokens Seguros:**
   - Generación aleatoria de 6 dígitos
   - Expiración de 15 minutos
   - Uso único
   - Almacenamiento seguro en DB

2. **Validación de Contraseñas:**
   - Mínimo 8 caracteres
   - Complejidad requerida
   - Confirmación obligatoria

3. **Protección de Datos:**
   - No revelación de existencia de emails
   - Encriptación de contraseñas
   - RLS en todas las tablas
   - Auditoría de accesos

4. **Prevención de Ataques:**
   - Rate limiting en Edge Functions
   - Validación de entrada
   - Sanitización de datos
   - CORS configurado

## 📱 Navegación

### Rutas Principales

```
/auth/index → Redirige a /auth/login-v6
/auth/login-v6 → Pantalla de inicio de sesión
/auth/registro-v6 → Pantalla de registro
/auth/recuperar-password-v6 → Recuperación de contraseña
/auth/verificar-email-v6 → Verificación de email
```

### Flujos de Navegación

**Registro Exitoso:**
```
/auth/registro-v6 
  → /auth/verificar-email-v6 
  → Usuario verifica email 
  → /auth/login-v6 
  → /(tabs)/explorar
```

**Login Exitoso:**
```
/auth/login-v6 
  → /(tabs)/explorar
```

**Recuperación de Contraseña:**
```
/auth/recuperar-password-v6 (Paso 1: Email)
  → /auth/recuperar-password-v6 (Paso 2: Token)
  → /auth/recuperar-password-v6 (Paso 3: Nueva Contraseña)
  → Auto-login
  → /(tabs)/explorar
```

## 🧪 Testing

### Casos de Prueba

**Login:**
- ✅ Login exitoso con credenciales válidas
- ✅ Error con email inválido
- ✅ Error con contraseña incorrecta
- ✅ Detección de usuario de Google
- ✅ Manejo de email no verificado

**Registro:**
- ✅ Registro exitoso con datos válidos
- ✅ Error con email ya registrado
- ✅ Error con contraseña débil
- ✅ Error con contraseñas no coincidentes
- ✅ Error sin aceptar términos

**Recuperación de Contraseña:**
- ✅ Envío exitoso de token
- ✅ Validación exitosa de token
- ✅ Actualización exitosa de contraseña
- ✅ Error con token inválido
- ✅ Error con token expirado
- ✅ Error con token ya usado

## 📊 Métricas y Monitoreo

### Eventos a Trackear

1. **Autenticación:**
   - Login exitoso
   - Login fallido
   - Registro exitoso
   - Registro fallido

2. **Recuperación de Contraseña:**
   - Token solicitado
   - Token validado
   - Contraseña actualizada
   - Token expirado
   - Token inválido

3. **Verificación de Email:**
   - Email enviado
   - Email verificado
   - Email reenviado

## 🚀 Despliegue

### Checklist de Despliegue

- [ ] Verificar Edge Functions desplegadas
- [ ] Verificar tabla `password_tokens` creada
- [ ] Verificar índices creados
- [ ] Verificar RLS policies activas
- [ ] Configurar RESEND_API_KEY en Supabase
- [ ] Verificar plantilla de email en Resend
- [ ] Probar flujo completo en staging
- [ ] Verificar redirecciones funcionando
- [ ] Verificar auto-login después de reset
- [ ] Monitorear logs de Edge Functions

### Variables de Entorno

```bash
SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
RESEND_API_KEY=<resend_api_key>
```

## 📝 Notas de Migración

### Desde V5 a V6

1. **Cambios en Rutas:**
   - `/auth/login-v5` → `/auth/login-v6`
   - `/auth/registro-v5` → `/auth/registro-v6`
   - `/auth/recuperar-password-v5` → `/auth/recuperar-password-v6`

2. **Nuevas Pantallas:**
   - `/auth/verificar-email-v6` (nueva)

3. **Cambios en Base de Datos:**
   - Tabla `password_tokens` (nueva)

4. **Cambios en Edge Functions:**
   - Todas las funciones actualizadas para V6

## 🐛 Troubleshooting

### Problemas Comunes

**1. Token no llega al email:**
- Verificar configuración de Resend
- Verificar DNS records (SPF, DKIM, DMARC)
- Revisar logs de Edge Function
- Verificar carpeta de spam

**2. Token inválido:**
- Verificar que no haya expirado (15 min)
- Verificar que no se haya usado
- Verificar que el email coincida

**3. No se puede actualizar contraseña:**
- Verificar que el token sea válido
- Verificar que la contraseña cumpla requisitos
- Revisar logs de Edge Function

**4. Auto-login no funciona:**
- Verificar que la contraseña se haya actualizado
- Verificar credenciales en signInWithPassword
- Revisar logs de Supabase Auth

## 📚 Recursos Adicionales

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Documentación de Resend](https://resend.com/docs)
- [Guía de Seguridad](./SECURITY_BEST_PRACTICES.md)
- [Guía de Diseño](./DESIGN_SYSTEM.md)

## 🎯 Próximos Pasos

1. **Autenticación Biométrica:**
   - Face ID / Touch ID
   - Integración con expo-local-authentication

2. **Autenticación de Dos Factores:**
   - SMS
   - Authenticator apps

3. **Social Login:**
   - Google OAuth
   - Apple Sign In
   - Facebook Login

4. **Mejoras de UX:**
   - Recordar dispositivo
   - Login automático
   - Gestión de sesiones

## 📞 Soporte

Para soporte técnico o preguntas sobre el sistema de autenticación V6.0, contacta al equipo de desarrollo.

---

**Versión:** 6.0.0  
**Última actualización:** 2025  
**Autor:** Equipo BarLive
