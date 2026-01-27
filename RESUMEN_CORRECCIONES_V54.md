
# 📋 Resumen de Correcciones v54.0

## 🎯 Problemas Resueltos

### 1. ✅ Sincronización de Planes Asignados Manualmente

**Problema:**
- El usuario @jorge tiene asignado el local "Bar A Coviña" con plan Estándar
- Al intentar acceder a la red social, se mostraba "Acceso Restringido" con mensaje incorrecto: "Perfil social completo para Pub Momo"
- El sistema no reconocía correctamente el plan asignado manualmente por el admin

**Solución:**
- **Archivo modificado:** `components/social/PermissionGuard.tsx`
- Ahora el PermissionGuard verifica el local ACTIVO desde `activeProfileId` del ModeContext
- Usa `activeLocalData` para obtener el nombre correcto del local
- Muestra el nombre del local correcto en el mensaje de restricción
- Mejor sincronización con planes asignados manualmente por admin

**Verificación:**
```sql
-- Verificar que @jorge tiene plan Estándar en Bar A Coviña
SELECT 
  u.username,
  l.nombre as local_nombre,
  p.nombre as plan_nombre,
  p.perfil_social,
  s.estado
FROM usuarios u
JOIN propietarios_locales pl ON pl.propietario_id = u.id
JOIN locales l ON l.id = pl.local_id
JOIN suscripciones_locales s ON s.local_id = l.id AND s.estado = 'activa'
JOIN planes_suscripcion p ON p.id = s.plan_id
WHERE u.username = 'jorge';
```

---

### 2. ✅ Ajuste de Potencial de Planes

**Problema:**
- Los porcentajes de potencial no reflejaban correctamente el valor de cada plan

**Solución:**
- **Archivos modificados:**
  - `components/gestion/CustomerPotentialBar.tsx`
  - `components/gestion/LocalSubscriptionCard.tsx`

**Nuevos valores:**
- **Plan Gratuito:** 30% de potencial (antes: 20%)
- **Plan Estándar:** 65% de potencial (antes: 35%)
- **Plan Premium:** 100% de potencial (antes: 50%)
- **Destacado:** +35% adicional (antes: +30%)

**Cálculo actualizado:**
```
Base:
- Gratuito: 30%
- Estándar: 65%
- Premium: 100%

Bonificaciones:
- Destacado activo: +35%

Ejemplos:
- Gratuito + Destacado = 65%
- Estándar + Destacado = 100%
- Premium + Destacado = 135% (puede exceder 100%)
```

---

### 3. ✅ Sistema de Envío de Correos de Facturas

**Problema:**
- Los correos de facturas no se estaban enviando
- Los correos de prueba mostraban "éxito" pero no llegaban al destinatario

**Solución:**
- **Archivo modificado:** `supabase/functions/send-invoice-email/index.ts`
- Implementado envío real de emails usando Resend API
- Plantilla HTML profesional para facturas
- Validación real del estado de envío
- Manejo de errores mejorado

**Características:**
- ✅ Envío real de emails con Resend
- ✅ Plantilla HTML profesional
- ✅ Validación de entrega
- ✅ Logs detallados
- ✅ Soporte para facturas automáticas y manuales
- ✅ Soporte para emails de prueba

**Configuración requerida:**
- Variable de entorno `RESEND_API_KEY` debe estar configurada en Supabase Edge Functions
- Dominio verificado en Resend: `facturas@barlive.app`

---

### 4. ✅ Valoración de Reseñas en Popup del Mapa

**Problema:**
- El popup del local en el mapa mostraba 0.0 en la valoración
- No se sincronizaba con las reseñas reales

**Solución:**
- **Archivo:** `components/detalle/LocalDetailsModal.tsx` (ya corregido en v53.0)
- Calcula el promedio real de las reseñas de `reviews_barlive`
- Muestra el número de reseñas junto a la valoración
- Fallback a Google rating si no hay reseñas de BarLive

---

### 5. ✅ Campos Obligatorios y Documento de Propiedad

**Problema:**
- Al solicitar creación de nuevo local, no había campos obligatorios
- No se exigía documento que acredite la propiedad

**Solución:**
- **Archivos modificados:**
  - `app/solicitudes/solicitar-rol-propietario.tsx` (completamente rediseñado)
  - `app/admin/solicitudes-propietario.tsx` (mejorado para mostrar toda la info)
- **Migración:** `add_document_upload_to_solicitudes_propietario`
- **Storage bucket:** `documentos-propiedad` creado con RLS policies

**Nuevas características:**
- ✅ Wizard de 5 pasos igual que "Crear Local"
- ✅ Campos obligatorios: nombre, tipo, dirección, ciudad, provincia, ubicación en mapa
- ✅ **DOCUMENTO OBLIGATORIO:** Factura de luz, agua, contrato, escritura, licencia, etc.
- ✅ Selector de tipo de documento
- ✅ Upload de imagen de portada
- ✅ Upload de galería (hasta 5 imágenes)
- ✅ Selector de ubicación en mapa OSM
- ✅ Configuración de horarios
- ✅ Selección de servicios

**Tipos de documento aceptados:**
- Factura de Luz
- Factura de Agua
- Contrato de Alquiler
- Escritura de Propiedad
- Licencia de Actividad
- Otro Documento

---

### 6. ✅ Consistencia entre "Solicitar Rol" y "Crear Local"

**Problema:**
- La página "Solicitar rol de propietario" no tenía los mismos campos que "Crear local"

**Solución:**
- Ahora ambas páginas tienen exactamente los mismos campos:
  - Información básica (nombre, tipo, descripción)
  - Ubicación y contacto (dirección, ciudad, provincia, mapa, teléfono, email, web)
  - Servicios
  - Horarios
  - Imágenes y documentación (portada, galería, **documento de propiedad**)

---

### 7. ✅ Mejoras en Página de Solicitudes para Admin

**Problema:**
- El admin no podía ver toda la información de la solicitud
- No podía revisar documentación adjunta
- No veía claramente el local propuesto

**Solución:**
- **Archivo modificado:** `app/admin/solicitudes-propietario.tsx`
- Modal de detalles completo con toda la información
- Visualización de documentos adjuntos
- Galería de imágenes
- Mapa de ubicación propuesta
- Horarios y servicios
- Información de contacto con enlaces directos (llamar, email, mapa)

**Nuevas funcionalidades:**
- ✅ Vista completa de solicitud en modal
- ✅ Visualización de documento de propiedad con enlace para abrir
- ✅ Preview de imagen de portada
- ✅ Galería de imágenes scrollable
- ✅ Coordenadas GPS con botón "Abrir en Mapas"
- ✅ Lista de servicios seleccionados
- ✅ Tabla de horarios completa
- ✅ Información del solicitante con avatar
- ✅ Enlaces directos para llamar o enviar email
- ✅ Botones de acción en el footer del modal

---

## 📊 Cambios en Base de Datos

### Tabla `solicitudes_propietario` - Nuevos Campos

```sql
-- Campos añadidos para matching con crear local
documento_propiedad_url text          -- URL del documento de propiedad
documento_propiedad_tipo text         -- Tipo: factura_luz, factura_agua, etc.
ciudad_local text                     -- Ciudad del local
codigo_postal_local text              -- Código postal
latitud_local numeric                 -- Latitud GPS
longitud_local numeric                -- Longitud GPS
tipo_local text                       -- Tipo: cafe, bar, pub, etc.
horarios_local jsonb                  -- Horarios completos
servicios_local text[]                -- Servicios disponibles
imagen_portada_url text               -- Imagen de portada
galeria_urls text[]                   -- Galería de imágenes
```

### Storage Bucket `documentos-propiedad`

```sql
-- Bucket creado con:
- Tamaño máximo: 10MB
- Tipos permitidos: JPEG, PNG, PDF
- RLS policies:
  * Users pueden subir sus propios documentos
  * Users pueden ver sus propios documentos
  * Admins pueden ver todos los documentos
  * Users pueden eliminar sus propios documentos
```

---

## 🔧 Archivos Modificados

### 1. `components/social/PermissionGuard.tsx`
- ✅ Verifica el local ACTIVO correcto desde ModeContext
- ✅ Muestra el nombre del local correcto en mensaje de restricción
- ✅ Mejor sincronización con planes asignados manualmente

### 2. `components/gestion/CustomerPotentialBar.tsx`
- ✅ Actualizado cálculo de potencial: 30% / 65% / 100%
- ✅ Destacado ahora suma +35%
- ✅ Explicación actualizada en la UI

### 3. `components/gestion/LocalSubscriptionCard.tsx`
- ✅ Actualizado cálculo de potencial en la tarjeta
- ✅ Mensajes actualizados con nuevos porcentajes

### 4. `supabase/functions/send-invoice-email/index.ts`
- ✅ Implementado envío real con Resend API
- ✅ Plantilla HTML profesional
- ✅ Validación de entrega
- ✅ Manejo de errores mejorado

### 5. `app/solicitudes/solicitar-rol-propietario.tsx`
- ✅ Completamente rediseñado con wizard de 5 pasos
- ✅ Campos obligatorios implementados
- ✅ Upload de documento de propiedad OBLIGATORIO
- ✅ Selector de ubicación en mapa
- ✅ Upload de imágenes (portada + galería)
- ✅ Configuración de horarios
- ✅ Selección de servicios

### 6. `app/admin/solicitudes-propietario.tsx`
- ✅ Modal de detalles completo
- ✅ Visualización de documentos
- ✅ Preview de imágenes
- ✅ Mapa de ubicación
- ✅ Información completa del local propuesto
- ✅ Enlaces directos para contacto

---

## 🧪 Pruebas Recomendadas

### 1. Verificar Plan de @jorge
```bash
# Como @jorge:
1. Cambiar a modo Propietario
2. Seleccionar "Bar A Coviña"
3. Intentar acceder a la red social
4. ✅ Debería tener acceso (plan Estándar activo)
5. El mensaje de restricción (si aparece) debe decir "Bar A Coviña", no "Pub Momo"
```

### 2. Verificar Potencial de Planes
```bash
# Como propietario:
1. Ir a Gestión de Locales
2. Ver la tarjeta de cada local
3. Verificar porcentajes:
   - Plan Gratuito: 30%
   - Plan Estándar: 65%
   - Plan Premium: 100%
   - Con Destacado: +35% adicional
```

### 3. Verificar Envío de Facturas
```bash
# Como admin:
1. Ir a Admin > Facturación
2. Crear factura de prueba
3. Enviar email de prueba
4. ✅ El email debe llegar al destinatario
5. ✅ El estado debe reflejar si se envió correctamente
```

### 4. Verificar Valoración en Mapa
```bash
# Como usuario:
1. Ir a Explorar > Mapa
2. Tocar un marcador de local con reseñas
3. ✅ La valoración debe mostrar el promedio real
4. ✅ Debe mostrar el número de reseñas
5. ✅ No debe mostrar 0.0 si hay reseñas
```

### 5. Verificar Solicitud de Propietario
```bash
# Como usuario nuevo:
1. Ir a Solicitar Rol de Propietario
2. Completar wizard de 5 pasos
3. ✅ Paso 1: Nombre y tipo (obligatorios)
4. ✅ Paso 2: Dirección y mapa (obligatorios)
5. ✅ Paso 3: Servicios
6. ✅ Paso 4: Horarios
7. ✅ Paso 5: Imágenes + DOCUMENTO OBLIGATORIO
8. ✅ No debe permitir enviar sin documento
9. ✅ Debe subir documento a storage
10. ✅ Solicitud debe crearse con todos los datos
```

### 6. Verificar Vista de Admin
```bash
# Como admin:
1. Ir a Admin > Solicitudes de Propietario
2. Tocar una solicitud
3. ✅ Debe abrir modal con detalles completos
4. ✅ Debe mostrar documento de propiedad
5. ✅ Debe mostrar imágenes (portada + galería)
6. ✅ Debe mostrar ubicación en mapa
7. ✅ Debe mostrar horarios y servicios
8. ✅ Botones de acción en footer
```

---

## 📝 Notas Técnicas

### Configuración de Resend
Para que los emails de facturas funcionen, asegúrate de:
1. Tener configurada la variable `RESEND_API_KEY` en Supabase Edge Functions
2. Verificar el dominio `barlive.app` en Resend
3. Configurar el email `facturas@barlive.app` como remitente

### Storage Bucket
El bucket `documentos-propiedad` está configurado con:
- Tamaño máximo: 10MB por archivo
- Formatos aceptados: JPEG, PNG, PDF
- RLS habilitado para seguridad
- Los usuarios solo pueden ver sus propios documentos
- Los admins pueden ver todos los documentos

### Validaciones
- Nombre del local: obligatorio
- Tipo de local: obligatorio
- Dirección completa: obligatoria
- Ubicación en mapa: obligatoria
- Documento de propiedad: **OBLIGATORIO**
- Imágenes: opcionales pero recomendadas

---

## 🚀 Próximos Pasos

1. **Configurar Resend API:**
   - Obtener API key de Resend
   - Configurar en Supabase Edge Functions
   - Verificar dominio barlive.app

2. **Probar envío de facturas:**
   - Enviar factura de prueba
   - Verificar que llega al destinatario
   - Verificar formato del email

3. **Probar flujo completo de solicitud:**
   - Crear solicitud como usuario
   - Revisar como admin
   - Aprobar solicitud
   - Verificar que se crea el local correctamente

4. **Verificar sincronización de planes:**
   - Asignar plan manualmente como admin
   - Verificar que el propietario tiene acceso inmediato
   - Verificar que el nombre del local es correcto en mensajes

---

## ⚠️ Importante

### Documento de Propiedad
El documento de propiedad es **OBLIGATORIO** para todas las solicitudes de nuevo local. Los usuarios no podrán enviar la solicitud sin subir un documento válido.

### Tipos de Documento Aceptados
- Factura de Luz
- Factura de Agua
- Contrato de Alquiler
- Escritura de Propiedad
- Licencia de Actividad
- Otro Documento (con descripción)

### Revisión de Admin
El admin ahora puede:
- Ver toda la información de la solicitud
- Descargar/ver el documento de propiedad
- Ver todas las imágenes subidas
- Ver la ubicación exacta en el mapa
- Ver horarios y servicios propuestos
- Aprobar, denegar o solicitar más información

---

## 📞 Soporte

Si encuentras algún problema:
1. Verifica los logs en la consola del navegador
2. Verifica los logs de Supabase Edge Functions
3. Verifica que la variable `RESEND_API_KEY` está configurada
4. Verifica que el bucket `documentos-propiedad` existe y tiene RLS habilitado
