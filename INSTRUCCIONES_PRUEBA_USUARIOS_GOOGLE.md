
# 🧪 Instrucciones de Prueba: Solución Usuarios de Google

## 📋 Preparación

Antes de empezar, asegúrate de tener:
- [ ] La app actualizada con los nuevos cambios
- [ ] Acceso al Dashboard de Supabase
- [ ] Acceso al correo de uno de los usuarios de Google (para verificar que llega el email)

## 🎯 Usuarios de Prueba Disponibles

Hay 4 usuarios con `provider: 'google'`:

1. **benxaque@gmail.com** - Benjamín Pérez
2. **jorgepereznoya@gmail.com** - Jorge Pérez
3. **almudenasanchezmourino@gmail.com** - Almudena Sanchez
4. **jorgepereznoyagh@gmail.com** - Jorge Pérez

**Recomendación:** Empieza con uno de estos usuarios para la prueba.

## 🧪 Prueba 1: Flujo desde Login

### Paso 1: Abrir la app
- Abre la aplicación BarLive
- Ve a la pantalla de "Iniciar sesión"

### Paso 2: Intentar iniciar sesión
- **Email:** `benxaque@gmail.com` (o cualquier otro usuario de Google)
- **Contraseña:** `cualquier_cosa` (no importa, no tiene contraseña configurada)
- Click en **"Iniciar sesión"**

### Paso 3: Verificar alerta
**✅ Resultado esperado:**
```
Título: "Usuario de Google"
Mensaje: "Anteriormente iniciaste sesión con Google. Para continuar, 
          necesitas configurar una contraseña para tu cuenta. 
          Te enviaremos un correo con instrucciones."
Botones: [Configurar contraseña] [Cancelar]
```

**❌ Si no aparece:**
- Verificar que el usuario tiene `provider = 'google'` en la base de datos
- Revisar los logs de la consola
- Verificar que la función `checkIfGoogleUser()` está funcionando

### Paso 4: Configurar contraseña
- Click en **"Configurar contraseña"**

**✅ Resultado esperado:**
- Se abre la pantalla `configurar-password-google.tsx`
- Muestra el email del usuario
- Muestra mensaje explicativo

### Paso 5: Enviar correo
- Click en **"Enviar correo de configuración"**

**✅ Resultado esperado:**
```
Título: "✅ Correo enviado"
Mensaje: "Hemos enviado un enlace a [email] para que puedas 
          configurar tu contraseña. Por favor, revisa tu bandeja 
          de entrada (y la carpeta de spam) y sigue las instrucciones."
Botón: [Entendido]
```

**❌ Si aparece error:**
- Verificar configuración SMTP en Supabase
- Revisar logs de Supabase (Dashboard → Logs)
- Verificar que el email existe en `auth.users`

### Paso 6: Verificar correo
- Abre el correo del usuario (ej: benxaque@gmail.com)
- Busca el correo de Supabase

**✅ Resultado esperado:**
- Correo de Supabase con asunto "Reset Your Password" o similar
- Contiene un enlace para configurar la contraseña
- El enlace apunta a Supabase

**❌ Si no llega el correo:**
- Revisar carpeta de spam
- Esperar 2-3 minutos (puede tardar)
- Verificar en Dashboard de Supabase → Authentication → Logs
- Verificar configuración de email templates

### Paso 7: Configurar contraseña
- Click en el enlace del correo
- Se abre página de Supabase
- Ingresa una nueva contraseña (mínimo 8 caracteres)
- Confirma la contraseña
- Click en "Update Password"

**✅ Resultado esperado:**
- Mensaje de éxito
- Redirige a `https://natively.dev/email-confirmed`

### Paso 8: Iniciar sesión con nueva contraseña
- Vuelve a la app
- Ve a "Iniciar sesión"
- **Email:** `benxaque@gmail.com`
- **Contraseña:** La que acabas de configurar
- Click en "Iniciar sesión"

**✅ Resultado esperado:**
- Login exitoso
- Redirige a la pantalla principal de la app
- Usuario puede usar la app normalmente

## 🧪 Prueba 2: Flujo desde Recuperar Contraseña

### Paso 1: Abrir recuperar contraseña
- Abre la app
- Ve a "Iniciar sesión"
- Click en **"¿Olvidaste tu contraseña?"**

### Paso 2: Ingresar email
- **Email:** `jorgepereznoya@gmail.com` (o cualquier otro usuario de Google)
- Click en **"Enviar enlace"**

### Paso 3: Verificar alerta
**✅ Resultado esperado:**
```
Título: "Usuario de Google"
Mensaje: "Tu cuenta fue creada con Google. Para poder iniciar sesión 
          con contraseña, primero necesitas configurar una."
Botones: [Configurar contraseña] [Cancelar]
```

### Paso 4: Continuar con configuración
- Click en **"Configurar contraseña"**
- Continúa con los pasos 4-8 de la Prueba 1

## 🧪 Prueba 3: Usuario Normal (No Google)

### Objetivo: Verificar que no afecta a usuarios normales

### Paso 1: Intentar con usuario normal
- Ve a "Iniciar sesión"
- Ingresa email de un usuario que NO sea de Google
- Ingresa contraseña incorrecta
- Click en "Iniciar sesión"

**✅ Resultado esperado:**
- Muestra error normal: "Email o contraseña incorrectos"
- NO muestra alerta de "Usuario de Google"

### Paso 2: Recuperar contraseña usuario normal
- Click en "¿Olvidaste tu contraseña?"
- Ingresa email de usuario normal
- Click en "Enviar enlace"

**✅ Resultado esperado:**
- Envía correo de reset normalmente
- NO redirige a configuración de Google

## 📊 Checklist de Verificación

### Funcionalidad:
- [ ] Detecta usuarios de Google en login
- [ ] Detecta usuarios de Google en recuperar contraseña
- [ ] Muestra alertas correctas
- [ ] Redirige a pantalla de configuración
- [ ] Envía correo correctamente
- [ ] Correo llega al usuario
- [ ] Enlace del correo funciona
- [ ] Usuario puede configurar contraseña
- [ ] Usuario puede iniciar sesión con nueva contraseña
- [ ] No afecta a usuarios normales

### UX:
- [ ] Mensajes claros y en español
- [ ] Botones bien etiquetados
- [ ] Flujo intuitivo
- [ ] Sin errores visuales
- [ ] Loading states funcionan

### Seguridad:
- [ ] Requiere acceso al email
- [ ] Enlace expira después de 24h
- [ ] No expone información sensible
- [ ] Usa sistema oficial de Supabase

## 🐛 Problemas Comunes y Soluciones

### Problema 1: No aparece la alerta de "Usuario de Google"

**Posibles causas:**
1. Usuario no tiene `provider = 'google'` en la base de datos
2. Error en la función `checkIfGoogleUser()`
3. Error de red

**Solución:**
```sql
-- Verificar en Supabase:
SELECT id, email, provider FROM usuarios WHERE email = 'benxaque@gmail.com';
```

**Debe mostrar:** `provider: 'google'`

### Problema 2: No llega el correo

**Posibles causas:**
1. Configuración SMTP incorrecta
2. Email en spam
3. Email no existe en auth.users
4. Rate limiting de Supabase

**Solución:**
1. Verificar en Dashboard → Authentication → Email Templates
2. Revisar carpeta de spam
3. Verificar:
```sql
SELECT * FROM auth.users WHERE email = 'benxaque@gmail.com';
```
4. Esperar 5 minutos y reintentar

### Problema 3: El enlace del correo no funciona

**Posibles causas:**
1. URL no está en lista de URLs permitidas
2. Enlace expirado (>24h)
3. Error en redirect URL

**Solución:**
1. Verificar en Dashboard → Authentication → URL Configuration
2. Debe incluir: `https://natively.dev/email-confirmed`
3. Generar nuevo enlace

### Problema 4: Error al configurar contraseña

**Posibles causas:**
1. Contraseña muy corta (<8 caracteres)
2. Token inválido o expirado
3. Error de red

**Solución:**
1. Usar contraseña de al menos 8 caracteres
2. Generar nuevo enlace
3. Verificar conexión a internet

## 📝 Registro de Pruebas

### Prueba 1: Login
- **Fecha:** ___________
- **Usuario:** ___________
- **Resultado:** ☐ Exitoso ☐ Fallido
- **Notas:** ___________

### Prueba 2: Recuperar Contraseña
- **Fecha:** ___________
- **Usuario:** ___________
- **Resultado:** ☐ Exitoso ☐ Fallido
- **Notas:** ___________

### Prueba 3: Usuario Normal
- **Fecha:** ___________
- **Usuario:** ___________
- **Resultado:** ☐ Exitoso ☐ Fallido
- **Notas:** ___________

## 🎯 Criterios de Éxito

La solución se considera exitosa si:

✅ **Detección:**
- Detecta correctamente usuarios de Google
- No afecta a usuarios normales

✅ **UX:**
- Mensajes claros y comprensibles
- Flujo intuitivo y sin confusión
- Botones funcionan correctamente

✅ **Funcionalidad:**
- Correos se envían correctamente
- Correos llegan al usuario
- Enlaces funcionan
- Usuario puede configurar contraseña
- Usuario puede iniciar sesión después

✅ **Seguridad:**
- Sistema seguro
- No expone información sensible
- Usa métodos oficiales de Supabase

## 📞 Soporte

Si encuentras problemas durante las pruebas:

1. **Revisar logs de la consola** en la app
2. **Revisar logs de Supabase** en el Dashboard
3. **Consultar documentación:**
   - `GOOGLE_USER_EMAIL_FIX.md` - Documentación técnica
   - `GUIA_RAPIDA_USUARIOS_GOOGLE.md` - Guía rápida
   - `RESUMEN_SOLUCION_USUARIOS_GOOGLE.md` - Resumen ejecutivo

## ✅ Después de las Pruebas

Una vez que las pruebas sean exitosas:

1. **Comunicar a los 4 usuarios** el cambio
2. **Ofrecer soporte** durante la transición
3. **Monitorear** que completen el proceso
4. **Documentar** cualquier problema encontrado
5. **Ajustar** si es necesario

---

**¡Buena suerte con las pruebas!** 🚀

Si todo funciona correctamente, los usuarios de Google podrán configurar su contraseña y recibir correos sin problemas.
