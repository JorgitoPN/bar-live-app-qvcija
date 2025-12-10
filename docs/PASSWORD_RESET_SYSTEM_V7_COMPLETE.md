
# Sistema de Restablecimiento de Contraseña v7.0 - Barlive

## 📋 Resumen

Sistema completo de restablecimiento de contraseña basado en tokens de 6 dígitos con expiración de 1 hora, diseñado para proporcionar una experiencia de usuario segura y amigable.

## 🎯 Características Principales

### 1. **Token de 6 Dígitos**
- Código numérico fácil de recordar y escribir
- Generación aleatoria segura
- Expiración automática después de 1 hora
- Un solo uso por token

### 2. **Email Profesional y Detallado**
- Diseño moderno con gradientes
- Instrucciones paso a paso claras
- Avisos de seguridad destacados
- Recomendaciones en caso de actividad sospechosa
- Enlaces a soporte y políticas

### 3. **Interfaz de Usuario Mejorada**
- Diseño limpio e intuitivo
- Feedback visual claro
- Instrucciones paso a paso
- Manejo de errores amigable

## 🏗️ Arquitectura del Sistema

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUJO COMPLETO                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario solicita código                                │
│     ↓                                                       │
│  2. App → Edge Function (request-password-token)           │
│     ↓                                                       │
│  3. Genera token de 6 dígitos                              │
│     ↓                                                       │
│  4. Guarda en tabla password_tokens                        │
│     ↓                                                       │
│  5. Envía email con Resend                                 │
│     ↓                                                       │
│  6. Usuario recibe email                                   │
│     ↓                                                       │
│  7. Usuario ingresa código en app                          │
│     ↓                                                       │
│  8. App → Edge Function (validate-password-token)          │
│     ↓                                                       │
│  9. Valida token (no expirado, no usado)                   │
│     ↓                                                       │
│  10. Usuario ingresa nueva contraseña                      │
│     ↓                                                       │
│  11. App → Edge Function (update-password-with-token)      │
│     ↓                                                       │
│  12. Actualiza contraseña                                  │
│     ↓                                                       │
│  13. Marca token como usado                                │
│     ↓                                                       │
│  14. Usuario puede iniciar sesión                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Base de Datos

**Tabla: `password_tokens`**

```sql
CREATE TABLE password_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

-- Índices para optimización
CREATE INDEX idx_password_tokens_email ON password_tokens(email);
CREATE INDEX idx_password_tokens_token ON password_tokens(token);
CREATE INDEX idx_password_tokens_expires_at ON password_tokens(expires_at);
```

### Edge Functions

#### 1. **request-password-token**
- **Ruta**: `/functions/v1/request-password-token`
- **Método**: POST
- **Body**: `{ email: string }`
- **Funcionalidad**:
  - Verifica si el usuario existe (sin revelar al cliente)
  - Genera token de 6 dígitos
  - Guarda en base de datos con expiración de 1 hora
  - Envía email con Resend
  - Siempre retorna éxito (seguridad)

#### 2. **validate-password-token**
- **Ruta**: `/functions/v1/validate-password-token`
- **Método**: POST
- **Body**: `{ email: string, token: string }`
- **Funcionalidad**:
  - Busca token en base de datos
  - Verifica que no esté expirado
  - Verifica que no haya sido usado
  - Retorna validación

#### 3. **update-password-with-token**
- **Ruta**: `/functions/v1/update-password-with-token`
- **Método**: POST
- **Body**: `{ email: string, token: string, newPassword: string }`
- **Funcionalidad**:
  - Valida token nuevamente
  - Actualiza contraseña del usuario
  - Marca token como usado
  - Registra timestamp de uso

## 📧 Plantilla de Email

### Características del Email

1. **Header con Gradiente**
   - Logo de Barlive
   - Título claro: "Solicitud de restablecimiento de contraseña"

2. **Saludo Personalizado**
   - "Hola 👋"
   - Mensaje de confirmación de solicitud

3. **Token Destacado**
   - Código de 6 dígitos en fuente grande
   - Fondo con gradiente
   - Fácil de copiar

4. **Nota de Seguridad** (Amarillo)
   - 🔒 Icono de seguridad
   - Información sobre expiración (1 hora)
   - Instrucción para ignorar si no fue solicitado

5. **Advertencia de Seguridad** (Rojo)
   - ⚠️ Icono de advertencia
   - Qué hacer si no fue el usuario
   - Lista de recomendaciones:
     - Ignorar el correo
     - Cambiar contraseña inmediatamente
     - Contactar soporte

6. **Botón de Soporte**
   - Enlace directo a soporte@barliveapp.es
   - Diseño destacado con gradiente

7. **Footer**
   - Copyright
   - Enlaces a Política de Privacidad y Términos de Servicio
   - Nota sobre correo automático

## 🎨 Interfaz de Usuario

### Pantalla 1: Solicitar Código

**Elementos:**
- Header con gradiente
- Icono de email con escudo
- Título: "Recupera tu cuenta"
- Descripción clara
- Input de email con validación
- Botón "Enviar código de recuperación"
- Nota de seguridad

### Pantalla 2: Código Enviado

**Elementos:**
- Confirmación visual (icono de verificación)
- Email del usuario destacado
- Instrucciones paso a paso:
  1. Revisa tu correo
  2. Haz clic en el enlace
  3. Crea tu nueva contraseña
  4. ¡Listo!
- 6 inputs para el código
- Botón "Validar código y continuar"
- Consejos útiles
- Botón "Reenviar código"

### Pantalla 3: Nueva Contraseña

**Elementos:**
- Icono de candado con escudo
- Título: "Casi listo"
- Input de nueva contraseña (con mostrar/ocultar)
- Input de confirmar contraseña
- Requisitos de contraseña con checkmarks:
  - Mínimo 8 caracteres
  - Al menos una mayúscula
  - Al menos una minúscula
  - Al menos un número
- Botón "Actualizar contraseña"

## 🔒 Seguridad

### Medidas Implementadas

1. **No Revelación de Información**
   - Siempre retorna éxito al solicitar código
   - No indica si el email existe o no

2. **Expiración de Tokens**
   - 1 hora de validez
   - Limpieza automática de tokens expirados

3. **Un Solo Uso**
   - Token se marca como usado después de actualizar contraseña
   - No se puede reutilizar

4. **Validación de Email**
   - Formato de email validado
   - Normalización (lowercase, trim)

5. **Validación de Contraseña**
   - Mínimo 8 caracteres
   - Al menos una mayúscula
   - Al menos una minúscula
   - Al menos un número

6. **Auditoría**
   - Registro de IP y User Agent (opcional)
   - Timestamps de creación y uso
   - Logs detallados en Edge Functions

## 📱 Experiencia de Usuario

### Flujo Completo

1. **Usuario olvida contraseña**
   - Hace clic en "¿Olvidaste tu contraseña?"
   - Ingresa su email
   - Hace clic en "Enviar código"

2. **Recibe email**
   - Email llega en segundos
   - Diseño profesional y claro
   - Código destacado y fácil de copiar

3. **Ingresa código**
   - 6 inputs individuales
   - Auto-focus al siguiente input
   - Validación en tiempo real

4. **Crea nueva contraseña**
   - Requisitos claros
   - Feedback visual de cumplimiento
   - Confirmación de contraseña

5. **Confirmación**
   - Mensaje de éxito
   - Redirección a login
   - Puede iniciar sesión inmediatamente

### Manejo de Errores

- **Email inválido**: Mensaje claro de formato incorrecto
- **Código incorrecto**: Opción de reintentar o solicitar nuevo código
- **Código expirado**: Mensaje claro con opción de solicitar nuevo código
- **Contraseña débil**: Indicadores visuales de requisitos no cumplidos
- **Contraseñas no coinciden**: Mensaje claro de error

## 🚀 Despliegue

### Requisitos

1. **Supabase**
   - Proyecto configurado
   - Tabla `password_tokens` creada
   - Edge Functions desplegadas

2. **Resend**
   - Cuenta activa
   - API Key configurada
   - Dominio verificado (barliveapp.es)

3. **Variables de Entorno**
   ```
   SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
   RESEND_API_KEY=<tu-resend-api-key>
   ```

### Pasos de Despliegue

1. **Crear tabla en Supabase**
   ```sql
   -- Ejecutar en SQL Editor de Supabase
   CREATE TABLE password_tokens (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT NOT NULL,
     token TEXT NOT NULL,
     expires_at TIMESTAMPTZ NOT NULL,
     used BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     used_at TIMESTAMPTZ,
     ip_address TEXT,
     user_agent TEXT
   );

   CREATE INDEX idx_password_tokens_email ON password_tokens(email);
   CREATE INDEX idx_password_tokens_token ON password_tokens(token);
   CREATE INDEX idx_password_tokens_expires_at ON password_tokens(expires_at);
   ```

2. **Desplegar Edge Functions**
   ```bash
   # Desde la raíz del proyecto
   supabase functions deploy request-password-token
   supabase functions deploy validate-password-token
   supabase functions deploy update-password-with-token
   ```

3. **Configurar Variables de Entorno en Supabase**
   - Ir a Project Settings > Edge Functions
   - Agregar secrets:
     - `RESEND_API_KEY`

4. **Verificar Dominio en Resend**
   - Agregar registros DNS
   - Verificar dominio
   - Configurar "From" address: noreply@barliveapp.es

## 🧪 Pruebas

### Casos de Prueba

1. **Flujo Completo Exitoso**
   - Solicitar código con email válido
   - Recibir email
   - Ingresar código correcto
   - Crear nueva contraseña
   - Iniciar sesión

2. **Email No Registrado**
   - Solicitar código con email no registrado
   - Verificar que retorna éxito (seguridad)
   - Verificar que no se envía email

3. **Código Expirado**
   - Esperar más de 1 hora
   - Intentar usar código
   - Verificar mensaje de error

4. **Código Incorrecto**
   - Ingresar código incorrecto
   - Verificar mensaje de error
   - Verificar opción de reintentar

5. **Código Ya Usado**
   - Usar código exitosamente
   - Intentar usar el mismo código nuevamente
   - Verificar que no funciona

6. **Contraseña Débil**
   - Intentar contraseña sin mayúsculas
   - Intentar contraseña sin números
   - Intentar contraseña corta
   - Verificar mensajes de error

## 📊 Métricas y Monitoreo

### Métricas Importantes

1. **Tasa de Éxito**
   - % de tokens que resultan en cambio de contraseña exitoso

2. **Tiempo de Respuesta**
   - Tiempo desde solicitud hasta recepción de email

3. **Tasa de Expiración**
   - % de tokens que expiran sin ser usados

4. **Intentos Fallidos**
   - Número de intentos con código incorrecto

### Logs

- Todos los Edge Functions tienen logging detallado
- Formato: `[FunctionName] 🔍 ACTION`
- Incluye timestamps y datos relevantes

## 🔧 Mantenimiento

### Limpieza de Tokens Expirados

Crear un cron job para limpiar tokens expirados:

```sql
-- Ejecutar diariamente
DELETE FROM password_tokens
WHERE expires_at < NOW() - INTERVAL '7 days';
```

### Monitoreo de Uso

```sql
-- Tokens generados hoy
SELECT COUNT(*) FROM password_tokens
WHERE created_at >= CURRENT_DATE;

-- Tokens usados hoy
SELECT COUNT(*) FROM password_tokens
WHERE used = TRUE AND used_at >= CURRENT_DATE;

-- Tasa de éxito
SELECT 
  COUNT(CASE WHEN used = TRUE THEN 1 END)::FLOAT / COUNT(*)::FLOAT * 100 AS success_rate
FROM password_tokens
WHERE created_at >= CURRENT_DATE;
```

## 📞 Soporte

### Contacto
- Email: soporte@barliveapp.es
- Respuesta en 24-48 horas

### Problemas Comunes

1. **No recibo el email**
   - Revisar carpeta de spam
   - Verificar email correcto
   - Esperar unos minutos
   - Solicitar nuevo código

2. **Código no funciona**
   - Verificar que no haya expirado (1 hora)
   - Verificar que sea el código correcto
   - Solicitar nuevo código

3. **No puedo cambiar contraseña**
   - Verificar requisitos de contraseña
   - Verificar que las contraseñas coincidan
   - Contactar soporte

## 🎉 Conclusión

Este sistema proporciona una experiencia de usuario segura, profesional y fácil de usar para el restablecimiento de contraseñas en Barlive. El diseño del email y la interfaz de usuario están optimizados para claridad y usabilidad, mientras que las medidas de seguridad protegen contra ataques comunes.

---

**Versión**: 7.0  
**Última actualización**: Enero 2025  
**Autor**: Equipo Barlive
