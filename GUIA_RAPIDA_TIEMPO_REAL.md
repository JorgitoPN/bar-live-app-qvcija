
# 📱 GUÍA RÁPIDA - MENSAJERÍA EN TIEMPO REAL

## ✅ ¿QUÉ SE HA CORREGIDO?

### 1. Mensajes Privados ⚡
**ANTES:** Necesitabas actualizar para ver mensajes nuevos
**AHORA:** Los mensajes aparecen instantáneamente (< 100ms)

### 2. Chat Público de Sala Virtual 🎉
**ANTES:** Necesitabas actualizar para ver mensajes de otros usuarios
**AHORA:** Los mensajes aparecen en tiempo real para todos

### 3. Lista de Usuarios en Sala Virtual 👥
**ANTES:** La lista no se actualizaba automáticamente
**AHORA:** Se actualiza en tiempo real cuando alguien entra/sale

### 4. Avatar de @jorge en Blanco 🖼️
**PROBLEMA:** El usuario @almu8 (en realidad @alma8) no podía ver tu foto de perfil
**CAUSA:** Tu avatar era una ruta local de iOS (file://...) que solo existe en tu dispositivo
**SOLUCIÓN:** Se eliminó la URL local. Ahora verás tu inicial "J" hasta que subas una nueva foto

### 5. Popup "Acceso Denegado" 🚫
**PROBLEMA:** Aparecía aleatoriamente al navegar por la app
**CAUSA:** Verificación de permisos demasiado amplia
**SOLUCIÓN:** Ahora solo aparece si intentas acceder directamente a /admin

## 🎯 CÓMO USAR LAS NUEVAS FUNCIONES

### Mensajes Privados
1. Abre una conversación
2. Los mensajes nuevos aparecerán automáticamente
3. Verás "✓✓" cuando el otro usuario lea tu mensaje
4. No necesitas actualizar manualmente

### Chat Público (Sala Virtual)
1. Entra a un local abierto
2. Ve a la sala virtual
3. Los mensajes aparecen instantáneamente
4. Verás "Alguien está escribiendo..." cuando otros escriben
5. La pestaña "Usuarios" se actualiza automáticamente

### Subir Nueva Foto de Perfil
1. Ve a tu perfil
2. Toca tu avatar
3. Selecciona "Cambiar foto de perfil"
4. Elige una foto de tu galería
5. La foto se subirá a Supabase Storage (URL pública)
6. Ahora todos podrán ver tu foto

## ⚠️ IMPORTANTE

### Para @jorge (jorgepereznoyagh@gmail.com)
Tu foto de perfil se ha eliminado porque era una ruta local que solo existía en tu dispositivo.

**Pasos para solucionarlo:**
1. Ve a tu perfil en la app
2. Toca tu avatar (verás una "J")
3. Selecciona "Cambiar foto de perfil"
4. Elige una foto de tu galería
5. La foto se subirá correctamente y todos podrán verla

### Para @alma8 (Almudena Sanchez)
Ahora podrás ver correctamente el avatar de @jorge una vez que suba su nueva foto de perfil.

## 🔧 HERRAMIENTAS DE ADMINISTRACIÓN

### Corregir Avatares (Solo Admin)
**Ruta:** `/admin/fix-avatar-urls`

Esta herramienta:
- Busca avatares con URLs locales (file://)
- Los corrige automáticamente
- Muestra un reporte de usuarios afectados

## 📊 VERIFICACIÓN

### Cómo verificar que funciona:

**Mensajes Privados:**
1. Abre la app en dos dispositivos con usuarios diferentes
2. Envía un mensaje desde el dispositivo A
3. El mensaje debe aparecer INSTANTÁNEAMENTE en el dispositivo B
4. No debes actualizar manualmente

**Chat Público:**
1. Entra a una sala virtual con dos usuarios
2. Envía un mensaje desde el dispositivo A
3. El mensaje debe aparecer INSTANTÁNEAMENTE en el dispositivo B
4. Verás el indicador "escribiendo..." cuando el otro usuario escribe

**Lista de Usuarios:**
1. Entra a una sala virtual
2. Que otro usuario entre a la misma sala
3. La lista de usuarios debe actualizarse AUTOMÁTICAMENTE
4. El contador en el header debe cambiar instantáneamente

**Avatares:**
1. @alma8 debe poder ver el avatar de @benxaque (Benjamín Pérez)
2. @jorge debe ver su inicial "J" hasta que suba una nueva foto
3. Todos los avatares deben ser visibles (no en blanco)

## 🚨 SI ALGO NO FUNCIONA

### Mensajes no aparecen en tiempo real:
1. Cierra y vuelve a abrir la app
2. Verifica tu conexión a internet
3. Revisa los logs de la consola

### Avatar sigue en blanco:
1. Ve a `/admin/fix-avatar-urls` (solo admin)
2. Ejecuta la corrección
3. El usuario afectado debe subir una nueva foto

### Popup sigue apareciendo:
1. Cierra completamente la app
2. Vuelve a abrirla
3. Si persiste, contacta con soporte

## 📞 CONTACTO

Si tienes problemas o preguntas:
- Revisa los logs de la consola
- Usa la herramienta de diagnóstico en `/admin/fix-avatar-urls`
- Verifica que tu conexión a internet es estable

---

**Última actualización:** ${new Date().toLocaleDateString('es-ES')}
