
# 📧 Guía Completa: Configuración de Resend con Supabase para BarLive

## 🎯 Objetivo

Configurar Resend como proveedor SMTP personalizado para enviar emails de autenticación desde Supabase, usando el dominio `noreply.barlive.app`.

---

## 📋 Checklist de Configuración

### ✅ Paso 1: Configurar DNS en IONOS

Debes agregar los siguientes registros DNS en IONOS para el subdominio `noreply.barlive.app`:

#### 1.1 Registro DKIM (Verificación de dominio)

```
Tipo: TXT
Nombre: resend._domainkey.noreply
Valor: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDjQqvqSjAufcQ7B0QM2ZCpRVgWXhYd92hcKAx0qTXOj/m4SElmhs21pq5VwHUIr42gTFXv/GY9af4e6ZKwrK30MoJjAboiOscXSiyzG1XE33P8aO8YKFsxy5QoOhjfiVTlk9cUYcTduwinA1Mj/i3AudWjnhuC2/BicvunxgIGdQIDAQAB
TTL: 3600 (o Auto)
```

#### 1.2 Registros SPF (Envío de emails)

**Registro MX:**
```
Tipo: MX
Nombre: send.noreply
Valor: feedback-smtp.eu-west-1.amazonses.com
TTL: 3600 (o Auto)
Prioridad: 10
```

**Registro TXT:**
```
Tipo: TXT
Nombre: send.noreply
Valor: v=spf1 include:amazonses.com ~all
TTL: 3600 (o Auto)
```

#### 1.3 Registro DMARC (Opcional pero recomendado)

```
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none;
TTL: 3600 (o Auto)
```

#### 1.4 Registro MX para recibir emails (Opcional)

```
Tipo: MX
Nombre: noreply
Valor: inbound-smtp.eu-west-1.amazonaws.com
TTL: 3600 (o Auto)
Prioridad: 10
```

---

### ✅ Paso 2: Verificar Propagación DNS

Después de agregar los registros DNS:

1. **Tiempo de propagación**: 1-48 horas (normalmente 1-4 horas)
2. **Verificar en Resend**: Ve al dashboard de Resend y verifica el estado de los registros
3. **Herramientas de verificación**:

```bash
# Verificar DKIM
dig TXT resend._domainkey.noreply.barlive.app

# Verificar SPF
dig TXT send.noreply.barlive.app

# Verificar DMARC
dig TXT _dmarc.noreply.barlive.app
```

**Herramientas online:**
- https://mxtoolbox.com/
- https://dnschecker.org/
- https://www.whatsmydns.net/

---

### ✅ Paso 3: Obtener API Key de Resend

1. Ve a tu dashboard de Resend: https://resend.com/
2. Navega a **API Keys**
3. Crea una nueva API Key:
   - **Name**: `BarLive Production`
   - **Permission**: `Sending access`
   - **Domain**: `noreply.barlive.app`
4. **Copia la API Key** (solo se muestra una vez)

**Formato de la API Key:**
```
re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### ✅ Paso 4: Configurar SMTP en Supabase

#### 4.1 Acceder a la configuración

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navega a **Authentication → Email Templates**
3. Haz clic en **Settings** (arriba a la derecha)

#### 4.2 Configurar SMTP personalizado

**Opción 1: Usar SMTP de Resend (Recomendado)**

```
Enable Custom SMTP: ✅ ON

SMTP Host: smtp.resend.com
SMTP Port: 465 (SSL) o 587 (TLS)
SMTP User: resend
SMTP Password: [Tu API Key de Resend - re_xxxxxxxxxx]

Sender Email: noreply@noreply.barlive.app
Sender Name: BarLive
```

**Opción 2: Usar API de Resend (Alternativa)**

Si prefieres usar la API de Resend en lugar de SMTP, necesitarás crear una Edge Function personalizada. Ver sección "Opción Avanzada" más abajo.

---

### ✅ Paso 5: Configurar Plantillas de Email

#### 5.1 Plantilla de Confirmación de Registro

1. Ve a **Authentication → Email Templates**
2. Selecciona **Confirm signup**
3. Copia el contenido de `docs/EMAIL_TEMPLATE_CONFIRM_SIGNUP_RESEND.html`
4. Pega en el editor de Supabase
5. Guarda los cambios

**Variables disponibles:**
- `{{ .ConfirmationURL }}` - URL de confirmación
- `{{ .Email }}` - Email del usuario
- `{{ .Token }}` - Token de verificación (si usas OTP)

#### 5.2 Plantilla de Restablecimiento de Contraseña

1. Ve a **Authentication → Email Templates**
2. Selecciona **Reset password**
3. Copia el contenido de `docs/EMAIL_TEMPLATE_RESET_PASSWORD_RESEND.html`
4. Pega en el editor de Supabase
5. Guarda los cambios

**Variables disponibles:**
- `{{ .ConfirmationURL }}` - URL de restablecimiento
- `{{ .Email }}` - Email del usuario
- `{{ .Token }}` - Token de restablecimiento (si usas OTP)

---

### ✅ Paso 6: Configurar URLs de Redirección

#### 6.1 Site URL

1. Ve a **Authentication → URL Configuration**
2. Configura el **Site URL**:

```
Production: https://barliveapp.es
Development: http://localhost:8081
```

#### 6.2 Redirect URLs

Agrega las siguientes URLs permitidas:

```
https://barliveapp.es/email-confirmed
https://barliveapp.es/auth/*
https://www.barliveapp.es/email-confirmed
https://www.barliveapp.es/auth/*
exp://localhost:8081/email-confirmed
exp://localhost:8081/auth/*
```

---

### ✅ Paso 7: Configurar Opciones de Email

1. Ve a **Authentication → Email**
2. Configura las siguientes opciones:

```
Enable email confirmations: ✅ ON
Secure email change: ✅ ON
Double confirm email changes: ✅ ON
```

---

### ✅ Paso 8: Probar el Sistema

#### 8.1 Prueba de Registro

1. Abre la app en desarrollo: `npm run dev`
2. Ve a la pantalla de registro
3. Registra un nuevo usuario con un email real
4. Verifica que recibes el email de confirmación
5. Haz clic en el enlace de confirmación
6. Verifica que puedes iniciar sesión

#### 8.2 Prueba de Restablecimiento de Contraseña

1. Ve a la pantalla de login
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Verifica que recibes el email de restablecimiento
5. Haz clic en el enlace
6. Cambia tu contraseña
7. Verifica que puedes iniciar sesión con la nueva contraseña

#### 8.3 Verificar Logs

**En Resend:**
1. Ve a **Logs** en el dashboard de Resend
2. Verifica que los emails se están enviando correctamente
3. Revisa el estado de entrega

**En Supabase:**
1. Ve a **Logs** en el dashboard de Supabase
2. Filtra por `auth` para ver logs de autenticación
3. Busca errores relacionados con emails

---

## 🔧 Opción Avanzada: Usar API de Resend

Si prefieres usar la API de Resend en lugar de SMTP, puedes crear una Edge Function personalizada:

### Crear Edge Function

```typescript
// supabase/functions/send-email-resend/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json()

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BarLive <noreply@noreply.barlive.app>',
        to: [to],
        subject: subject,
        html: html,
      }),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: response.ok ? 200 : 400,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
```

### Configurar Variable de Entorno

```bash
# En Supabase Dashboard → Edge Functions → Secrets
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🐛 Troubleshooting

### Problema: No recibo emails

**Soluciones:**
1. Verifica que los registros DNS estén correctamente configurados
2. Espera a que la propagación DNS se complete (hasta 48h)
3. Revisa la carpeta de spam
4. Verifica los logs de Resend
5. Verifica los logs de Supabase
6. Comprueba que la API Key de Resend sea correcta

### Problema: Emails van a spam

**Soluciones:**
1. Configura el registro DMARC correctamente
2. Asegúrate de que el registro SPF esté configurado
3. Verifica que el registro DKIM esté activo
4. Usa un dominio con buena reputación
5. Evita palabras spam en el asunto y contenido
6. Incluye un enlace de "unsubscribe"

### Problema: Error de autenticación SMTP

**Soluciones:**
1. Verifica que la API Key de Resend sea correcta
2. Asegúrate de usar el puerto correcto (465 o 587)
3. Verifica que el usuario SMTP sea "resend"
4. Comprueba que el dominio esté verificado en Resend

### Problema: Enlaces de confirmación no funcionan

**Soluciones:**
1. Verifica que las URLs de redirección estén configuradas en Supabase
2. Asegúrate de que el Site URL sea correcto
3. Comprueba que los enlaces no hayan expirado (24h)
4. Verifica que la plantilla use `{{ .ConfirmationURL }}`

---

## 📊 Monitoreo y Métricas

### Métricas en Resend

1. **Emails enviados**: Total de emails enviados
2. **Tasa de entrega**: Porcentaje de emails entregados
3. **Tasa de apertura**: Porcentaje de emails abiertos (si está habilitado)
4. **Tasa de clics**: Porcentaje de clics en enlaces (si está habilitado)
5. **Bounces**: Emails rebotados
6. **Quejas**: Emails marcados como spam

### Métricas en Supabase

1. **Registros**: Total de usuarios registrados
2. **Confirmaciones**: Total de emails confirmados
3. **Resets**: Total de restablecimientos de contraseña
4. **Errores**: Total de errores de autenticación

---

## 💰 Costos

### Resend Pricing

- **Plan Free**: 3,000 emails/mes gratis
- **Plan Pro**: $20/mes - 50,000 emails/mes
- **Plan Enterprise**: Personalizado

### Supabase Pricing

- **Plan Free**: Incluye autenticación básica
- **Plan Pro**: $25/mes - Incluye SMTP personalizado
- **Plan Enterprise**: Personalizado

**Recomendación para BarLive:**
- Empezar con el plan Free de Resend (3,000 emails/mes)
- Monitorear el uso mensual
- Actualizar a Pro cuando sea necesario

---

## 🚀 Despliegue a Producción

### Checklist Final

- [ ] Registros DNS configurados y verificados
- [ ] API Key de Resend creada y guardada
- [ ] SMTP configurado en Supabase
- [ ] Plantillas de email configuradas
- [ ] URLs de redirección configuradas
- [ ] Opciones de email configuradas
- [ ] Pruebas de registro completadas
- [ ] Pruebas de restablecimiento completadas
- [ ] Logs verificados sin errores
- [ ] Dominio verificado en Resend
- [ ] Site URL configurado para producción

### Variables de Entorno

Asegúrate de tener configuradas las siguientes variables:

```bash
# En Render (para la web app)
EXPO_PUBLIC_SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# En Supabase (para Edge Functions)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📚 Recursos Adicionales

### Documentación

- [Resend Documentation](https://resend.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)

### Soporte

- **Resend Support**: support@resend.com
- **Supabase Support**: https://supabase.com/support
- **BarLive Support**: Contacta al equipo de desarrollo

---

## ✅ Conclusión

Una vez completados todos los pasos, tu sistema de autenticación estará completamente funcional con Resend como proveedor SMTP. Los usuarios podrán:

1. ✅ Registrarse con email y contraseña
2. ✅ Recibir emails de confirmación
3. ✅ Confirmar su email haciendo clic en el enlace
4. ✅ Iniciar sesión con sus credenciales
5. ✅ Restablecer su contraseña si la olvidan
6. ✅ Recibir emails de restablecimiento de contraseña

**¡Tu app está lista para producción!** 🎉
