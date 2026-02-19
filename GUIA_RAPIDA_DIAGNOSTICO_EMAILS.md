
# 🚨 GUÍA RÁPIDA: Diagnóstico de Emails No Llegan

## ⚡ ACCIÓN INMEDIATA (5 minutos)

### 1. Ver Logs del Edge Function

```
1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Click en "Edge Functions" (menú izquierdo)
3. Click en "request-password-token"
4. Click en "Logs"
5. Intenta enviar un código desde la app
6. Lee el error que aparece
```

### 2. Identificar el Error

Busca en los logs uno de estos mensajes:

#### ❌ Error: "RESEND_API_KEY is not configured"
**Causa**: No hay API key de Resend configurada
**Solución**: 
```bash
# Obtén tu API key de https://resend.com/api-keys
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

#### ❌ Error: "Domain not verified" o Status 403
**Causa**: El dominio barliveapp.es no está verificado en Resend
**Solución**:
1. Ve a https://resend.com/domains
2. Agrega el dominio `barliveapp.es`
3. Configura los registros DNS que te indiquen
4. Espera 24-48 horas para la verificación

#### ❌ Error: "Unauthorized sender" o Status 400
**Causa**: El email noreply@barliveapp.es no está autorizado
**Solución temporal**:
Cambia el email en el Edge Function a:
```typescript
from: 'Barlive <onboarding@resend.dev>',
```

#### ❌ Error: "Rate limit exceeded" o Status 429
**Causa**: Has excedido el límite de envíos
**Solución**:
1. Ve a https://resend.com/settings/billing
2. Verifica tu plan y límites
3. Espera o actualiza tu plan

## 🔍 VERIFICACIÓN RÁPIDA

### ¿Está configurada la API Key?

```bash
# En tu terminal local con Supabase CLI
supabase secrets list

# Deberías ver:
# RESEND_API_KEY | ******* | 2025-12-10
```

### ¿Está verificado el dominio?

1. Ve a https://resend.com/domains
2. Busca `barliveapp.es`
3. Debe mostrar: ✅ **Verified**

### ¿Funcionan los emails de prueba?

Prueba con el email de desarrollo de Resend:

```typescript
// En el Edge Function, cambia temporalmente:
from: 'Barlive <onboarding@resend.dev>',
```

Si funciona con este email pero no con `noreply@barliveapp.es`, el problema es la verificación del dominio.

## 📋 CHECKLIST RÁPIDO

Marca lo que ya verificaste:

- [ ] Los logs del Edge Function muestran el error específico
- [ ] RESEND_API_KEY está configurada en Supabase
- [ ] El dominio barliveapp.es está en Resend
- [ ] El dominio muestra estado "Verified" en Resend
- [ ] Los registros DNS (SPF, DKIM) están configurados
- [ ] No has excedido el límite de envíos de tu plan

## 🎯 SOLUCIÓN MÁS COMÚN

**El 90% de los casos es por dominio no verificado**

### Pasos para verificar el dominio:

1. **Ve a Resend**: https://resend.com/domains
2. **Agrega el dominio**: Click en "Add Domain" → Ingresa `barliveapp.es`
3. **Copia los registros DNS**: Resend te mostrará 3 registros TXT
4. **Ve a tu proveedor DNS** (IONOS, Cloudflare, etc.)
5. **Agrega los registros**:
   ```
   Tipo: TXT
   Nombre: @ (o barliveapp.es)
   Valor: [el que te dio Resend para SPF]
   
   Tipo: TXT
   Nombre: resend._domainkey
   Valor: [el que te dio Resend para DKIM]
   
   Tipo: TXT
   Nombre: _dmarc
   Valor: v=DMARC1; p=none;
   ```
6. **Espera 10-30 minutos** (puede tardar hasta 48 horas)
7. **Verifica en Resend**: Click en "Verify" en el dominio

## 🚀 MIENTRAS ESPERAS LA VERIFICACIÓN

Usa el email de prueba de Resend temporalmente:

1. Abre: `supabase/functions/request-password-token/index.ts`
2. Busca la línea:
   ```typescript
   from: 'Barlive <noreply@barliveapp.es>',
   ```
3. Cámbiala a:
   ```typescript
   from: 'Barlive <onboarding@resend.dev>',
   ```
4. Despliega:
   ```bash
   supabase functions deploy request-password-token
   ```

**Nota**: Este email solo funciona para pruebas. Una vez verificado tu dominio, vuelve a cambiar al email original.

## 📞 ¿NECESITAS AYUDA?

Si ninguna de estas soluciones funciona:

1. **Copia los logs completos** del Edge Function
2. **Toma captura** del estado en Resend (https://resend.com/domains)
3. **Verifica** que RESEND_API_KEY esté configurada
4. **Contacta soporte** de Resend con esta información

## 🎓 RECURSOS

- **Dashboard Supabase**: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
- **Dashboard Resend**: https://resend.com/overview
- **Dominios Resend**: https://resend.com/domains
- **API Keys Resend**: https://resend.com/api-keys
- **Estado Resend**: https://status.resend.com/

---

**Recuerda**: El Edge Function ya está actualizado con mejor logging. Solo necesitas configurar Resend correctamente.
