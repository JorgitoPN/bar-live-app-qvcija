
# 🔍 Verificación del Estado de Emails - Checklist Rápido

## ✅ PASO 1: Verificar Configuración de Supabase Auth

### 1.1 Acceder al Dashboard
```
URL: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/auth
```

### 1.2 Verificar SMTP Settings
Scroll hasta la sección **SMTP Settings** y verifica:

**Si ves esto:**
```
Host: smtp.resend.com
Port: 465 o 587
Username: resend
Password: re_xxxxxxxxx
```
➡️ **Estás usando Resend** (y por eso los emails no llegan porque el dominio no está verificado)

**Si ves esto:**
```
Host: (vacío)
Port: (vacío)
Username: (vacío)
Password: (vacío)
```
➡️ **Estás usando Supabase nativo** (debería funcionar)

---

## ✅ PASO 2: Verificar Estado de Resend

### 2.1 Acceder a Resend
```
URL: https://resend.com/domains
```

### 2.2 Buscar tu dominio
Busca: `barlive.app`

**Posibles estados:**

| Estado | Significado | Acción |
|--------|-------------|--------|
| ✅ **Verified** | Dominio verificado | Puedes usar Resend |
| ⏳ **Pending** | DNS no propagado | Espera propagación |
| ❌ **Failed** | Error en DNS | Revisa configuración |
| 🚫 **Not Found** | No agregado | Agrega el dominio |

---

## ✅ PASO 3: Verificar Logs de Supabase

### 3.1 Ver logs recientes
En tu terminal, ejecuta:
```bash
# Ver logs de Auth
supabase functions logs --project-ref embntaqwlwmgazvrglaf
```

### 3.2 Buscar errores específicos

**Error actual que estás viendo:**
```
Error: gomail: could not send email 1: 450 The barlive.app domain is not verified
```
➡️ **Solución:** Desactiva Resend o verifica el dominio

**Otros errores posibles:**
```
Error: Email not confirmed
```
➡️ Usuario debe verificar email primero

```
Error: Rate limit exceeded
```
➡️ Demasiados intentos, espera unos minutos

```
Error: Invalid API key
```
➡️ API key de Resend incorrecta

---

## ✅ PASO 4: Probar Envío de Email

### 4.1 Prueba desde la app
1. Abre tu app
2. Ve a: Registro
3. Ingresa un email de prueba
4. Haz clic en "Crear cuenta"
5. Observa:
   - ¿Aparece mensaje de éxito?
   - ¿Llega el email?
   - ¿Cuánto tarda?

### 4.2 Revisa tu bandeja de entrada
- Busca email de: `noreply@mail.app.supabase.io` (Supabase nativo)
- O de: `noreply@barlive.app` (Resend)
- Revisa también la carpeta de spam

### 4.3 Verifica el contenido del email
- ¿Tiene el enlace de verificación?
- ¿El enlace funciona?
- ¿Redirige correctamente?

---

## ✅ PASO 5: Verificar Email Templates

### 5.1 Acceder a Email Templates
```
URL: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates
```

### 5.2 Verificar templates activos
Debe haber templates para:
- ✅ **Confirm signup** (Verificación de email)
- ✅ **Reset password** (Recuperación de contraseña)
- ✅ **Magic Link** (Inicio de sesión sin contraseña)
- ✅ **Change Email** (Cambio de email)

### 5.3 Verificar contenido del template
El template debe incluir:
- `{{ .ConfirmationURL }}` para verificación
- `{{ .Token }}` para el código
- Diseño profesional y claro

---

## 📊 DIAGNÓSTICO RÁPIDO

### Escenario A: Usando Resend + Dominio NO Verificado
**Síntomas:**
- ❌ Emails no llegan
- ❌ Error en logs: "domain is not verified"
- ❌ SMTP configurado en Supabase

**Solución:**
1. Desactiva SMTP en Supabase (usa nativo)
2. O verifica el dominio en Resend

---

### Escenario B: Usando Supabase Nativo
**Síntomas:**
- ✅ Emails llegan
- ✅ Sin errores en logs
- ✅ SMTP vacío en Supabase

**Estado:**
- ✅ Todo funciona correctamente
- Email viene de: `noreply@mail.app.supabase.io`

---

### Escenario C: Usando Resend + Dominio Verificado
**Síntomas:**
- ✅ Emails llegan
- ✅ Sin errores en logs
- ✅ SMTP configurado en Supabase
- ✅ Dominio verificado en Resend

**Estado:**
- ✅ Todo funciona correctamente
- Email viene de: `noreply@barlive.app`

---

## 🎯 ACCIÓN RECOMENDADA SEGÚN TU CASO

### Si estás en Escenario A (TU CASO ACTUAL):

**Opción 1: Solución Rápida (5 minutos)**
1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/auth
2. Scroll hasta: **SMTP Settings**
3. Elimina todos los valores:
   - Host: (dejar vacío)
   - Port: (dejar vacío)
   - Username: (dejar vacío)
   - Password: (dejar vacío)
4. Haz clic en: **Save**
5. Prueba el registro nuevamente

**Opción 2: Solución Profesional (30 min + DNS)**
1. Ve a: https://resend.com/domains
2. Agrega dominio: `barlive.app`
3. Configura registros DNS (SPF, DKIM, DMARC)
4. Espera verificación
5. Los emails funcionarán desde tu dominio

---

## 📝 CHECKLIST DE VERIFICACIÓN COMPLETA

Marca cada item después de verificarlo:

### Configuración de Supabase
- [ ] SMTP Settings revisado
- [ ] Email Templates activos
- [ ] Email confirmations habilitado
- [ ] Redirect URLs configuradas

### Configuración de Resend (si aplica)
- [ ] API Key configurada
- [ ] Dominio agregado
- [ ] DNS configurado
- [ ] Dominio verificado

### Pruebas Funcionales
- [ ] Email de registro llega
- [ ] Email de recuperación llega
- [ ] Enlaces funcionan correctamente
- [ ] Emails no van a spam
- [ ] Tiempo de entrega < 1 minuto

### Experiencia de Usuario
- [ ] Mensajes de error claros
- [ ] Indicadores de carga visibles
- [ ] Confirmaciones visuales
- [ ] Opción de reenvío disponible

---

## 🆘 COMANDOS ÚTILES

### Ver logs en tiempo real
```bash
supabase functions logs --project-ref embntaqwlwmgazvrglaf --follow
```

### Ver secrets configurados
```bash
supabase secrets list --project-ref embntaqwlwmgazvrglaf
```

### Verificar DNS
```bash
# En tu navegador
https://dnschecker.org

# Buscar: barlive.app
# Tipo: TXT (para SPF)
# Tipo: CNAME (para DKIM)
```

---

## 📞 CONTACTOS DE SOPORTE

Si necesitas ayuda:

- **Supabase Discord:** https://discord.supabase.com
- **Resend Support:** support@resend.com
- **Documentación:** 
  - Supabase Auth: https://supabase.com/docs/guides/auth
  - Resend: https://resend.com/docs

---

## ✅ RESULTADO ESPERADO

Después de la verificación, deberías poder:

1. ✅ Registrar nuevos usuarios
2. ✅ Recibir emails de verificación
3. ✅ Verificar cuentas con el enlace
4. ✅ Recuperar contraseñas
5. ✅ Iniciar sesión sin problemas

**Tiempo de entrega de emails:** < 1 minuto
**Tasa de entrega:** > 95%
**Emails en spam:** < 5%

---

## 📊 MÉTRICAS A MONITOREAR

### Diariamente
- Número de emails enviados
- Tasa de entrega
- Emails rebotados
- Emails en spam

### Semanalmente
- Tiempo promedio de entrega
- Errores de envío
- Quejas de usuarios
- Tasa de verificación

### Mensualmente
- Costo de emails (si aplica)
- Tendencias de uso
- Optimizaciones necesarias
- Actualizaciones de templates

---

**Última actualización:** 1 de diciembre de 2024
**Versión:** 1.0
**Estado:** Activo
