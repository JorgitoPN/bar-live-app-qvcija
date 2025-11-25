
# Configuración Completa de Resend para BarLive

## 📧 Estado Actual

✅ **Edge Function Desplegada**: La función `send-verification-email` está activa y lista para enviar correos.

✅ **Código Configurado**: El código ya está configurado para enviar desde `noreply@barlive.app`.

⚠️ **Pendiente**: Necesitas completar la configuración de Resend para que los correos se envíen correctamente.

---

## 🚀 Pasos para Completar la Configuración

### Paso 1: Obtener la API Key de Resend (5 minutos)

1. **Ve a Resend**: https://resend.com
2. **Crea una cuenta** o inicia sesión si ya tienes una
3. **Verifica tu email** (recibirás un correo de confirmación)
4. **Ve a "API Keys"** en el menú lateral izquierdo
5. **Haz clic en "Create API Key"**
   - Nombre sugerido: `BarLive Production`
   - Permisos: `Sending access` (por defecto)
6. **Copia la API Key** (empieza con `re_`)
   - ⚠️ **IMPORTANTE**: Guárdala en un lugar seguro, solo se muestra una vez

---

### Paso 2: Configurar la API Key en Supabase (2 minutos)

Tienes dos opciones para configurar la API key:

#### Opción A: Usando el Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navega a **Settings** → **Edge Functions** → **Secrets**
3. Haz clic en **Add new secret**
4. Configura:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Tu API key de Resend (la que copiaste en el Paso 1)
5. Haz clic en **Save**

#### Opción B: Usando la CLI de Supabase

Si tienes la CLI de Supabase instalada, ejecuta:

```bash
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui --project-ref embntaqwlwmgazvrglaf
```

#### Verificar la Configuración

Para verificar que la API key está configurada:

```bash
supabase secrets list --project-ref embntaqwlwmgazvrglaf
```

Deberías ver `RESEND_API_KEY` en la lista.

---

### Paso 3: Configurar el Dominio Personalizado en Resend (10 minutos)

Para enviar correos desde `noreply@barlive.app` en lugar de `onboarding@resend.dev`, necesitas verificar tu dominio.

#### 3.1. Agregar el Dominio en Resend

1. En Resend, ve a **Domains** en el menú lateral
2. Haz clic en **Add Domain**
3. Introduce tu dominio: `barlive.app`
4. Haz clic en **Add**

#### 3.2. Configurar los Registros DNS

Resend te mostrará los registros DNS que necesitas agregar. Debes configurar estos registros en tu proveedor de DNS (donde compraste el dominio o donde lo tienes configurado).

**Registros DNS Requeridos:**

1. **SPF Record** (TXT)
   ```
   Nombre: @
   Tipo: TXT
   Valor: v=spf1 include:_spf.resend.com ~all
   ```

2. **DKIM Record** (TXT)
   ```
   Nombre: resend._domainkey
   Tipo: TXT
   Valor: [Valor proporcionado por Resend - único para tu cuenta]
   ```

3. **DMARC Record** (TXT) - Opcional pero recomendado
   ```
   Nombre: _dmarc
   Tipo: TXT
   Valor: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
   ```

#### 3.3. Verificar el Dominio

1. Después de agregar los registros DNS, espera unos minutos (puede tardar hasta 48 horas, pero usualmente es más rápido)
2. En Resend, haz clic en **Verify** junto a tu dominio
3. Si todo está correcto, verás un ✅ verde

**Nota**: Mientras el dominio no esté verificado, los correos se enviarán desde `onboarding@resend.dev`, que funciona perfectamente para pruebas.

---

### Paso 4: Probar el Sistema de Emails (5 minutos)

Una vez configurada la API key, prueba el sistema:

#### 4.1. Probar desde la App

1. Abre la app BarLive
2. Ve a la pantalla de registro
3. Introduce un email válido (tuyo)
4. Completa el registro
5. Revisa tu bandeja de entrada (y spam)
6. Deberías recibir un correo con el código de verificación

#### 4.2. Probar la Edge Function Directamente

Puedes probar la función directamente con curl:

```bash
curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
  -H 'Authorization: Bearer TU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "tu@email.com",
    "code": "123456",
    "type": "verification"
  }'
```

Reemplaza `TU_ANON_KEY` con tu Supabase Anon Key (la puedes encontrar en Settings → API).

---

## 🔍 Solución de Problemas

### Problema 1: No llegan los correos

**Posibles causas y soluciones:**

1. **API Key no configurada o incorrecta**
   - Verifica en Supabase Dashboard → Settings → Edge Functions → Secrets
   - Asegúrate de que el nombre sea exactamente `RESEND_API_KEY`
   - Verifica que la API key sea válida en Resend

2. **Límite de correos excedido**
   - Plan gratuito de Resend: 100 correos/día, 3,000/mes
   - Revisa tu uso en el dashboard de Resend
   - Considera actualizar al plan de pago si es necesario

3. **Correos en spam**
   - Revisa la carpeta de spam
   - Configura el dominio personalizado para mejorar la entregabilidad
   - Agrega los registros SPF, DKIM y DMARC

4. **Dominio no verificado**
   - Si usas `noreply@barlive.app`, el dominio debe estar verificado
   - Mientras tanto, los correos se envían desde `onboarding@resend.dev`

### Problema 2: Error "Failed to send email"

**Revisa los logs de la Edge Function:**

1. Ve a Supabase Dashboard
2. Navega a **Edge Functions** → **send-verification-email** → **Logs**
3. Busca errores específicos de la API de Resend

**Errores comunes:**

- `401 Unauthorized`: API key incorrecta o no configurada
- `403 Forbidden`: Dominio no verificado (si usas dominio personalizado)
- `429 Too Many Requests`: Límite de correos excedido

### Problema 3: Código de verificación incorrecto

**Verifica en la base de datos:**

```sql
SELECT 
  email, 
  verification_code, 
  verification_code_expires_at,
  email_verified
FROM usuarios
WHERE email = 'usuario@ejemplo.com';
```

**Posibles causas:**

- Código expirado (10 minutos de validez)
- Email incorrecto
- Código ya usado

---

## 📊 Monitoreo y Métricas

### Dashboard de Resend

En https://resend.com/emails puedes ver:

- ✅ Correos enviados
- 📬 Correos entregados
- 📧 Correos abiertos (si activas tracking)
- ❌ Correos rebotados
- 📊 Estadísticas de uso

### Logs de Supabase

Para ver los logs en tiempo real:

```bash
supabase functions logs send-verification-email --tail --project-ref embntaqwlwmgazvrglaf
```

Para ver los últimos 100 logs:

```bash
supabase functions logs send-verification-email --limit 100 --project-ref embntaqwlwmgazvrglaf
```

---

## 💰 Planes y Límites de Resend

### Plan Gratuito
- ✅ 3,000 correos/mes
- ✅ 100 correos/día
- ✅ Perfecto para desarrollo y apps pequeñas
- ✅ Dominio personalizado incluido

### Plan de Pago
- 💵 Desde $20/mes: 50,000 correos
- 💵 $80/mes: 250,000 correos
- 💵 Planes personalizados disponibles

### ¿Cuándo actualizar?

Considera actualizar cuando:
- Envíes más de 3,000 correos/mes
- Necesites soporte prioritario
- Requieras IP dedicada
- Necesites webhooks avanzados

---

## 🎨 Personalización de Emails

Los templates de email están en el Edge Function. Para personalizarlos:

1. **Colores**: Cambia el gradiente en el código
   ```typescript
   background: linear-gradient(to right, #14B8A6, #06B6D4);
   ```

2. **Logo**: Agrega tu logo
   ```html
   <img src="https://tu-dominio.com/logo.png" alt="BarLive" style="width: 150px;">
   ```

3. **Contenido**: Modifica el texto según tus necesidades

4. **Estilos**: Personaliza los estilos CSS inline

Para aplicar cambios, necesitas redesplegar la Edge Function:

```bash
supabase functions deploy send-verification-email --project-ref embntaqwlwmgazvrglaf
```

---

## ✅ Checklist de Configuración

Marca cada paso cuando lo completes:

- [ ] **Paso 1**: Cuenta de Resend creada
- [ ] **Paso 2**: API Key obtenida de Resend
- [ ] **Paso 3**: API Key configurada en Supabase
- [ ] **Paso 4**: API Key verificada (aparece en secrets list)
- [ ] **Paso 5**: Dominio agregado en Resend
- [ ] **Paso 6**: Registros DNS configurados (SPF, DKIM)
- [ ] **Paso 7**: Dominio verificado en Resend
- [ ] **Paso 8**: Email de prueba enviado exitosamente
- [ ] **Paso 9**: Email recibido en bandeja de entrada
- [ ] **Paso 10**: Código de verificación funciona correctamente

---

## 🔐 Mejores Prácticas de Seguridad

1. **Nunca expongas tu API Key**
   - ❌ No la incluyas en el código
   - ❌ No la subas a Git
   - ✅ Usa siempre variables de entorno/secrets

2. **Configura Rate Limiting**
   - Limita el número de correos por usuario
   - Implementa cooldown entre envíos
   - Monitorea intentos sospechosos

3. **Valida los Emails**
   - Verifica el formato antes de enviar
   - Implementa verificación de dominio
   - Usa listas de bloqueo para emails temporales

4. **Monitorea el Uso**
   - Revisa regularmente el dashboard de Resend
   - Configura alertas para límites
   - Mantén logs de todos los envíos

---

## 📚 Recursos Adicionales

### Documentación Oficial

- **Resend Docs**: https://resend.com/docs
- **Resend API Reference**: https://resend.com/docs/api-reference
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase Auth**: https://supabase.com/docs/guides/auth

### Guías Relacionadas

- `docs/EMAIL_SYSTEM_CONFIGURATION.md` - Configuración completa del sistema
- `docs/EMAIL_CONFIGURATION_GUIDE.md` - Guía de configuración detallada
- `docs/EMAIL_SETUP_QUICK_START.md` - Inicio rápido (5 minutos)
- `docs/AUTHENTICATION_FIXES_SUMMARY.md` - Solución de problemas de autenticación

### Soporte

- **Resend Support**: https://resend.com/support
- **Supabase Support**: https://supabase.com/support
- **Community Discord**: https://discord.supabase.com

---

## 🎯 Próximos Pasos Recomendados

Una vez que el sistema de emails esté funcionando:

1. **Implementar más tipos de correos**
   - Correo de bienvenida
   - Notificaciones de eventos
   - Recordatorios
   - Newsletters

2. **Mejorar la entregabilidad**
   - Configurar DMARC policy a `quarantine` o `reject`
   - Implementar feedback loops
   - Monitorear bounce rates

3. **Optimizar el rendimiento**
   - Implementar cola de correos
   - Usar batch sending para múltiples destinatarios
   - Cachear templates

4. **Añadir tracking**
   - Open tracking
   - Click tracking
   - Conversion tracking

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas o preguntas:

1. **Revisa esta guía completa** - La mayoría de problemas están cubiertos aquí
2. **Revisa los logs** - Supabase y Resend tienen logs detallados
3. **Consulta la documentación** - Enlaces arriba
4. **Contacta soporte** - Resend y Supabase tienen excelente soporte

---

**Última actualización**: Enero 2025  
**Tiempo estimado de configuración**: 15-20 minutos  
**Dificultad**: Fácil ⭐⭐☆☆☆

**Estado**: ✅ Edge Function lista | ⚠️ Requiere configuración de API Key y dominio
