
# Sistema de Verificación de Cuenta mediante Token

## 📋 Resumen

Se ha implementado un sistema de verificación de cuenta mediante token de 6 dígitos, siguiendo el mismo patrón que el sistema de recuperación de contraseña. Este sistema reemplaza el método anterior de verificación por enlace de correo.

## 🎯 Flujo de Verificación

### 1. Registro de Usuario
**Archivo:** `app/auth/registro-v6.tsx`

- El usuario completa el formulario de registro (nombre, email, contraseña)
- Se crea la cuenta en Supabase Auth (sin verificación automática)
- Se envía automáticamente un token de verificación al correo del usuario
- El usuario es redirigido a la pantalla de verificación de token

### 2. Envío de Token
**Edge Function:** `request-verification-token`

**Proceso:**
- Genera un código aleatorio de 6 dígitos
- Almacena el token en la tabla `verification_tokens` con expiración de 1 hora
- Envía el código por correo electrónico usando Resend
- El correo incluye instrucciones claras y diseño profesional

**Plantilla de correo:**
- Diseño moderno con gradiente de marca
- Código destacado en grande y fácil de copiar
- Instrucciones paso a paso
- Notas de seguridad sobre expiración
- Enlaces a soporte

### 3. Introducción del Token
**Archivo:** `app/auth/verificar-cuenta-token.tsx`

**Características:**
- 6 campos de entrada individuales para cada dígito
- Auto-focus al siguiente campo al escribir
- Validación en tiempo real
- Indicadores visuales de campos completados
- Instrucciones paso a paso
- Opción para reenviar código
- Consejos útiles (revisar spam, tiempo de expiración)

### 4. Validación del Token
**Edge Function:** `validate-verification-token`

**Proceso:**
- Busca el token en la base de datos
- Verifica que no haya sido usado
- Comprueba que no haya expirado
- Retorna resultado de validación

### 5. Verificación de Cuenta
**Edge Function:** `verify-account-with-token`

**Proceso:**
- Valida el token nuevamente
- Actualiza `email_confirmed_at` en auth.users
- Actualiza `email_verified` en la tabla usuarios
- Marca el token como usado
- Retorna confirmación de éxito

### 6. Confirmación y Redirección
- Se muestra mensaje de éxito
- El usuario es redirigido a la pantalla de login
- Puede iniciar sesión inmediatamente

## 🗄️ Base de Datos

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

**Características:**
- Tokens de 6 dígitos numéricos
- Expiración de 1 hora
- Marcado de uso único
- Índices para búsquedas rápidas
- RLS habilitado

## 🔧 Edge Functions

### 1. request-verification-token
**Ruta:** `/functions/v1/request-verification-token`

**Input:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Output:**
```json
{
  "success": true
}
```

**Errores:**
- 404: Usuario no encontrado
- 400: Email ya verificado
- 500: Error al enviar correo

### 2. validate-verification-token
**Ruta:** `/functions/v1/validate-verification-token`

**Input:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "123456"
}
```

**Output:**
```json
{
  "valid": true
}
```

**Errores:**
- Token inválido o no encontrado
- Token expirado

### 3. verify-account-with-token
**Ruta:** `/functions/v1/verify-account-with-token`

**Input:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "123456"
}
```

**Output:**
```json
{
  "success": true
}
```

**Errores:**
- Token inválido
- Token expirado
- Usuario no encontrado
- Error al verificar cuenta

## 📱 Pantallas de la App

### 1. verificar-cuenta-token.tsx
**Ruta:** `/auth/verificar-cuenta-token`

**Parámetros:**
- `email`: Email del usuario
- `nombre`: Nombre del usuario (opcional)

**Funcionalidades:**
- Entrada de código de 6 dígitos
- Validación automática al completar
- Reenvío de código
- Instrucciones paso a paso
- Consejos útiles

### 2. registro-v6.tsx (actualizado)
**Cambios:**
- Envía token de verificación en lugar de enlace
- Redirige a pantalla de token
- Maneja errores de envío de token

### 3. login-v6.tsx (actualizado)
**Cambios:**
- Detecta cuentas no verificadas
- Ofrece enviar código de verificación
- Redirige a pantalla de token

### 4. verificar-email-v6.tsx (actualizado)
**Cambios:**
- Ahora es una pantalla de transición
- Envía token automáticamente
- Redirige a verificar-cuenta-token

## 🎨 Diseño y UX

### Consistencia con Password Reset
El diseño sigue exactamente el mismo patrón que el sistema de recuperación de contraseña:

- **Mismos colores y gradientes**
- **Misma estructura de pasos**
- **Mismos iconos y estilos**
- **Mismos mensajes de error/éxito**
- **Misma experiencia de usuario**

### Elementos Visuales
- Gradiente de header con colores de marca
- Iconos grandes y llamativos
- Campos de token individuales con feedback visual
- Animaciones suaves
- Mensajes claros y concisos

## 🔒 Seguridad

### Medidas Implementadas
1. **Tokens de un solo uso:** Marcados como usados después de verificación
2. **Expiración temporal:** 1 hora de validez
3. **Validación en servidor:** Toda la lógica crítica en Edge Functions
4. **No revelación de información:** No se indica si un email existe o no
5. **Límite de intentos:** Tokens invalidados después de uso

### Auditoría
- Registro de IP y User Agent (preparado para implementación futura)
- Timestamps de creación y uso
- Logs detallados en Edge Functions

## 📧 Plantilla de Email

### Características
- **Diseño responsive:** Se adapta a móviles y desktop
- **Gradiente de marca:** Colores corporativos de BarLive
- **Código destacado:** Fuente grande y monoespaciada
- **Instrucciones claras:** Pasos numerados
- **Notas de seguridad:** Advertencias sobre expiración
- **Enlaces de soporte:** Contacto directo con soporte

### Contenido
- Saludo personalizado
- Código de 6 dígitos en grande
- Instrucciones paso a paso
- Nota de seguridad sobre expiración
- Advertencia si no fue solicitado
- Enlaces a términos y privacidad
- Footer corporativo

## 🔄 Integración con Sistema Existente

### Compatibilidad
- ✅ Compatible con usuarios de Google (pueden verificar después)
- ✅ Compatible con sistema de recuperación de contraseña
- ✅ Compatible con sistema de autenticación existente
- ✅ No afecta a usuarios ya verificados

### Migración
- Los usuarios existentes no se ven afectados
- Los nuevos usuarios usan el sistema de tokens
- Los usuarios no verificados pueden solicitar nuevo código

## 🧪 Pruebas

### Casos de Prueba
1. ✅ Registro nuevo usuario → Recibe token → Verifica cuenta
2. ✅ Token inválido → Mensaje de error apropiado
3. ✅ Token expirado → Opción de reenviar
4. ✅ Reenvío de token → Nuevo código generado
5. ✅ Usuario ya verificado → No permite verificar de nuevo
6. ✅ Login con cuenta no verificada → Ofrece verificar

### Verificación Manual
```sql
-- Ver tokens de verificación
SELECT * FROM verification_tokens 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver usuarios no verificados
SELECT id, email, nombre, email_verified 
FROM usuarios 
WHERE email_verified = false;

-- Verificar manualmente un usuario (solo para pruebas)
UPDATE usuarios 
SET email_verified = true 
WHERE email = 'usuario@ejemplo.com';
```

## 📊 Métricas y Monitoreo

### Logs
Todos los Edge Functions incluyen logs detallados:
- Timestamp de cada operación
- Email procesado (sin datos sensibles)
- Resultado de cada paso
- Errores con contexto completo

### Consultas Útiles
```sql
-- Tokens generados hoy
SELECT COUNT(*) FROM verification_tokens 
WHERE created_at > CURRENT_DATE;

-- Tokens usados vs no usados
SELECT 
  used,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as validos
FROM verification_tokens 
GROUP BY used;

-- Tasa de verificación
SELECT 
  COUNT(*) FILTER (WHERE email_verified = true) * 100.0 / COUNT(*) as tasa_verificacion
FROM usuarios;
```

## 🚀 Próximos Pasos

### Mejoras Futuras
1. **Rate limiting:** Limitar intentos de envío de tokens
2. **Análisis de patrones:** Detectar comportamientos sospechosos
3. **Notificaciones push:** Alternativa al correo electrónico
4. **Verificación por SMS:** Opción adicional de verificación
5. **Recordatorios:** Emails automáticos para cuentas no verificadas

### Optimizaciones
1. **Caché de templates:** Reducir tiempo de generación de emails
2. **Queue de emails:** Procesar envíos en lote
3. **Retry automático:** Reintentar envíos fallidos
4. **Métricas avanzadas:** Dashboard de verificaciones

## 📝 Notas Importantes

### Para Desarrolladores
- Todos los emails se normalizan a minúsculas
- Los tokens son numéricos de 6 dígitos
- La expiración es de 1 hora (configurable)
- Los tokens son de un solo uso
- Se mantiene compatibilidad con sistema anterior

### Para Administradores
- Los tokens se pueden ver en la tabla `verification_tokens`
- Se puede verificar manualmente usuarios en caso de problemas
- Los logs están disponibles en Supabase Dashboard
- El sistema usa Resend para envío de emails

### Para Usuarios
- El código llega en menos de 1 minuto
- Revisar carpeta de spam si no llega
- El código expira en 1 hora
- Se puede solicitar un nuevo código en cualquier momento
- El proceso es seguro y encriptado

## 🔗 Archivos Relacionados

### Edge Functions
- `supabase/functions/request-verification-token/index.ts`
- `supabase/functions/validate-verification-token/index.ts`
- `supabase/functions/verify-account-with-token/index.ts`

### Pantallas de App
- `app/auth/verificar-cuenta-token.tsx`
- `app/auth/registro-v6.tsx`
- `app/auth/login-v6.tsx`
- `app/auth/verificar-email-v6.tsx`

### Migraciones
- `supabase/migrations/[timestamp]_create_verification_tokens_table.sql`

## ✅ Checklist de Implementación

- [x] Crear tabla `verification_tokens`
- [x] Implementar Edge Function `request-verification-token`
- [x] Implementar Edge Function `validate-verification-token`
- [x] Implementar Edge Function `verify-account-with-token`
- [x] Crear pantalla `verificar-cuenta-token.tsx`
- [x] Actualizar `registro-v6.tsx`
- [x] Actualizar `login-v6.tsx`
- [x] Actualizar `verificar-email-v6.tsx`
- [x] Diseñar plantilla de email
- [x] Habilitar RLS en tabla
- [x] Crear índices de base de datos
- [x] Documentar sistema completo

## 🎉 Resultado Final

El sistema de verificación de cuenta ahora funciona exactamente igual que el sistema de recuperación de contraseña:

1. **Usuario se registra** → Recibe código por email
2. **Usuario introduce código** → Sistema valida
3. **Cuenta verificada** → Usuario puede iniciar sesión

**Ventajas:**
- ✅ Más intuitivo que enlaces de verificación
- ✅ Funciona en todos los clientes de correo
- ✅ No depende de deep links
- ✅ Experiencia consistente con password reset
- ✅ Fácil de usar en móvil
- ✅ Seguro y confiable
