
# ✅ Checklist de Configuración - BarLive

## 🎯 Resumen

Este documento contiene todos los pasos necesarios para completar la configuración de BarLive y tener el sistema de correos y autenticación funcionando correctamente.

## 📧 Sistema de Correos Electrónicos

### ✅ Ya Configurado

- [x] Edge Function `send-verification-email` desplegada en Supabase
- [x] Base de datos con columnas de verificación (`email_verified`, `verification_code`, etc.)
- [x] Flujo de registro actualizado con envío de OTP
- [x] Pantalla de verificación de email implementada
- [x] Sistema de reenvío de códigos
- [x] Plantillas de correo profesionales

### ⚠️ Pendiente de Configurar

#### 1. Obtener API Key de Resend

**Pasos:**

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta (es gratis para hasta 3,000 correos/mes)
3. Ve a **API Keys** en el dashboard
4. Haz clic en **Create API Key**
5. Dale un nombre (ej: "BarLive Production")
6. Copia la API key (empieza con `re_`)

#### 2. Configurar API Key en Supabase

**Pasos:**

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Settings** → **Edge Functions**
3. Haz clic en la pestaña **Secrets**
4. Haz clic en **Add Secret**
5. Configura:
   - **Name:** `RESEND_API_KEY`
   - **Value:** La API key que copiaste de Resend (ej: `re_xxxxxxxxxx`)
6. Haz clic en **Save**

#### 3. Probar el Sistema de Correos

**Pasos:**

1. Abre la app en tu dispositivo o simulador
2. Ve a la pantalla de registro
3. Ingresa un correo electrónico real (tuyo)
4. Presiona "Continuar"
5. Verifica que:
   - ✅ Recibes el correo con el código OTP
   - ✅ El código tiene 6 dígitos
   - ✅ El correo tiene el diseño de BarLive
   - ✅ Puedes ingresar el código y verificar tu email

#### 4. (Opcional) Configurar Dominio Personalizado

Para enviar correos desde `noreply@barlive.app` en lugar de `onboarding@resend.dev`:

**Pasos:**

1. En Resend, ve a **Domains**
2. Haz clic en **Add Domain**
3. Ingresa `barlive.app`
4. Resend te dará registros DNS para configurar
5. Ve a tu proveedor de DNS (ej: Cloudflare, GoDaddy)
6. Agrega los registros DNS que Resend te indica
7. Vuelve a Resend y haz clic en **Verify Domain**
8. Una vez verificado, actualiza la Edge Function para usar `noreply@barlive.app`

## 🔐 Autenticación con Face ID / Touch ID

### ✅ Ya Configurado

- [x] Permisos configurados en `app.json`
- [x] Módulo `expo-local-authentication` instalado
- [x] Utilidad `biometricAuth.ts` implementada
- [x] Integración en pantalla de login
- [x] Integración en configuración de usuario
- [x] Almacenamiento seguro de credenciales
- [x] Flujo de activación/desactivación

### ✅ Listo para Usar

No hay pasos adicionales de configuración. El sistema de Face ID está completamente funcional.

**Para probar:**

1. Abre la app en un dispositivo con Face ID o Touch ID
2. Inicia sesión con email/password o Google
3. Ve a **Perfil** → **Configuración**
4. Activa el toggle de "Face ID / Touch ID"
5. Cierra sesión
6. En la pantalla de login, presiona el botón de Face ID
7. Autentica con Face ID
8. ¡Deberías iniciar sesión automáticamente!

## 🔍 Verificación de Configuración

### Verificar Edge Function

```bash
# Prueba la Edge Function directamente
curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "type": "verification"
  }'
```

### Verificar Base de Datos

```sql
-- Ver usuarios con códigos de verificación pendientes
SELECT 
  email, 
  email_verified, 
  verification_code,
  verification_code_expires_at
FROM usuarios
WHERE email_verified = false;
```

### Verificar Logs

1. Ve a Supabase Dashboard
2. Navega a **Edge Functions** → **send-verification-email**
3. Haz clic en **Logs**
4. Verifica que no haya errores

## 📊 Métricas y Monitoreo

### Resend Dashboard

En [https://resend.com/dashboard](https://resend.com/dashboard) puedes ver:

- Correos enviados hoy
- Correos entregados
- Correos abiertos
- Correos rebotados
- Límite de correos restantes

### Supabase Dashboard

En Supabase puedes ver:

- Logs de Edge Functions
- Errores de autenticación
- Usuarios registrados
- Usuarios verificados

## 🐛 Solución de Problemas

### Los correos no llegan

1. **Verifica la API Key:**
   - Ve a Supabase → Settings → Edge Functions → Secrets
   - Asegúrate de que `RESEND_API_KEY` esté configurada

2. **Revisa los logs:**
   - Ve a Supabase → Edge Functions → send-verification-email → Logs
   - Busca errores de Resend API

3. **Verifica el límite de correos:**
   - Ve a Resend Dashboard
   - Verifica que no hayas excedido el límite diario/mensual

4. **Revisa la carpeta de spam:**
   - Los correos de Resend pueden ir a spam
   - Marca como "No es spam" para futuros correos

### Face ID no funciona

1. **Verifica que el dispositivo tenga Face ID configurado:**
   - Ve a Ajustes → Face ID y código
   - Asegúrate de que Face ID esté activado

2. **Verifica los permisos:**
   - Revisa que `app.json` tenga el plugin de `expo-local-authentication`

3. **Reinstala la app:**
   - A veces los permisos no se actualizan correctamente
   - Desinstala y vuelve a instalar la app

## 📝 Checklist Final

### Sistema de Correos

- [ ] Cuenta de Resend creada
- [ ] API Key de Resend obtenida
- [ ] API Key configurada en Supabase como secret
- [ ] Correo de prueba enviado y recibido
- [ ] Código OTP verificado correctamente
- [ ] (Opcional) Dominio personalizado configurado

### Autenticación Biométrica

- [x] Face ID configurado en el dispositivo
- [x] App instalada en dispositivo real
- [x] Face ID activado en la configuración de la app
- [x] Login con Face ID probado y funcionando

### Documentación

- [x] `EMAIL_SYSTEM_CONFIGURATION.md` revisado
- [x] `FACE_ID_SETUP_COMPLETE.md` revisado
- [x] Este checklist completado

## 🚀 Próximos Pasos

Una vez completada la configuración:

1. **Prueba el flujo completo de registro:**
   - Registro con email
   - Verificación de email
   - Completar perfil
   - Activar Face ID

2. **Monitorea los correos:**
   - Revisa el dashboard de Resend
   - Verifica que los correos lleguen rápido
   - Comprueba la tasa de entrega

3. **Recopila feedback:**
   - Pregunta a los usuarios si reciben los correos
   - Verifica que el diseño se vea bien en diferentes clientes de correo
   - Ajusta según sea necesario

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación en `/docs`
2. Verifica los logs en Supabase
3. Consulta la documentación de Resend: [https://resend.com/docs](https://resend.com/docs)
4. Consulta la documentación de Expo Local Authentication: [https://docs.expo.dev/versions/latest/sdk/local-authentication/](https://docs.expo.dev/versions/latest/sdk/local-authentication/)

---

**Última actualización:** 2025-01-26
**Estado:** ✅ Sistema Configurado - Requiere API Key de Resend
