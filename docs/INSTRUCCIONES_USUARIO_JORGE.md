
# Instrucciones para Jorge (jorgepereznoyagh@gmail.com)

## ¡Hola Jorge!

Tu cuenta fue creada anteriormente con "Continuar con Google", pero esa opción ya no está disponible. Para poder iniciar sesión ahora, necesitas configurar una contraseña. Es muy fácil, sigue estos pasos:

## Pasos para Configurar tu Contraseña

### 1. Ve a la Página de Inicio de Sesión

Abre tu navegador y ve a:
```
https://barliveapp.es/auth/login
```

### 2. Ingresa tu Correo Electrónico

En el campo de correo electrónico, escribe:
```
jorgepereznoyagh@gmail.com
```

### 3. Haz Clic en "¿Olvidaste tu contraseña?"

No intentes poner una contraseña todavía. En lugar de eso, haz clic en el enlace que dice **"¿Olvidaste tu contraseña?"**

### 4. Revisa tu Correo Electrónico

Te enviaremos un correo a `jorgepereznoyagh@gmail.com` con el asunto:
```
Restablece tu contraseña - BarLive
```

**⚠️ IMPORTANTE**: 
- Revisa tu **carpeta de SPAM** si no lo ves en la bandeja de entrada
- El correo viene de: `noreply@mail.app.supabase.io`
- Puede tardar unos minutos en llegar

### 5. Abre el Correo y Haz Clic en el Enlace

Dentro del correo, encontrarás un botón o enlace que dice algo como:
```
Restablecer contraseña
```

Haz clic en ese enlace.

### 6. Configura tu Nueva Contraseña

Se abrirá una página donde podrás:
- Escribir tu nueva contraseña (mínimo 8 caracteres)
- Confirmar tu nueva contraseña

**Consejo**: Usa una contraseña segura que recuerdes fácilmente.

### 7. ¡Listo!

Una vez configurada tu contraseña, ya puedes:
- Ir a https://barliveapp.es/auth/login
- Ingresar tu correo: `jorgepereznoyagh@gmail.com`
- Ingresar tu nueva contraseña
- ¡Disfrutar de BarLive!

## ¿Problemas?

### No me llega el correo

1. **Espera 2-3 minutos** - A veces tarda un poco
2. **Revisa la carpeta de SPAM** - Es muy común que vaya ahí
3. **Revisa la carpeta de Promociones** (si usas Gmail)
4. **Intenta de nuevo** - Puedes solicitar otro correo después de 60 segundos

### El enlace no funciona

1. **Verifica que no haya expirado** - Los enlaces duran 24 horas
2. **Copia y pega el enlace** en el navegador en lugar de hacer clic
3. **Solicita un nuevo enlace** si ya pasaron 24 horas

### Otros problemas

Si tienes cualquier otro problema, por favor:
1. Toma una captura de pantalla del error
2. Envíala al soporte de BarLive
3. Menciona que eres un "usuario de Google que necesita configurar contraseña"

## Información Técnica (para el desarrollador)

### Estado Actual de la Cuenta

```sql
-- Usuario existe en auth.users
id: 4f3ce732-f479-43f2-acb2-e92831c6bec0
email: jorgepereznoyagh@gmail.com
email_confirmed_at: 2025-11-01 02:17:23.164416+00
provider: Google (iss: https://accounts.google.com)
```

### Logs Relevantes

Los logs muestran que:
- El usuario intentó registrarse nuevamente
- Se enviaron correos de verificación (status 200)
- Los correos fueron enviados a `jorgepereznoyagy@gmail.com` (nota el typo)
- El correo correcto es `jorgepereznoyagh@gmail.com`

### Solución

El usuario debe usar el flujo de "Olvidé mi contraseña" para configurar una contraseña, ya que:
1. Su cuenta ya está verificada (via Google)
2. Supabase no envía correos de verificación a cuentas ya verificadas
3. El flujo de "Reset Password" es el único que funciona para este caso

## Resumen

**En pocas palabras:**
1. Ve a https://barliveapp.es/auth/login
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Revisa tu correo (y la carpeta de spam)
4. Haz clic en el enlace del correo
5. Configura tu nueva contraseña
6. ¡Listo!

**Tiempo estimado**: 5 minutos

**Dificultad**: Muy fácil ⭐

---

Si sigues estos pasos, podrás acceder a tu cuenta sin problemas. ¡Gracias por tu paciencia!
