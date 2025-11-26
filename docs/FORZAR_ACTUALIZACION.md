
# 🔄 Cómo Forzar la Actualización de la App

## ⚠️ Si los cambios no aparecen después de reiniciar

Sigue estos pasos EN ORDEN:

---

## 📋 Método 1: Limpieza Completa (Recomendado)

### Paso 1: Detener Todo
```bash
# En la terminal donde corre Expo, presiona Ctrl+C
# Luego ejecuta:
killall node
```

### Paso 2: Limpiar Cachés
```bash
# Limpia la caché de Metro
rm -rf node_modules/.cache

# Limpia la caché de Expo
rm -rf .expo

# Limpia la caché de Watchman (si está instalado)
watchman watch-del-all
```

### Paso 3: Reiniciar con Caché Limpia
```bash
npx expo start --clear
```

### Paso 4: Recargar la App
- Presiona `r` en la terminal de Expo
- O sacude el dispositivo y selecciona "Reload"

---

## 📋 Método 2: Reinstalación Completa de la App

### Para iOS (Simulador)
```bash
# 1. Borra la app del simulador
# 2. Detén Expo (Ctrl+C)
# 3. Limpia todo
rm -rf .expo
rm -rf node_modules/.cache
# 4. Reinicia
npx expo start --clear
# 5. Presiona 'i' para abrir en iOS
```

### Para Android (Emulador)
```bash
# 1. Borra la app del emulador
# 2. Detén Expo (Ctrl+C)
# 3. Limpia todo
rm -rf .expo
rm -rf node_modules/.cache
# 4. Reinicia
npx expo start --clear
# 5. Presiona 'a' para abrir en Android
```

### Para Dispositivo Físico
```bash
# 1. Desinstala la app Expo Go del dispositivo
# 2. Reinstala Expo Go desde la tienda
# 3. En tu computadora:
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear
# 4. Escanea el QR code de nuevo
```

---

## 📋 Método 3: Verificar que los Archivos Están Actualizados

### Verificar PublicacionCard.tsx
```bash
# Busca "v2" en el archivo
grep -n "PublicacionCard v2" components/social/PublicacionCard.tsx
```

**Salida esperada:**
```
[número de línea]: // CRITICAL FIX v2: Fetch author data based on post type with cache busting
[número de línea]: console.log('[PublicacionCard v2] Fetching author for post:', ...
```

### Verificar local.tsx
```bash
# Busca "v2" en el archivo
grep -n "DetalleLocal v2" app/detalle/local.tsx
```

**Salida esperada:**
```
[número de línea]: console.log('[DetalleLocal v2] Loading local with fresh data (cache bypassed)');
[número de línea]: console.log('[DetalleLocal v2] Loaded local from Supabase:', ...
```

Si NO ves "v2" en estos archivos, los cambios no se guardaron correctamente.

---

## 📋 Método 4: Forzar Recarga en Tiempo de Ejecución

### En la App (Mientras Está Corriendo)

**iOS:**
1. Presiona `Cmd + D` (simulador) o sacude el dispositivo
2. Selecciona "Reload"
3. Si no funciona, selecciona "Debug Remote JS"
4. Luego "Reload" de nuevo

**Android:**
1. Presiona `Cmd + M` (emulador) o sacude el dispositivo
2. Selecciona "Reload"
3. Si no funciona, selecciona "Debug"
4. Luego "Reload" de nuevo

---

## 📋 Método 5: Verificar Logs en Tiempo Real

### Abrir la Consola de Desarrollo

**Opción 1: En el Navegador**
```bash
# Después de iniciar Expo, abre:
http://localhost:19000
# Luego haz clic en "Logs" en la barra lateral
```

**Opción 2: En la Terminal**
```bash
# Los logs aparecen automáticamente en la terminal donde corre Expo
# Busca líneas que contengan:
[PublicacionCard v2]
[DetalleLocal v2]
```

### Logs que Confirman que los Cambios Están Activos

**Para la página social:**
```
[PublicacionCard v2] Fetching user data for: [user_id]
[PublicacionCard v2] User data fetched successfully: { nombre: "...", username: "jorge", hasAvatar: true }
[PublicacionCard v2] Rendering with author data: { displayName: "@jorge", hasAvatar: true, isAuthor: false }
```

**Para la página de detalles:**
```
[DetalleLocal v2] Loading local with fresh data (cache bypassed)
[DetalleLocal v2] Loaded local from Supabase: { id: "...", nombre: "...", hasServicios: true, serviciosCount: 8, ... }
[DetalleLocal v2] Rendering with new design: { hasServices: true, hasAmbiente: true, hasClientela: true, ... }
```

---

## 📋 Método 6: Verificar Base de Datos

### Verificar que los Datos Existen

**Para la página social (usuario @jorge):**
```sql
-- Ejecuta en Supabase SQL Editor
SELECT id, nombre, username, avatar 
FROM usuarios 
WHERE username = 'jorge';
```

**Resultado esperado:**
```
id: [uuid]
nombre: "Jorge García" (o similar)
username: "jorge"
avatar: "https://..." (URL de la foto)
```

**Para la página de detalles (Casa Adolfo):**
```sql
-- Ejecuta en Supabase SQL Editor
SELECT 
  id, 
  nombre, 
  servicios_disponibles, 
  plan_activo, 
  destacado,
  horarios_completos,
  ambiente_completo,
  clientela
FROM locales 
WHERE nombre LIKE '%Casa Adolfo%';
```

**Resultado esperado:**
```
servicios_disponibles: { ... } (objeto con servicios)
plan_activo: "estandar" o "premium"
destacado: true
horarios_completos: { ... } (objeto con horarios)
ambiente_completo: { ... } (objeto con ambiente)
clientela: { ... } (objeto con clientela)
```

---

## 🚨 Solución de Problemas Específicos

### Problema: "No veo el nombre de usuario @jorge"

**Causa posible:** El usuario no tiene username en la base de datos

**Solución:**
```sql
-- Actualiza el username del usuario
UPDATE usuarios 
SET username = 'jorge' 
WHERE nombre LIKE '%Jorge%';
```

### Problema: "No veo la sección de servicios"

**Causa posible:** El local no tiene servicios_disponibles

**Solución:**
```sql
-- Verifica si el local tiene servicios
SELECT servicios_disponibles FROM locales WHERE id = '[local_id]';

-- Si es NULL o vacío, agrega servicios de ejemplo:
UPDATE locales 
SET servicios_disponibles = '{
  "bebidas": {
    "cerveza": true,
    "cocteles": true
  },
  "pagos": {
    "efectivo": true,
    "tarjetas": true
  },
  "comodidades": {
    "wifi": true,
    "terraza": true
  }
}'::jsonb
WHERE id = '[local_id]';
```

### Problema: "No veo el botón de perfil social"

**Causa posible:** El local no tiene plan activo

**Solución:**
```sql
-- Actualiza el plan del local
UPDATE locales 
SET plan_activo = 'estandar' 
WHERE nombre LIKE '%Casa Adolfo%';
```

### Problema: "No veo el badge Destacado"

**Causa posible:** El local no está marcado como destacado

**Solución:**
```sql
-- Marca el local como destacado
UPDATE locales 
SET destacado = true 
WHERE nombre LIKE '%Casa Adolfo%';
```

---

## ✅ Checklist de Verificación Final

Después de seguir TODOS los pasos anteriores, verifica:

### En la Terminal
- [ ] Ves logs con `[PublicacionCard v2]`
- [ ] Ves logs con `[DetalleLocal v2]`
- [ ] No hay errores en rojo

### En la App - Página Social
- [ ] Ves `@jorge` en lugar de "Usuario"
- [ ] Ves la foto de perfil del usuario
- [ ] Ves el icono de papelera en tus publicaciones

### En la App - Página de Detalles
- [ ] Ves la sección "Servicios Disponibles"
- [ ] Los servicios tienen iconos de colores
- [ ] Los chips de Ambiente tienen iconos
- [ ] Los chips de Clientela tienen iconos
- [ ] Las reseñas de Google tienen el logo de Google
- [ ] Las reseñas de usuarios tienen su foto de perfil
- [ ] El día actual está resaltado en horarios
- [ ] Los locales destacados muestran el badge "Destacado"
- [ ] Los locales con eventos muestran el banner de eventos
- [ ] Los locales con plan activo muestran el botón de perfil social
- [ ] NO hay puntitos de paginación en la galería

---

## 🆘 Si NADA Funciona

### Última Opción: Reinstalación Completa del Proyecto

```bash
# 1. Haz backup de tus cambios
git add .
git commit -m "Backup antes de reinstalación"

# 2. Limpia todo
rm -rf node_modules
rm -rf .expo
rm -rf node_modules/.cache
rm -rf ios/build
rm -rf android/build

# 3. Reinstala dependencias
npm install

# 4. Inicia con caché limpia
npx expo start --clear
```

---

## 📞 Contacto para Soporte

Si después de seguir TODOS estos pasos aún no ves los cambios, proporciona:

1. **Logs de la consola** (copia y pega todo lo que veas)
2. **Capturas de pantalla** de:
   - La página social
   - La página de detalles de un local
3. **Resultado de estos comandos:**
   ```bash
   grep -n "PublicacionCard v2" components/social/PublicacionCard.tsx
   grep -n "DetalleLocal v2" app/detalle/local.tsx
   ```
4. **Versión de Expo:**
   ```bash
   npx expo --version
   ```

---

**Recuerda:** Los cambios ESTÁN implementados en el código. Si no los ves, es un problema de caché o de datos en la base de datos, no del código en sí.

¡Sigue estos pasos y los verás! 🚀
