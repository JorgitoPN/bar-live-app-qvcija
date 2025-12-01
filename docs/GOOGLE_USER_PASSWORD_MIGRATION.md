
# Migración de Usuarios de Google a Email/Password

## Problema

Los usuarios que se registraron con "Continuar con Google" (funcionalidad que ya no está disponible) no pueden recibir correos de verificación cuando intentan registrarse nuevamente con email/password porque:

1. Sus cuentas ya están verificadas en Supabase (via Google OAuth)
2. Supabase no envía correos de verificación a cuentas ya verificadas
3. Estos usuarios no tienen contraseña configurada

## Usuarios Afectados

Actualmente hay **5 usuarios** que se registraron con Google:

- jorgepereznoyagh@gmail.com
- (y 4 más)

## Solución Implementada

### 1. Detección Automática

El sistema ahora detecta automáticamente si un usuario intentando iniciar sesión es un usuario de Google:

```typescript
const checkIfGoogleUser = async (email: string): Promise<boolean> => {
  const { data } = await supabase
    .from('usuarios')
    .select('provider')
    .eq('email', email)
    .maybeSingle();

  return data?.provider === 'google';
};
```

### 2. Flujo de Configuración de Contraseña

Cuando se detecta un usuario de Google, el sistema:

1. Muestra un mensaje explicativo
2. Ofrece enviar un correo de "restablecimiento de contraseña"
3. El usuario recibe el correo y puede configurar su contraseña
4. Una vez configurada, puede iniciar sesión con email/password

### 3. Páginas Actualizadas

#### `app/auth/login.tsx`
- Detecta usuarios de Google
- Redirige a la página de configuración de contraseña

#### `app/auth/registro-email.tsx`
- Detecta usuarios de Google existentes
- Ofrece reenviar correo de configuración

#### `app/auth/configurar-password-google.tsx` (NUEVA)
- Página dedicada para usuarios de Google
- Envía correo de restablecimiento de contraseña
- Instrucciones claras paso a paso

## Instrucciones para Usuarios

### Para jorgepereznoyagh@gmail.com y otros usuarios de Google:

1. **Ve a la página de inicio de sesión**
   - https://barliveapp.es/auth/login

2. **Ingresa tu correo electrónico**
   - jorgepereznoyagh@gmail.com

3. **Haz clic en "¿Olvidaste tu contraseña?"**
   - O intenta iniciar sesión y el sistema te guiará

4. **Recibirás un correo**
   - Asunto: "Restablece tu contraseña"
   - De: noreply@mail.app.supabase.io
   - **IMPORTANTE**: Revisa tu carpeta de spam

5. **Haz clic en el enlace del correo**
   - El enlace es válido por 24 horas

6. **Configura tu nueva contraseña**
   - Mínimo 8 caracteres
   - Confirma la contraseña

7. **¡Listo!**
   - Ya puedes iniciar sesión con tu email y contraseña

## Verificación del Correo

Si el usuario dice que no le llega el correo, verifica:

### 1. Logs de Supabase

```bash
# Buscar en los logs de Auth
# Debe aparecer: "mail.send" con "mail_type":"recovery"
```

### 2. Estado del Usuario en la Base de Datos

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  recovery_sent_at,
  raw_user_meta_data->>'iss' as provider
FROM auth.users 
WHERE email = 'jorgepereznoyagh@gmail.com';
```

### 3. Configuración de Email en Supabase

- **Path**: Authentication → Email Templates
- Verificar que la plantilla "Reset Password" esté configurada
- Verificar que los emails no estén siendo bloqueados

## Solución de Problemas

### El correo no llega

1. **Verificar carpeta de spam**
   - Los correos de Supabase a veces van a spam

2. **Verificar que el correo se envió**
   - Revisar logs de Supabase Auth
   - Buscar `mail.send` con `mail_type: recovery`

3. **Reenviar el correo**
   - El usuario puede hacer clic en "Reenviar correo" después de 60 segundos

4. **Verificar configuración de Supabase**
   - Authentication → Email → Verificar que esté habilitado
   - Authentication → Email Templates → Verificar plantilla "Reset Password"

### El enlace no funciona

1. **Verificar que no haya expirado**
   - Los enlaces expiran en 24 horas

2. **Verificar redirect URLs**
   - Debe incluir: `https://natively.dev/email-confirmed`

3. **Solicitar un nuevo enlace**
   - El usuario puede solicitar un nuevo correo

## Alternativa: Configuración Manual

Si el correo no llega, puedes configurar la contraseña manualmente:

### Opción 1: Desde Supabase Dashboard

1. Ve a Authentication → Users
2. Busca el usuario por email
3. Haz clic en el usuario
4. Haz clic en "Send password recovery"
5. O usa "Update user" para establecer una contraseña

### Opción 2: Desde SQL

```sql
-- NO RECOMENDADO: Esto requiere hashear la contraseña manualmente
-- Es mejor usar el flujo de restablecimiento de contraseña
```

## Prevención Futura

Para evitar este problema en el futuro:

1. **No eliminar métodos de autenticación** sin migrar usuarios primero
2. **Notificar a los usuarios** antes de cambios en autenticación
3. **Proporcionar un período de transición** para que los usuarios migren
4. **Mantener documentación** de todos los métodos de autenticación usados

## Estadísticas

- **Total de usuarios de Google**: 5
- **Usuarios con email confirmado**: 5
- **Usuarios que necesitan configurar contraseña**: 5

## Contacto

Si tienes problemas con la migración:

1. Intenta el flujo de "Olvidé mi contraseña"
2. Revisa tu carpeta de spam
3. Espera 60 segundos entre intentos
4. Si el problema persiste, contacta a soporte

## Notas Técnicas

### Por qué no se envían correos de verificación

Supabase no envía correos de verificación a usuarios que ya tienen `email_confirmed_at` establecido. Los usuarios de Google tienen este campo establecido porque Google ya verificó su email.

### Por qué usamos "Reset Password"

El flujo de "Reset Password" es el único que funciona para usuarios ya confirmados. Permite establecer una contraseña sin requerir la contraseña anterior.

### Seguridad

El flujo de restablecimiento de contraseña es seguro porque:

1. Requiere acceso al correo electrónico
2. Los enlaces expiran en 24 horas
3. Los enlaces son de un solo uso
4. Se registra en los logs de Supabase

## Conclusión

Este problema afecta a usuarios que se registraron con Google antes de que se eliminara esa funcionalidad. La solución es usar el flujo de "Restablecimiento de contraseña" para que puedan configurar una contraseña y continuar usando la aplicación.
