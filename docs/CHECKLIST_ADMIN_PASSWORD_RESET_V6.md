
# ✅ Checklist del Administrador: Sistema de Password Reset v6.0

## 🎯 Objetivo
Configurar y desplegar el sistema completo de restablecimiento de contraseña para Barlive.

**Tiempo estimado**: 2-3 horas  
**Dificultad**: Media  
**Requisitos**: Acceso a Supabase Dashboard, cuenta de Resend, Supabase CLI

---

## 📋 Fase 1: Preparación (15 minutos)

### ✅ 1.1 Verificar Accesos
- [ ] Tengo acceso al Dashboard de Supabase
- [ ] Tengo acceso al proyecto `embntaqwlwmgazvrglaf`
- [ ] Tengo permisos de administrador
- [ ] Tengo acceso al DNS del dominio `barliveapp.es`

### ✅ 1.2 Crear Cuenta en Resend
- [ ] Ir a [resend.com](https://resend.com)
- [ ] Crear cuenta con email corporativo
- [ ] Verificar email de la cuenta
- [ ] Anotar credenciales en gestor de contraseñas

### ✅ 1.3 Instalar Herramientas
- [ ] Instalar Supabase CLI: `npm install -g supabase`
- [ ] Verificar instalación: `supabase --version`
- [ ] Tener acceso a terminal/línea de comandos

---

## 📧 Fase 2: Configurar Resend (45 minutos)

### ✅ 2.1 Agregar Dominio en Resend

1. **Ir a Domains**
   - [ ] En Resend Dashboard, clic en "Domains"
   - [ ] Clic en "Add Domain"
   - [ ] Ingresar: `barliveapp.es`
   - [ ] Clic en "Add"

2. **Copiar Registros DNS**
   Resend te mostrará 3 registros DNS que debes agregar:
   
   - [ ] **SPF Record** (TXT)
     ```
     Tipo: TXT
     Nombre: @
     Valor: v=spf1 include:_spf.resend.com ~all
     ```
   
   - [ ] **DKIM Record** (TXT)
     ```
     Tipo: TXT
     Nombre: resend._domainkey
     Valor: [valor proporcionado por Resend]
     ```
   
   - [ ] **DMARC Record** (TXT)
     ```
     Tipo: TXT
     Nombre: _dmarc
     Valor: v=DMARC1; p=none; rua=mailto:dmarc@barliveapp.es
     ```

### ✅ 2.2 Configurar DNS

**Si usas IONOS:**
1. [ ] Ir a [ionos.es](https://www.ionos.es)
2. [ ] Login → Dominios → barliveapp.es
3. [ ] Clic en "DNS"
4. [ ] Agregar cada registro DNS de Resend
5. [ ] Guardar cambios

**Si usas Cloudflare:**
1. [ ] Ir a [cloudflare.com](https://www.cloudflare.com)
2. [ ] Login → Sitios → barliveapp.es
3. [ ] Clic en "DNS"
4. [ ] Agregar cada registro DNS de Resend
5. [ ] Guardar cambios

**Si usas otro proveedor:**
- [ ] Consultar documentación del proveedor
- [ ] Agregar los 3 registros DNS
- [ ] Guardar cambios

### ✅ 2.3 Verificar Dominio

- [ ] Volver a Resend Dashboard
- [ ] Ir a "Domains"
- [ ] Clic en "Verify" junto a `barliveapp.es`
- [ ] Esperar verificación (puede tardar hasta 48 horas)
- [ ] Estado debe cambiar a "Verified" ✅

**Nota**: Mientras esperas la verificación, puedes continuar con las siguientes fases.

### ✅ 2.4 Crear API Key

- [ ] En Resend Dashboard, ir a "API Keys"
- [ ] Clic en "Create API Key"
- [ ] Nombre: `Barlive Production`
- [ ] Permisos: "Full Access" (o "Sending Access")
- [ ] Clic en "Create"
- [ ] **IMPORTANTE**: Copiar la API Key (solo se muestra una vez)
- [ ] Guardar en gestor de contraseñas
- [ ] Formato: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🔧 Fase 3: Configurar Supabase Dashboard (30 minutos)

### ✅ 3.1 Configurar URL de Redirección

1. [ ] Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. [ ] Seleccionar proyecto `embntaqwlwmgazvrglaf`
3. [ ] Ir a **Authentication** → **URL Configuration**
4. [ ] En "Redirect URLs", agregar:
   ```
   https://barliveapp.es/auth/reset-password-web
   ```
5. [ ] Verificar que "Site URL" sea:
   ```
   https://barliveapp.es
   ```
6. [ ] Clic en "Save"

### ✅ 3.2 Configurar Plantilla de Email

1. [ ] En Supabase Dashboard, ir a **Authentication** → **Email Templates**
2. [ ] Seleccionar **"Reset Password"**
3. [ ] Copiar el contenido del archivo:
   ```
   docs/EMAIL_TEMPLATE_PASSWORD_RESET_V6.html
   ```
4. [ ] Pegar en el editor de Supabase
5. [ ] **VERIFICAR** que la variable `{{ .ConfirmationURL }}` esté presente
6. [ ] Configurar "Subject":
   ```
   🔐 Restablecer tu contraseña - Barlive
   ```
7. [ ] Clic en "Save"

### ✅ 3.3 Verificar Configuración de SMTP (Opcional)

Si quieres usar tu propio servidor SMTP en lugar del de Supabase:

1. [ ] Ir a **Project Settings** → **Auth**
2. [ ] Scroll hasta "SMTP Settings"
3. [ ] Configurar:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: [Tu API Key de Resend]
   - Sender email: `noreply@barliveapp.es`
   - Sender name: `Barlive`
4. [ ] Clic en "Save"

**Nota**: Esto es opcional. Supabase puede usar su propio servicio de emails.

---

## 🚀 Fase 4: Desplegar Edge Function (30 minutos)

### ✅ 4.1 Configurar Supabase CLI

1. **Login en Supabase**
   ```bash
   supabase login
   ```
   - [ ] Se abrirá el navegador
   - [ ] Autorizar acceso
   - [ ] Volver a la terminal

2. **Vincular Proyecto**
   ```bash
   supabase link --project-ref embntaqwlwmgazvrglaf
   ```
   - [ ] Ingresar password del proyecto si se solicita
   - [ ] Verificar que diga "Linked to project"

3. **Verificar Vinculación**
   ```bash
   supabase projects list
   ```
   - [ ] Debe aparecer el proyecto `embntaqwlwmgazvrglaf`

### ✅ 4.2 Configurar Secretos

1. **Configurar RESEND_API_KEY**
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   - [ ] Reemplazar con tu API Key de Resend
   - [ ] Debe decir "Secret set successfully"

2. **Verificar Secretos**
   ```bash
   supabase secrets list
   ```
   - [ ] Debe aparecer `RESEND_API_KEY`

### ✅ 4.3 Desplegar Función

1. **Desplegar**
   ```bash
   supabase functions deploy send-password-change-confirmation
   ```
   - [ ] Esperar a que termine el despliegue
   - [ ] Debe decir "Deployed successfully"

2. **Verificar Despliegue**
   ```bash
   supabase functions list
   ```
   - [ ] Debe aparecer `send-password-change-confirmation`
   - [ ] Estado: "Active"

3. **Ver URL de la Función**
   - [ ] Copiar la URL que aparece
   - [ ] Formato: `https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-password-change-confirmation`

---

## 🧪 Fase 5: Pruebas (30 minutos)

### ✅ 5.1 Prueba del Flujo Completo

1. **Solicitar Reset**
   - [ ] Abrir app Barlive
   - [ ] Ir a Login
   - [ ] Clic en "¿Olvidaste tu contraseña?"
   - [ ] Ingresar un email de prueba
   - [ ] Clic en "Enviar enlace"
   - [ ] Verificar mensaje de éxito

2. **Verificar Email de Reset**
   - [ ] Abrir bandeja de entrada del email de prueba
   - [ ] Buscar correo de Barlive
   - [ ] Verificar que llegó (revisar spam si no aparece)
   - [ ] Verificar diseño del correo
   - [ ] Verificar que el botón "Restablecer contraseña" esté presente

3. **Restablecer Contraseña**
   - [ ] Clic en el botón del correo
   - [ ] Verificar que se abre la página web
   - [ ] Verificar que muestra el formulario
   - [ ] Ingresar nueva contraseña
   - [ ] Verificar indicadores de requisitos
   - [ ] Confirmar contraseña
   - [ ] Clic en "Guardar nueva contraseña"
   - [ ] Verificar pantalla de éxito

4. **Verificar Email de Confirmación**
   - [ ] Revisar bandeja de entrada
   - [ ] Buscar correo de confirmación
   - [ ] Verificar que llegó
   - [ ] Verificar contenido del correo

5. **Iniciar Sesión**
   - [ ] Volver a la app Barlive
   - [ ] Ir a Login
   - [ ] Ingresar email y nueva contraseña
   - [ ] Clic en "Iniciar sesión"
   - [ ] Verificar que inicia sesión correctamente

### ✅ 5.2 Pruebas de Error

1. **Enlace Expirado**
   - [ ] Solicitar reset
   - [ ] Esperar más de 1 hora
   - [ ] Intentar usar el enlace
   - [ ] Verificar mensaje de error apropiado

2. **Contraseña Débil**
   - [ ] Solicitar reset
   - [ ] Abrir enlace
   - [ ] Intentar contraseña débil (ej: "123")
   - [ ] Verificar que no permite guardar
   - [ ] Verificar mensajes de validación

3. **Contraseñas No Coinciden**
   - [ ] Ingresar contraseña en primer campo
   - [ ] Ingresar diferente en segundo campo
   - [ ] Intentar guardar
   - [ ] Verificar mensaje de error

### ✅ 5.3 Verificar Logs

1. **Logs de Edge Function**
   ```bash
   supabase functions logs send-password-change-confirmation
   ```
   - [ ] Verificar que no hay errores
   - [ ] Verificar que se envió el correo

2. **Logs en Supabase Dashboard**
   - [ ] Ir a **Functions** → **send-password-change-confirmation**
   - [ ] Clic en "Logs"
   - [ ] Verificar ejecuciones exitosas
   - [ ] Verificar que no hay errores

3. **Logs en Resend**
   - [ ] Ir a Resend Dashboard
   - [ ] Clic en "Logs"
   - [ ] Verificar que los emails se enviaron
   - [ ] Verificar estado: "Delivered"

---

## 📊 Fase 6: Monitoreo y Mantenimiento

### ✅ 6.1 Configurar Alertas

- [ ] En Supabase, configurar alertas para:
  - Errores en Edge Functions
  - Tasa de error alta en autenticación
  - Uso excesivo de recursos

- [ ] En Resend, configurar alertas para:
  - Emails rebotados
  - Tasa de entrega baja
  - Problemas de dominio

### ✅ 6.2 Documentar Credenciales

Guardar en gestor de contraseñas:
- [ ] API Key de Resend
- [ ] URL del proyecto de Supabase
- [ ] Credenciales de acceso a DNS
- [ ] Contactos de soporte

### ✅ 6.3 Capacitar al Equipo

- [ ] Compartir documentación con equipo de soporte
- [ ] Realizar sesión de capacitación
- [ ] Crear FAQ interna
- [ ] Establecer proceso de escalación

---

## ✅ Checklist Final

### Verificación Completa

- [ ] ✅ Dominio verificado en Resend
- [ ] ✅ API Key configurada en Supabase
- [ ] ✅ Edge Function desplegada
- [ ] ✅ Plantilla de email configurada
- [ ] ✅ URLs de redirección configuradas
- [ ] ✅ Pruebas completas realizadas
- [ ] ✅ Logs verificados sin errores
- [ ] ✅ Equipo capacitado
- [ ] ✅ Documentación actualizada
- [ ] ✅ Sistema en producción

---

## 🎉 ¡Felicidades!

Si completaste todos los pasos, el sistema de restablecimiento de contraseña v6.0 está **completamente configurado y funcionando**.

### Próximos Pasos

1. **Monitorear** el sistema durante la primera semana
2. **Recopilar feedback** de usuarios
3. **Ajustar** según sea necesario
4. **Documentar** cualquier problema encontrado

---

## 🆘 ¿Problemas?

### Recursos de Ayuda

1. **Documentación Técnica**
   - `PASSWORD_RESET_FLOW_V6_SETUP.md`
   - `GUIA_USUARIO_RESTABLECER_PASSWORD.md`

2. **Logs**
   - Supabase Dashboard → Functions → Logs
   - Resend Dashboard → Logs
   - Terminal: `supabase functions logs`

3. **Soporte**
   - Supabase: [support.supabase.com](https://support.supabase.com)
   - Resend: [resend.com/support](https://resend.com/support)
   - Equipo interno: Contactar al equipo de desarrollo

---

## 📝 Notas del Administrador

Usa este espacio para anotar cualquier detalle específico de tu implementación:

```
Fecha de implementación: _______________
Problemas encontrados: _______________
Soluciones aplicadas: _______________
Tiempo total: _______________
Notas adicionales: _______________
```

---

**Versión**: 1.0  
**Última actualización**: 2 de febrero de 2025  
**Mantenido por**: Equipo de Desarrollo Barlive

---

¡Éxito con la implementación! 🚀
