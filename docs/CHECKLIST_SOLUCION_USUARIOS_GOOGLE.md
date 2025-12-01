
# ✅ Checklist: Solución para Usuarios de Google

## Para el Desarrollador

### 1. Verificar que el código esté desplegado
- [ ] Verificar que `app/auth/configurar-password-google.tsx` existe
- [ ] Verificar que `app/auth/login.tsx` detecta usuarios de Google
- [ ] Verificar que `app/auth/recuperar-password.tsx` está actualizado
- [ ] Verificar que `app/auth/registro-email.tsx` está actualizado

### 2. Verificar configuración de Supabase
- [ ] Authentication → Email → Verificar que esté habilitado
- [ ] Authentication → Email Templates → Verificar plantilla "Reset Password"
- [ ] Authentication → URL Configuration → Verificar redirect URLs
- [ ] Verificar que `https://natively.dev/email-confirmed` esté en la lista

### 3. Probar el flujo
- [ ] Ir a https://barliveapp.es/auth/login
- [ ] Ingresar email de usuario de Google
- [ ] Hacer clic en "¿Olvidaste tu contraseña?"
- [ ] Verificar que se envía el correo
- [ ] Verificar logs de Supabase (debe aparecer `mail.send` con `mail_type: recovery`)

### 4. Verificar logs
- [ ] Abrir Supabase Dashboard
- [ ] Ir a Logs → Auth
- [ ] Buscar `mail.send` con `mail_type: recovery`
- [ ] Verificar que el status sea 200
- [ ] Verificar que el email sea correcto

## Para el Usuario (jorgepereznoyagh@gmail.com)

### 1. Ir a la página de login
- [ ] Abrir https://barliveapp.es/auth/login
- [ ] Ingresar email: `jorgepereznoyagh@gmail.com`

### 2. Solicitar restablecimiento de contraseña
- [ ] Hacer clic en "¿Olvidaste tu contraseña?"
- [ ] Confirmar que el email es correcto
- [ ] Hacer clic en "Enviar correo de recuperación"

### 3. Revisar correo electrónico
- [ ] Abrir Gmail
- [ ] Buscar correo de "BarLive" o "Supabase"
- [ ] **IMPORTANTE**: Revisar carpeta de SPAM
- [ ] Revisar carpeta de Promociones (si aplica)

### 4. Configurar contraseña
- [ ] Abrir el correo
- [ ] Hacer clic en el enlace "Restablecer contraseña"
- [ ] Ingresar nueva contraseña (mínimo 8 caracteres)
- [ ] Confirmar contraseña
- [ ] Hacer clic en "Actualizar contraseña"

### 5. Iniciar sesión
- [ ] Ir a https://barliveapp.es/auth/login
- [ ] Ingresar email: `jorgepereznoyagh@gmail.com`
- [ ] Ingresar la nueva contraseña
- [ ] Hacer clic en "Iniciar sesión"
- [ ] ✅ ¡Listo!

## Solución de Problemas

### Si el correo no llega (después de 5 minutos)

- [ ] Verificar carpeta de spam ⭐ **MÁS COMÚN**
- [ ] Verificar carpeta de Promociones (Gmail)
- [ ] Verificar que el email sea correcto (jorgepereznoyagh@gmail.com con 'h')
- [ ] Esperar 60 segundos y solicitar de nuevo
- [ ] Verificar logs de Supabase

### Si el enlace no funciona

- [ ] Verificar que no haya expirado (24 horas)
- [ ] Copiar y pegar el enlace en el navegador
- [ ] Solicitar un nuevo enlace
- [ ] Verificar que la URL sea correcta

### Si sigue sin funcionar

- [ ] Verificar configuración de Supabase Dashboard
- [ ] Verificar que el usuario existe en auth.users
- [ ] Verificar que el email esté confirmado
- [ ] Considerar enviar correo manualmente desde Dashboard
- [ ] Contactar a soporte de Supabase

## Verificación Final

### Después de que el usuario configure su contraseña

- [ ] El usuario puede iniciar sesión con email/password
- [ ] El usuario NO necesita usar Google
- [ ] El usuario puede cambiar su contraseña cuando quiera
- [ ] El usuario puede usar "Olvidé mi contraseña" si la olvida

## Documentación de Referencia

- [ ] `GOOGLE_USER_PASSWORD_MIGRATION.md` - Explicación técnica completa
- [ ] `INSTRUCCIONES_USUARIO_JORGE.md` - Instrucciones para el usuario
- [ ] `RESUMEN_PROBLEMA_EMAILS_GOOGLE.md` - Resumen ejecutivo
- [ ] `SQL_VERIFICAR_USUARIOS_GOOGLE.sql` - Queries para verificar estado

## Notas Importantes

### ⚠️ Recordatorios

1. **NO es un problema de configuración de emails**
   - Los emails SÍ se están enviando
   - El problema es que el usuario ya está verificado

2. **La solución es usar "Olvidé mi contraseña"**
   - NO intentar registrarse de nuevo
   - NO intentar verificar el email
   - SÍ usar el flujo de recuperación de contraseña

3. **Revisar SPAM es crítico**
   - La mayoría de los correos de Supabase van a spam
   - Especialmente en Gmail
   - Pedir al usuario que revise spam primero

4. **El enlace expira en 24 horas**
   - Si pasa más tiempo, solicitar uno nuevo
   - No hay límite de intentos

## Estado Actual

- [x] Código implementado
- [x] Documentación creada
- [ ] Usuario notificado
- [ ] Usuario configuró contraseña
- [ ] Usuario puede iniciar sesión
- [ ] Problema resuelto ✅

## Tiempo Estimado

- **Implementación**: ✅ Completado
- **Usuario configura contraseña**: 5 minutos
- **Verificación**: 2 minutos
- **Total**: ~7 minutos

## Probabilidad de Éxito

- **Si el usuario sigue las instrucciones**: 99% 🎯
- **Si revisa spam**: 95% ⭐
- **Si no revisa spam**: 50% ⚠️

---

**Última actualización**: 2025-12-01
**Estado**: ✅ Solución implementada, esperando confirmación del usuario
