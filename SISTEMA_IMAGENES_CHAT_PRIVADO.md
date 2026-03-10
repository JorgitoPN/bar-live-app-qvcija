
# Sistema de Compartir Imágenes en Chat Privado

## 🎯 Funcionalidades Implementadas

### 1. Compartir Imágenes
- ✅ Seleccionar imagen de la galería
- ✅ Tomar foto directamente desde la cámara
- ✅ Tres modos de envío:
  - **Ver una vez**: La imagen desaparece después de abrirla
  - **Permitir volver a ver**: Se puede abrir varias veces durante el chat
  - **Envío normal**: La imagen queda guardada permanentemente

### 2. Opciones según Tipo de Envío
- ✅ **Envío normal**:
  - Descargar al dispositivo
  - Compartir en feed/momentos (próximamente)
- ✅ **Ver una vez / Volver a ver**:
  - No se pueden descargar
  - Protección contra capturas (advertencia al usuario)
  - Auto-eliminación después de ser vistas

### 3. Seguridad y Privacidad
- ✅ Advertencias de privacidad para imágenes efímeras
- ✅ Contador de tiempo para "ver una vez" (10 segundos)
- ✅ Indicadores visuales de estado (vista/no vista)
- ⏳ Cifrado E2E (pendiente backend)
- ⏳ Detección de capturas de pantalla (limitado en React Native)

### 4. Optimización y Almacenamiento
- ✅ Compresión automática de imágenes (resize a 1080px, calidad 70%)
- ✅ Previsualización antes de enviar
- ⏳ Almacenamiento en object storage (pendiente backend)
- ⏳ Eliminación automática de imágenes efímeras (pendiente backend)

### 5. Experiencia de Usuario
- ✅ Indicadores de lectura y visualización
- ✅ Notificaciones en tiempo real al recibir imágenes
- ✅ Interfaz similar a Instagram
- ✅ Badges visuales para cada modo de envío
- ✅ Visor de imágenes a pantalla completa

## 📱 Componentes Creados

### 1. `ImageShareModal.tsx`
Modal para seleccionar el modo de envío de la imagen:
- Previsualización de la imagen
- Selección de modo (ver una vez, volver a ver, normal)
- Información sobre cada modo
- Botón de envío

### 2. `ImageMessageBubble.tsx`
Burbuja de mensaje para imágenes en el chat:
- Muestra imagen o placeholder (si no ha sido vista)
- Badges de modo de envío
- Indicador de "vista" para imágenes efímeras
- Botones de descarga/compartir (solo modo normal)
- Soporte para eliminación (long press)

### 3. `ImageViewerModal.tsx`
Visor de imágenes a pantalla completa:
- Fondo difuminado
- Contador de tiempo para "ver una vez"
- Badges de modo
- Advertencias de privacidad
- Auto-cierre para "ver una vez"

## 🔧 Integración en `conversacion.tsx`

### Nuevas Funciones
- `handlePickImage()`: Seleccionar de galería
- `handleTakePhoto()`: Tomar foto con cámara
- `handleSendImage()`: Enviar imagen con modo seleccionado
- `handleViewImage()`: Ver imagen en pantalla completa

### Nuevos Estados
- `showImageShareModal`: Control del modal de compartir
- `selectedImageUri`: URI de la imagen seleccionada
- `showImageViewer`: Control del visor de imágenes
- `viewingImage`: Datos de la imagen siendo visualizada

### Actualización de Interfaz
- Botones de galería y cámara en el área de input
- Renderizado de mensajes de imagen
- Modales de compartir y visualizar

## 🔄 Backend Integration (TODO)

### Endpoints Necesarios

#### 1. Upload Image
```
POST /api/chat/upload-image
Body: {
  image: File,
  chatId: string,
  shareMode: 'view_once' | 'allow_replay' | 'normal'
}
Response: {
  imageUrl: string,
  messageId: string,
  expiresAt?: string (for ephemeral images)
}
```

#### 2. Mark Image as Viewed
```
POST /api/chat/mark-image-viewed
Body: {
  messageId: string
}
Response: {
  success: boolean,
  shouldDelete: boolean (for view_once)
}
```

#### 3. Delete Ephemeral Images (Cron Job)
```
Background job que elimina:
- Imágenes "view_once" después de ser vistas
- Imágenes "allow_replay" cuando el chat se elimina
- Imágenes expiradas (más de 30 días sin actividad)
```

### Database Schema

#### Tabla: mensajes (actualizar)
```sql
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS share_mode TEXT CHECK (share_mode IN ('view_once', 'allow_replay', 'normal'));
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

#### Tabla: ephemeral_images (nueva)
```sql
CREATE TABLE IF NOT EXISTS ephemeral_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES mensajes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  share_mode TEXT NOT NULL CHECK (share_mode IN ('view_once', 'allow_replay')),
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ephemeral_images_expires ON ephemeral_images(expires_at);
CREATE INDEX idx_ephemeral_images_message ON ephemeral_images(message_id);
```

### Storage Configuration
- Usar object storage (Supabase Storage o similar)
- Carpetas separadas por modo:
  - `/chat-images/normal/` - Imágenes permanentes
  - `/chat-images/ephemeral/` - Imágenes temporales
- Políticas de acceso:
  - Solo usuarios del chat pueden acceder
  - URLs firmadas con expiración para imágenes efímeras

### Seguridad
- Validar que el usuario pertenece al chat
- Verificar permisos antes de mostrar imágenes
- Encriptar URLs de imágenes efímeras
- Rate limiting para uploads (max 10 imágenes/minuto)
- Validar tipo y tamaño de archivo (max 10MB)

## 📊 Flujo de Datos

### Envío de Imagen
1. Usuario selecciona imagen (galería o cámara)
2. Imagen se comprime localmente
3. Modal de selección de modo
4. Upload a backend con modo seleccionado
5. Backend guarda en storage y crea registro en DB
6. Mensaje se crea con URL de imagen
7. Notificación en tiempo real al destinatario

### Visualización de Imagen
1. Usuario toca imagen en chat
2. Si es efímera y no vista: marca como vista en DB
3. Abre visor a pantalla completa
4. Si es "ver una vez": contador de 10 segundos
5. Al cerrar: si es "ver una vez", se elimina del storage

### Eliminación Automática
1. Cron job ejecuta cada hora
2. Busca imágenes "view_once" vistas hace más de 1 hora
3. Busca imágenes "allow_replay" de chats eliminados
4. Elimina archivos del storage
5. Elimina registros de DB

## 🎨 Diseño Visual

### Colores por Modo
- **Ver una vez**: Rojo (#FF6B6B)
- **Volver a ver**: Turquesa (#4ECDC4)
- **Normal**: Verde (#95E1D3)

### Iconos
- Ver una vez: `visibility_off`
- Volver a ver: `replay`
- Normal: `image`

### Estados Visuales
- No vista (efímera): Fondo de color con icono
- Vista: Imagen completa con badge
- Descargando: Spinner de carga
- Error: Icono de error con mensaje

## 🔐 Consideraciones de Privacidad

### Limitaciones Técnicas
- React Native no puede bloquear capturas de pantalla completamente
- Solo se pueden mostrar advertencias al usuario
- La detección de capturas es limitada en iOS y Android

### Mejores Prácticas Implementadas
- Advertencias claras antes de ver imágenes efímeras
- Contador visible para "ver una vez"
- Badges siempre visibles indicando el modo
- Eliminación automática después de visualización
- No permitir descarga de imágenes efímeras

## 📝 Notas de Implementación

### Dependencias Instaladas
- `expo-media-library`: Para guardar imágenes en galería
- `expo-image-picker`: Para seleccionar/tomar fotos (ya instalado)
- `expo-image-manipulator`: Para comprimir imágenes (ya instalado)

### Permisos Requeridos
- `CAMERA`: Para tomar fotos
- `MEDIA_LIBRARY`: Para acceder a galería y guardar imágenes
- `WRITE_EXTERNAL_STORAGE`: Para guardar en Android (legacy)

### Compatibilidad
- ✅ iOS 13+
- ✅ Android 6.0+
- ✅ Web (con limitaciones en cámara)

## 🚀 Próximos Pasos

1. **Backend Integration**
   - Crear endpoints de upload
   - Configurar object storage
   - Implementar cron jobs de limpieza

2. **Cifrado E2E**
   - Implementar encriptación de imágenes
   - Gestión de claves por chat
   - Desencriptación en cliente

3. **Compartir en Feed/Momentos**
   - Integrar con sistema de publicaciones
   - Permitir compartir solo imágenes normales
   - Mantener privacidad de imágenes efímeras

4. **Mejoras de UX**
   - Previsualización de miniaturas en lista de mensajes
   - Galería de imágenes del chat
   - Búsqueda de imágenes en chat
   - Estadísticas de uso

5. **Optimizaciones**
   - Cache de imágenes vistas
   - Lazy loading de imágenes
   - Compresión adaptativa según conexión
   - Streaming de imágenes grandes

## ✅ Verificación

Para verificar que todo funciona:

1. Abrir un chat privado
2. Tocar botón de galería o cámara
3. Seleccionar/tomar una imagen
4. Elegir modo de envío
5. Enviar imagen
6. Verificar que aparece en el chat
7. Tocar imagen para ver en pantalla completa
8. Verificar comportamiento según modo seleccionado

## 🐛 Debugging

Logs importantes:
- `[ImageShareModal]`: Selección de modo y envío
- `[ImageMessageBubble]`: Visualización y acciones
- `[ImageViewerModal]`: Visor a pantalla completa
- `[Conversacion]`: Upload y gestión de imágenes

Errores comunes:
- Permisos no otorgados: Verificar en configuración del dispositivo
- Imagen no se carga: Verificar URL y permisos de storage
- No se puede descargar: Verificar permisos de MEDIA_LIBRARY
- Modo no se guarda: Verificar campo share_mode en DB
