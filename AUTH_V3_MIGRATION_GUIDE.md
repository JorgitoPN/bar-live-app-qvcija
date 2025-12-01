
# BarLive Authentication System 3.0 - Migration Guide

## 🎯 Objetivo

Migrar de Google OAuth a un sistema de autenticación propio basado en email/contraseña, eliminando completamente la dependencia de proveedores externos mientras se preservan todos los datos y roles de usuarios existentes.

## ✅ Cambios Implementados

### 1. Sistema de Autenticación Nuevo

**Archivos Modificados:**
- ✅ `app/auth/login.tsx` - Login con email/contraseña (sin Google)
- ✅ `app/auth/registro-email.tsx` - Registro con email/contraseña
- ✅ `app/auth/crear-password-google.tsx` - **NUEVO** - Migración de usuarios Google
- ✅ `utils/auth.ts` - Eliminadas funciones de Google OAuth
- ✅ `contexts/AuthContext.tsx` - Sin cambios (compatible)

### 2. Base de Datos

**Migración Aplicada:** `auth_system_v3_migration`

**Cambios en la tabla `usuarios`:**
- ✅ Índices optimizados para búsquedas por email
- ✅ Función de migración `migrate_google_user_to_barlive()`
- ✅ Vista `users_needing_migration` para monitoreo
- ✅ Comentarios actualizados en la tabla

**Estructura preservada:**
```sql
- id (UUID) - Vinculado a auth.users
- email (TEXT) - Email del usuario
- nombre (TEXT) - Nombre completo
- rol_app (TEXT) - 'cliente', 'propietario', 'admin'
- provider (TEXT) - 'barlive' o 'google'
- email_verified (BOOLEAN) - Estado de verificación
- avatar, bio, username, etc. - Todos preservados
```

## 👥 Usuarios Existentes

### Estado Actual (4 usuarios con Google):

1. **Almudena Sanchez** - Cliente
2. **Jorge Pérez** - Propietario  
3. **Benjamín Pérez** - Cliente
4. **Jorge Pérez** - Admin

**Todos necesitan configurar contraseña en su próximo inicio de sesión.**

## 🔄 Flujo de Migración para Usuarios Google

### Paso 1: Usuario intenta iniciar sesión
```
Usuario ingresa email y contraseña
↓
Sistema detecta provider = 'google'
↓
Muestra alerta: "Configuración requerida"
```

### Paso 2: Configuración de contraseña
```
Usuario es redirigido a /auth/crear-password-google
↓
Ingresa nueva contraseña (mínimo 8 caracteres)
↓
Confirma contraseña
```

### Paso 3: Migración automática
```
Sistema actualiza:
- provider: 'google' → 'barlive'
- email_verified: false → true
↓
Usuario puede iniciar sesión con email/contraseña
```

## 🔐 Características de Seguridad

### Validaciones Implementadas

**Email:**
- ✅ Formato válido de email
- ✅ Normalización (lowercase, trim)
- ✅ Verificación de duplicados

**Contraseña:**
- ✅ Mínimo 8 caracteres
- ✅ Confirmación requerida
- ✅ Almacenamiento seguro (Supabase Auth)

**Verificación de Email:**
- ✅ Código de verificación enviado
- ✅ Reenvío de código disponible
- ✅ Expiración de códigos

## 📊 Datos Preservados

### ✅ Completamente Preservado

**Perfil de Usuario:**
- ID único (UUID)
- Email
- Nombre
- Avatar
- Bio
- Username
- Sitio web
- Ubicación
- Todas las configuraciones

**Roles y Permisos:**
- Cliente
- Propietario
- Admin
- Permisos asociados

**Contenido Social:**
- Posts publicados
- Comentarios
- Likes dados y recibidos
- Posts guardados
- Historias
- Seguidores y seguidos

**Relaciones con Locales:**
- Locales guardados
- Suscripciones a locales
- Propiedad de locales
- Check-ins en sala virtual
- Interacciones en sala virtual

**Configuraciones:**
- Preferencias de privacidad
- Configuración de notificaciones
- Preferencias de visualización
- Idioma y región

### ❌ Lo Único que Cambia

**Método de Autenticación:**
- Antes: Google OAuth
- Después: Email/Contraseña

**Campo Provider:**
- Antes: `'google'`
- Después: `'barlive'` (después de migración)

## 🧪 Testing

### Casos de Prueba

**✅ Nuevo Usuario:**
1. Registro con email/contraseña
2. Verificación de email
3. Inicio de sesión
4. Recuperación de contraseña

**✅ Usuario Google Existente:**
1. Intento de login
2. Detección de cuenta Google
3. Configuración de contraseña
4. Migración exitosa
5. Login con nuevas credenciales

**✅ Preservación de Datos:**
1. Verificar roles mantenidos
2. Verificar posts existentes
3. Verificar seguidores/seguidos
4. Verificar locales guardados
5. Verificar configuraciones

## 📱 Experiencia de Usuario

### Pantalla de Login

```
┌─────────────────────────────────┐
│  Iniciar sesión                 │
│  Bienvenido de vuelta a BarLive │
├─────────────────────────────────┤
│  Correo electrónico             │
│  [correo@ejemplo.com]           │
│                                 │
│  Contraseña                     │
│  [••••••••]                     │
│                                 │
│  ¿Olvidaste tu contraseña?      │
│                                 │
│  [Iniciar sesión]               │
│                                 │
│  ───────── o ─────────          │
│                                 │
│  ¿No tienes cuenta? Regístrate  │
└─────────────────────────────────┘
```

### Pantalla de Migración (Usuarios Google)

```
┌─────────────────────────────────┐
│  Configurar contraseña          │
│  Migración a BarLive Auth 3.0   │
├─────────────────────────────────┤
│  ℹ️ Tu cuenta fue creada con    │
│  Google. Para continuar usando  │
│  BarLive, configura contraseña  │
│                                 │
│  Correo electrónico             │
│  [usuario@gmail.com] (fijo)     │
│                                 │
│  Nueva contraseña               │
│  [Mínimo 8 caracteres]          │
│                                 │
│  Confirmar contraseña           │
│  [Repite tu contraseña]         │
│                                 │
│  [Configurar contraseña]        │
│                                 │
│  📝 Todos tus datos, roles y    │
│  configuraciones se mantendrán  │
└─────────────────────────────────┘
```

## 🔍 Monitoreo

### Ver Usuarios que Necesitan Migrar

```sql
SELECT * FROM users_needing_migration;
```

### Estadísticas de Migración

```sql
SELECT 
  provider,
  COUNT(*) as total_usuarios,
  SUM(CASE WHEN email_verified THEN 1 ELSE 0 END) as verificados
FROM usuarios
GROUP BY provider;
```

### Usuarios Migrados Recientemente

```sql
SELECT 
  email,
  nombre,
  rol_app,
  updated_at
FROM usuarios
WHERE provider = 'barlive'
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

## 🚨 Solución de Problemas

### Problema: Usuario no puede iniciar sesión

**Síntoma:** Error "Usuario no encontrado"

**Solución:**
1. Verificar que el email existe en la base de datos
2. Verificar el campo `provider`
3. Si es Google, redirigir a configuración de contraseña

### Problema: Email de verificación no llega

**Síntoma:** Usuario no recibe código de verificación

**Solución:**
1. Verificar carpeta de spam
2. Reenviar código de verificación
3. Verificar configuración de email en Supabase

### Problema: Error al configurar contraseña

**Síntoma:** Error en pantalla de migración

**Solución:**
1. Verificar que el usuario existe
2. Verificar que `provider = 'google'`
3. Intentar recuperación de contraseña alternativa

## 📈 Métricas de Éxito

### KPIs a Monitorear

- ✅ Tasa de migración exitosa (objetivo: 100%)
- ✅ Tiempo promedio de migración (objetivo: < 2 minutos)
- ✅ Tasa de retención post-migración (objetivo: 100%)
- ✅ Errores de autenticación (objetivo: 0%)

### Dashboard de Migración

```sql
-- Resumen de migración
SELECT 
  COUNT(*) FILTER (WHERE provider = 'google') as pendientes_migracion,
  COUNT(*) FILTER (WHERE provider = 'barlive') as migrados,
  COUNT(*) as total_usuarios,
  ROUND(100.0 * COUNT(*) FILTER (WHERE provider = 'barlive') / COUNT(*), 2) as porcentaje_migrado
FROM usuarios;
```

## 🎓 Capacitación

### Para Usuarios

**Mensaje de Comunicación:**

> "¡Hola! Hemos mejorado nuestro sistema de inicio de sesión. 
> 
> Si te registraste con Google, necesitarás configurar una contraseña la próxima vez que inicies sesión. Es rápido y sencillo:
> 
> 1. Ingresa tu email
> 2. Configura una nueva contraseña
> 3. ¡Listo! Todos tus datos se mantienen intactos
> 
> Gracias por ser parte de BarLive 🎉"

### Para Soporte

**Script de Ayuda:**

1. **Usuario reporta problema de login:**
   - "¿Te registraste con Google?"
   - "Necesitas configurar una contraseña nueva"
   - "Te guío paso a paso..."

2. **Usuario pregunta por sus datos:**
   - "Todos tus datos están seguros"
   - "Tus posts, seguidores y configuraciones se mantienen"
   - "Solo cambia la forma de iniciar sesión"

## 🔮 Próximos Pasos

### Mejoras Futuras

1. **Autenticación de Dos Factores (2FA)**
   - SMS o app authenticator
   - Mayor seguridad

2. **Autenticación Biométrica**
   - Face ID / Touch ID
   - Login más rápido

3. **Gestión de Sesiones**
   - Ver dispositivos activos
   - Cerrar sesiones remotas

4. **Recuperación de Cuenta**
   - Preguntas de seguridad
   - Recuperación por teléfono

## ✨ Conclusión

La migración a Authentication System 3.0 ha sido implementada exitosamente:

- ✅ Google OAuth completamente eliminado
- ✅ Sistema propio de email/contraseña funcionando
- ✅ Todos los usuarios existentes preservados
- ✅ Migración transparente para usuarios
- ✅ Datos y roles 100% intactos
- ✅ Mayor control y seguridad

**Estado:** ✅ LISTO PARA PRODUCCIÓN

**Fecha de Implementación:** 2025-01-12

**Versión:** 3.0.0
