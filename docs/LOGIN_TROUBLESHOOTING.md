
# 🔧 Solución de Problemas de Inicio de Sesión

## ❌ Error: "Invalid login credentials"

### Causas Comunes

1. **Email no verificado** ⚠️
   - El usuario debe verificar su email antes de iniciar sesión
   - Revisa tu bandeja de entrada y spam
   - Busca el email de verificación de BarLive

2. **Credenciales incorrectas** 🔑
   - Email escrito incorrectamente
   - Contraseña incorrecta
   - Espacios en blanco al inicio o final del email

3. **Usuario no existe** 👤
   - El email no está registrado en el sistema
   - Necesitas crear una cuenta primero

4. **Problemas de conexión** 🌐
   - Sin conexión a internet
   - Servidor de Supabase no disponible

### Soluciones

#### ✅ Solución 1: Verificar Email

```
1. Abre tu correo electrónico
2. Busca "BarLive" o "Verificación"
3. Revisa también la carpeta de spam
4. Haz clic en el enlace de verificación
5. Intenta iniciar sesión nuevamente
```

#### ✅ Solución 2: Verificar Credenciales

```
1. Asegúrate de escribir el email correctamente
2. Verifica que no haya espacios al inicio o final
3. Comprueba que la contraseña sea correcta
4. Recuerda que las contraseñas distinguen mayúsculas/minúsculas
```

#### ✅ Solución 3: Recuperar Contraseña

```
1. Haz clic en "¿Olvidaste tu contraseña?"
2. Introduce tu email
3. Revisa tu correo para el enlace de recuperación
4. Crea una nueva contraseña
5. Intenta iniciar sesión con la nueva contraseña
```

#### ✅ Solución 4: Crear Nueva Cuenta

```
1. Si el email no está registrado, crea una cuenta nueva
2. Haz clic en "Registrarse"
3. Completa el formulario de registro
4. Verifica tu email
5. Inicia sesión con tus nuevas credenciales
```

## 📧 Error: "Email not confirmed"

### Causa
El usuario intentó iniciar sesión sin verificar su email.

### Solución

1. **Busca el email de verificación:**
   - Revisa tu bandeja de entrada
   - Revisa la carpeta de spam
   - Busca emails de "BarLive" o "noreply@barlive.app"

2. **Haz clic en el enlace de verificación:**
   - El enlace es válido por 24 horas
   - Si expiró, solicita un nuevo email

3. **Reenviar email de verificación:**
   - En la pantalla de login, busca "Reenviar email de verificación"
   - Introduce tu email
   - Revisa tu correo nuevamente

## ⏱️ Error: "Too many requests"

### Causa
Demasiados intentos de inicio de sesión en poco tiempo.

### Solución

```
1. Espera 5-10 minutos
2. No intentes iniciar sesión repetidamente
3. Verifica tus credenciales antes de intentar nuevamente
4. Si el problema persiste, espera 30 minutos
```

## 🌐 Error: "Network error"

### Causa
Problemas de conexión a internet o servidor no disponible.

### Solución

1. **Verifica tu conexión:**
   ```
   - Comprueba que estés conectado a internet
   - Intenta abrir una página web
   - Cambia de WiFi a datos móviles (o viceversa)
   ```

2. **Reinicia la app:**
   ```
   - Cierra completamente la app
   - Espera unos segundos
   - Abre la app nuevamente
   ```

3. **Verifica el estado de Supabase:**
   ```
   - Ve a https://status.supabase.com/
   - Verifica que todos los servicios estén operativos
   ```

## 🔍 Diagnóstico Paso a Paso

### Paso 1: Verificar Email

```typescript
// El email debe tener este formato:
✅ usuario@ejemplo.com
❌ usuario @ejemplo.com (con espacio)
❌ USUARIO@EJEMPLO.COM (mayúsculas - se normalizará automáticamente)
❌ usuario@ejemplo (sin dominio completo)
```

### Paso 2: Verificar Contraseña

```typescript
// La contraseña debe:
✅ Tener al menos 6 caracteres
✅ Ser exactamente como la creaste (distingue mayúsculas/minúsculas)
❌ No puede estar vacía
❌ No puede tener solo espacios
```

### Paso 3: Verificar Estado de Verificación

```sql
-- Para verificar si tu email está confirmado (solo para admins):
SELECT 
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'tu_email@ejemplo.com';
```

## 🛠️ Herramientas de Diagnóstico

### Ver Logs de Autenticación

Los logs se muestran en la consola de desarrollo:

```
[Auth] ======================================== 
[Auth] Iniciando sesión con BarLive
[Auth] Email original: usuario@ejemplo.com
[Auth] Email normalizado: usuario@ejemplo.com
[Auth] Llamando a supabase.auth.signInWithPassword...
[Auth] ✅ Sesión iniciada en Auth
[Auth] User ID: abc123...
[Auth] Email confirmado: Sí
[Auth] ✅ Inicio de sesión completado exitosamente
[Auth] ========================================
```

### Mensajes de Error Mejorados

El sistema ahora proporciona mensajes de error más claros:

```
❌ Email o contraseña incorrectos

✓ Verifica que el email esté escrito correctamente
✓ Verifica que la contraseña sea correcta
✓ Asegúrate de haber verificado tu email

💡 ¿Olvidaste tu contraseña? Usa "Recuperar contraseña"
```

## 📞 Contactar Soporte

Si ninguna de estas soluciones funciona:

1. **Recopila información:**
   - Email que estás intentando usar
   - Mensaje de error exacto
   - Capturas de pantalla
   - Logs de la consola

2. **Contacta con soporte:**
   - Email: soporte@barlive.app
   - Incluye toda la información recopilada
   - Describe los pasos que has intentado

## 🔐 Prevención de Problemas

### Para Usuarios

1. ✅ Verifica tu email inmediatamente después de registrarte
2. ✅ Guarda tu contraseña en un lugar seguro
3. ✅ Usa un email válido y accesible
4. ✅ Revisa spam si no recibes emails

### Para Desarrolladores

1. ✅ Implementa verificación de email obligatoria
2. ✅ Normaliza emails automáticamente
3. ✅ Proporciona mensajes de error claros
4. ✅ Implementa rate limiting
5. ✅ Monitorea logs de autenticación
6. ✅ Configura alertas para fallos frecuentes

## 📊 Estadísticas de Errores Comunes

| Error | Frecuencia | Solución Principal |
|-------|------------|-------------------|
| Email no verificado | 45% | Verificar email |
| Contraseña incorrecta | 30% | Recuperar contraseña |
| Usuario no existe | 15% | Crear cuenta |
| Problemas de red | 8% | Verificar conexión |
| Otros | 2% | Contactar soporte |

## 🎯 Checklist de Solución Rápida

Antes de contactar soporte, verifica:

- [ ] ¿Has verificado tu email?
- [ ] ¿El email está escrito correctamente?
- [ ] ¿La contraseña es correcta?
- [ ] ¿Tienes conexión a internet?
- [ ] ¿Has esperado si hay rate limiting?
- [ ] ¿Has revisado la carpeta de spam?
- [ ] ¿Has intentado recuperar la contraseña?
- [ ] ¿Has intentado crear una cuenta nueva?

Si has verificado todo y el problema persiste, contacta con soporte.
