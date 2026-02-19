
# Testing: Sistema de Recuperación de Contraseña por Token

## 🧪 Guía de Testing

Esta guía te ayudará a probar el nuevo sistema de recuperación de contraseña.

## 📋 Pre-requisitos

Antes de comenzar, verifica que:

1. ✅ La tabla `password_tokens` existe en la base de datos
2. ✅ Las 3 Edge Functions están desplegadas y ACTIVE
3. ✅ `RESEND_API_KEY` está configurado
4. ✅ El dominio está verificado en Resend
5. ✅ Tienes acceso a un email de prueba

## 🔍 Verificación de Componentes

### 1. Verificar Tabla en Base de Datos

```sql
-- Verificar que la tabla existe
SELECT * FROM password_tokens LIMIT 1;

-- Verificar estructura
\d password_tokens

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'password_tokens';
```

### 2. Verificar Edge Functions

Puedes verificar el estado de las Edge Functions en el dashboard de Supabase o con:

```bash
# Listar Edge Functions
supabase functions list

# Verificar logs de una función específica
supabase functions logs request-password-token
supabase functions logs validate-password-token
supabase functions logs update-password-with-token
```

### 3. Verificar Configuración de Resend

1. Ve a https://resend.com/domains
2. Verifica que `barliveapp.es` está verificado
3. Verifica que los registros DNS están correctos

## 🧪 Casos de Prueba

### Caso 1: Flujo Completo Exitoso ✅

**Objetivo:** Verificar que el flujo completo funciona correctamente.

**Pasos:**

1. **Solicitar código:**
   - Abre la app
   - Ve a Login
   - Toca "¿Olvidaste tu contraseña?"
   - Ingresa un email válido registrado
   - Toca "Enviar código"
   - **Esperado:** Mensaje de éxito

2. **Verificar email:**
   - Abre tu cliente de correo
   - Busca email de "Barlive"
   - **Esperado:** Email con código de 6 dígitos

3. **Verificar en base de datos:**
   ```sql
   SELECT * FROM password_tokens 
   WHERE email = 'tu-email@ejemplo.com' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - **Esperado:** Token creado, no usado, no expirado

4. **Validar código:**
   - En la app, toca "Continuar"
   - Ingresa el código de 6 dígitos
   - Toca "Validar código"
   - **Esperado:** Navegación a pantalla de nueva contraseña

5. **Cambiar contraseña:**
   - Ingresa nueva contraseña: `TestPassword123`
   - Confirma la contraseña
   - Toca "Actualizar contraseña"
   - **Esperado:** Mensaje de éxito

6. **Verificar token usado:**
   ```sql
   SELECT * FROM password_tokens 
   WHERE email = 'tu-email@ejemplo.com' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - **Esperado:** `used = true`, `used_at` tiene timestamp

7. **Iniciar sesión:**
   - Ingresa email
   - Ingresa nueva contraseña: `TestPassword123`
   - Toca "Iniciar sesión"
   - **Esperado:** Login exitoso

**Resultado esperado:** ✅ PASS

---

### Caso 2: Email No Existente 🔒

**Objetivo:** Verificar que no se revela si un email existe.

**Pasos:**

1. Solicita código con email que NO existe: `noexiste@ejemplo.com`
2. **Esperado:** Mensaje de éxito (igual que con email válido)
3. Verifica base de datos:
   ```sql
   SELECT * FROM password_tokens 
   WHERE email = 'noexiste@ejemplo.com';
   ```
4. **Esperado:** No hay token creado
5. **Esperado:** No se envió email

**Resultado esperado:** ✅ PASS (por seguridad)

---

### Caso 3: Token Expirado ⏰

**Objetivo:** Verificar que los tokens expiran correctamente.

**Pasos:**

1. Solicita código normalmente
2. Espera 16 minutos (o modifica `expires_at` en la BD):
   ```sql
   UPDATE password_tokens 
   SET expires_at = NOW() - INTERVAL '1 minute'
   WHERE email = 'tu-email@ejemplo.com';
   ```
3. Intenta validar el código
4. **Esperado:** Error "Token has expired"

**Resultado esperado:** ✅ PASS

---

### Caso 4: Token Inválido ❌

**Objetivo:** Verificar que se rechazan códigos incorrectos.

**Pasos:**

1. Solicita código normalmente
2. Ingresa código incorrecto: `999999`
3. Toca "Validar código"
4. **Esperado:** Error "Invalid or expired token"

**Resultado esperado:** ✅ PASS

---

### Caso 5: Token Ya Usado 🔄

**Objetivo:** Verificar que los tokens solo pueden usarse una vez.

**Pasos:**

1. Completa el flujo completo exitosamente
2. Intenta usar el mismo código nuevamente
3. **Esperado:** Error "Invalid or expired token"

**Resultado esperado:** ✅ PASS

---

### Caso 6: Contraseña Débil 🔐

**Objetivo:** Verificar validación de requisitos de contraseña.

**Pasos:**

1. Llega a la pantalla de nueva contraseña
2. Intenta con contraseñas débiles:
   - `abc` (muy corta)
   - `abcdefgh` (sin mayúsculas ni números)
   - `ABCDEFGH` (sin minúsculas ni números)
   - `abcdefgh1` (sin mayúsculas)
3. **Esperado:** Error en cada caso

4. Intenta con contraseña válida: `TestPassword123`
5. **Esperado:** Éxito

**Resultado esperado:** ✅ PASS

---

### Caso 7: Reenvío de Código 🔄

**Objetivo:** Verificar que se puede solicitar un nuevo código.

**Pasos:**

1. Solicita código
2. Anota el código recibido: `123456`
3. Verifica en BD:
   ```sql
   SELECT token FROM password_tokens 
   WHERE email = 'tu-email@ejemplo.com' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
4. Toca "Solicitar nuevo código"
5. Recibe nuevo código: `789012`
6. Verifica en BD:
   ```sql
   SELECT token, used FROM password_tokens 
   WHERE email = 'tu-email@ejemplo.com' 
   ORDER BY created_at DESC 
   LIMIT 2;
   ```
7. **Esperado:** Solo existe el nuevo token (el anterior fue eliminado)
8. Intenta usar el código antiguo: `123456`
9. **Esperado:** Error "Invalid or expired token"
10. Usa el código nuevo: `789012`
11. **Esperado:** Éxito

**Resultado esperado:** ✅ PASS

---

### Caso 8: Contraseñas No Coinciden ⚠️

**Objetivo:** Verificar validación de confirmación de contraseña.

**Pasos:**

1. Llega a pantalla de nueva contraseña
2. Ingresa contraseña: `TestPassword123`
3. Confirma con diferente: `TestPassword456`
4. Toca "Actualizar contraseña"
5. **Esperado:** Error "Las contraseñas no coinciden"

**Resultado esperado:** ✅ PASS

---

## 📊 Checklist de Testing

### Funcionalidad Básica
- [ ] Solicitar código con email válido
- [ ] Recibir email con código
- [ ] Validar código correcto
- [ ] Cambiar contraseña
- [ ] Iniciar sesión con nueva contraseña

### Seguridad
- [ ] Email no existente no revela información
- [ ] Token expira en 15 minutos
- [ ] Token solo puede usarse una vez
- [ ] Código incorrecto es rechazado
- [ ] Contraseña débil es rechazada

### UX
- [ ] Mensajes de error son claros
- [ ] Loading states funcionan
- [ ] Navegación entre pantallas es fluida
- [ ] Diseño es consistente
- [ ] Instrucciones son claras

### Edge Cases
- [ ] Reenvío de código invalida el anterior
- [ ] Contraseñas no coinciden muestra error
- [ ] Campos vacíos muestran error
- [ ] Email inválido muestra error

## 🐛 Debugging

### Ver Logs de Edge Functions

```bash
# Logs en tiempo real
supabase functions logs request-password-token --tail

# Logs de las últimas 24 horas
supabase functions logs validate-password-token --since 24h

# Logs con filtro
supabase functions logs update-password-with-token | grep ERROR
```

### Consultas Útiles en Base de Datos

```sql
-- Ver todos los tokens activos
SELECT email, token, expires_at, used, created_at 
FROM password_tokens 
WHERE used = false 
AND expires_at > NOW()
ORDER BY created_at DESC;

-- Ver tokens expirados
SELECT email, token, expires_at, created_at 
FROM password_tokens 
WHERE expires_at < NOW()
ORDER BY created_at DESC;

-- Ver tokens usados
SELECT email, token, used_at, created_at 
FROM password_tokens 
WHERE used = true
ORDER BY used_at DESC;

-- Limpiar tokens de prueba
DELETE FROM password_tokens 
WHERE email LIKE '%@ejemplo.com';

-- Estadísticas
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE used = true) as usados,
  COUNT(*) FILTER (WHERE used = false AND expires_at > NOW()) as activos,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expirados
FROM password_tokens;
```

### Verificar Email en Resend

1. Ve a https://resend.com/emails
2. Busca emails enviados a tu dirección de prueba
3. Verifica estado: Delivered / Bounced / Failed
4. Revisa logs de errores si hay problemas

## 🔧 Solución de Problemas

### Problema: No llega el email

**Posibles causas:**
1. RESEND_API_KEY no configurado
2. Dominio no verificado
3. Email en spam
4. Rate limit de Resend

**Solución:**
```bash
# Verificar configuración
echo $RESEND_API_KEY

# Ver logs de la función
supabase functions logs request-password-token --tail

# Verificar en Resend dashboard
# https://resend.com/emails
```

### Problema: Token siempre inválido

**Posibles causas:**
1. Token expirado
2. Token ya usado
3. Email no coincide

**Solución:**
```sql
-- Verificar token en BD
SELECT * FROM password_tokens 
WHERE email = 'tu-email@ejemplo.com' 
ORDER BY created_at DESC 
LIMIT 1;

-- Crear token de prueba manualmente
INSERT INTO password_tokens (email, token, expires_at)
VALUES ('tu-email@ejemplo.com', '123456', NOW() + INTERVAL '15 minutes');
```

### Problema: Error al actualizar contraseña

**Posibles causas:**
1. Usuario no existe en Auth
2. Token inválido
3. Contraseña no cumple requisitos

**Solución:**
```bash
# Ver logs de la función
supabase functions logs update-password-with-token --tail

# Verificar usuario en Auth
supabase auth users list | grep tu-email@ejemplo.com
```

## 📈 Métricas de Performance

### Tiempos Esperados

- **Solicitar código:** < 2 segundos
- **Recibir email:** < 30 segundos
- **Validar código:** < 1 segundo
- **Actualizar contraseña:** < 2 segundos
- **Total del flujo:** < 3 minutos

### Tasa de Éxito Esperada

- **Solicitud de código:** 100%
- **Entrega de email:** > 99%
- **Validación de código:** > 95%
- **Actualización de contraseña:** > 98%
- **Flujo completo:** > 90%

## ✅ Criterios de Aceptación

El sistema se considera funcional si:

1. ✅ Todos los casos de prueba pasan
2. ✅ Los emails se entregan en < 1 minuto
3. ✅ No hay errores en los logs de Edge Functions
4. ✅ La experiencia de usuario es fluida
5. ✅ La seguridad funciona correctamente

## 🎯 Próximos Pasos Después del Testing

Una vez que todos los tests pasen:

1. [ ] Documentar cualquier issue encontrado
2. [ ] Realizar testing en diferentes dispositivos
3. [ ] Probar con diferentes clientes de email
4. [ ] Configurar monitoreo en producción
5. [ ] Preparar rollout gradual
6. [ ] Comunicar cambios a usuarios

---

**Última actualización:** 2025-01-03  
**Versión:** 1.0.0
