
# Sistema de Recuperación de Contraseña por Token - Barlive

## 🎯 Objetivo

Implementar un sistema de recuperación de contraseña **100% interno** en la app Barlive, basado en tokens de 6 dígitos, sin depender de páginas web externas ni del sistema estándar de Supabase.

## 🚨 Problema Resuelto

El sistema anterior de recuperación de contraseña presentaba los siguientes problemas:

- **Páginas en blanco**: Los enlaces de recuperación redirigían a páginas que no se cargaban correctamente
- **URLs incorrectas**: Redirecciones a `http://0.12.165.252/` o URLs mal configuradas
- **Dependencia de navegador**: Requería abrir un navegador externo para completar el proceso
- **Experiencia fragmentada**: El usuario salía de la app para restablecer su contraseña
- **Tokens OTP expirados**: Enlaces que expiraban antes de que el usuario pudiera usarlos

## ✅ Solución Implementada

### Arquitectura del Sistema

El nuevo sistema consta de 4 componentes principales:

#### 1. **Tabla `password_tokens`**

Almacena los tokens de recuperación con los siguientes campos:

```sql
CREATE TABLE password_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,              -- Token de 6 dígitos
  expires_at timestamptz NOT NULL,  -- Expira en 15 minutos
  used boolean DEFAULT false,       -- Marca si el token ya fue usado
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  ip_address text,                  -- Para auditoría de seguridad
  user_agent text                   -- Para auditoría de seguridad
);
```

**Características de seguridad:**
- Tokens de 6 dígitos numéricos (fáciles de recordar y escribir)
- Expiración automática en 15 minutos
- Un solo uso por token
- Auditoría de IP y User Agent
- RLS habilitado (solo service role puede acceder)

#### 2. **Edge Function: `request-password-token`**

**Propósito:** Generar y enviar el token de recuperación por email.

**Flujo:**
1. Recibe el email del usuario
2. Verifica si el usuario existe (sin revelar esta información al cliente)
3. Genera un token aleatorio de 6 dígitos
4. Elimina tokens anteriores no usados del mismo email
5. Guarda el token en la base de datos con expiración de 15 minutos
6. Envía el token por email usando Resend
7. Retorna éxito (siempre, para no revelar si el email existe)

**Endpoint:** `POST /functions/v1/request-password-token`

**Request:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, you will receive a password reset code."
}
```

**Email enviado:**
- Asunto: "Código de recuperación de contraseña - Barlive"
- Contenido: HTML con diseño profesional mostrando el código de 6 dígitos
- Información: El código expira en 15 minutos
- Instrucción: "Introduce este código en la app Barlive"

#### 3. **Edge Function: `validate-password-token`**

**Propósito:** Validar que el token ingresado por el usuario es correcto y no ha expirado.

**Flujo:**
1. Recibe email y token
2. Busca el token en la base de datos
3. Verifica que no haya sido usado
4. Verifica que no haya expirado
5. Retorna si el token es válido o no

**Endpoint:** `POST /functions/v1/validate-password-token`

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "123456"
}
```

**Response (válido):**
```json
{
  "valid": true,
  "message": "Token is valid"
}
```

**Response (inválido):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

#### 4. **Edge Function: `update-password-with-token`**

**Propósito:** Actualizar la contraseña del usuario después de validar el token.

**Flujo:**
1. Recibe email, token y nueva contraseña
2. Valida el token (igual que `validate-password-token`)
3. Busca el usuario en Supabase Auth por email
4. Actualiza la contraseña usando `auth.admin.updateUserById()`
5. Marca el token como usado
6. Retorna éxito

**Endpoint:** `POST /functions/v1/update-password-with-token`

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "token": "123456",
  "newPassword": "NuevaPassword123"
}
```

**Response (éxito):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### Flujo de Usuario (UI)

#### Pantalla 1: `recuperar-password-token.tsx`

**Ruta:** `/auth/recuperar-password-token`

**Funcionalidad:**
- Input para ingresar el email
- Botón "Enviar código"
- Llama a `request-password-token`
- Muestra mensaje de éxito (siempre, por seguridad)
- Instrucciones sobre qué hacer a continuación
- Botón para continuar a la siguiente pantalla
- Opción para reenviar el código

**Características:**
- Validación de formato de email
- Loading state durante el envío
- Diseño con gradiente en el header
- Iconos descriptivos
- Mensajes claros y amigables

#### Pantalla 2: `validar-token-password.tsx`

**Ruta:** `/auth/validar-token-password`

**Funcionalidad:**
- 6 inputs individuales para cada dígito del token
- Auto-focus al siguiente input al escribir
- Backspace navega al input anterior
- Botón "Validar código"
- Llama a `validate-password-token`
- Si es válido, navega a la pantalla de nueva contraseña
- Si es inválido, muestra error y permite reintentar
- Opción para solicitar nuevo código

**Características:**
- UX optimizada para entrada de código
- Inputs grandes y fáciles de usar
- Feedback visual cuando se completa cada dígito
- Ayuda contextual sobre qué hacer si no recibe el código
- Opción para volver y solicitar nuevo código

#### Pantalla 3: `nueva-password-token.tsx`

**Ruta:** `/auth/nueva-password-token`

**Funcionalidad:**
- Input para nueva contraseña (con toggle show/hide)
- Input para confirmar contraseña (con toggle show/hide)
- Validación en tiempo real de requisitos de contraseña
- Botón "Actualizar contraseña"
- Llama a `update-password-with-token`
- Muestra mensaje de éxito
- Redirige automáticamente al login

**Características:**
- Validación de contraseña en tiempo real:
  - Mínimo 8 caracteres
  - Al menos una mayúscula
  - Al menos una minúscula
  - Al menos un número
- Indicadores visuales (checkmarks) para cada requisito
- Confirmación de que las contraseñas coinciden
- Diseño consistente con el resto de la app

## 🔒 Seguridad

### Medidas Implementadas

1. **No revelación de información:**
   - El sistema nunca revela si un email existe en la base de datos
   - Siempre retorna éxito al solicitar un token, independientemente de si el email existe

2. **Tokens de un solo uso:**
   - Cada token solo puede usarse una vez
   - Se marca como "usado" después de actualizar la contraseña

3. **Expiración temporal:**
   - Los tokens expiran en 15 minutos
   - Después de expirar, el usuario debe solicitar un nuevo token

4. **Auditoría:**
   - Se registra la IP y User Agent de cada solicitud
   - Permite detectar patrones sospechosos

5. **RLS (Row Level Security):**
   - Solo el service role puede acceder a la tabla `password_tokens`
   - Los usuarios no pueden ver ni modificar tokens directamente

6. **Validación de contraseña:**
   - Requisitos mínimos de seguridad
   - Validación tanto en cliente como en servidor

7. **Limpieza automática:**
   - Los tokens antiguos no usados se eliminan al solicitar uno nuevo
   - Previene acumulación de tokens en la base de datos

## 📧 Integración con Resend

El sistema utiliza Resend para enviar los emails con los códigos de recuperación.

### Configuración Requerida

1. **Variable de entorno:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

2. **Dominio verificado en Resend:**
   - Dominio: `barliveapp.es`
   - DNS configurado (SPF, DKIM, DMARC)
   - Estado: Verificado

3. **Email remitente:**
   ```
   Barlive <noreply@barliveapp.es>
   ```

### Plantilla de Email

El email enviado incluye:
- **Header con gradiente:** Diseño profesional y reconocible
- **Código destacado:** El token de 6 dígitos en grande y con fondo de color
- **Instrucciones claras:** Qué hacer con el código
- **Advertencia de expiración:** Recordatorio de que expira en 15 minutos
- **Nota de seguridad:** Qué hacer si no solicitó el cambio
- **Footer:** Información de copyright y contacto

## 🚀 Ventajas del Nuevo Sistema

### Para el Usuario

1. **Experiencia fluida:** Todo el proceso ocurre dentro de la app
2. **Sin navegador externo:** No necesita salir de la app
3. **Código fácil de usar:** 6 dígitos son fáciles de recordar y escribir
4. **Feedback inmediato:** Validación en tiempo real
5. **Proceso rápido:** Solo 3 pantallas simples
6. **Sin enlaces rotos:** No depende de URLs que puedan fallar

### Para el Desarrollo

1. **Control total:** No depende del sistema estándar de Supabase
2. **Debugging fácil:** Logs claros en cada paso
3. **Personalizable:** Fácil de modificar según necesidades
4. **Escalable:** Puede manejar alto volumen de solicitudes
5. **Mantenible:** Código limpio y bien documentado
6. **Testeable:** Cada componente puede probarse independientemente

### Para la Seguridad

1. **Tokens de corta duración:** Reducen ventana de ataque
2. **Un solo uso:** Previene reutilización de tokens
3. **Auditoría completa:** Registro de todas las operaciones
4. **No revelación de información:** Protege privacidad de usuarios
5. **Validación robusta:** Múltiples capas de verificación

## 📱 Integración en la App

### Actualización del Login

El botón "¿Olvidaste tu contraseña?" en la pantalla de login ahora redirige a:

```typescript
router.push({
  pathname: '/auth/recuperar-password-token',
  params: { email: normalizedEmail },
});
```

### Navegación del Flujo

```
Login
  ↓ (¿Olvidaste tu contraseña?)
recuperar-password-token
  ↓ (Enviar código)
validar-token-password
  ↓ (Validar código)
nueva-password-token
  ↓ (Actualizar contraseña)
Login (con nueva contraseña)
```

## 🧪 Testing

### Casos de Prueba

1. **Flujo completo exitoso:**
   - Solicitar código → Recibir email → Validar código → Cambiar contraseña → Login

2. **Email no existente:**
   - Solicitar código con email que no existe → Debe mostrar éxito (por seguridad)

3. **Token expirado:**
   - Esperar 15+ minutos → Intentar validar → Debe mostrar error de expiración

4. **Token inválido:**
   - Ingresar código incorrecto → Debe mostrar error

5. **Token ya usado:**
   - Usar el mismo token dos veces → Segunda vez debe fallar

6. **Contraseña débil:**
   - Intentar contraseña que no cumple requisitos → Debe mostrar error

7. **Reenvío de código:**
   - Solicitar nuevo código → Debe invalidar el anterior

## 🔧 Mantenimiento

### Limpieza de Tokens Expirados

Se recomienda crear un cron job para limpiar tokens expirados:

```sql
DELETE FROM password_tokens
WHERE expires_at < NOW() - INTERVAL '1 day';
```

### Monitoreo

Métricas a monitorear:
- Número de solicitudes de token por día
- Tasa de éxito de validación de tokens
- Tiempo promedio del flujo completo
- Tokens expirados sin usar
- Intentos fallidos de validación

### Logs

Cada Edge Function registra:
- Timestamp de la operación
- Email (hasheado en producción)
- Resultado de la operación
- Errores si los hay

## 📝 Notas Adicionales

### Consideraciones de UX

1. **Mensajes claros:** Cada pantalla explica qué hacer
2. **Ayuda contextual:** Tips sobre qué hacer si hay problemas
3. **Feedback visual:** Loading states, iconos, colores
4. **Navegación intuitiva:** Botones claros para avanzar o retroceder
5. **Accesibilidad:** Textos legibles, contraste adecuado

### Consideraciones Técnicas

1. **Rate limiting:** Considerar implementar límite de solicitudes por IP
2. **Captcha:** Evaluar agregar captcha para prevenir abuse
3. **Notificaciones:** Considerar notificar al usuario si alguien intenta resetear su contraseña
4. **Backup:** Los tokens se almacenan en la base de datos principal (con backup automático)

### Mejoras Futuras

1. **SMS como alternativa:** Enviar código por SMS además de email
2. **Biometría:** Permitir recuperación con huella/Face ID
3. **Preguntas de seguridad:** Capa adicional de verificación
4. **Historial de cambios:** Mostrar al usuario cuándo cambió su contraseña
5. **Alertas de seguridad:** Notificar cambios de contraseña por email

## 🎉 Conclusión

El nuevo sistema de recuperación de contraseña por token proporciona una experiencia superior, más segura y completamente integrada en la app Barlive. Elimina todos los problemas del sistema anterior y ofrece un flujo simple, rápido y confiable para que los usuarios recuperen el acceso a sus cuentas.

**Estado:** ✅ Implementado y listo para producción

**Última actualización:** 2025-01-03
