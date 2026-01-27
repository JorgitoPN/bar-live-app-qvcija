
# 🌐 Instrucciones para Configurar DNS en IONOS

## 🎯 Objetivo

Configurar los registros DNS en IONOS para que tu dominio `barliveapp.es` apunte a tu app en Render.

**Tiempo estimado:** 10 minutos

---

## 📋 Antes de Empezar

Necesitas tener:

1. ✅ Acceso a tu cuenta de IONOS
2. ✅ El dominio `barliveapp.es` registrado
3. ✅ La IP o CNAME que te dio Render (lo obtienes en Render → Settings → Custom Domain)

---

## 🔧 Paso a Paso

### Paso 1: Acceder al Panel de IONOS

1. Ve a: https://www.ionos.es/
2. Haz clic en **Iniciar sesión** (arriba a la derecha)
3. Ingresa tus credenciales
4. Haz clic en **Iniciar sesión**

### Paso 2: Ir a la Configuración de DNS

1. En el panel principal, haz clic en **Dominios y SSL**
2. Busca tu dominio: `barliveapp.es`
3. Haz clic en el ícono de **engranaje** (⚙️) al lado del dominio
4. Selecciona **DNS**

### Paso 3: Configurar Registros DNS para Render

#### Registro 1: Dominio Principal (barliveapp.es)

Este registro hace que `barliveapp.es` apunte a tu app en Render.

1. Haz clic en **Agregar registro**
2. Selecciona **Tipo:** `A`
3. Completa:
   - **Host:** `@` (o dejar vacío)
   - **Apunta a:** (la IP que te dio Render, ejemplo: `216.24.57.1`)
   - **TTL:** `3600`
4. Haz clic en **Guardar**

**¿Dónde encuentro la IP de Render?**
1. Ve a Render → Tu Static Site → Settings → Custom Domain
2. Haz clic en **Add Custom Domain**
3. Ingresa `barliveapp.es`
4. Render te mostrará la IP que debes usar

#### Registro 2: Subdominio www (www.barliveapp.es)

Este registro hace que `www.barliveapp.es` también funcione.

1. Haz clic en **Agregar registro**
2. Selecciona **Tipo:** `CNAME`
3. Completa:
   - **Host:** `www`
   - **Apunta a:** `bar-live-app-qvcija.onrender.com` (tu URL de Render sin https://)
   - **TTL:** `3600`
4. Haz clic en **Guardar**

### Paso 4: Configurar Registros DNS para Resend (OPCIONAL)

**NOTA:** Solo necesitas esto si vas a usar Resend para enviar emails personalizados desde `noreply@barlive.app`.

#### Registro 3: DKIM (Verificación de Email)

1. Haz clic en **Agregar registro**
2. Selecciona **Tipo:** `TXT`
3. Completa:
   - **Host:** `resend._domainkey.noreply`
   - **Valor:** `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDjQqvqSjAufcQ7B0QM2ZCpRVgWXhYd92hcKAx0qTXOj/m4SElmhs21pq5VwHUIr42gTFXv/GY9af4e6ZKwrK30MoJjAboiOscXSiyzG1XE33P8aO8YKFsxy5QoOhjfiVTlk9cUYcTduwinA1Mj/i3AudWjnhuC2/BicvunxgIGdQIDAQAB`
   - **TTL:** `3600`
4. Haz clic en **Guardar**

#### Registro 4: SPF (Prevención de Spam) - MX

1. Haz clic en **Agregar registro**
2. Selecciona **Tipo:** `MX`
3. Completa:
   - **Host:** `send.noreply`
   - **Apunta a:** `feedback-smtp.eu-west-1.amazonses.com`
   - **Prioridad:** `10`
   - **TTL:** `3600`
4. Haz clic en **Guardar**

#### Registro 5: SPF (Prevención de Spam) - TXT

1. Haz clic en **Agregar registro**
2. Selecciona **Tipo:** `TXT`
3. Completa:
   - **Host:** `send.noreply`
   - **Valor:** `v=spf1 include:amazonses.com ~all`
   - **TTL:** `3600`
4. Haz clic en **Guardar**

#### Registro 6: DMARC (Política de Email) - OPCIONAL

1. Haz clic en **Agregar registro**
2. Selecciona **Tipo:** `TXT`
3. Completa:
   - **Host:** `_dmarc`
   - **Valor:** `v=DMARC1; p=none;`
   - **TTL:** `3600`
4. Haz clic en **Guardar**

#### Registro 7: MX para Recibir Emails - OPCIONAL

1. Haz clic en **Agregar registro**
2. Selecciona **Tipo:** `MX`
3. Completa:
   - **Host:** `noreply`
   - **Apunta a:** `inbound-smtp.eu-west-1.amazonaws.com`
   - **Prioridad:** `10`
   - **TTL:** `3600`
4. Haz clic en **Guardar**

---

## ⏱️ Tiempo de Propagación

Los cambios en DNS pueden tardar en propagarse:

- **Mínimo:** 5-10 minutos
- **Promedio:** 1-2 horas
- **Máximo:** 24-48 horas

**Consejo:** Usa https://dnschecker.org/ para verificar si los cambios ya se propagaron.

---

## ✅ Verificar la Configuración

### Verificar Dominio Principal

1. Abre una ventana de incógnito en tu navegador
2. Ve a: `https://barliveapp.es`
3. Verifica que tu app carga correctamente

### Verificar Subdominio www

1. Ve a: `https://www.barliveapp.es`
2. Verifica que redirige a `https://barliveapp.es` o que carga tu app

### Verificar SSL

1. Haz clic en el candado 🔒 en la barra de direcciones
2. Verifica que dice **"Conexión segura"**
3. Verifica que el certificado es válido

### Verificar Registros DNS (Opcional)

Usa herramientas online para verificar:

1. **DNSChecker:** https://dnschecker.org/
   - Ingresa: `barliveapp.es`
   - Selecciona: `A`
   - Verifica que aparece la IP de Render

2. **MXToolbox:** https://mxtoolbox.com/
   - Ingresa: `barliveapp.es`
   - Verifica todos los registros

---

## 🐛 Solución de Problemas

### Problema 1: "Este sitio no se puede alcanzar"

**Causa:** Los registros DNS no están configurados correctamente o no se han propagado.

**Solución:**
1. Verifica que el registro A apunta a la IP correcta de Render
2. Verifica que el registro CNAME apunta al dominio correcto de Render
3. Espera 1-2 horas para que se propaguen los cambios
4. Usa https://dnschecker.org/ para verificar la propagación

### Problema 2: "Tu conexión no es privada" (Error SSL)

**Causa:** El certificado SSL no se ha generado todavía.

**Solución:**
1. Ve a Render → Settings → Custom Domain
2. Verifica que el dominio está **Verified**
3. Espera a que Render genere el certificado (puede tardar hasta 24 horas)
4. Si después de 24 horas no funciona, contacta a Render Support

### Problema 3: "DNS_PROBE_FINISHED_NXDOMAIN"

**Causa:** El dominio no existe o los registros DNS no están configurados.

**Solución:**
1. Verifica que el dominio está registrado en IONOS
2. Verifica que los registros DNS están guardados
3. Espera a que se propaguen los cambios
4. Limpia la caché de DNS de tu computadora:
   - **Windows:** `ipconfig /flushdns`
   - **Mac:** `sudo dscacheutil -flushcache`
   - **Linux:** `sudo systemd-resolve --flush-caches`

### Problema 4: Los emails de Resend no funcionan

**Causa:** Los registros DNS de Resend no están configurados correctamente.

**Solución:**
1. Ve a Resend → Domains → noreply.barlive.app
2. Verifica que todos los registros están en estado **Verified**
3. Si no están verificados, revisa los registros DNS en IONOS
4. Espera a que se propaguen los cambios (hasta 24 horas)
5. Usa https://mxtoolbox.com/ para verificar los registros MX y SPF

---

## 📊 Resumen de Registros DNS

### Para Render (Obligatorio)

| Tipo | Host | Apunta a | TTL |
|------|------|----------|-----|
| A | @ | (IP de Render) | 3600 |
| CNAME | www | bar-live-app-qvcija.onrender.com | 3600 |

### Para Resend (Opcional)

| Tipo | Host | Valor/Apunta a | Prioridad | TTL |
|------|------|----------------|-----------|-----|
| TXT | resend._domainkey.noreply | p=MIGfMA0GCS... | - | 3600 |
| MX | send.noreply | feedback-smtp.eu-west-1.amazonses.com | 10 | 3600 |
| TXT | send.noreply | v=spf1 include:amazonses.com ~all | - | 3600 |
| TXT | _dmarc | v=DMARC1; p=none; | - | 3600 |
| MX | noreply | inbound-smtp.eu-west-1.amazonaws.com | 10 | 3600 |

---

## ✅ Checklist Final

- [ ] Accedí al panel de IONOS
- [ ] Configuré el registro A para el dominio principal
- [ ] Configuré el registro CNAME para www
- [ ] (Opcional) Configuré los registros de Resend
- [ ] Guardé todos los cambios
- [ ] Esperé a que se propaguen los cambios
- [ ] Verifiqué que `https://barliveapp.es` funciona
- [ ] Verifiqué que `https://www.barliveapp.es` funciona
- [ ] Verifiqué que el SSL funciona
- [ ] (Opcional) Verifiqué que los emails de Resend funcionan

---

## 🎉 ¡Listo!

Tu dominio está configurado correctamente y apunta a tu app en Render.

**URLs de producción:**
- https://barliveapp.es
- https://www.barliveapp.es

---

## 📞 Soporte

Si tienes problemas:

1. **IONOS Support:** https://www.ionos.es/ayuda
2. **IONOS Community:** https://www.ionos.es/community
3. **Render Support:** https://render.com/support

---

**¡Éxito con tu configuración! 🚀**
