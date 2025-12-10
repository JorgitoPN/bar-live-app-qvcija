
# 📝 PASOS EXACTOS PARA SOLUCIONAR EMAILS

## 🎯 OBJETIVO
Hacer que los correos de recuperación de contraseña lleguen a los usuarios.

## ⏱️ TIEMPO ESTIMADO
- **Si tienes acceso a DNS**: 30 minutos + espera de verificación (10 min - 48 horas)
- **Si usas email temporal**: 5 minutos

---

## 🚀 OPCIÓN 1: SOLUCIÓN DEFINITIVA (Recomendada)

### PASO 1: Obtener API Key de Resend (5 minutos)

1. Ve a https://resend.com/
2. Inicia sesión o crea una cuenta
3. Ve a **API Keys**: https://resend.com/api-keys
4. Click en **"Create API Key"**
5. Dale un nombre: `Barlive Production`
6. Selecciona permisos: **"Full Access"** o **"Sending Access"**
7. Click en **"Create"**
8. **COPIA LA CLAVE** (solo se muestra una vez)
   - Ejemplo: `re_123abc456def789ghi012jkl345mno678`

### PASO 2: Configurar API Key en Supabase (2 minutos)

**Opción A: Desde el Dashboard**
1. Ve a https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Click en **"Settings"** (menú izquierdo)
3. Click en **"Edge Functions"**
4. Scroll hasta **"Secrets"**
5. Click en **"Add new secret"**
6. Nombre: `RESEND_API_KEY`
7. Valor: Pega la clave que copiaste
8. Click en **"Save"**

**Opción B: Desde la Terminal**
```bash
supabase secrets set RESEND_API_KEY=re_123abc456def789ghi012jkl345mno678
```

### PASO 3: Verificar Dominio en Resend (10 minutos)

1. Ve a https://resend.com/domains
2. Click en **"Add Domain"**
3. Ingresa: `barliveapp.es`
4. Click en **"Add"**

Resend te mostrará 3 registros DNS que debes agregar:

```
📋 REGISTRO 1 - SPF (Verificación)
Tipo: TXT
Nombre: @ (o barliveapp.es)
Valor: v=spf1 include:_spf.resend.com ~all

📋 REGISTRO 2 - DKIM (Autenticación)
Tipo: TXT
Nombre: resend._domainkey
Valor: [valor único que te da Resend]

📋 REGISTRO 3 - DMARC (Políticas)
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none; rua=mailto:dmarc@barliveapp.es
```

### PASO 4: Agregar Registros DNS (10 minutos)

**Si tu dominio está en IONOS:**

1. Ve a https://www.ionos.es/
2. Inicia sesión
3. Ve a **"Dominios y SSL"**
4. Click en el dominio `barliveapp.es`
5. Click en **"DNS"** o **"Configuración DNS"**
6. Click en **"Agregar registro"**

Para cada registro:
- Selecciona tipo: **TXT**
- Nombre: [el que te dio Resend]
- Valor: [el que te dio Resend]
- TTL: 3600 (o el valor por defecto)
- Click en **"Guardar"**

**Si tu dominio está en Cloudflare:**

1. Ve a https://dash.cloudflare.com/
2. Selecciona el dominio `barliveapp.es`
3. Ve a **"DNS"** → **"Records"**
4. Click en **"Add record"**

Para cada registro:
- Type: **TXT**
- Name: [el que te dio Resend]
- Content: [el que te dio Resend]
- TTL: Auto
- Click en **"Save"**

### PASO 5: Verificar en Resend (1 minuto + espera)

1. Vuelve a https://resend.com/domains
2. Busca `barliveapp.es`
3. Click en **"Verify"**

**Estados posibles:**
- ✅ **Verified**: ¡Listo! Ya puedes enviar emails
- ⏳ **Pending**: Espera 10-30 minutos y vuelve a verificar
- ❌ **Failed**: Revisa que los registros DNS estén correctos

**Nota**: La verificación puede tardar desde 10 minutos hasta 48 horas dependiendo de tu proveedor DNS.

### PASO 6: Probar (2 minutos)

1. Abre la app Barlive
2. Ve a **"¿Olvidaste tu contraseña?"**
3. Ingresa tu email
4. Click en **"Enviar código de recuperación"**
5. Revisa tu email (incluyendo spam)

**Si funciona**: ✅ ¡Perfecto! Ya está todo configurado

**Si no funciona**: Ve a la sección de troubleshooting abajo

---

## ⚡ OPCIÓN 2: SOLUCIÓN TEMPORAL (5 minutos)

Si necesitas que funcione YA mientras esperas la verificación del dominio:

### PASO 1: Obtener API Key (igual que Opción 1, Paso 1)

### PASO 2: Configurar API Key (igual que Opción 1, Paso 2)

### PASO 3: Usar Email de Prueba de Resend

El Edge Function ya está desplegado y funcionando. Solo necesitas que Resend esté configurado correctamente.

**Nota**: Con el email de prueba `onboarding@resend.dev` solo puedes enviar a emails verificados en Resend. Para producción, DEBES verificar tu dominio.

---

## 🔍 TROUBLESHOOTING

### ❌ "Los emails siguen sin llegar"

**Verifica los logs:**
1. Ve a https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Click en **"Edge Functions"** → **"request-password-token"** → **"Logs"**
3. Busca el error específico

**Errores comunes:**

```
❌ "RESEND_API_KEY is not configured"
→ Solución: Repite Paso 2 de Opción 1

❌ "Domain not verified" (Status 403)
→ Solución: Espera más tiempo o verifica los registros DNS

❌ "Unauthorized sender" (Status 400)
→ Solución: Verifica que el dominio esté en Resend

❌ "Rate limit exceeded" (Status 429)
→ Solución: Espera o actualiza tu plan de Resend
```

### ❌ "El dominio no se verifica"

1. **Espera más tiempo**: Puede tardar hasta 48 horas
2. **Verifica los registros DNS**:
   ```bash
   # En tu terminal:
   dig TXT barliveapp.es
   dig TXT resend._domainkey.barliveapp.es
   dig TXT _dmarc.barliveapp.es
   ```
3. **Contacta a tu proveedor DNS** si los registros no aparecen después de 24 horas

### ❌ "Los emails van a spam"

Esto es normal al principio. Para mejorar la entregabilidad:

1. ✅ Verifica SPF, DKIM y DMARC (ya lo hiciste en Paso 4)
2. ✅ Usa un dominio con buena reputación
3. ✅ Envía emails consistentemente (no solo de vez en cuando)
4. ✅ Pide a los usuarios que agreguen tu email a contactos

---

## ✅ VERIFICACIÓN FINAL

Marca cada item cuando funcione:

- [ ] API Key de Resend configurada en Supabase
- [ ] Dominio verificado en Resend (estado: ✅ Verified)
- [ ] Email de prueba recibido correctamente
- [ ] Email NO está en spam
- [ ] Código de 6 dígitos visible en el email
- [ ] Flujo completo de recuperación funciona

---

## 📊 MONITOREO POST-IMPLEMENTACIÓN

Una vez que todo funcione:

### Diario (primera semana):
- Revisa los logs del Edge Function
- Verifica que los emails lleguen
- Monitorea la carpeta de spam

### Semanal:
- Revisa el dashboard de Resend: https://resend.com/emails
- Verifica la tasa de entrega (debería ser >95%)
- Revisa la cuota de envíos

### Mensual:
- Actualiza la documentación si cambias algo
- Revisa el plan de Resend si necesitas más envíos
- Verifica que los registros DNS sigan activos

---

## 🎓 RECURSOS ÚTILES

- **Dashboard Supabase**: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
- **Dashboard Resend**: https://resend.com/overview
- **Verificar DNS**: https://mxtoolbox.com/SuperTool.aspx
- **Estado Resend**: https://status.resend.com/
- **Soporte Resend**: https://resend.com/support

---

## 📞 CONTACTO DE EMERGENCIA

Si después de seguir TODOS estos pasos el problema persiste:

1. **Copia los logs completos** del Edge Function
2. **Toma captura** del dashboard de Resend
3. **Verifica** el estado de los registros DNS
4. **Contacta** al soporte de Resend con toda esta información

---

**Última actualización**: 2025-12-10  
**Edge Function Version**: 7  
**Estado**: ✅ Desplegado y listo para usar
