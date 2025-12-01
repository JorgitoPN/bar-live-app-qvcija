
# 🚨 Solución Rápida: Error 403 en Envío de Correos

## El Problema

```
Error: FunctionsHttpError: Edge Function returned a non-2xx status code
Status: 403 Forbidden
```

## La Solución (5 minutos)

### 1️⃣ Configurar RESEND_API_KEY

```bash
# Paso 1: Obtén tu API key de Resend
# Ve a: https://resend.com/api-keys
# Crea una nueva API key y cópiala

# Paso 2: Configúrala en Supabase
# Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions
# Agrega un nuevo secret:
# Name: RESEND_API_KEY
# Value: re_tu_api_key_aqui
```

### 2️⃣ Verificar el Dominio (Opcional pero Recomendado)

```bash
# Ve a: https://resend.com/domains
# Agrega el dominio: barlive.app
# Configura los registros DNS que te muestre Resend
# Espera 5-30 minutos para la propagación
# Haz clic en "Verify"
```

### 3️⃣ Probar

```bash
# Abre la app
# Ve a crear contraseña para usuarios de Google
# Haz clic en "Enviar código de verificación"
# Revisa tu email (y spam)
```

## Verificación Rápida

```bash
# Ver si la API key está configurada
supabase secrets list --project-ref embntaqwlwmgazvrglaf

# Ver los logs del Edge Function
# Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/functions/send-verification-email/logs
```

## Solución Temporal

Si no puedes verificar el dominio ahora, el código se mostrará en pantalla cuando falle el envío del email. El usuario puede copiarlo y usarlo manualmente.

## Más Información

- Guía completa: `docs/EMAIL_ERROR_FIX_GUIDE.md`
- Configuración de Resend: `docs/RESEND_CONFIGURATION_COMPLETE.md`
- Troubleshooting: `docs/EMAIL_TROUBLESHOOTING_GUIDE.md`
