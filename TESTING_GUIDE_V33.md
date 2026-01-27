
# Guía de Pruebas - Fix v33
## Google Password Loop & Session Persistence

## 🎯 Escenarios de Prueba

### ✅ Escenario 1: Usuario de Google - Primera Configuración de Contraseña

**Pasos:**
1. Crear cuenta nueva con Google OAuth
2. Cerrar sesión
3. Ir a pantalla de login
4. Ingresar email y contraseña (cualquiera)
5. Hacer clic en "Iniciar sesión"

**Resultado Esperado:**
- ✅ Aparece alerta: "Cuenta de Google. Esta cuenta fue creada con Google. ¿Deseas configurar una contraseña para poder iniciar sesión con email?"
- ✅ Opciones: "Configurar contraseña" y "Cancelar"

**Continuar:**
6. Hacer clic en "Configurar contraseña"
7. Seguir flujo de configuración de contraseña
8. Ingresar código de 6 dígitos recibido por email
9. Crear nueva contraseña
10. Cerrar sesión
11. Intentar login nuevamente con email y la nueva contraseña

**Resultado Esperado:**
- ✅ Login exitoso SIN mostrar mensaje de configuración
- ✅ Sesión reconocida inmediatamente
- ✅ Navegación a pantalla principal sin problemas

---

### ✅ Escenario 2: Usuario de Google - Contraseña Ya Configurada

**Prerequisito:** Usuario de Google que ya configuró contraseña previamente

**Pasos:**
1. Ir a pantalla de login
2. Ingresar email y contraseña
3. Hacer clic en "Iniciar sesión"

**Resultado Esperado:**
- ✅ Login exitoso DIRECTO
- ✅ NO aparece mensaje de configuración de contraseña
- ✅ Sesión reconocida inmediatamente
- ✅ Navegación a pantalla principal

---

### ✅ Escenario 3: Usuario de Email Normal

**Pasos:**
1. Crear cuenta con email/contraseña (no Google)
2. Verificar email con código de 6 dígitos
3. Cerrar sesión
4. Intentar login con email y contraseña

**Resultado Esperado:**
- ✅ Login exitoso DIRECTO
- ✅ NO aparece mensaje de configuración de contraseña
- ✅ Sesión reconocida inmediatamente
- ✅ Navegación a pantalla principal

---

### ✅ Escenario 4: Persistencia de Sesión

**Pasos:**
1. Iniciar sesión con cualquier método (Google, email, etc.)
2. Verificar que aparece contenido de usuario autenticado
3. Navegar a diferentes pantallas de la app
4. Verificar estado de sesión en cada pantalla

**Resultado Esperado:**
- ✅ Sesión se mantiene en todas las pantallas
- ✅ NO se muestra "Inicia sesión para ver contenido"
- ✅ Avatar y datos de usuario visibles
- ✅ NO se requiere reiniciar la app

---

### ✅ Escenario 5: Credenciales Incorrectas

**Pasos:**
1. Ir a pantalla de login
2. Ingresar email válido
3. Ingresar contraseña incorrecta
4. Hacer clic en "Iniciar sesión"

**Resultado Esperado:**
- ✅ Aparece error: "Email o contraseña incorrectos"
- ✅ Campo de contraseña se sacude (animación)
- ✅ NO se navega a otra pantalla
- ✅ Usuario puede intentar nuevamente

---

### ✅ Escenario 6: Email No Verificado

**Pasos:**
1. Crear cuenta con email/contraseña
2. NO verificar email
3. Cerrar sesión
4. Intentar login con email y contraseña

**Resultado Esperado:**
- ✅ Aparece alerta: "Email no verificado"
- ✅ Opción para enviar código de verificación
- ✅ Al aceptar, se envía código de 6 dígitos
- ✅ Redirección a pantalla de verificación

---

## 🔍 Verificación en Base de Datos

### Verificar Estado de Usuario de Google:

```sql
-- Ver estado completo de un usuario
SELECT 
  u.email,
  u.provider,
  u.password_hash,
  u.email_verified,
  CASE 
    WHEN au.encrypted_password IS NOT NULL AND au.encrypted_password != '' 
    THEN 'HAS_PASSWORD' 
    ELSE 'NO_PASSWORD' 
  END as auth_password_status
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'usuario@ejemplo.com';
```

**Resultados Esperados:**

**Usuario de Google SIN contraseña:**
```
email: usuario@ejemplo.com
provider: google
password_hash: NULL
email_verified: true
auth_password_status: NO_PASSWORD
```

**Usuario de Google CON contraseña:**
```
email: usuario@ejemplo.com
provider: google
password_hash: SET
email_verified: true
auth_password_status: HAS_PASSWORD
```

**Usuario de Email:**
```
email: usuario@ejemplo.com
provider: email
password_hash: SET
email_verified: true
auth_password_status: HAS_PASSWORD
```

---

## 📱 Verificación en App

### Logs a Buscar en Consola:

**Login Exitoso:**
```
[Login v6.4 - Fixed] 🔐 Attempting login: usuario@ejemplo.com
[Login v6.4 - Fixed] ✅ Login successful: uuid-del-usuario
[Login v6.4 - Fixed] ✅ Session obtained: Yes
[Login v6.4 - Fixed] 📝 Updating AuthContext with session...
[Login v6.4 - Fixed] ⏳ Waiting for session to persist in storage...
[Login v6.4 - Fixed] ✅ Session verified and persisted
[Login v6.4 - Fixed] 🚀 Redirigiendo a lista de locales...
```

**Usuario de Google sin contraseña:**
```
[Login v6.4 - Fixed] 🔐 Attempting login: usuario@ejemplo.com
[Login v6.4 - Fixed] 🔍 Google user without password detected
```

**Error de credenciales:**
```
[Login v6.4 - Fixed] 🔐 Attempting login: usuario@ejemplo.com
[Login v6.4 - Fixed] ❌ Error signing in: Invalid login credentials
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: Sigue apareciendo mensaje de configuración de contraseña

**Verificar:**
1. ¿El usuario tiene `password_hash = 'SET'` en la tabla `usuarios`?
2. ¿El Edge Function se desplegó correctamente?
3. ¿La migración se aplicó exitosamente?

**Solución Manual:**
```sql
UPDATE usuarios
SET password_hash = 'SET', email_verified = true
WHERE email = 'usuario@ejemplo.com'
  AND provider = 'google';
```

---

### Problema: Sesión no se reconoce después de login

**Verificar:**
1. ¿Aparece el log "Session verified and persisted"?
2. ¿Hay errores en la consola del AuthContext?
3. ¿La sesión existe en AsyncStorage?

**Solución:**
1. Aumentar el delay en `login-v6.tsx` (línea con `setTimeout`)
2. Verificar que no hay conflictos con otros listeners de auth
3. Limpiar caché de la app y volver a intentar

---

### Problema: Error al configurar contraseña

**Verificar:**
1. ¿El código de 6 dígitos es correcto?
2. ¿El código no ha expirado (1 hora)?
3. ¿El Edge Function está funcionando?

**Solución:**
1. Solicitar nuevo código
2. Verificar logs del Edge Function en Supabase Dashboard
3. Verificar que la tabla `password_tokens` existe

---

## ✅ Checklist de Pruebas Completo

### Funcionalidad de Login:
- [ ] Usuario de Google sin contraseña ve mensaje de configuración
- [ ] Usuario de Google con contraseña NO ve mensaje
- [ ] Usuario de email normal puede hacer login
- [ ] Credenciales incorrectas muestran error apropiado
- [ ] Email no verificado redirige a verificación

### Configuración de Contraseña:
- [ ] Se envía código de 6 dígitos por email
- [ ] Código se puede validar correctamente
- [ ] Nueva contraseña se guarda exitosamente
- [ ] `password_hash` se actualiza en tabla `usuarios`
- [ ] Próximo login funciona sin mensaje de configuración

### Persistencia de Sesión:
- [ ] Sesión se reconoce inmediatamente después de login
- [ ] Sesión persiste al navegar entre pantallas
- [ ] NO se requiere reiniciar app para reconocer sesión
- [ ] Sesión se mantiene después de cerrar y abrir app
- [ ] Logout funciona correctamente

### Base de Datos:
- [ ] Migración se aplicó correctamente
- [ ] Función `has_auth_password()` existe y funciona
- [ ] Usuarios existentes fueron actualizados
- [ ] Nuevos usuarios se crean con estado correcto

---

## 📊 Métricas de Éxito

**Antes del Fix:**
- ❌ 100% de usuarios de Google veían mensaje repetitivo
- ❌ Sesión no reconocida hasta reiniciar app
- ❌ Experiencia de usuario frustrante

**Después del Fix:**
- ✅ 0% de usuarios de Google con contraseña ven mensaje
- ✅ 100% de sesiones reconocidas inmediatamente
- ✅ Experiencia de usuario fluida y sin fricciones

---

## 🎉 Confirmación Final

Si todos los escenarios pasan exitosamente:
- ✅ El fix está funcionando correctamente
- ✅ Los usuarios pueden usar la app sin problemas
- ✅ No se requieren acciones adicionales

Si algún escenario falla:
- 🔍 Revisar logs en consola
- 🔍 Verificar estado en base de datos
- 🔍 Consultar sección de "Problemas Comunes"
