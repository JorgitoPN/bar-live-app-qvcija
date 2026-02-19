
# Quick Fix Guide - Android v27.0

## 🚨 Problema: Iconos mostrando "?" en Android

### Solución Rápida

1. **Verificar el icono en consola:**
   ```
   ⚠️ [IconSymbol v27.0 Android] No icon mapping found for "cup.and.saucer.fill"
   ```

2. **Agregar mapeo en `components/IconSymbol.tsx`:**
   ```typescript
   const MAPPING = {
     // ... existing mappings ...
     "cup.and.saucer.fill": "cafe",
     "cup.and.saucer": "cafe-outline",
   };
   ```

3. **Reiniciar servidor:**
   ```bash
   # Detener servidor (Ctrl+C)
   npx expo start --clear
   ```

4. **Verificar en consola:**
   ```
   ✅ 🎨 [IconSymbol v27.0 Android] Rendering "cafe" (mapped)
   ```

## 🚨 Problema: Error de autenticación en Android

### Solución Rápida

1. **Verificar logs de consola:**
   ```
   [Login v27.0] ❌ Error signing in: { message: '...', platform: 'android' }
   ```

2. **Verificar conexión a internet:**
   - Abrir navegador en el dispositivo
   - Intentar cargar una página web
   - Verificar que hay conexión estable

3. **Verificar credenciales:**
   - Email correcto y verificado
   - Contraseña correcta
   - Cuenta existe en Supabase

4. **Verificar variables de entorno:**
   ```bash
   # En .env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Limpiar y reiniciar:**
   ```bash
   # Detener servidor
   npx expo start --clear
   # Reinstalar app en dispositivo
   ```

## 📋 Checklist Rápido

### Iconos
- [ ] Todos los iconos se muestran (sin "?")
- [ ] Logs muestran renderizado exitoso
- [ ] No hay warnings en consola

### Autenticación
- [ ] Login funciona con credenciales válidas
- [ ] Mensajes de error son claros
- [ ] Logs muestran información detallada

### General
- [ ] App funciona igual en Android e iOS
- [ ] No hay crashes
- [ ] UX es consistente

## 🔍 Comandos Útiles

```bash
# Limpiar caché y reiniciar
npx expo start --clear

# Ver logs en tiempo real
npx expo start --android

# Reinstalar dependencias
rm -rf node_modules
npm install

# Verificar variables de entorno
cat .env
```

## 📞 Contacto Rápido

**Si el problema persiste:**
1. Revisar `ANDROID_ICON_AND_AUTH_FIX_V27.md` (guía completa)
2. Consultar `ANDROID_TESTING_CHECKLIST_V27.md` (pruebas)
3. Buscar en logs de consola
4. Reportar con logs completos

---

**Versión:** 27.0  
**Última actualización:** 2025-01-26
