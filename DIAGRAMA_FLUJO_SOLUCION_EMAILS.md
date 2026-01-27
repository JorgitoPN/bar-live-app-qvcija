
# 🔄 DIAGRAMA DE FLUJO: Solución de Emails

## 📊 FLUJO COMPLETO DEL PROCESO

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO EN LA APP                         │
│                                                              │
│  1. Click en "¿Olvidaste tu contraseña?"                   │
│  2. Ingresa email: usuario@ejemplo.com                      │
│  3. Click en "Enviar código de recuperación"               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              APP LLAMA AL EDGE FUNCTION                      │
│                                                              │
│  supabase.functions.invoke('request-password-token', {      │
│    body: { email: 'usuario@ejemplo.com' }                   │
│  })                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           EDGE FUNCTION: request-password-token              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PASO 1: Verificar RESEND_API_KEY                     │  │
│  │                                                       │  │
│  │ ❌ No configurada → Error 500                        │  │
│  │ ✅ Configurada → Continuar                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                      │
│                       ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PASO 2: Verificar si el usuario existe               │  │
│  │                                                       │  │
│  │ ❌ No existe → Retornar success (seguridad)          │  │
│  │ ✅ Existe → Continuar                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                      │
│                       ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PASO 3: Generar token de 6 dígitos                   │  │
│  │                                                       │  │
│  │ Token: 123456                                         │  │
│  │ Expira en: 1 hora                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                      │
│                       ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PASO 4: Guardar token en base de datos               │  │
│  │                                                       │  │
│  │ INSERT INTO password_tokens (                         │  │
│  │   email, token, expires_at, used                      │  │
│  │ )                                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                      │
│                       ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PASO 5: Enviar email via Resend API                  │  │
│  │                                                       │  │
│  │ POST https://api.resend.com/emails                    │  │
│  │ {                                                     │  │
│  │   from: "Barlive <noreply@barliveapp.es>",          │  │
│  │   to: "usuario@ejemplo.com",                         │  │
│  │   subject: "Código de Recuperación",                 │  │
│  │   html: [plantilla con token]                        │  │
│  │ }                                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                      │
│                       ▼                                      │
│              ┌────────┴────────┐                            │
│              │                 │                            │
│         ✅ Status 200      ❌ Status 4xx/5xx               │
│              │                 │                            │
└──────────────┼─────────────────┼────────────────────────────┘
               │                 │
               │                 ▼
               │    ┌─────────────────────────────────────┐
               │    │  ERRORES POSIBLES DE RESEND         │
               │    │                                      │
               │    │  403: Domain not verified            │
               │    │  400: Unauthorized sender            │
               │    │  429: Rate limit exceeded            │
               │    │  500: Resend internal error          │
               │    └─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    EMAIL ENVIADO                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  📧 Asunto: Código de Recuperación - Barlive      │    │
│  │  De: Barlive <noreply@barliveapp.es>              │    │
│  │  Para: usuario@ejemplo.com                         │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐  │    │
│  │  │  🔐 Tu código de recuperación es:           │  │    │
│  │  │                                              │  │    │
│  │  │         ┌─────────────────┐                 │  │    │
│  │  │         │   1  2  3  4  5  6   │                 │  │    │
│  │  │         └─────────────────┘                 │  │    │
│  │  │                                              │  │    │
│  │  │  Este código expira en 1 hora               │  │    │
│  │  └─────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                USUARIO RECIBE EL EMAIL                       │
│                                                              │
│  1. Abre el email                                           │
│  2. Copia el código: 123456                                 │
│  3. Vuelve a la app                                         │
│  4. Ingresa el código                                       │
│  5. Crea nueva contraseña                                   │
│  6. ✅ Contraseña actualizada                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 PUNTOS DE FALLO COMUNES

### ❌ FALLO 1: RESEND_API_KEY No Configurada

```
┌─────────────────────────────────────┐
│  Edge Function                      │
│                                     │
│  if (!RESEND_API_KEY) {            │
│    ❌ Error 500                     │
│    "Email service not configured"  │
│  }                                  │
└─────────────────────────────────────┘
```

**Solución**: Configurar RESEND_API_KEY en Supabase Secrets

---

### ❌ FALLO 2: Dominio No Verificado

```
┌─────────────────────────────────────┐
│  Resend API                         │
│                                     │
│  POST /emails                       │
│  from: "noreply@barliveapp.es"     │
│                                     │
│  ❌ Status 403                      │
│  "Domain not verified"              │
└─────────────────────────────────────┘
```

**Solución**: Verificar dominio en Resend con registros DNS

---

### ❌ FALLO 3: Email No Autorizado

```
┌─────────────────────────────────────┐
│  Resend API                         │
│                                     │
│  POST /emails                       │
│  from: "noreply@barliveapp.es"     │
│                                     │
│  ❌ Status 400                      │
│  "Unauthorized sender"              │
└─────────────────────────────────────┘
```

**Solución**: Verificar dominio o usar email autorizado

---

### ❌ FALLO 4: Límite de Envíos Excedido

```
┌─────────────────────────────────────┐
│  Resend API                         │
│                                     │
│  POST /emails                       │
│                                     │
│  ❌ Status 429                      │
│  "Rate limit exceeded"              │
│  "100 emails/day limit reached"    │
└─────────────────────────────────────┘
```

**Solución**: Esperar o actualizar plan de Resend

---

## ✅ FLUJO EXITOSO

```
Usuario → App → Edge Function → Supabase DB → Resend API → Email → Usuario
   │       │          │              │             │          │       │
   │       │          │              │             │          │       │
   ▼       ▼          ▼              ▼             ▼          ▼       ▼
Ingresa  Llama   Valida API    Guarda token   Envía email  Llega  Ingresa
 email   función     Key                                    inbox   código
```

**Tiempo total**: 2-5 segundos

---

## 🔧 PROCESO DE DIAGNÓSTICO

```
┌─────────────────────────────────────────────────────────────┐
│                    ¿LOS EMAILS LLEGAN?                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
          NO                      SÍ
           │                       │
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│  VER LOGS DEL        │  │  ✅ TODO FUNCIONA    │
│  EDGE FUNCTION       │  │                      │
└──────────┬───────────┘  │  Monitorear:         │
           │              │  - Tasa de entrega   │
           ▼              │  - Emails en spam    │
┌──────────────────────┐  │  - Cuota de envíos   │
│  ¿QUÉ ERROR MUESTRA? │  └──────────────────────┘
└──────────┬───────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
┌──────────────────────┐              ┌──────────────────────┐
│  "RESEND_API_KEY     │              │  "Domain not         │
│   not configured"    │              │   verified"          │
│                      │              │                      │
│  SOLUCIÓN:           │              │  SOLUCIÓN:           │
│  1. Ir a Resend      │              │  1. Ir a Resend      │
│  2. Crear API Key    │              │  2. Agregar dominio  │
│  3. Copiar clave     │              │  3. Copiar DNS       │
│  4. Ir a Supabase    │              │  4. Agregar en DNS   │
│  5. Agregar secret   │              │  5. Esperar 10-30min │
└──────────────────────┘              │  6. Verificar        │
                                      └──────────────────────┘
```

---

## 📊 ESTADOS DEL EMAIL EN RESEND

```
┌─────────────────────────────────────────────────────────────┐
│                  DASHBOARD DE RESEND                         │
│                  https://resend.com/emails                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│  ✅ DELIVERED        │  │  ❌ FAILED           │
│                      │  │                      │
│  El email llegó      │  │  El email no llegó   │
│  correctamente       │  │                      │
│                      │  │  Posibles causas:    │
│  Tiempo: 2-5 seg     │  │  - Email inválido    │
│                      │  │  - Dominio no        │
│                      │  │    verificado        │
│                      │  │  - Bounce            │
└──────────────────────┘  └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  ⏳ QUEUED           │
│                      │
│  Email en cola       │
│  Esperar 1-2 min     │
└──────────────────────┘
```

---

## 🎯 CHECKLIST VISUAL

```
CONFIGURACIÓN INICIAL
├─ [ ] Cuenta Resend creada
├─ [ ] API Key obtenida
├─ [ ] API Key en Supabase
└─ [ ] Dominio agregado en Resend

VERIFICACIÓN DNS
├─ [ ] SPF configurado
├─ [ ] DKIM configurado
├─ [ ] DMARC configurado
└─ [ ] Dominio verificado (✅)

PRUEBAS
├─ [ ] Logs muestran éxito
├─ [ ] Email recibido
├─ [ ] Código visible
└─ [ ] Flujo completo OK

MONITOREO
├─ [ ] Dashboard revisado
├─ [ ] Tasa entrega >95%
├─ [ ] Cuota suficiente
└─ [ ] Alertas configuradas
```

---

## 💡 TIPS VISUALES

### 🟢 TODO BIEN
```
Logs: ✅ Email sent successfully!
Resend: ✅ Delivered
Inbox: 📧 Email recibido
Usuario: 😊 Código funciona
```

### 🟡 EN PROCESO
```
Logs: ⏳ Sending email...
Resend: ⏳ Queued
Inbox: ⏳ Esperando...
Usuario: ⏳ Esperando...
```

### 🔴 ERROR
```
Logs: ❌ Domain not verified
Resend: ❌ Failed
Inbox: ❌ Sin email
Usuario: 😞 No recibió código
```

---

**Última actualización**: 2025-12-10  
**Versión**: 1.0  
**Estado**: ✅ Documentación completa
