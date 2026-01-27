
# 📱 INSTRUCCIONES PARA USUARIOS - MENSAJERÍA EN TIEMPO REAL

## 🎯 PARA @jorge (Jorge Pérez)

### ⚠️ ACCIÓN REQUERIDA: Subir Nueva Foto de Perfil

Tu foto de perfil se ha eliminado porque era una ruta local que solo existía en tu dispositivo. Otros usuarios (como @alma8) no podían verla.

### 📝 Pasos para Subir tu Foto:

1. **Abre la app BarLive** en tu iPhone

2. **Ve a la pestaña "Perfil"** (última pestaña en la barra inferior)

3. **Toca tu avatar** (verás un círculo con la letra "J")

4. **Selecciona "Cambiar foto de perfil"** o "Editar perfil"

5. **Elige "Seleccionar de galería"**

6. **Selecciona una foto** de tu galería de fotos

7. **Espera a que se suba** (verás una barra de progreso)

8. **¡Listo!** Tu foto ahora es visible para todos los usuarios

### ✅ Verificación:
- Deberías ver tu foto en tu perfil
- Pide a @alma8 que verifique que puede ver tu foto
- Si ves una "J", la foto aún no se ha subido correctamente

---

## 🎯 PARA @alma8 (Almudena Sanchez)

### ✅ Problema Resuelto

Ya no verás avatares en blanco. Ahora verás:

- **Opción 1:** La inicial del usuario (ej: "J" para Jorge)
- **Opción 2:** La foto de perfil del usuario (si ya la subió)

### 📝 Qué Esperar:

1. **Abre la app BarLive**

2. **Busca el perfil de @jorge**

3. **Verás uno de estos dos casos:**
   - Una "J" circular (si Jorge aún no ha subido su foto)
   - La foto de perfil de Jorge (si ya la subió)

4. **Ya NO verás un avatar en blanco**

### ✅ Verificación:
- Todos los avatares deben ser visibles
- Si ves un avatar en blanco, cierra y vuelve a abrir la app
- Si persiste, notifica al administrador

---

## 🎯 PARA TODOS LOS USUARIOS

### 🚀 Nuevas Funciones de Mensajería

#### 1. Mensajes Privados en Tiempo Real

**Cómo funciona:**
- Abre una conversación con otro usuario
- Envía un mensaje
- El otro usuario lo verá **INSTANTÁNEAMENTE**
- No necesitas actualizar manualmente
- Verás "✓✓" cuando el otro usuario lea tu mensaje

**Pruébalo:**
1. Abre una conversación
2. Pide a un amigo que te envíe un mensaje
3. El mensaje debe aparecer automáticamente
4. No toques el botón de actualizar

#### 2. Chat Público en Sala Virtual

**Cómo funciona:**
- Entra a un local abierto
- Ve a la "Sala Virtual"
- Envía un mensaje
- Todos los usuarios en la sala lo verán **INSTANTÁNEAMENTE**
- Verás "Alguien está escribiendo..." cuando otros escriben

**Pruébalo:**
1. Entra a una sala virtual con un amigo
2. Envía un mensaje
3. Tu amigo debe verlo aparecer automáticamente
4. Empieza a escribir y tu amigo verá el indicador

#### 3. Lista de Usuarios en Tiempo Real

**Cómo funciona:**
- Entra a una sala virtual
- Ve a la pestaña "Usuarios"
- La lista se actualiza **AUTOMÁTICAMENTE**
- Verás el contador cambiar cuando alguien entra/sale

**Pruébalo:**
1. Entra a una sala virtual
2. Ve a la pestaña "Usuarios"
3. Pide a un amigo que entre a la misma sala
4. Deberías ver aparecer a tu amigo automáticamente

### 📸 Cómo Subir tu Foto de Perfil Correctamente

**Pasos:**
1. Ve a tu perfil
2. Toca tu avatar
3. Selecciona "Cambiar foto de perfil"
4. Elige una foto de tu galería
5. Espera a que se suba (verás progreso)
6. ¡Listo! Todos podrán ver tu foto

**⚠️ IMPORTANTE:**
- La foto se sube a Supabase Storage (servidor en la nube)
- La URL será pública y accesible para todos
- NO uses fotos de otras apps (pueden ser rutas locales)
- Elige fotos directamente de tu galería de fotos

### 🚫 Sobre el Popup "Acceso Denegado"

**Antes:**
- Aparecía aleatoriamente al navegar

**Ahora:**
- Solo aparece si intentas acceder a `/admin` sin permisos
- No debería aparecer en navegación normal
- Si aparece, cierra la app completamente y vuelve a abrirla

## 🎯 PREGUNTAS FRECUENTES

### ¿Por qué mi avatar es una letra?
- Tu foto de perfil era una ruta local (file://)
- Se eliminó para que otros usuarios no vean un avatar en blanco
- Sube una nueva foto siguiendo los pasos arriba

### ¿Los mensajes antiguos siguen ahí?
- Sí, todos los mensajes privados se guardan
- Solo el chat público de sala virtual es volátil (no se guarda)

### ¿Necesito actualizar para ver mensajes nuevos?
- No, los mensajes aparecen automáticamente
- El sistema usa WebSockets para actualizaciones en tiempo real

### ¿Qué pasa si pierdo conexión a internet?
- Los mensajes se enviarán cuando recuperes conexión
- Verás un indicador de "enviando..." mientras tanto

### ¿Puedo eliminar mensajes?
- Sí, mantén presionado tu mensaje y selecciona "Eliminar"
- Solo puedes eliminar tus propios mensajes
- En conversaciones privadas, el mensaje se elimina para ambos

## 🎉 BENEFICIOS

### Antes
- ⏱️ Tenías que actualizar manualmente para ver mensajes
- 😕 No sabías si alguien estaba escribiendo
- 👻 Algunos avatares aparecían en blanco
- 🔔 Popup molesto aparecía aleatoriamente

### Ahora
- ⚡ Mensajes aparecen instantáneamente
- ⌨️ Ves cuando alguien está escribiendo
- 🖼️ Todos los avatares son visibles
- 🎯 Popup solo aparece cuando corresponde

## 📞 SOPORTE

Si tienes problemas:

1. **Cierra y vuelve a abrir la app**
2. **Verifica tu conexión a internet**
3. **Revisa que tienes la última versión de la app**
4. **Contacta al administrador** si el problema persiste

---

## 🎊 ¡DISFRUTA LA NUEVA EXPERIENCIA!

La mensajería ahora es **instantánea** y **fluida**, como en Instagram o WhatsApp.

**¡No más actualizaciones manuales!** 🎉

---

**Última actualización:** ${new Date().toLocaleDateString('es-ES', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
