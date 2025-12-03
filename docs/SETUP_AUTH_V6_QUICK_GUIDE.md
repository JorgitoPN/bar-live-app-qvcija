
# 🚀 Guía Rápida de Configuración - Sistema de Autenticación V6.0

## 📋 Requisitos Previos

- Acceso a Supabase Dashboard
- Acceso a Resend Dashboard
- Supabase CLI instalado
- Proyecto BarLive configurado

## ⚡ Pasos de Configuración

### 1. Base de Datos

La tabla `password_tokens` ya debería estar creada. Si no, ejecuta:

```sql
CREATE TABLE IF NOT EXISTS public.password_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_password_tokens_email ON public.password_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_tokens_token ON public.password_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_tokens_expires_at ON public.password_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_tokens_used ON public.password_tokens(used);

-- RLS
ALTER TABLE public.password_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage password tokens"
  ON public.password_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 2. Edge Functions

Las Edge Functions ya están desplegadas:
- `request-password-token`
- `validate-password-token`
- `update-password-with-token`

Para verificar:
```bash
supabase functions list
```

### 3. Configurar Resend API Key

1. Ve a [Resend Dashboard](https://resend.com/api-keys)
2. Crea una nueva API Key
3. Copia la key
4. En Supabase Dashboard:
   - Ve a Project Settings → Edge Functions
   - Añade secret: `RESEND_API_KEY` con tu key

O usando CLI:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 4. Verificar Configuración de Email

1. **Dominio Verificado:**
   - Ve a Resend Dashboard → Domains
   - Verifica que `barliveapp.es` esté verificado
   - Verifica DNS records (SPF, DKIM, DMARC)

2. **From Address:**
   - Usa: `Barlive <noreply@barliveapp.es>`

### 5. Probar el Sistema

#### Test 1: Solicitar Token
```bash
curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/request-password-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com"}'
```

#### Test 2: Validar Token
```bash
curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/validate-password-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","token":"123456"}'
```

#### Test 3: Actualizar Contraseña
```bash
curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/update-password-with-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","token":"123456","newPassword":"NewPass123"}'
```

### 6. Verificar en la App

1. **Login:**
   - Abre la app
   - Ve a `/auth/login-v6`
   - Prueba login con credenciales válidas

2. **Registro:**
   - Ve a `/auth/registro-v6`
   - Crea una cuenta nueva
   - Verifica que llegue el email de verificación

3. **Recuperación de Contraseña:**
   - Ve a `/auth/recuperar-password-v6`
   - Ingresa un email válido
   - Verifica que llegue el token
   - Ingresa el token
   - Cambia la contraseña
   - Verifica auto-login

## 🔍 Verificación de Estado

### Checklist de Verificación

- [ ] Tabla `password_tokens` existe
- [ ] Índices creados
- [ ] RLS habilitado
- [ ] Edge Functions desplegadas
- [ ] `RESEND_API_KEY` configurado
- [ ] Dominio verificado en Resend
- [ ] DNS records configurados
- [ ] Test de solicitar token exitoso
- [ ] Test de validar token exitoso
- [ ] Test de actualizar contraseña exitoso
- [ ] Email llega correctamente
- [ ] Token se valida correctamente
- [ ] Contraseña se actualiza correctamente
- [ ] Auto-login funciona
- [ ] Redirección a explorar funciona

## 🐛 Troubleshooting

### Email no llega

1. Verifica Resend Dashboard → Logs
2. Verifica DNS records
3. Revisa carpeta de spam
4. Verifica logs de Edge Function:
```bash
supabase functions logs request-password-token
```

### Token inválido

1. Verifica que no haya expirado (15 min)
2. Verifica en DB:
```sql
SELECT * FROM password_tokens 
WHERE email = 'test@example.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Contraseña no se actualiza

1. Verifica logs de Edge Function:
```bash
supabase functions logs update-password-with-token
```
2. Verifica que el usuario exista en Supabase Auth

## 📊 Monitoreo

### Queries Útiles

**Tokens recientes:**
```sql
SELECT email, token, created_at, expires_at, used
FROM password_tokens
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

**Tokens expirados:**
```sql
SELECT COUNT(*)
FROM password_tokens
WHERE expires_at < now() AND used = false;
```

**Tokens usados:**
```sql
SELECT COUNT(*)
FROM password_tokens
WHERE used = true;
```

### Limpieza de Tokens

Ejecutar periódicamente:
```sql
DELETE FROM password_tokens
WHERE expires_at < now() - interval '1 hour';
```

## 🎯 Próximos Pasos

1. Configurar monitoreo de errores
2. Configurar alertas para fallos de email
3. Implementar rate limiting
4. Añadir analytics de uso
5. Documentar métricas clave

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs de Edge Functions
2. Verifica la configuración de Resend
3. Consulta la documentación completa en `AUTH_V6_SYSTEM_COMPLETE.md`

---

**Versión:** 6.0.0  
**Última actualización:** 2025
