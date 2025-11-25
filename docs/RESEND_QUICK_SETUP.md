
# 🚀 Configuración Rápida de Resend - BarLive

## ⚡ Configuración en 3 Pasos (10 minutos)

### ✅ Paso 1: Obtener API Key de Resend

1. Ve a: https://resend.com
2. Crea cuenta / Inicia sesión
3. Ve a **API Keys** → **Create API Key**
4. Copia la key (empieza con `re_`)

### ✅ Paso 2: Configurar en Supabase

**Opción A - Dashboard (Más fácil):**

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions
2. Click en **Secrets**
3. **Add new secret**:
   - Name: `RESEND_API_KEY`
   - Value: [Tu API key de Resend]
4. **Save**

**Opción B - CLI:**

```bash
supabase secrets set RESEND_API_KEY=re_tu_api_key --project-ref embntaqwlwmgazvrglaf
```

### ✅ Paso 3: Probar

1. Abre la app BarLive
2. Registra un nuevo usuario con tu email
3. Revisa tu bandeja de entrada
4. ✅ ¡Deberías recibir el código de verificación!

---

## 🎯 Configuración del Dominio (Opcional - 10 minutos)

Para enviar desde `noreply@barlive.app` en lugar de `onboarding@resend.dev`:

### 1. Agregar Dominio en Resend

1. En Resend → **Domains** → **Add Domain**
2. Introduce: `barlive.app`

### 2. Configurar DNS

Agrega estos registros en tu proveedor de DNS:

**SPF (TXT):**
```
Nombre: @
Valor: v=spf1 include:_spf.resend.com ~all
```

**DKIM (TXT):**
```
Nombre: resend._domainkey
Valor: [Valor único de Resend - cópialo del dashboard]
```

**DMARC (TXT) - Opcional:**
```
Nombre: _dmarc
Valor: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
```

### 3. Verificar

1. Espera 5-10 minutos (propagación DNS)
2. En Resend → **Verify**
3. ✅ Dominio verificado

---

## 🧪 Prueba Rápida con cURL

```bash
curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
  -H 'Authorization: Bearer [TU_SUPABASE_ANON_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "tu@email.com",
    "code": "123456",
    "type": "verification"
  }'
```

Encuentra tu Anon Key en: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/api

---

## 🔍 Verificar Configuración

### Ver Secrets Configurados

```bash
supabase secrets list --project-ref embntaqwlwmgazvrglaf
```

Deberías ver: `RESEND_API_KEY`

### Ver Logs de la Función

```bash
supabase functions logs send-verification-email --tail --project-ref embntaqwlwmgazvrglaf
```

---

## ❌ Solución Rápida de Problemas

### No llegan correos

1. ✅ **Verifica API Key**: Dashboard → Settings → Edge Functions → Secrets
2. ✅ **Revisa spam**: Los primeros correos pueden ir a spam
3. ✅ **Verifica límites**: Plan gratuito = 100/día, 3,000/mes
4. ✅ **Revisa logs**: Supabase Dashboard → Edge Functions → Logs

### Error "Failed to send email"

1. ✅ **API Key incorrecta**: Verifica que sea válida en Resend
2. ✅ **Dominio no verificado**: Usa `onboarding@resend.dev` mientras tanto
3. ✅ **Límite excedido**: Revisa uso en Resend dashboard

### Código no funciona

1. ✅ **Expirado**: Los códigos duran 10 minutos
2. ✅ **Email incorrecto**: Verifica que coincida exactamente
3. ✅ **Ya usado**: Los códigos son de un solo uso

---

## 📊 Límites del Plan Gratuito

- ✅ 3,000 correos/mes
- ✅ 100 correos/día
- ✅ Dominio personalizado incluido
- ✅ Perfecto para desarrollo

---

## 🎯 Checklist Mínimo

- [ ] API Key de Resend obtenida
- [ ] API Key configurada en Supabase
- [ ] Email de prueba enviado
- [ ] Email recibido correctamente
- [ ] Código de verificación funciona

---

## 📚 Documentación Completa

Para más detalles, consulta:
- `docs/RESEND_CONFIGURATION_COMPLETE.md` - Guía completa
- `docs/EMAIL_SYSTEM_CONFIGURATION.md` - Sistema de emails
- `docs/EMAIL_SETUP_QUICK_START.md` - Inicio rápido

---

## 🆘 Enlaces Útiles

- **Resend Dashboard**: https://resend.com/emails
- **Resend API Keys**: https://resend.com/api-keys
- **Resend Domains**: https://resend.com/domains
- **Supabase Project**: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
- **Supabase Secrets**: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions

---

**⏱️ Tiempo total**: 10-20 minutos  
**🎯 Dificultad**: Fácil  
**✅ Estado**: Edge Function lista, solo falta API Key
