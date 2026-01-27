
# Quick Reference - Fix v33
## Guía Rápida para Desarrolladores

## 🎯 Cambios Clave

### Login Screen (`login-v6.tsx`)
```typescript
// ✅ NUEVO: Verificar provider Y password_hash
const { data: userData } = await supabase
  .from('usuarios')
  .select('provider, email_verified, password_hash')
  .eq('email', normalizedEmail)
  .maybeSingle();

// Solo mostrar mensaje si es Google Y no tiene contraseña
if (userData?.provider === 'google' && !userData.password_hash) {
  // Mostrar diálogo de configuración
}
```

### Edge Function (`update-password-with-token`)
```typescript
// ✅ NUEVO: Actualizar usuarios table después de configurar contraseña
await supabaseAdmin
  .from('usuarios')
  .update({ 
    password_hash: 'SET',
    email_verified: true,
  })
  .eq('email', normalizedEmail);
```

### Session Persistence
```typescript
// ✅ NUEVO: Actualizar AuthContext inmediatamente
setSessionManually(authData.session);

// ✅ NUEVO: Esperar más tiempo para persistencia
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ NUEVO: Verificar sesión después del delay
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Error: sesión perdida
}
```

---

## 🔍 Debugging

### Logs a Buscar

**Login Exitoso:**
```
[Login v6.4 - Fixed] 🔐 Attempting login
[Login v6.4 - Fixed] ✅ Login successful
[Login v6.4 - Fixed] 📝 Updating AuthContext with session
[Login v6.4 - Fixed] ✅ Session verified and persisted
```

**Usuario de Google sin contraseña:**
```
[Login v6.4 - Fixed] 🔍 Google user without password detected
```

---

## 📊 SQL Queries Útiles

### Ver Estado de Usuario
```sql
SELECT 
  email,
  provider,
  password_hash,
  email_verified
FROM usuarios
WHERE email = 'usuario@ejemplo.com';
```

### Corregir Usuario con Inconsistencia
```sql
UPDATE usuarios u
SET password_hash = 'SET', email_verified = true
FROM auth.users au
WHERE u.id = au.id
  AND u.email = 'usuario@ejemplo.com'
  AND au.encrypted_password IS NOT NULL;
```

### Ver Usuarios de Google
```sql
SELECT 
  email,
  CASE 
    WHEN password_hash = 'SET' THEN 'Con contraseña'
    ELSE 'Sin contraseña'
  END as estado
FROM usuarios
WHERE provider = 'google';
```

---

## ✅ Checklist de Verificación

### Después de Desplegar:
- [ ] Edge Function desplegado correctamente
- [ ] Migración aplicada exitosamente
- [ ] Función `has_auth_password()` existe
- [ ] No hay usuarios con inconsistencias

### Pruebas Mínimas:
- [ ] Login con usuario de Google (con contraseña) → Directo
- [ ] Login con usuario de Google (sin contraseña) → Mensaje
- [ ] Login con usuario de email → Directo
- [ ] Sesión reconocida inmediatamente

---

## 🐛 Problemas Comunes

### "Sigue apareciendo mensaje de configuración"
```sql
-- Verificar estado
SELECT email, provider, password_hash FROM usuarios WHERE email = '...';

-- Si tiene contraseña en auth pero no en usuarios:
UPDATE usuarios SET password_hash = 'SET' WHERE email = '...';
```

### "Sesión no se reconoce"
- Verificar logs de AuthContext
- Aumentar delay en login-v6.tsx si es necesario
- Verificar que no hay conflictos con otros listeners

---

## 📚 Documentación Completa

- **GOOGLE_PASSWORD_AND_SESSION_FIX_V33.md** - Explicación técnica detallada
- **TESTING_GUIDE_V33.md** - Guía de pruebas completa
- **ADMIN_SQL_QUERIES_V33.md** - Queries SQL para administradores
- **RESUMEN_CORRECCIONES_V33.md** - Resumen ejecutivo

---

## 🚀 Deployment Checklist

1. ✅ Actualizar código frontend
2. ✅ Desplegar Edge Function
3. ✅ Aplicar migración
4. ✅ Verificar función `has_auth_password()`
5. ✅ Probar flujos principales
6. ✅ Monitorear logs

---

## 💡 Tips

- Siempre verificar logs con `[Login v6.4 - Fixed]`
- Usar queries SQL para diagnóstico rápido
- Documentar cualquier caso edge encontrado
- Mantener logs detallados para debugging

---

**Versión:** v33  
**Estado:** ✅ Implementado
