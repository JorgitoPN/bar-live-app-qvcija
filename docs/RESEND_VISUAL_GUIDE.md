
# 📸 Guía Visual: Configuración de Resend para BarLive

Esta guía te muestra exactamente dónde hacer clic y qué configurar.

---

## 🎯 Parte 1: Obtener API Key de Resend

### Paso 1.1: Crear Cuenta en Resend

1. **Ve a**: https://resend.com
2. **Haz clic en**: "Sign Up" (esquina superior derecha)
3. **Completa el formulario**:
   - Email
   - Contraseña
   - Acepta términos
4. **Haz clic en**: "Create Account"

### Paso 1.2: Verificar Email

1. **Revisa tu email**: Busca correo de Resend
2. **Haz clic en**: "Verify Email" en el correo
3. **Serás redirigido**: Al dashboard de Resend

### Paso 1.3: Crear API Key

1. **En el dashboard de Resend**:
   - Busca el menú lateral izquierdo
   - Haz clic en **"API Keys"**

2. **Haz clic en**: "Create API Key" (botón azul)

3. **Configura la API Key**:
   ```
   Name: BarLive Production
   Permission: Sending access (por defecto)
   ```

4. **Haz clic en**: "Create"

5. **⚠️ IMPORTANTE**: 
   - Copia la API Key (empieza con `re_`)
   - Guárdala en un lugar seguro
   - Solo se muestra una vez
   - Ejemplo: `re_123abc456def789ghi012jkl345mno678`

---

## 🎯 Parte 2: Configurar API Key en Supabase

### Opción A: Usando el Dashboard (Recomendado)

#### Paso 2.1: Ir a Supabase

1. **Ve a**: https://supabase.com/dashboard
2. **Inicia sesión** con tu cuenta
3. **Selecciona tu proyecto**: BarLive (embntaqwlwmgazvrglaf)

#### Paso 2.2: Navegar a Secrets

1. **En el menú lateral izquierdo**:
   - Haz clic en **"Settings"** (⚙️ icono de engranaje)
   - Haz clic en **"Edge Functions"**

2. **En la página de Edge Functions**:
   - Busca la pestaña **"Secrets"**
   - Haz clic en ella

#### Paso 2.3: Agregar el Secret

1. **Haz clic en**: "Add new secret" (botón verde)

2. **Completa el formulario**:
   ```
   Name: RESEND_API_KEY
   Value: [Pega aquí tu API key de Resend]
   ```

3. **⚠️ IMPORTANTE**: 
   - El nombre debe ser exactamente `RESEND_API_KEY`
   - No agregues espacios ni comillas
   - Pega la key completa (empieza con `re_`)

4. **Haz clic en**: "Save" o "Add Secret"

5. **Verificación**:
   - Deberías ver `RESEND_API_KEY` en la lista de secrets
   - El valor estará oculto (●●●●●●●●)

### Opción B: Usando la CLI

Si prefieres usar la terminal:

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Login en Supabase
supabase login

# Configurar el secret
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui --project-ref embntaqwlwmgazvrglaf

# Verificar
supabase secrets list --project-ref embntaqwlwmgazvrglaf
```

---

## 🎯 Parte 3: Verificar que Funciona

### Paso 3.1: Probar desde la App

1. **Abre la app BarLive** en tu dispositivo/emulador

2. **Ve a la pantalla de registro**:
   - Busca "Crear cuenta" o "Registrarse"
   - Haz clic

3. **Completa el formulario**:
   ```
   Email: tu_email_real@gmail.com
   [Continúa con el resto del registro]
   ```

4. **Espera el código**:
   - Revisa tu bandeja de entrada
   - Revisa también la carpeta de spam
   - Deberías recibir un correo en menos de 30 segundos

5. **Verifica el correo**:
   - Asunto: "Verifica tu correo electrónico - BarLive"
   - Remitente: `BarLive <onboarding@resend.dev>` (o `noreply@barlive.app` si configuraste el dominio)
   - Contenido: Código de 6 dígitos

6. **Ingresa el código** en la app

7. **✅ ¡Éxito!**: Si el código funciona, todo está configurado correctamente

### Paso 3.2: Revisar Logs en Supabase

1. **Ve a Supabase Dashboard**

2. **Navega a**:
   - Edge Functions (menú lateral)
   - send-verification-email
   - Pestaña "Logs"

3. **Busca**:
   - `[SendVerificationEmail] Email sent successfully`
   - Deberías ver el `messageId` de Resend

4. **Si hay errores**:
   - Busca líneas rojas con `[ERROR]`
   - Lee el mensaje de error
   - Consulta la sección de solución de problemas

### Paso 3.3: Revisar Dashboard de Resend

1. **Ve a**: https://resend.com/emails

2. **Deberías ver**:
   - Tu correo de prueba en la lista
   - Estado: "Delivered" (✅)
   - Timestamp reciente

3. **Haz clic en el correo** para ver detalles:
   - Destinatario
   - Asunto
   - Contenido HTML
   - Logs de entrega

---

## 🎯 Parte 4: Configurar Dominio Personalizado (Opcional)

### Paso 4.1: Agregar Dominio en Resend

1. **En Resend Dashboard**:
   - Haz clic en **"Domains"** (menú lateral)

2. **Haz clic en**: "Add Domain" (botón azul)

3. **Introduce tu dominio**:
   ```
   Domain: barlive.app
   ```

4. **Haz clic en**: "Add"

5. **Resend te mostrará**:
   - Registros DNS que necesitas configurar
   - Instrucciones específicas

### Paso 4.2: Configurar DNS

**Dónde configurar DNS:**
- Ve al panel de control de tu proveedor de dominio
- Ejemplos: GoDaddy, Namecheap, Cloudflare, etc.
- Busca la sección "DNS Management" o "DNS Settings"

**Registros a agregar:**

1. **SPF Record**:
   ```
   Type: TXT
   Name: @ (o deja en blanco)
   Value: v=spf1 include:_spf.resend.com ~all
   TTL: 3600 (o automático)
   ```

2. **DKIM Record**:
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [Copia el valor de Resend - es único para tu cuenta]
   TTL: 3600 (o automático)
   ```

3. **DMARC Record** (Opcional):
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
   TTL: 3600 (o automático)
   ```

### Paso 4.3: Verificar Dominio

1. **Espera**: 5-10 minutos (a veces hasta 48 horas)

2. **En Resend**:
   - Ve a Domains
   - Busca tu dominio
   - Haz clic en "Verify"

3. **Estado**:
   - ⏳ Pending: Esperando propagación DNS
   - ✅ Verified: ¡Listo para usar!
   - ❌ Failed: Revisa los registros DNS

4. **Una vez verificado**:
   - Los correos se enviarán desde `noreply@barlive.app`
   - Mejor entregabilidad
   - Más profesional

---

## 🔍 Solución Visual de Problemas

### Problema: No veo "Secrets" en Supabase

**Solución:**
1. Asegúrate de estar en **Settings** → **Edge Functions**
2. Busca las pestañas en la parte superior
3. Si no ves "Secrets", actualiza la página
4. Verifica que tengas permisos de administrador

### Problema: "Invalid API Key" en Resend

**Solución:**
1. Ve a Resend → API Keys
2. Verifica que la key esté activa (no revocada)
3. Crea una nueva key si es necesario
4. Actualiza el secret en Supabase

### Problema: Correos van a spam

**Solución:**
1. Configura el dominio personalizado
2. Agrega todos los registros DNS (SPF, DKIM, DMARC)
3. Espera 24-48 horas para que mejore la reputación
4. Pide a los usuarios que marquen como "No es spam"

### Problema: "Domain not verified"

**Solución:**
1. Verifica que los registros DNS estén correctos
2. Usa herramientas como:
   - https://mxtoolbox.com/SuperTool.aspx
   - https://dnschecker.org/
3. Espera más tiempo (propagación DNS)
4. Contacta a tu proveedor de DNS si persiste

---

## 📊 Pantallas de Referencia

### Dashboard de Resend - Vista Principal
```
┌─────────────────────────────────────────┐
│ Resend                                  │
├─────────────────────────────────────────┤
│ ☰ Menu                                  │
│   📧 Emails                             │
│   🔑 API Keys          ← Aquí           │
│   🌐 Domains                            │
│   📊 Analytics                          │
│   ⚙️  Settings                          │
└─────────────────────────────────────────┘
```

### Supabase - Configuración de Secrets
```
┌─────────────────────────────────────────┐
│ Settings > Edge Functions               │
├─────────────────────────────────────────┤
│ [Functions] [Secrets] [Logs]            │
│                                         │
│ Secrets                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Name              Value              │ │
│ │ RESEND_API_KEY    ●●●●●●●●●●●●●●●● │ │
│ └─────────────────────────────────────┘ │
│ [+ Add new secret]                      │
└─────────────────────────────────────────┘
```

### Resend - Configuración de Dominio
```
┌─────────────────────────────────────────┐
│ Domains                                 │
├─────────────────────────────────────────┤
│ barlive.app                    ✅       │
│                                         │
│ DNS Records:                            │
│ ┌─────────────────────────────────────┐ │
│ │ SPF    @ v=spf1 include:_spf...    │ │
│ │ DKIM   resend._domainkey p=MII...  │ │
│ │ DMARC  _dmarc v=DMARC1; p=none...  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist Visual

Marca cada paso cuando lo completes:

### Configuración Básica (Obligatorio)
- [ ] ✅ Cuenta de Resend creada
- [ ] ✅ Email verificado en Resend
- [ ] ✅ API Key creada en Resend
- [ ] ✅ API Key copiada y guardada
- [ ] ✅ Secret agregado en Supabase
- [ ] ✅ Secret verificado en lista
- [ ] ✅ Email de prueba enviado
- [ ] ✅ Email recibido correctamente
- [ ] ✅ Código de verificación funciona

### Configuración Avanzada (Opcional)
- [ ] 🎯 Dominio agregado en Resend
- [ ] 🎯 Registro SPF configurado
- [ ] 🎯 Registro DKIM configurado
- [ ] 🎯 Registro DMARC configurado
- [ ] 🎯 DNS propagado (verificado)
- [ ] 🎯 Dominio verificado en Resend
- [ ] 🎯 Email de prueba desde dominio personalizado
- [ ] 🎯 Email recibido en bandeja (no spam)

---

## 🎓 Consejos Profesionales

### 💡 Tip 1: Guarda la API Key
Guarda tu API Key en un gestor de contraseñas como:
- 1Password
- LastPass
- Bitwarden
- Apple Keychain

### 💡 Tip 2: Prueba Primero
Antes de configurar el dominio personalizado:
1. Prueba con `onboarding@resend.dev`
2. Asegúrate de que todo funciona
3. Luego configura el dominio

### 💡 Tip 3: Monitorea el Uso
Revisa regularmente:
- Dashboard de Resend → Analytics
- Correos enviados vs límite
- Tasa de entrega
- Correos rebotados

### 💡 Tip 4: Configura Alertas
En Resend, configura alertas para:
- 80% del límite mensual alcanzado
- Correos rebotados
- Problemas de entrega

---

## 📞 Soporte

Si necesitas ayuda visual adicional:

1. **Videos tutoriales**:
   - Resend: https://resend.com/docs
   - Supabase: https://supabase.com/docs

2. **Screenshots**:
   - Toma capturas de pantalla de tus errores
   - Compártelas en el soporte

3. **Comunidad**:
   - Discord de Supabase
   - Twitter: @resend, @supabase

---

**Última actualización**: Enero 2025  
**Tiempo estimado**: 15-20 minutos  
**Dificultad**: Fácil ⭐⭐☆☆☆
