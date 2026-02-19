
# 🚨 SOLUCIÓN DEFINITIVA: Problema de Emails - Dominio No Verificado

## 📋 RESUMEN EJECUTIVO

**Problema:** Los correos de recuperación de contraseña NO están llegando a los usuarios.

**Causa Raíz:** El dominio `barlive.app` NO está verificado en Resend (servicio de envío de emails).

**Error Específico:** 
```
Error 450: The barlive.app domain is not verified. 
Please, add and verify your domain on https://resend.com/domains
```

**Impacto:** 
- ❌ NO se pueden enviar correos de recuperación de contraseña
- ❌ NO se pueden enviar correos de verificación de email
- ❌ Los usuarios NO pueden recuperar sus cuentas

---

## 🔍 DIAGNÓSTICO COMPLETO

### Logs de Supabase Auth

Los logs muestran claramente el error:

```json
{
  "error": "gomail: could not send email 1: 450 The barlive.app domain is not verified. Please, add and verify your domain on https://resend.com/domains",
  "level": "error",
  "msg": "500: Error sending recovery email",
  "path": "/recover",
  "status": 500,
  "error_code": "unexpected_failure"
}
```

### Análisis del Error

1. **Error Code:** `450` - Error de SMTP relacionado con verificación de dominio
2. **Status:** `500` - Error interno del servidor (causado por el error de SMTP)
3. **Mensaje:** "The barlive.app domain is not verified"
4. **Servicio:** Resend (proveedor de SMTP configurado en Supabase)

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Acceder a Resend

1. Ir a: https://resend.com/domains
2. Iniciar sesión con las credenciales de administrador
3. Buscar el dominio `barlive.app` en la lista

### Paso 2: Obtener Registros DNS

En Resend, para el dominio `barlive.app`, copiar los siguientes registros DNS:

#### Registro DKIM (DomainKeys Identified Mail)
```
Tipo: TXT
Nombre: resend._domainkey.barlive.app
Valor: [Valor proporcionado por Resend]
TTL: 3600
```

#### Registro SPF (Sender Policy Framework)
```
Tipo: TXT
Nombre: barlive.app
Valor: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### Registro DMARC (Domain-based Message Authentication)
```
Tipo: TXT
Nombre: _dmarc.barlive.app
Valor: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
TTL: 3600
```

### Paso 3: Configurar DNS en IONOS

1. Ir a: https://www.ionos.es/
2. Iniciar sesión con las credenciales del dominio
3. Navegar a: **Dominios** → **barlive.app** → **DNS**
4. Añadir los registros DNS copiados de Resend:

#### Añadir Registro DKIM
- Clic en "Añadir registro"
- Tipo: TXT
- Nombre: `resend._domainkey`
- Valor: [Pegar el valor de Resend]
- TTL: 3600
- Guardar

#### Añadir/Actualizar Registro SPF
- Si ya existe un registro TXT para `@` (raíz del dominio), editarlo
- Si no existe, crear uno nuevo:
  - Tipo: TXT
  - Nombre: `@` (o dejar vacío)
  - Valor: `v=spf1 include:_spf.resend.com ~all`
  - TTL: 3600
  - Guardar

#### Añadir Registro DMARC
- Clic en "Añadir registro"
- Tipo: TXT
- Nombre: `_dmarc`
- Valor: `v=DMARC1; p=none; rua=mailto:dmarc@barlive.app`
- TTL: 3600
- Guardar

### Paso 4: Esperar Propagación DNS

⏰ **Tiempo de espera:** 15-30 minutos (puede tardar hasta 48 horas en casos extremos)

Para verificar la propagación:
```bash
# Verificar DKIM
dig TXT resend._domainkey.barlive.app

# Verificar SPF
dig TXT barlive.app

# Verificar DMARC
dig TXT _dmarc.barlive.app
```

O usar herramientas online:
- https://mxtoolbox.com/SuperTool.aspx
- https://dnschecker.org/

### Paso 5: Verificar en Resend

1. Volver a https://resend.com/domains
2. Seleccionar `barlive.app`
3. Clic en "Verify Domain" o "Check DNS Records"
4. Esperar a que todos los registros aparezcan como ✅ Verificados

---

## 🔧 ALTERNATIVA TEMPORAL

Mientras se verifica el dominio, puedes usar los emails nativos de Supabase:

### Opción 1: Desactivar SMTP Personalizado

1. Ir a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/providers
2. Navegar a: **Email** → **SMTP Settings**
3. Desactivar "Enable Custom SMTP"
4. Guardar cambios

**Nota:** Los emails se enviarán desde `noreply@mail.app.supabase.io` en lugar de `noreply@barlive.app`

### Opción 2: Usar Otro Proveedor SMTP

Alternativas a Resend:
- **SendGrid** (12,000 emails gratis/mes)
- **Mailgun** (5,000 emails gratis/mes)
- **Amazon SES** (62,000 emails gratis/mes)

---

## 📊 VERIFICACIÓN POST-IMPLEMENTACIÓN

### 1. Verificar Registros DNS

```bash
# Verificar todos los registros
dig TXT barlive.app
dig TXT resend._domainkey.barlive.app
dig TXT _dmarc.barlive.app
```

### 2. Probar Envío de Email

En la app, intentar:
1. Recuperar contraseña
2. Registrar nuevo usuario
3. Verificar que los emails lleguen

### 3. Revisar Logs de Supabase

```bash
# Verificar que no haya errores 450 o 500
# Los logs deben mostrar:
# "mail.send" con status 200
```

---

## 🚨 TROUBLESHOOTING

### Error: "DNS records not found"

**Causa:** Los registros DNS aún no se han propagado

**Solución:**
1. Esperar más tiempo (hasta 48 horas)
2. Verificar que los registros se añadieron correctamente en IONOS
3. Limpiar caché DNS local: `ipconfig /flushdns` (Windows) o `sudo dscacheutil -flushcache` (Mac)

### Error: "DKIM signature verification failed"

**Causa:** El valor del registro DKIM es incorrecto

**Solución:**
1. Verificar que el valor copiado de Resend sea exacto
2. Asegurarse de que no haya espacios extra
3. Verificar que el nombre del registro sea `resend._domainkey`

### Error: "SPF record invalid"

**Causa:** Conflicto con registros SPF existentes

**Solución:**
1. Verificar si ya existe un registro SPF
2. Si existe, combinarlo: `v=spf1 include:_spf.resend.com include:otro-proveedor.com ~all`
3. NO tener múltiples registros SPF (solo uno por dominio)

---

## 📞 CONTACTO Y SOPORTE

### Soporte BarLive
- **Email:** soporte@barliveapp.es
- **Teléfono:** [Añadir número]

### Soporte Resend
- **Documentación:** https://resend.com/docs
- **Email:** support@resend.com

### Soporte IONOS
- **Teléfono:** 900 649 649
- **Email:** info@ionos.es
- **Chat:** https://www.ionos.es/ayuda

---

## 📚 RECURSOS ADICIONALES

### Documentación Oficial

- **Resend Domain Verification:** https://resend.com/docs/dashboard/domains/introduction
- **Supabase SMTP Setup:** https://supabase.com/docs/guides/auth/auth-smtp
- **DNS Records Explained:** https://www.cloudflare.com/learning/dns/dns-records/

### Herramientas de Verificación

- **MX Toolbox:** https://mxtoolbox.com/
- **DNS Checker:** https://dnschecker.org/
- **DMARC Analyzer:** https://dmarc.org/

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Acceder a Resend y obtener registros DNS
- [ ] Acceder a IONOS y añadir registros DNS
- [ ] Esperar propagación DNS (15-30 min)
- [ ] Verificar registros con `dig` o herramientas online
- [ ] Verificar dominio en Resend
- [ ] Probar envío de email de recuperación
- [ ] Verificar logs de Supabase (sin errores 450/500)
- [ ] Documentar cambios realizados
- [ ] Notificar a usuarios que el problema está resuelto

---

## 📝 NOTAS IMPORTANTES

1. **NO eliminar registros DNS existentes** sin verificar su propósito
2. **Hacer backup** de la configuración DNS actual antes de hacer cambios
3. **Probar en ambiente de desarrollo** primero si es posible
4. **Documentar todos los cambios** realizados
5. **Notificar al equipo** cuando el problema esté resuelto

---

## 🎯 RESULTADO ESPERADO

Después de completar estos pasos:

✅ El dominio `barlive.app` estará verificado en Resend
✅ Los emails de recuperación de contraseña llegarán correctamente
✅ Los emails de verificación de cuenta llegarán correctamente
✅ NO habrá errores 450 o 500 en los logs de Supabase
✅ Los usuarios podrán recuperar sus cuentas sin problemas

---

**Última actualización:** 1 de diciembre de 2025
**Versión:** 1.0
**Autor:** Sistema de Diagnóstico Automático
