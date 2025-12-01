
# ⚡ ACCIÓN INMEDIATA: Configurar Resend para BarLive

## 🎯 Lo que debes hacer AHORA MISMO

### 1️⃣ Ir a IONOS y agregar registros DNS (15 min)

Accede a tu panel de IONOS → Dominios → DNS de `barlive.app`

**Agrega estos 4 registros:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Registro 1: DKIM (Verificación)                                 │
├─────────────────────────────────────────────────────────────────┤
│ Tipo: TXT                                                       │
│ Nombre: resend._domainkey.noreply                              │
│ Valor: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDjQqvqSjAu... │
│        (copia el valor completo de Resend)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Registro 2: SPF MX                                              │
├─────────────────────────────────────────────────────────────────┤
│ Tipo: MX                                                        │
│ Nombre: send.noreply                                            │
│ Valor: feedback-smtp.eu-west-1.amazonses.com                   │
│ Prioridad: 10                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Registro 3: SPF TXT                                             │
├─────────────────────────────────────────────────────────────────┤
│ Tipo: TXT                                                       │
│ Nombre: send.noreply                                            │
│ Valor: v=spf1 include:amazonses.com ~all                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Registro 4: DMARC (Opcional)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Tipo: TXT                                                       │
│ Nombre: _dmarc                                                  │
│ Valor: v=DMARC1; p=none;                                        │
└─────────────────────────────────────────────────────────────────┘
```

**⏰ Después de agregar:** Espera 1-48 horas para propagación DNS

---

### 2️⃣ Obtener API Key de Resend (5 min)

1. Ve a https://resend.com/api-keys
2. Clic en **Create API Key**
3. Configura:
   - Name: `BarLive Production`
   - Permission: `Sending access`
   - Domain: `noreply.barlive.app`
4. **COPIA LA API KEY** (formato: `re_xxxxxxxxxx`)
5. **GUÁRDALA** (solo se muestra una vez)

---

### 3️⃣ Configurar SMTP en Supabase (10 min)

1. Ve a https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. **Authentication** → **Email Templates** → **Settings**
3. Activa **Enable Custom SMTP**
4. Configura:

```
SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP User: resend
SMTP Password: [Pega tu API Key aquí]
Sender Email: noreply@noreply.barlive.app
Sender Name: BarLive
```

5. **Save**

---

### 4️⃣ Configurar Plantillas de Email (10 min)

#### Plantilla 1: Confirmación de Registro

1. **Authentication** → **Email Templates** → **Confirm signup**
2. Abre el archivo `docs/EMAIL_TEMPLATE_CONFIRM_SIGNUP_RESEND.html`
3. Copia TODO el contenido
4. Pega en el editor de Supabase
5. **Save**

#### Plantilla 2: Restablecimiento de Contraseña

1. **Authentication** → **Email Templates** → **Reset password**
2. Abre el archivo `docs/EMAIL_TEMPLATE_RESET_PASSWORD_RESEND.html`
3. Copia TODO el contenido
4. Pega en el editor de Supabase
5. **Save**

---

### 5️⃣ Configurar URLs (5 min)

1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://barliveapp.es`
3. **Redirect URLs** (agregar todas):

```
https://barliveapp.es/email-confirmed
https://barliveapp.es/auth/*
https://www.barliveapp.es/email-confirmed
https://www.barliveapp.es/auth/*
```

4. **Save**

---

## ⏳ MAÑANA (después de propagación DNS)

### 6️⃣ Verificar DNS

1. Ve a https://resend.com/domains
2. Verifica que todos los registros estén en **verde ✅**
3. Si no, espera más tiempo

### 7️⃣ Probar el Sistema

```bash
# 1. Iniciar la app
npm run dev

# 2. Probar registro
- Ir a pantalla de registro
- Registrar con tu email real
- Verificar que recibes el email
- Hacer clic en el enlace
- Iniciar sesión

# 3. Probar restablecimiento
- Ir a "¿Olvidaste tu contraseña?"
- Ingresar tu email
- Verificar que recibes el email
- Hacer clic en el enlace
- Cambiar contraseña
- Iniciar sesión
```

---

## ✅ Checklist Rápido

```
HOY:
[ ] Agregar 4 registros DNS en IONOS
[ ] Obtener API Key de Resend
[ ] Configurar SMTP en Supabase
[ ] Configurar plantilla de confirmación
[ ] Configurar plantilla de restablecimiento
[ ] Configurar URLs de redirección

MAÑANA:
[ ] Verificar DNS en Resend (todos en verde)
[ ] Probar registro de usuario
[ ] Probar restablecimiento de contraseña
[ ] Verificar logs sin errores
[ ] Desplegar a producción
```

---

## 🆘 Si algo falla

### DNS no se verifica
- Espera más tiempo (hasta 48h)
- Verifica que copiaste los valores correctamente
- Usa https://mxtoolbox.com/ para verificar

### No recibo emails
- Revisa carpeta de spam
- Verifica logs de Resend
- Verifica logs de Supabase
- Comprueba que la API Key sea correcta

### Errores en Supabase
- Revisa **Logs** → filtrar por `auth`
- Verifica que el SMTP esté configurado
- Comprueba que las plantillas estén guardadas

---

## 📞 Contacto

- **Resend Support**: support@resend.com
- **Supabase Support**: https://supabase.com/support

---

## 🎯 Resultado Final

Cuando termines, tendrás:

✅ Sistema de registro funcionando
✅ Emails de verificación enviándose
✅ Emails de restablecimiento funcionando
✅ App lista para usuarios finales
✅ Sistema listo para producción

**¡Vamos! 🚀**
