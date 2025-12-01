
# 🚀 Pasos Siguientes: Configuración de Resend para BarLive

## 📋 Resumen de la Situación Actual

✅ **Ya tienes:**
- Dominio `barliveapp.es` configurado en Render
- Dominio `noreply.barlive.app` creado en Resend
- Sistema de autenticación implementado en la app
- Plantillas de email listas para usar

❌ **Falta configurar:**
- Registros DNS en IONOS para Resend
- SMTP en Supabase
- Probar el sistema completo

---

## 🎯 Pasos Inmediatos (Hoy)

### 1️⃣ Configurar DNS en IONOS (15 minutos)

Ve a tu panel de IONOS y agrega estos registros DNS para `noreply.barlive.app`:

#### Registro DKIM
```
Tipo: TXT
Nombre: resend._domainkey.noreply
Valor: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDjQqvqSjAufcQ7B0QM2ZCpRVgWXhYd92hcKAx0qTXOj/m4SElmhs21pq5VwHUIr42gTFXv/GY9af4e6ZKwrK30MoJjAboiOscXSiyzG1XE33P8aO8YKFsxy5QoOhjfiVTlk9cUYcTduwinA1Mj/i3AudWjnhuC2/BicvunxgIGdQIDAQAB
```

#### Registros SPF
```
Tipo: MX
Nombre: send.noreply
Valor: feedback-smtp.eu-west-1.amazonses.com
Prioridad: 10

Tipo: TXT
Nombre: send.noreply
Valor: v=spf1 include:amazonses.com ~all
```

#### Registro DMARC (Opcional)
```
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none;
```

**⏰ Tiempo de propagación:** 1-48 horas (normalmente 1-4 horas)

---

### 2️⃣ Obtener API Key de Resend (5 minutos)

1. Ve a https://resend.com/
2. Inicia sesión en tu cuenta
3. Ve a **API Keys**
4. Crea una nueva API Key:
   - Name: `BarLive Production`
   - Permission: `Sending access`
   - Domain: `noreply.barlive.app`
5. **Copia la API Key** (formato: `re_xxxxxxxxxx`)
6. **Guárdala en un lugar seguro** (solo se muestra una vez)

---

### 3️⃣ Configurar SMTP en Supabase (10 minutos)

1. Ve a https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navega a **Authentication → Email Templates**
3. Haz clic en **Settings** (arriba a la derecha)
4. Activa **Enable Custom SMTP**
5. Configura:
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 465
   SMTP User: resend
   SMTP Password: [Tu API Key de Resend]
   Sender Email: noreply@noreply.barlive.app
   Sender Name: BarLive
   ```
6. Guarda los cambios

---

### 4️⃣ Configurar Plantillas de Email (10 minutos)

#### Plantilla de Confirmación de Registro

1. Ve a **Authentication → Email Templates**
2. Selecciona **Confirm signup**
3. Copia el contenido de `docs/EMAIL_TEMPLATE_CONFIRM_SIGNUP_RESEND.html`
4. Pega en el editor
5. Guarda

#### Plantilla de Restablecimiento de Contraseña

1. Selecciona **Reset password**
2. Copia el contenido de `docs/EMAIL_TEMPLATE_RESET_PASSWORD_RESEND.html`
3. Pega en el editor
4. Guarda

---

### 5️⃣ Configurar URLs de Redirección (5 minutos)

1. Ve a **Authentication → URL Configuration**
2. Configura el **Site URL**:
   ```
   https://barliveapp.es
   ```
3. Agrega las **Redirect URLs**:
   ```
   https://barliveapp.es/email-confirmed
   https://barliveapp.es/auth/*
   https://www.barliveapp.es/email-confirmed
   https://www.barliveapp.es/auth/*
   ```

---

## ⏳ Pasos para Mañana (Después de la propagación DNS)

### 6️⃣ Verificar DNS (5 minutos)

1. Ve al dashboard de Resend
2. Verifica que todos los registros DNS estén en verde ✅
3. Si no están verificados, espera más tiempo (hasta 48h)

**Herramientas de verificación:**
```bash
# Verificar DKIM
dig TXT resend._domainkey.noreply.barlive.app

# Verificar SPF
dig TXT send.noreply.barlive.app
```

O usa herramientas online:
- https://mxtoolbox.com/
- https://dnschecker.org/

---

### 7️⃣ Probar el Sistema (15 minutos)

#### Prueba 1: Registro de Usuario

1. Abre la app en desarrollo: `npm run dev`
2. Ve a la pantalla de registro
3. Registra un nuevo usuario con tu email real
4. Verifica que recibes el email de confirmación
5. Revisa la carpeta de spam si no lo ves
6. Haz clic en el enlace de confirmación
7. Verifica que puedes iniciar sesión

#### Prueba 2: Restablecimiento de Contraseña

1. Ve a la pantalla de login
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Verifica que recibes el email de restablecimiento
5. Haz clic en el enlace
6. Cambia tu contraseña
7. Verifica que puedes iniciar sesión con la nueva contraseña

#### Prueba 3: Reenvío de Email de Verificación

1. Registra un nuevo usuario
2. No hagas clic en el enlace de confirmación
3. Intenta iniciar sesión
4. Haz clic en "Reenviar correo"
5. Verifica que recibes un nuevo email
6. Confirma que el enlace funciona

---

### 8️⃣ Verificar Logs (5 minutos)

#### En Resend:
1. Ve a **Logs** en el dashboard
2. Verifica que los emails se están enviando
3. Revisa el estado de entrega
4. Busca errores

#### En Supabase:
1. Ve a **Logs** en el dashboard
2. Filtra por `auth`
3. Busca errores relacionados con emails
4. Verifica que no hay problemas

---

## 🎉 Pasos Finales (Cuando todo funcione)

### 9️⃣ Desplegar a Producción

1. Verifica que todas las pruebas pasen
2. Actualiza las variables de entorno en Render:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   ```
3. Haz un deploy de la app en Render
4. Prueba el registro y login en producción

---

### 🔟 Monitorear y Optimizar

1. **Monitorea los logs de Resend** para ver la tasa de entrega
2. **Revisa los logs de Supabase** para detectar errores
3. **Pide feedback a usuarios beta** sobre el proceso de registro
4. **Optimiza las plantillas de email** según sea necesario
5. **Configura alertas** para errores críticos

---

## 📊 Checklist de Verificación

Usa este checklist para asegurarte de que todo está configurado:

### DNS (IONOS)
- [ ] Registro DKIM agregado
- [ ] Registro MX SPF agregado
- [ ] Registro TXT SPF agregado
- [ ] Registro DMARC agregado (opcional)
- [ ] Propagación DNS completada (verificado en Resend)

### Resend
- [ ] Dominio `noreply.barlive.app` creado
- [ ] API Key creada y guardada
- [ ] Registros DNS verificados (todos en verde)
- [ ] Logs sin errores

### Supabase
- [ ] SMTP personalizado configurado
- [ ] Plantilla de confirmación configurada
- [ ] Plantilla de restablecimiento configurada
- [ ] Site URL configurado
- [ ] Redirect URLs configuradas
- [ ] Opciones de email configuradas

### Pruebas
- [ ] Registro de usuario funciona
- [ ] Email de confirmación recibido
- [ ] Enlace de confirmación funciona
- [ ] Login con usuario verificado funciona
- [ ] Restablecimiento de contraseña funciona
- [ ] Email de restablecimiento recibido
- [ ] Enlace de restablecimiento funciona
- [ ] Reenvío de email funciona

### Producción
- [ ] Variables de entorno configuradas en Render
- [ ] App desplegada en producción
- [ ] Pruebas en producción completadas
- [ ] Logs sin errores
- [ ] Usuarios pueden registrarse e iniciar sesión

---

## 🆘 ¿Necesitas Ayuda?

Si encuentras algún problema:

1. **Revisa los logs** de Resend y Supabase
2. **Verifica la configuración DNS** con herramientas online
3. **Consulta la documentación**:
   - [Resend Docs](https://resend.com/docs)
   - [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
4. **Contacta al soporte**:
   - Resend: support@resend.com
   - Supabase: https://supabase.com/support

---

## 🎯 Objetivo Final

Al completar todos estos pasos, tendrás:

✅ Sistema de autenticación completo y funcional
✅ Emails de verificación enviados desde tu dominio
✅ Emails de restablecimiento de contraseña funcionando
✅ App lista para usuarios finales
✅ Sistema listo para App Store y Play Store

**¡Éxito!** 🚀
