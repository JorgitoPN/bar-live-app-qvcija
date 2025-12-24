
# 🚀 Quick Start: Probar Sistema de Verificación con Token

## ⚡ Prueba Rápida (5 minutos)

### 1. Registrar un Usuario de Prueba

1. Abre la app BarLive
2. Toca "Regístrate gratis"
3. Completa el formulario:
   ```
   Nombre: Test Usuario
   Email: tu-email@ejemplo.com
   Contraseña: Test1234
   Confirmar: Test1234
   ```
4. Acepta términos y condiciones
5. Toca "Crear cuenta"

### 2. Verificar que el Email se Envió

**En la app:**
- Deberías ver un mensaje: "¡Cuenta creada!"
- Serás redirigido a la pantalla de verificación

**En tu correo:**
- Busca un email de "BarLive <noreply@barliveapp.es>"
- Asunto: "🎉 Verifica tu cuenta de Barlive"
- Deberías recibirlo en menos de 1 minuto

**Si no lo recibes:**
- Revisa tu carpeta de spam
- Espera 2-3 minutos
- Toca "Reenviar código" en la app

### 3. Introducir el Código

1. Abre el correo de BarLive
2. Copia el código de 6 dígitos (ejemplo: 123456)
3. En la app, introduce el código en los 6 campos
4. El código se validará automáticamente
5. Toca "Verificar cuenta"

### 4. Confirmar Verificación

**Deberías ver:**
- Mensaje: "✅ ¡Cuenta verificada!"
- Texto: "Tu cuenta ha sido verificada exitosamente"
- Botón: "Ir a iniciar sesión"

**Toca el botón y:**
- Serás redirigido a la pantalla de login
- Podrás iniciar sesión con tu email y contraseña

## 🔍 Verificación en Base de Datos

### Ver el Token Generado

```sql
SELECT 
  email,
  token,
  used,
  expires_at,
  created_at
FROM verification_tokens
WHERE email = 'tu-email@ejemplo.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Deberías ver:**
- `email`: tu-email@ejemplo.com
- `token`: 123456 (6 dígitos)
- `used`: true (después de verificar)
- `expires_at`: 1 hora después de created_at
- `created_at`: timestamp de creación

### Ver el Usuario Verificado

```sql
SELECT 
  id,
  email,
  nombre,
  email_verified,
  fecha_registro
FROM usuarios
WHERE email = 'tu-email@ejemplo.com';
```

**Deberías ver:**
- `email_verified`: true (después de verificar)
- `nombre`: Test Usuario
- `fecha_registro`: timestamp de registro

### Ver en Auth.Users

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'tu-email@ejemplo.com';
```

**Deberías ver:**
- `email_confirmed_at`: timestamp (después de verificar)
- `email`: tu-email@ejemplo.com

## 🧪 Casos de Prueba

### Caso 1: Flujo Normal ✅
1. Registrar usuario
2. Recibir email
3. Introducir código correcto
4. Cuenta verificada
5. Login exitoso

**Resultado esperado:** ✅ Todo funciona

### Caso 2: Token Inválido ❌
1. Registrar usuario
2. Introducir código incorrecto (999999)
3. Tocar "Verificar cuenta"

**Resultado esperado:** 
- ❌ Error: "Código inválido"
- Opción de "Solicitar nuevo código"

### Caso 3: Token Expirado ⏰
1. Registrar usuario
2. Esperar 1 hora (o forzar expiración en BD)
3. Introducir código

**Resultado esperado:**
- ❌ Error: "El código ha expirado"
- Opción de "Solicitar nuevo código"

**Forzar expiración:**
```sql
UPDATE verification_tokens
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE email = 'tu-email@ejemplo.com'
  AND used = false;
```

### Caso 4: Reenvío de Código 🔄
1. Registrar usuario
2. En pantalla de verificación, tocar "Reenviar código"
3. Esperar nuevo email
4. Introducir nuevo código

**Resultado esperado:**
- ✅ Nuevo email recibido
- ✅ Nuevo código funciona
- ✅ Código anterior invalidado

### Caso 5: Usuario Ya Verificado ✅
1. Verificar un usuario
2. Intentar solicitar nuevo código de verificación

**Resultado esperado:**
- ❌ Error: "El email ya está verificado"

### Caso 6: Login Sin Verificar 🔐
1. Registrar usuario pero NO verificar
2. Intentar iniciar sesión

**Resultado esperado:**
- ❌ Error: "Email no verificado"
- Opción de "Verificar ahora"
- Al tocar, se envía código y redirige a verificación

## 📧 Verificar Email

### Elementos a Comprobar

**Header:**
- ✅ Gradiente teal → cyan
- ✅ Logo/título "🎉 Barlive"
- ✅ Subtítulo "¡Bienvenido a la comunidad!"

**Cuerpo:**
- ✅ Saludo "¡Hola! 👋"
- ✅ Mensaje de bienvenida
- ✅ Código de 6 dígitos en grande
- ✅ Instrucciones numeradas (1, 2, 3)

**Seguridad:**
- ✅ Nota sobre expiración (1 hora)
- ✅ Advertencia si no fue solicitado

**Footer:**
- ✅ Copyright con año actual
- ✅ Enlaces a privacidad y términos
- ✅ Nota de correo automático

## 🔧 Troubleshooting Rápido

### Problema: No recibo el email

**Solución rápida:**
```sql
-- 1. Verificar que el token se creó
SELECT * FROM verification_tokens 
WHERE email = 'tu-email@ejemplo.com' 
ORDER BY created_at DESC LIMIT 1;

-- 2. Si existe, el problema es de entrega de email
-- Revisar logs de request-verification-token en Supabase Dashboard
```

### Problema: Código no funciona

**Solución rápida:**
```sql
-- Verificar estado del token
SELECT 
  token,
  used,
  expires_at > NOW() as es_valido,
  expires_at,
  created_at
FROM verification_tokens
WHERE email = 'tu-email@ejemplo.com'
  AND token = '123456';
```

### Problema: Error al verificar

**Solución rápida:**
```sql
-- Verificar manualmente
UPDATE usuarios
SET email_verified = true
WHERE email = 'tu-email@ejemplo.com';

-- Luego el usuario puede iniciar sesión
```

## 📱 Capturas de Pantalla Esperadas

### 1. Pantalla de Registro
- Formulario con nombre, email, contraseña
- Checkbox de términos
- Botón "Crear cuenta"

### 2. Pantalla de Verificación
- 6 campos de entrada para dígitos
- Instrucciones paso a paso
- Botón "Verificar cuenta"
- Botón "Reenviar código"

### 3. Email Recibido
- Header con gradiente
- Código de 6 dígitos destacado
- Instrucciones claras
- Notas de seguridad

### 4. Confirmación
- Icono de check verde
- Mensaje "¡Cuenta verificada!"
- Botón "Ir a iniciar sesión"

## ⏱️ Tiempos Esperados

- **Registro → Email enviado:** < 5 segundos
- **Email enviado → Email recibido:** < 1 minuto
- **Introducir código → Validación:** < 2 segundos
- **Validación → Verificación:** < 2 segundos
- **Proceso completo:** < 2 minutos

## 🎯 Criterios de Éxito

### El sistema funciona correctamente si:
- ✅ Los emails se reciben en menos de 1 minuto
- ✅ Los códigos válidos verifican la cuenta
- ✅ Los códigos inválidos muestran error apropiado
- ✅ Los códigos expirados se rechazan
- ✅ El reenvío genera nuevos códigos
- ✅ Los usuarios verificados pueden iniciar sesión
- ✅ Los usuarios no verificados no pueden iniciar sesión

## 🆘 Soporte

### Si algo no funciona:

1. **Revisar logs:**
   - Supabase Dashboard → Edge Functions → Logs
   - Buscar errores con ❌

2. **Verificar configuración:**
   - RESEND_API_KEY configurada
   - Dominio verificado en Resend
   - Edge Functions desplegadas

3. **Contactar soporte:**
   - Email: soporte@barliveapp.es
   - Incluir: email de prueba, hora del intento, error recibido

## 📊 Métricas a Monitorear

Después de la prueba, verificar:

```sql
-- Resumen de la prueba
SELECT 
  'Tokens generados' as metrica,
  COUNT(*)::text as valor
FROM verification_tokens
WHERE created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
  'Tokens usados',
  COUNT(*)::text
FROM verification_tokens
WHERE used = true
  AND created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
  'Usuarios verificados',
  COUNT(*)::text
FROM usuarios
WHERE email_verified = true
  AND fecha_registro > NOW() - INTERVAL '1 hour';
```

## ✅ Checklist de Prueba

- [ ] Usuario puede registrarse
- [ ] Email se recibe en menos de 1 minuto
- [ ] Email tiene diseño correcto
- [ ] Código de 6 dígitos es visible
- [ ] Código se puede copiar fácilmente
- [ ] Campos de token funcionan correctamente
- [ ] Auto-focus entre campos funciona
- [ ] Validación muestra feedback visual
- [ ] Código correcto verifica la cuenta
- [ ] Código incorrecto muestra error
- [ ] Reenvío genera nuevo código
- [ ] Usuario verificado puede iniciar sesión
- [ ] Usuario no verificado no puede iniciar sesión
- [ ] Login ofrece verificar si no está verificado

## 🎊 ¡Listo!

Si todos los checks están marcados, el sistema está funcionando perfectamente.

---

**Tiempo estimado de prueba:** 5-10 minutos
**Dificultad:** Fácil
**Requisitos:** Email válido, app BarLive instalada
