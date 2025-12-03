
# 📊 Diagrama de Flujo: Sistema de Password Reset v6.0

## 🎯 Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE PASSWORD RESET V6.0                    │
│                                                                       │
│  Usuario → App → Supabase → Resend → Email → Web → Confirmación    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo Detallado

### Fase 1: Solicitud de Restablecimiento

```
┌──────────────┐
│   USUARIO    │
│              │
│ "Olvidé mi   │
│  contraseña" │
└──────┬───────┘
       │
       │ 1. Presiona botón
       ↓
┌──────────────────────────────────────┐
│  APP BARLIVE                         │
│  (recuperar-password-v6.tsx)         │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ Formulario:                    │ │
│  │ • Email: [____________]        │ │
│  │ • [Enviar enlace]              │ │
│  └────────────────────────────────┘ │
└──────────────┬───────────────────────┘
               │
               │ 2. Ingresa email
               │    y envía
               ↓
┌──────────────────────────────────────┐
│  VALIDACIÓN                          │
│                                      │
│  ✓ Email válido?                    │
│  ✓ Formato correcto?                │
└──────────────┬───────────────────────┘
               │
               │ 3. Llama API
               ↓
┌──────────────────────────────────────┐
│  SUPABASE AUTH                       │
│                                      │
│  resetPasswordForEmail(email, {     │
│    redirectTo: "https://..."        │
│  })                                 │
└──────────────┬───────────────────────┘
               │
               │ 4. Genera token
               │    y enlace
               ↓
┌──────────────────────────────────────┐
│  RESEND (Servicio de Email)          │
│                                      │
│  • Recibe solicitud                 │
│  • Carga plantilla HTML             │
│  • Inserta enlace con token         │
│  • Envía email                      │
└──────────────┬───────────────────────┘
               │
               │ 5. Email enviado
               ↓
┌──────────────────────────────────────┐
│  BANDEJA DE ENTRADA                  │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ De: Barlive                    │ │
│  │ Asunto: 🔐 Restablecer...      │ │
│  │                                │ │
│  │ [Restablecer contraseña]       │ │
│  └────────────────────────────────┘ │
└──────────────┬───────────────────────┘
               │
               │ 6. Usuario abre email
               │    y hace clic
               ↓
```

### Fase 2: Restablecimiento de Contraseña

```
┌──────────────────────────────────────┐
│  NAVEGADOR WEB                       │
│  (reset-password-web.tsx)            │
│                                      │
│  URL: https://barliveapp.es/auth/   │
│       reset-password-web            │
│       #access_token=XXX             │
└──────────────┬───────────────────────┘
               │
               │ 7. Carga página
               ↓
┌──────────────────────────────────────┐
│  VERIFICACIÓN DE TOKEN               │
│                                      │
│  • Extrae token del URL hash        │
│  • Llama supabase.auth.setSession() │
│  • Verifica validez                 │
│  • Verifica expiración (1 hora)     │
└──────────────┬───────────────────────┘
               │
               ├─── Token inválido ───→ [Pantalla de Error]
               │                         "Enlace expirado"
               │
               └─── Token válido ─────→ [Continúa]
                                         │
                                         ↓
┌──────────────────────────────────────────────────────┐
│  FORMULARIO DE NUEVA CONTRASEÑA                      │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Nueva contraseña:                              │ │
│  │ [________________] 👁                          │ │
│  │                                                │ │
│  │ Confirmar contraseña:                          │ │
│  │ [________________] 👁                          │ │
│  │                                                │ │
│  │ Requisitos:                                    │ │
│  │ ✅ Mínimo 8 caracteres                         │ │
│  │ ✅ Una mayúscula                               │ │
│  │ ✅ Una minúscula                               │ │
│  │ ✅ Un número                                   │ │
│  │                                                │ │
│  │ [Guardar nueva contraseña]                     │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────┘
                       │
                       │ 8. Usuario ingresa
                       │    nueva contraseña
                       ↓
┌──────────────────────────────────────┐
│  VALIDACIÓN EN TIEMPO REAL           │
│                                      │
│  Mientras escribe:                  │
│  • Verifica longitud                │
│  • Verifica mayúsculas              │
│  • Verifica minúsculas              │
│  • Verifica números                 │
│  • Muestra indicadores visuales     │
└──────────────┬───────────────────────┘
               │
               │ 9. Presiona guardar
               ↓
┌──────────────────────────────────────┐
│  VALIDACIÓN FINAL                    │
│                                      │
│  ✓ Contraseñas coinciden?           │
│  ✓ Cumple requisitos?               │
└──────────────┬───────────────────────┘
               │
               ├─── No válida ────→ [Muestra error]
               │
               └─── Válida ───────→ [Continúa]
                                    │
                                    ↓
┌──────────────────────────────────────┐
│  SUPABASE AUTH                       │
│                                      │
│  supabase.auth.updateUser({         │
│    password: newPassword            │
│  })                                 │
└──────────────┬───────────────────────┘
               │
               │ 10. Actualiza password
               ↓
┌──────────────────────────────────────┐
│  EDGE FUNCTION                       │
│  (send-password-change-confirmation) │
│                                      │
│  • Recibe email del usuario         │
│  • Genera correo de confirmación    │
│  • Llama a Resend API               │
└──────────────┬───────────────────────┘
               │
               │ 11. Envía confirmación
               ↓
┌──────────────────────────────────────┐
│  RESEND                              │
│                                      │
│  • Envía email de confirmación      │
│  • "Tu contraseña ha sido cambiada" │
└──────────────┬───────────────────────┘
               │
               │ 12. Email enviado
               ↓
┌──────────────────────────────────────┐
│  PANTALLA DE ÉXITO                   │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ ✅ ¡Contraseña actualizada!    │ │
│  │                                │ │
│  │ Tu contraseña ha sido cambiada │ │
│  │ correctamente.                 │ │
│  │                                │ │
│  │ Próximos pasos:                │ │
│  │ 1. Cierra esta página          │ │
│  │ 2. Abre la app Barlive         │ │
│  │ 3. Inicia sesión               │ │
│  │                                │ │
│  │ [Cerrar página]                │ │
│  └────────────────────────────────┘ │
└──────────────┬───────────────────────┘
               │
               │ 13. Usuario cierra
               │     y vuelve a app
               ↓
┌──────────────────────────────────────┐
│  APP BARLIVE - LOGIN                 │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ Email: [____________]          │ │
│  │ Password: [____________]       │ │
│  │ [Iniciar sesión]               │ │
│  └────────────────────────────────┘ │
└──────────────┬───────────────────────┘
               │
               │ 14. Inicia sesión con
               │     nueva contraseña
               ↓
┌──────────────────────────────────────┐
│  ✅ ACCESO CONCEDIDO                 │
│                                      │
│  Usuario autenticado correctamente  │
└──────────────────────────────────────┘
```

---

## 🔐 Flujo de Seguridad

```
┌─────────────────────────────────────────────────────────┐
│                  CAPAS DE SEGURIDAD                      │
└─────────────────────────────────────────────────────────┘

1. SOLICITUD
   ├─ No revela si email existe
   ├─ Mensaje genérico siempre
   └─ Rate limiting (previene spam)

2. TOKEN
   ├─ Generado por Supabase (seguro)
   ├─ Único por solicitud
   ├─ Expira en 1 hora
   └─ Un solo uso

3. VALIDACIÓN
   ├─ Verifica token en servidor
   ├─ Verifica expiración
   ├─ Verifica que no fue usado
   └─ Verifica sesión activa

4. CONTRASEÑA
   ├─ Mínimo 8 caracteres
   ├─ Requiere mayúsculas
   ├─ Requiere minúsculas
   ├─ Requiere números
   └─ Encriptada con bcrypt

5. CONFIRMACIÓN
   ├─ Email de notificación
   ├─ Alerta de cambio
   └─ Instrucciones si no fue el usuario
```

---

## 📧 Flujo de Emails

```
┌─────────────────────────────────────────────────────────┐
│                    EMAILS ENVIADOS                       │
└─────────────────────────────────────────────────────────┘

EMAIL 1: RESET PASSWORD
┌────────────────────────────────────┐
│ De: Barlive <noreply@barliveapp.es>│
│ Para: usuario@ejemplo.com          │
│ Asunto: 🔐 Restablecer tu          │
│         contraseña - Barlive       │
│                                    │
│ Contenido:                         │
│ • Saludo                           │
│ • Explicación de la solicitud      │
│ • Botón CTA grande                 │
│ • Enlace alternativo               │
│ • Nota de seguridad                │
│ • Advertencia si no fue el usuario │
│ • Footer con links legales         │
└────────────────────────────────────┘
        │
        │ Usuario hace clic
        ↓
    [Página Web]
        │
        │ Cambia contraseña
        ↓

EMAIL 2: CONFIRMACIÓN
┌────────────────────────────────────┐
│ De: Barlive <noreply@barliveapp.es>│
│ Para: usuario@ejemplo.com          │
│ Asunto: ✅ Tu contraseña ha sido   │
│         actualizada - Barlive      │
│                                    │
│ Contenido:                         │
│ • Confirmación del cambio          │
│ • Detalles (fecha, hora)           │
│ • Próximos pasos                   │
│ • Advertencia de seguridad         │
│ • Botón de contacto a soporte      │
│ • Footer con links legales         │
└────────────────────────────────────┘
```

---

## ⚡ Flujo de Errores

```
┌─────────────────────────────────────────────────────────┐
│                  MANEJO DE ERRORES                       │
└─────────────────────────────────────────────────────────┘

ERROR 1: Email inválido
├─ Detectado en: App (validación)
├─ Mensaje: "Por favor, ingresa un correo válido"
└─ Acción: Usuario corrige email

ERROR 2: Token expirado
├─ Detectado en: Página web (verificación)
├─ Mensaje: "El enlace ha expirado"
├─ Acción: Botón "Solicitar nuevo enlace"
└─ Redirige a: App para nueva solicitud

ERROR 3: Token inválido
├─ Detectado en: Página web (verificación)
├─ Mensaje: "Enlace inválido o ya usado"
├─ Acción: Botón "Solicitar nuevo enlace"
└─ Redirige a: App para nueva solicitud

ERROR 4: Contraseña débil
├─ Detectado en: Página web (validación)
├─ Mensaje: Indicadores en rojo
├─ Acción: Usuario mejora contraseña
└─ Feedback: Indicadores en tiempo real

ERROR 5: Contraseñas no coinciden
├─ Detectado en: Página web (validación)
├─ Mensaje: "Las contraseñas no coinciden"
├─ Acción: Usuario corrige
└─ Feedback: Inmediato al escribir

ERROR 6: Email no llega
├─ Detectado en: Usuario reporta
├─ Posibles causas:
│  ├─ En spam
│  ├─ Dominio no verificado
│  └─ Error de Resend
├─ Acción: Revisar logs
└─ Solución: Reenviar o configurar

ERROR 7: Edge Function falla
├─ Detectado en: Logs de Supabase
├─ Mensaje: Error en confirmación
├─ Acción: Revisar logs
└─ Nota: No bloquea el cambio de password
```

---

## 🎨 Componentes Visuales

```
┌─────────────────────────────────────────────────────────┐
│              PANTALLAS DEL SISTEMA                       │
└─────────────────────────────────────────────────────────┘

PANTALLA 1: Solicitar Reset (App)
┌────────────────────────────────────┐
│ ← Recuperar contraseña             │
│ No te preocupes, te ayudaremos     │
├────────────────────────────────────┤
│                                    │
│        🔐                          │
│   Recupera tu cuenta               │
│                                    │
│ Ingresa tu correo electrónico...  │
│                                    │
│ ┌────────────────────────────────┐│
│ │ 📧 correo@ejemplo.com          ││
│ └────────────────────────────────┘│
│                                    │
│ ┌────────────────────────────────┐│
│ │ Enviar enlace de recuperación  ││
│ └────────────────────────────────┘│
│                                    │
│ 🔒 Por seguridad, no revelaremos  │
│    si este correo está registrado │
└────────────────────────────────────┘

PANTALLA 2: Email Enviado (App)
┌────────────────────────────────────┐
│        ✅                          │
│   ¡Correo enviado!                 │
│                                    │
│ Si existe una cuenta asociada a:   │
│ 📧 correo@ejemplo.com              │
│                                    │
│ Recibirás un correo con            │
│ instrucciones.                     │
│                                    │
│ 📋 Próximos pasos:                 │
│ 1️⃣ Revisa tu correo               │
│ 2️⃣ Haz clic en el botón           │
│ 3️⃣ Crea tu nueva contraseña       │
│ 4️⃣ ¡Listo!                        │
│                                    │
│ ┌────────────────────────────────┐│
│ │ Reenviar correo                ││
│ └────────────────────────────────┘│
└────────────────────────────────────┘

PANTALLA 3: Restablecer (Web)
┌────────────────────────────────────┐
│ Restablecer contraseña             │
│ Crea una nueva contraseña segura   │
│ 👤 usuario@ejemplo.com             │
├────────────────────────────────────┤
│                                    │
│ Nueva contraseña:                  │
│ ┌────────────────────────────────┐│
│ │ ••••••••••••••••          👁   ││
│ └────────────────────────────────┘│
│                                    │
│ Confirmar contraseña:              │
│ ┌────────────────────────────────┐│
│ │ ••••••••••••••••          👁   ││
│ └────────────────────────────────┘│
│                                    │
│ Requisitos de seguridad:           │
│ ✅ Mínimo 8 caracteres             │
│ ✅ Una letra mayúscula             │
│ ✅ Una letra minúscula             │
│ ✅ Un número                       │
│                                    │
│ ┌────────────────────────────────┐│
│ │ Guardar nueva contraseña       ││
│ └────────────────────────────────┘│
└────────────────────────────────────┘

PANTALLA 4: Éxito (Web)
┌────────────────────────────────────┐
│        ✅                          │
│   ¡Contraseña actualizada!         │
│                                    │
│ Tu contraseña ha sido cambiada     │
│ correctamente.                     │
│                                    │
│ ℹ️ Hemos enviado un correo de      │
│   confirmación a tu email.         │
│                                    │
│ 📱 Próximos pasos:                 │
│ 1. Cierra esta página              │
│ 2. Abre la app Barlive             │
│ 3. Inicia sesión con tu nueva      │
│    contraseña                      │
│                                    │
│ ┌────────────────────────────────┐│
│ │ Cerrar página                  ││
│ └────────────────────────────────┘│
│                                    │
│ 🔒 Si no fuiste tú, contacta       │
│    soporte@barliveapp.es           │
└────────────────────────────────────┘
```

---

## 📊 Métricas y Monitoreo

```
┌─────────────────────────────────────────────────────────┐
│                  PUNTOS DE MEDICIÓN                      │
└─────────────────────────────────────────────────────────┘

1. SOLICITUDES
   ├─ Total de solicitudes
   ├─ Solicitudes por día
   └─ Emails únicos vs repetidos

2. EMAILS
   ├─ Emails enviados
   ├─ Emails entregados
   ├─ Emails rebotados
   └─ Tasa de apertura

3. CONVERSIÓN
   ├─ Enlaces abiertos
   ├─ Contraseñas cambiadas
   ├─ Tasa de conversión
   └─ Tiempo promedio

4. ERRORES
   ├─ Tokens expirados
   ├─ Validaciones fallidas
   ├─ Errores de Edge Function
   └─ Emails no entregados

5. SOPORTE
   ├─ Tickets relacionados
   ├─ Tiempo de resolución
   └─ Problemas comunes
```

---

## 🔄 Ciclo de Vida del Token

```
┌─────────────────────────────────────────────────────────┐
│                  VIDA DEL TOKEN                          │
└─────────────────────────────────────────────────────────┘

CREACIÓN
├─ Timestamp: 2025-02-02 10:00:00
├─ Expiración: 2025-02-02 11:00:00 (1 hora)
├─ Estado: ACTIVO
└─ Usos: 0/1

DURANTE LA HORA
├─ Estado: ACTIVO
├─ Puede ser usado: SÍ
└─ Verificación: Válido

DESPUÉS DE 1 HORA
├─ Estado: EXPIRADO
├─ Puede ser usado: NO
└─ Mensaje: "Enlace expirado"

DESPUÉS DE USO
├─ Estado: USADO
├─ Puede ser usado: NO
└─ Mensaje: "Enlace ya usado"
```

---

**Versión**: 1.0  
**Última actualización**: 2 de febrero de 2025  
**Autor**: Equipo de Desarrollo Barlive

---

Este diagrama proporciona una vista visual completa del sistema de restablecimiento de contraseña v6.0.
