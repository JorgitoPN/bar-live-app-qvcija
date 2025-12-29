
# 🧪 GUÍA DE PRUEBAS v55.0

## 📋 CHECKLIST DE VERIFICACIÓN

### ✅ 1. SINCRONIZACIÓN DE PLANES ASIGNADOS MANUALMENTE

**Escenario:** Usuario @jorge con local "Bar A Coviña" y Plan Estándar asignado manualmente

**Pasos de Prueba:**
1. Inicia sesión como @jorge (jorgepereznoyagh@gmail.com)
2. Cambia a modo "Propietario"
3. Selecciona el local "Bar A Coviña"
4. Navega a la pestaña "Social"

**Resultado Esperado:**
- ✅ NO debe aparecer mensaje de "Acceso Restringido"
- ✅ Debe poder acceder a la red social sin problemas
- ✅ Si aparece algún mensaje, debe decir "Bar A Coviña" (no otro local)

**Resultado Anterior (Incorrecto):**
- ❌ Aparecía "Acceso Restringido"
- ❌ Mensaje decía "Perfil social completo para Pub Momo"

---

### ✅ 2. POTENCIAL DE PLANES

**Escenario:** Verificar que los valores de potencial son correctos

**Pasos de Prueba:**
1. Accede a "Gestión de Locales"
2. Observa la sección "Potencial de clientes alcanzado"

**Resultado Esperado:**

| Plan | Sin Destacado | Con Destacado |
|------|---------------|---------------|
| Gratuito | 30% | 65% |
| Estándar | 65% | 100% |
| Premium | 100% | 135% |

**Verificación Visual:**
- ✅ Plan Gratuito debe mostrar "Plan Gratuito (30% base)"
- ✅ Plan Estándar debe mostrar "Plan Estándar (65% base)"
- ✅ Plan Premium debe mostrar "Plan Premium (100% base)"
- ✅ Con destacado activo debe mostrar "Destacado Activo (+35%)"

---

### ✅ 3. NOTIFICACIONES DE FACTURAS

**Escenario:** Envío de factura de prueba

**Pasos de Prueba:**
1. Como administrador, accede a "Facturación"
2. Crea una factura de prueba
3. Envía la factura a un email de prueba
4. Verifica las notificaciones del usuario

**Resultado Esperado:**
- ✅ La aplicación indica "Notificación enviada con éxito"
- ✅ El usuario recibe una notificación in-app
- ✅ La notificación muestra: "📄 Nueva Factura: BL-XXXX"
- ✅ El mensaje incluye el total de la factura

**Dónde Ver la Notificación:**
- Perfil → Notificaciones
- Debe aparecer en la lista de notificaciones

**Nota Importante:**
El sistema actual usa **notificaciones in-app** en lugar de emails. Para envío de emails reales, se debe integrar con Resend, SendGrid o AWS SES.

---

### ✅ 4. VALORACIÓN EN POPUP DEL MAPA

**Escenario:** Verificar que la valoración se muestra correctamente

**Pasos de Prueba:**
1. Accede a la pestaña "Explorar" → "Mapa"
2. Toca un marcador de un local que tenga reseñas
3. Observa el popup que se abre

**Resultado Esperado:**
- ✅ La valoración NO debe ser 0.0
- ✅ Debe mostrar el promedio real de reseñas (ej: 4.5)
- ✅ Debe mostrar el número de reseñas (ej: "(12)")
- ✅ Formato: "⭐ 4.5 (12)"

**Locales de Prueba:**
- Busca locales con reseñas existentes
- Verifica que la valoración coincide con la página de detalles

**Prueba de Tiempo Real:**
1. Abre el popup de un local
2. Desde otro dispositivo/navegador, añade una reseña
3. ✅ La valoración debe actualizarse automáticamente

---

### ✅ 5. DOCUMENTO DE PROPIEDAD OBLIGATORIO

**Escenario:** Crear solicitud de nuevo local

**Pasos de Prueba:**
1. Accede a "Solicitar rol de propietario"
2. Selecciona "Crear nuevo local"
3. Completa los pasos 1-4 del wizard
4. En el paso 5, NO subas ningún documento
5. Intenta enviar la solicitud

**Resultado Esperado:**
- ✅ Debe aparecer un Alert: "Documento Requerido"
- ✅ El mensaje debe explicar que es obligatorio
- ✅ NO debe permitir enviar la solicitud

**Continuación:**
1. Selecciona un tipo de documento (ej: "Factura de Luz")
2. Sube un documento (PDF o imagen)
3. Envía la solicitud

**Resultado Esperado:**
- ✅ La solicitud se envía correctamente
- ✅ Aparece mensaje de confirmación
- ✅ El documento se guarda en Supabase Storage

---

### ✅ 6. CONSISTENCIA DE CAMPOS

**Escenario:** Comparar campos entre "Crear local" y "Solicitar rol de propietario"

**Pasos de Prueba:**
1. Abre "Crear local" en una pestaña
2. Abre "Solicitar rol de propietario" → "Crear nuevo local" en otra pestaña
3. Compara los campos de cada paso

**Resultado Esperado:**
- ✅ Paso 1: Mismos campos (nombre, tipo, descripción)
- ✅ Paso 2: Mismos campos (dirección, mapa, teléfono, email)
- ✅ Paso 3: Mismos campos (servicios)
- ✅ Paso 4: Mismos campos (horarios)
- ✅ Paso 5: Mismos campos (imágenes) + documento de propiedad

**Diferencia Clave:**
- "Solicitar rol de propietario" incluye campo adicional: **Documento de Propiedad** (obligatorio)

---

### ✅ 7. VISUALIZACIÓN DE SOLICITUDES (ADMIN)

**Escenario:** Revisar solicitud de propietario con toda la información

**Pasos de Prueba:**
1. Como administrador, accede a "Solicitudes de Propietarios"
2. Toca una solicitud para abrir el modal de detalles

**Resultado Esperado:**

**Sección "Solicitante":**
- ✅ Avatar del usuario
- ✅ Nombre completo
- ✅ Username (@username)
- ✅ Email

**Sección "Nuevo Local Propuesto" o "Local a Reclamar":**
- ✅ Nombre del local
- ✅ Tipo de local (con icono)
- ✅ Dirección completa
- ✅ Ciudad, código postal, provincia
- ✅ Teléfono (con botón para llamar)
- ✅ Email (con botón para enviar email)
- ✅ Descripción del local

**Sección "Documento de Propiedad":**
- ✅ Tipo de documento (ej: "Factura de Luz")
- ✅ Botón "Ver Documento" que abre el archivo
- ✅ Icono de documento

**Sección "Imágenes del Local":**
- ✅ Imagen de portada (si existe)
- ✅ Galería de imágenes (scroll horizontal)
- ✅ Todas las imágenes visibles

**Sección "Ubicación en el Mapa":**
- ✅ Coordenadas (latitud, longitud)
- ✅ Botón "Abrir en Mapas" que abre Google Maps

**Sección "Servicios":**
- ✅ Lista de servicios disponibles
- ✅ Chips con fondo de color

**Sección "Horarios":**
- ✅ Horarios completos por día
- ✅ Formato: "Lunes: 09:00 - 22:00"
- ✅ Días cerrados: "Domingo: Cerrado"

**Acciones Disponibles:**
- ✅ Botón "Aprobar" (verde)
- ✅ Botón "Cambiar Estado" (azul)
- ✅ Botón "Denegar" (rojo)

---

## 🎯 CASOS DE USO ESPECÍFICOS

### Caso 1: Usuario @jorge con Bar A Coviña

**Contexto:**
- Usuario: @jorge (jorgepereznoyagh@gmail.com)
- Local: Bar A Coviña
- Plan: Estándar (asignado manualmente por admin)

**Prueba:**
1. Login como @jorge
2. Modo Propietario → Seleccionar "Bar A Coviña"
3. Ir a pestaña "Social"

**Resultado Esperado:**
- ✅ Acceso completo a la red social
- ✅ Puede crear publicaciones
- ✅ Puede ver el feed social
- ✅ NO aparece mensaje de restricción

---

### Caso 2: Solicitud de Nuevo Local con Documento

**Contexto:**
- Usuario nuevo quiere crear un local
- Debe proporcionar documento de propiedad

**Prueba:**
1. Solicitar rol de propietario → Crear nuevo local
2. Paso 1: Nombre "Mi Bar", Tipo "Bar"
3. Paso 2: Dirección completa + ubicación en mapa
4. Paso 3: Seleccionar servicios (WiFi, Terraza, etc.)
5. Paso 4: Configurar horarios
6. Paso 5: Subir portada + galería + **DOCUMENTO**

**Resultado Esperado:**
- ✅ Sin documento: Error "Documento Requerido"
- ✅ Con documento: Solicitud enviada correctamente
- ✅ Admin puede ver toda la información
- ✅ Admin puede descargar el documento

---

### Caso 3: Valoración en Tiempo Real

**Contexto:**
- Local con reseñas existentes
- Se añade una nueva reseña

**Prueba:**
1. Dispositivo A: Abre popup del local en el mapa
2. Dispositivo B: Añade una reseña al local
3. Observa el popup en Dispositivo A

**Resultado Esperado:**
- ✅ La valoración se actualiza automáticamente
- ✅ El número de reseñas aumenta
- ✅ No es necesario cerrar y abrir el popup

---

## 🔍 VERIFICACIÓN SQL

### Verificar Plan de @jorge

```sql
SELECT 
  u.nombre as usuario,
  u.username,
  l.nombre as local,
  s.estado as suscripcion_estado,
  p.nombre as plan_nombre,
  p.perfil_social,
  p.permisos->>'potencial_base' as potencial_base
FROM usuarios u
JOIN locales l ON l.propietario_id = u.id
LEFT JOIN suscripciones_locales s ON s.local_id = l.id AND s.estado = 'activa'
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE u.username = 'jorge'
AND l.nombre ILIKE '%coviña%';
```

**Resultado Esperado:**
```
usuario: Jorge Pérez
username: jorge
local: Bar A Coviña
suscripcion_estado: activa
plan_nombre: Estándar
perfil_social: true
potencial_base: 65
```

---

### Verificar Valoración de un Local

```sql
SELECT 
  l.nombre,
  l.rating as rating_local,
  l.google_rating,
  COUNT(r.id) as num_reviews_barlive,
  AVG(r.rating) as avg_rating_barlive
FROM locales l
LEFT JOIN reviews_barlive r ON r.local_id = l.id
WHERE l.nombre ILIKE '%coviña%'
GROUP BY l.id, l.nombre, l.rating, l.google_rating;
```

---

### Verificar Documentos de Propiedad

```sql
SELECT 
  s.nombre_local,
  s.documento_propiedad_tipo,
  s.documento_propiedad_url IS NOT NULL as tiene_documento,
  s.estado,
  u.nombre as solicitante,
  u.email
FROM solicitudes_propietario s
JOIN usuarios u ON s.usuario_id = u.id
WHERE s.tipo_solicitud = 'nuevo_local'
ORDER BY s.created_at DESC
LIMIT 10;
```

---

## 🎨 VERIFICACIÓN VISUAL

### Tarjeta de Local (Gestión)

**Elementos a Verificar:**
- ✅ Imagen de portada
- ✅ Nombre del local (overlay en imagen)
- ✅ Provincia (overlay en imagen)
- ✅ **NUEVO:** Dirección (overlay en imagen)
- ✅ Badge de plan (esquina superior derecha)
- ✅ Potencial de clientes (barra de progreso)
- ✅ Créditos disponibles (formato numérico)

---

### Popup del Mapa

**Elementos a Verificar:**
- ✅ Imagen de portada
- ✅ Nombre del local
- ✅ Categorías (chips de colores)
- ✅ **NUEVO:** Valoración correcta (no 0.0)
- ✅ **NUEVO:** Número de reseñas "(12)"
- ✅ Estado (Abierto/Cerrado)
- ✅ Dirección
- ✅ Distancia desde ubicación actual
- ✅ Botones: "Estoy en este local", "Llamar", "Cómo llegar"

---

### Modal de Detalles de Solicitud (Admin)

**Elementos a Verificar:**
- ✅ Avatar del solicitante
- ✅ Nombre y username
- ✅ Email del solicitante
- ✅ Nombre del local propuesto
- ✅ Tipo de local
- ✅ Dirección completa
- ✅ Teléfono y email de contacto
- ✅ **NUEVO:** Documento de propiedad con botón "Ver Documento"
- ✅ **NUEVO:** Tipo de documento (ej: "Factura de Luz")
- ✅ **NUEVO:** Imagen de portada
- ✅ **NUEVO:** Galería de imágenes (scroll horizontal)
- ✅ **NUEVO:** Coordenadas y botón "Abrir en Mapas"
- ✅ **NUEVO:** Lista de servicios
- ✅ **NUEVO:** Horarios completos
- ✅ Botones de acción: Aprobar, Cambiar Estado, Denegar

---

## 🐛 PROBLEMAS CONOCIDOS Y SOLUCIONES

### Problema: "No se envían emails de facturas"

**Explicación:**
El sistema actual usa **notificaciones in-app** en lugar de emails. Esto es intencional y funciona correctamente.

**Verificación:**
1. Genera una factura
2. Verifica que el usuario recibe una notificación in-app
3. ✅ La notificación debe aparecer en Perfil → Notificaciones

**Para Emails Reales:**
Si necesitas envío de emails por correo electrónico, debes integrar con:
- Resend (recomendado)
- SendGrid
- AWS SES

---

### Problema: "Valoración sigue en 0.0"

**Posibles Causas:**
1. El local no tiene reseñas en `reviews_barlive`
2. Solo tiene valoración de Google (no de BarLive)

**Verificación:**
```sql
SELECT COUNT(*) FROM reviews_barlive WHERE local_id = 'LOCAL_ID';
```

**Solución:**
- Si COUNT = 0: El local no tiene reseñas de BarLive, mostrará valoración de Google
- Si COUNT > 0: Debe mostrar el promedio de las reseñas

---

### Problema: "No puedo subir documento"

**Posibles Causas:**
1. Archivo muy grande (>10MB)
2. Formato no permitido (solo JPG, PNG, PDF)
3. Permisos de storage no configurados

**Verificación:**
1. Verifica el tamaño del archivo
2. Verifica el formato del archivo
3. Revisa los logs de la consola

**Solución:**
- Reduce el tamaño del archivo si es >10MB
- Convierte a PDF o JPG si es otro formato
- Verifica que el bucket `documentos-propiedad` existe

---

## 📊 MÉTRICAS DE ÉXITO

### Indicadores Clave

1. **Sincronización de Planes:**
   - ✅ 0 errores de "Acceso Restringido" con plan activo
   - ✅ 100% de planes asignados manualmente reconocidos

2. **Potencial de Planes:**
   - ✅ Gratuito: 30% (no 20%)
   - ✅ Estándar: 65% (no 35%)
   - ✅ Premium: 100% (no 50%)

3. **Notificaciones de Facturas:**
   - ✅ 100% de facturas generan notificación in-app
   - ✅ 0 errores en envío de notificaciones

4. **Valoraciones:**
   - ✅ 0 locales con reseñas mostrando 0.0
   - ✅ 100% de valoraciones sincronizadas

5. **Documentos de Propiedad:**
   - ✅ 100% de solicitudes nuevas incluyen documento
   - ✅ 0 solicitudes enviadas sin documento

---

## 🚀 COMANDOS ÚTILES

### Verificar Estado de un Local

```sql
SELECT 
  l.nombre,
  l.destacado,
  s.estado as suscripcion_estado,
  p.nombre as plan_nombre,
  p.permisos->>'potencial_base' as potencial_base,
  s.creditos_destacados_restantes,
  s.creditos_eventos_restantes
FROM locales l
LEFT JOIN suscripciones_locales s ON s.local_id = l.id AND s.estado = 'activa'
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.nombre ILIKE '%nombre_local%';
```

---

### Verificar Solicitudes Pendientes

```sql
SELECT 
  s.nombre_local,
  s.tipo_solicitud,
  s.estado,
  s.documento_propiedad_tipo,
  s.documento_propiedad_url IS NOT NULL as tiene_documento,
  u.nombre as solicitante,
  u.email,
  s.created_at
FROM solicitudes_propietario s
JOIN usuarios u ON s.usuario_id = u.id
WHERE s.estado = 'pendiente'
ORDER BY s.created_at DESC;
```

---

### Verificar Notificaciones de Facturas

```sql
SELECT 
  n.titulo,
  n.mensaje,
  n.leida,
  n.created_at,
  u.nombre as destinatario,
  u.email
FROM notificaciones n
JOIN usuarios u ON n.usuario_id = u.id
WHERE n.tipo = 'sistema'
AND n.titulo ILIKE '%factura%'
ORDER BY n.created_at DESC
LIMIT 10;
```

---

## 📞 CONTACTO Y SOPORTE

### Logs a Revisar

**Frontend (Browser Console):**
```
[PermissionGuard v55.0] - Permisos y sincronización de planes
[LocalDetailsModal v55.0] - Valoraciones y popup del mapa
[SolicitarRolPropietario v55.0] - Creación de solicitudes
[LocalSubscriptionCard v55.0] - Potencial de planes
```

**Backend (Supabase Edge Functions):**
```
[send-invoice-email v55.0] - Envío de notificaciones de facturas
```

### Problemas Comunes

1. **"Acceso Restringido" con plan activo:**
   - Verifica que el plan tiene `perfil_social: true`
   - Verifica que la suscripción está en estado `activa`
   - Revisa los logs de PermissionGuard

2. **Valoración 0.0:**
   - Verifica que el local tiene reseñas en `reviews_barlive`
   - Si no tiene reseñas BarLive, mostrará valoración de Google
   - Revisa los logs de LocalDetailsModal

3. **No se puede subir documento:**
   - Verifica el tamaño (<10MB)
   - Verifica el formato (JPG, PNG, PDF)
   - Revisa los permisos del bucket `documentos-propiedad`

---

**Versión:** v55.0  
**Fecha:** 29 de Diciembre de 2024  
**Estado:** ✅ Listo para Pruebas
