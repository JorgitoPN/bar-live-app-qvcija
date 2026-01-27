
# ✅ Verificación Rápida - Lista de Chequeo

## 🎯 Usa esta lista para verificar que todo está funcionando

---

## 📧 Parte 1: Emails de Supabase (5 minutos)

### Verificar Plantillas

- [ ] Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates
- [ ] Verifica que "Confirm signup" está configurado en español
- [ ] Verifica que "Reset password" está configurado en español
- [ ] Verifica que "Change email" está configurado en español
- [ ] Verifica que "Magic link" está configurado en español

### Verificar URLs

- [ ] Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/url-configuration
- [ ] Verifica que Site URL es: `https://barliveapp.es`
- [ ] Verifica que Redirect URLs incluye: `https://barliveapp.es/email-confirmed`
- [ ] Verifica que Redirect URLs incluye: `https://barliveapp.es/*`

### Verificar Configuración

- [ ] Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/auth
- [ ] Verifica que "Enable email confirmations" está ✅ activado
- [ ] Verifica que "Secure email change" está ✅ activado

---

## 🌐 Parte 2: Render (5 minutos)

### Verificar Deploy

- [ ] Ve a: https://dashboard.render.com/
- [ ] Verifica que tu Static Site está **Live** (ícono verde)
- [ ] Verifica que el último deploy fue exitoso
- [ ] Haz clic en la URL de Render y verifica que tu app carga

### Verificar Variables de Entorno

- [ ] Ve a: Settings → Environment
- [ ] Verifica que existe: `EXPO_PUBLIC_SUPABASE_URL`
- [ ] Verifica que existe: `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Verificar Custom Domain

- [ ] Ve a: Settings → Custom Domain
- [ ] Verifica que `barliveapp.es` está **Verified**
- [ ] Verifica que `www.barliveapp.es` está **Verified**
- [ ] Verifica que ambos tienen certificado SSL

---

## 🔗 Parte 3: IONOS DNS (5 minutos)

### Verificar Registros DNS

- [ ] Ve a: https://www.ionos.es/ → Dominios → barliveapp.es → DNS
- [ ] Verifica que existe un registro A para `@` apuntando a la IP de Render
- [ ] Verifica que existe un registro CNAME para `www` apuntando a Render

### Verificar Propagación

- [ ] Ve a: https://dnschecker.org/
- [ ] Ingresa: `barliveapp.es`
- [ ] Selecciona tipo: `A`
- [ ] Verifica que aparece la IP de Render en la mayoría de ubicaciones

---

## 🧪 Parte 4: Pruebas Funcionales (10 minutos)

### Probar Registro

- [ ] Ve a: `https://barliveapp.es/auth/registro-email`
- [ ] Registra un nuevo usuario con un email real
- [ ] Verifica que aparece el mensaje: "¡Cuenta creada!"
- [ ] Revisa tu email
- [ ] Verifica que recibiste el correo de verificación
- [ ] Verifica que el email está en español
- [ ] Verifica que tiene el branding de BarLive
- [ ] Haz clic en el enlace de verificación
- [ ] Verifica que te redirige a: `https://barliveapp.es/email-confirmed`
- [ ] Verifica que aparece el mensaje: "¡Email verificado!"

### Probar Login

- [ ] Ve a: `https://barliveapp.es/auth/login`
- [ ] Intenta iniciar sesión con el usuario que acabas de crear
- [ ] Verifica que funciona correctamente
- [ ] Verifica que te redirige a la app principal

### Probar Login con Email No Verificado

- [ ] Registra otro usuario pero NO verifiques el email
- [ ] Intenta iniciar sesión con ese usuario
- [ ] Verifica que aparece el mensaje: "Email no verificado"
- [ ] Verifica que aparece el botón: "Reenviar correo"
- [ ] Haz clic en "Reenviar correo"
- [ ] Verifica que aparece el mensaje: "Correo enviado"
- [ ] Revisa tu email
- [ ] Verifica que recibiste el correo

### Probar Recuperación de Contraseña

- [ ] Ve a: `https://barliveapp.es/auth/login`
- [ ] Haz clic en "¿Olvidaste tu contraseña?"
- [ ] Ingresa el email de un usuario existente
- [ ] Haz clic en "Enviar enlace"
- [ ] Verifica que aparece el mensaje: "✅ Correo enviado"
- [ ] Revisa tu email
- [ ] Verifica que recibiste el correo de recuperación
- [ ] Verifica que el email está en español
- [ ] Haz clic en el enlace de recuperación
- [ ] Verifica que te redirige a una página para cambiar la contraseña
- [ ] Cambia la contraseña
- [ ] Verifica que funciona

### Probar Reenvío de Email

- [ ] Ve a: `https://barliveapp.es/auth/verificar-email`
- [ ] Verifica que aparece el botón: "Reenviar correo de verificación"
- [ ] Haz clic en el botón
- [ ] Verifica que aparece el mensaje: "Correo enviado"
- [ ] Verifica que el botón se deshabilita por 60 segundos
- [ ] Revisa tu email
- [ ] Verifica que recibiste el correo

---

## 🔒 Parte 5: Seguridad (5 minutos)

### Verificar SSL

- [ ] Ve a: `https://barliveapp.es`
- [ ] Haz clic en el candado 🔒 en la barra de direcciones
- [ ] Verifica que dice "Conexión segura"
- [ ] Verifica que el certificado es válido
- [ ] Verifica que el certificado es de Let's Encrypt (emitido por Render)

### Verificar Redirección HTTP → HTTPS

- [ ] Ve a: `http://barliveapp.es` (sin la 's')
- [ ] Verifica que te redirige automáticamente a `https://barliveapp.es`

### Verificar www → sin www

- [ ] Ve a: `https://www.barliveapp.es`
- [ ] Verifica que funciona (puede redirigir o mostrar la app)

---

## 📊 Parte 6: Monitoreo (5 minutos)

### Verificar Logs de Supabase

- [ ] Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/logs/auth-logs
- [ ] Verifica que aparecen los registros de autenticación
- [ ] Verifica que no hay errores críticos

### Verificar Logs de Render

- [ ] Ve a: https://dashboard.render.com/ → Tu Static Site → Logs
- [ ] Verifica que no hay errores en los logs
- [ ] Verifica que las requests se están procesando correctamente

### Verificar Métricas de Render

- [ ] Ve a: https://dashboard.render.com/ → Tu Static Site → Metrics
- [ ] Verifica que hay requests
- [ ] Verifica que el tiempo de respuesta es < 2 segundos

---

## 🎉 Resultado Final

### Si todos los checkboxes están marcados:

✅ **¡Tu app está 100% funcional y lista para producción!**

### Si algunos checkboxes NO están marcados:

⚠️ **Revisa las guías correspondientes:**

- **Emails:** `GUIA_COMPLETA_CONFIGURACION.md` → Parte 1
- **Render:** `INSTRUCCIONES_RENDER.md`
- **DNS:** `INSTRUCCIONES_IONOS_DNS.md`
- **Problemas:** Revisa la sección "Solución de Problemas" en cada guía

---

## 📞 ¿Necesitas Ayuda?

Si algo no funciona:

1. **Revisa los logs:**
   - Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/logs
   - Render: https://dashboard.render.com/ → Logs

2. **Consulta la documentación:**
   - `GUIA_COMPLETA_CONFIGURACION.md`
   - `INSTRUCCIONES_RENDER.md`
   - `INSTRUCCIONES_IONOS_DNS.md`

3. **Contacta soporte:**
   - Supabase: https://supabase.com/support
   - Render: https://render.com/support
   - IONOS: https://www.ionos.es/ayuda

---

## 📝 Notas

- **Tiempo total de verificación:** ~35 minutos
- **Frecuencia recomendada:** Cada vez que hagas cambios importantes
- **Guarda esta lista:** Úsala como referencia para futuras verificaciones

---

**¡Éxito con tu app! 🚀**
