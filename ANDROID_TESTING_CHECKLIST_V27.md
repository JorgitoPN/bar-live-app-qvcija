
# Android Testing Checklist - Version 27.0

## 🎯 Objetivo

Verificar que todos los iconos se renderizan correctamente y que la autenticación funciona en Android.

## ✅ Checklist de Pruebas

### 1. Iconos en Pantalla Explorar

**Ubicación:** `app/(tabs)/explorar/index.tsx`

- [ ] **Todos** - Icono de ubicación se muestra correctamente
- [ ] **Cafés** - Icono de taza de café se muestra correctamente
- [ ] **Restaurantes** - Icono de tenedor y cuchillo se muestra correctamente
- [ ] **Bares** - Icono de copa de vino se muestra correctamente
- [ ] **Pubs** - Icono de jarra de cerveza se muestra correctamente
- [ ] **Coctelería** - Icono de copa se muestra correctamente
- [ ] **Discotecas** - Icono de nota musical se muestra correctamente

**Cómo verificar:**
1. Abrir la app en Android
2. Navegar a la pestaña "Explorar"
3. Verificar que todos los iconos de categorías se muestren correctamente
4. NO deben aparecer signos de interrogación (?)

### 2. Iconos en Header

- [ ] Icono de mapa (esquina superior derecha)
- [ ] Icono de búsqueda (lupa)
- [ ] Icono de filtros (tres líneas horizontales)

### 3. Iconos en Tabs de Navegación

- [ ] **Eventos** - Icono de calendario
- [ ] **Favoritos** - Icono de corazón
- [ ] **Explorar** - Icono de brújula/sparkles
- [ ] **Social** - Icono de personas
- [ ] **Perfil** - Icono de persona

### 4. Autenticación

**Ubicación:** `app/auth/login.tsx`

#### Caso 1: Login Exitoso
1. [ ] Abrir pantalla de login
2. [ ] Ingresar email válido: `test@example.com`
3. [ ] Ingresar contraseña válida
4. [ ] Presionar "Iniciar sesión"
5. [ ] Verificar que aparece el indicador de carga
6. [ ] Verificar que se navega a la pantalla Explorar
7. [ ] Verificar en consola:
   ```
   [Login v27.0] ✅ Login successful: { userId: '...', email: '...', platform: 'android' }
   ```

#### Caso 2: Credenciales Incorrectas
1. [ ] Ingresar email válido
2. [ ] Ingresar contraseña incorrecta
3. [ ] Presionar "Iniciar sesión"
4. [ ] Verificar que aparece mensaje de error claro
5. [ ] Verificar que el mensaje incluye pasos de solución (solo en Android)

#### Caso 3: Email No Verificado
1. [ ] Ingresar email no verificado
2. [ ] Ingresar contraseña correcta
3. [ ] Presionar "Iniciar sesión"
4. [ ] Verificar que aparece alerta "Email no verificado"
5. [ ] Verificar que hay opción "Reenviar correo"

#### Caso 4: Usuario de Google sin Contraseña
1. [ ] Ingresar email de cuenta Google
2. [ ] Ingresar cualquier contraseña
3. [ ] Presionar "Iniciar sesión"
4. [ ] Verificar que aparece alerta "Configuración de contraseña requerida"
5. [ ] Verificar que hay opción "Configurar contraseña"

### 5. Logs de Consola

**Iconos:**
```
✅ Debe aparecer:
🎨 [IconSymbol v27.0 Android] Rendering "cafe" (mapped), size: 28, color: #14B8A6
🎨 [IconSymbol v27.0 Android] Rendering "restaurant" (mapped), size: 28, color: #14B8A6

❌ NO debe aparecer:
⚠️ [IconSymbol v27.0 Android] No icon mapping found for "..."
```

**Autenticación:**
```
✅ Debe aparecer:
[Login v27.0] 🔐 Intentando iniciar sesión: user@example.com
[Login v27.0] 📱 Platform: android
[Login v27.0] ✅ Login successful: { userId: '...', email: '...', platform: 'android' }

❌ NO debe aparecer (sin información útil):
[Login v27.0] ❌ Error signing in: undefined
```

## 🔍 Verificación Visual

### Pantalla Explorar

**Antes (v26.0):**
```
Todos    Cafés    Restaurantes    Bares    Pubs
  ?        ?           ?            ?        ?
```

**Después (v27.0):**
```
Todos    Cafés    Restaurantes    Bares    Pubs
  📍       ☕          🍴           🍷       🍺
```

### Mensajes de Error

**Antes (v26.0):**
```
Error
No se pudo iniciar sesión
[OK]
```

**Después (v27.0):**
```
Error
Error de autenticación: Invalid login credentials

Si el problema persiste, intenta:
1. Verificar tu conexión a internet
2. Reiniciar la aplicación
3. Contactar soporte
[OK]
```

## 📱 Dispositivos de Prueba

### Mínimo Requerido
- [ ] Android 10+ (API 29+)
- [ ] Conexión a internet estable
- [ ] Expo Go instalado

### Recomendado
- [ ] Probar en múltiples dispositivos Android
- [ ] Probar en diferentes versiones de Android
- [ ] Probar con diferentes tamaños de pantalla

## 🐛 Problemas Conocidos y Soluciones

### Problema: Iconos siguen mostrando "?"

**Causa:** Mapeo faltante o servidor no reiniciado

**Solución:**
1. Detener el servidor de desarrollo
2. Limpiar caché: `npx expo start --clear`
3. Verificar que el mapeo existe en `components/IconSymbol.tsx`
4. Reiniciar la app en el dispositivo

### Problema: Error de autenticación genérico

**Causa:** Problema de red o configuración de Supabase

**Solución:**
1. Verificar conexión a internet
2. Verificar variables de entorno:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Verificar que Supabase está funcionando
4. Revisar logs de consola para más detalles

### Problema: Sesión no persiste

**Causa:** AsyncStorage no configurado correctamente

**Solución:**
1. Verificar que `@react-native-async-storage/async-storage` está instalado
2. Limpiar datos de la app
3. Reinstalar la app
4. Verificar permisos de almacenamiento

## 📊 Reporte de Pruebas

### Información del Dispositivo
- **Modelo:** _________________
- **Versión de Android:** _________________
- **Versión de Expo Go:** _________________
- **Fecha de prueba:** _________________

### Resultados

#### Iconos
- Todos los iconos se muestran: ☐ Sí ☐ No
- Iconos faltantes: _________________
- Capturas de pantalla adjuntas: ☐ Sí ☐ No

#### Autenticación
- Login exitoso funciona: ☐ Sí ☐ No
- Mensajes de error claros: ☐ Sí ☐ No
- Sesión persiste: ☐ Sí ☐ No
- Logs detallados: ☐ Sí ☐ No

#### Paridad Android-iOS
- Funcionalidad idéntica: ☐ Sí ☐ No
- Diseño consistente: ☐ Sí ☐ No
- UX coherente: ☐ Sí ☐ No

### Notas Adicionales
_________________________________________________
_________________________________________________
_________________________________________________

## ✅ Criterios de Aceptación

Para considerar las pruebas exitosas, TODOS los siguientes criterios deben cumplirse:

- [ ] Todos los iconos se renderizan correctamente (sin "?")
- [ ] Login funciona con credenciales válidas
- [ ] Mensajes de error son claros y útiles
- [ ] Sesión persiste después de cerrar/abrir la app
- [ ] Logs de consola muestran información detallada
- [ ] No hay diferencias significativas entre Android e iOS
- [ ] La app no se crashea durante las pruebas

---

**Versión:** 27.0  
**Fecha:** 2025-01-26  
**Estado:** 📋 Listo para pruebas
