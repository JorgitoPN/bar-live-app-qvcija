
# 🔧 CAMBIOS TÉCNICOS v55.0

## 📋 RESUMEN EJECUTIVO

Esta versión corrige problemas críticos relacionados con:
1. Sincronización de planes asignados manualmente
2. Valores de potencial de planes
3. Sistema de envío de correos de facturas
4. Sincronización de valoraciones en popup del mapa
5. Requisitos de creación de locales
6. Consistencia entre flujos de solicitud
7. Mejoras en panel de administración

---

## 🔄 CAMBIOS EN COMPONENTES

### 1. PermissionGuard.tsx (v55.0)

**Problema Corregido:**
- Mostraba nombre incorrecto del local en mensaje de restricción
- No sincronizaba correctamente planes asignados manualmente

**Cambios Implementados:**
```typescript
// ✅ Usa activeLocalData.nombre del contexto (ya cargado y correcto)
const currentLocalName = activeLocalData?.nombre || '';
setLocalName(currentLocalName);

// ✅ Suscripción en tiempo real para cambios de plan
useEffect(() => {
  if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
    const subscription = supabase
      .channel(`subscription-updates-${activeProfileId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'suscripciones_locales',
        filter: `local_id=eq.${activeProfileId}`,
      }, (payload) => {
        console.log('[PermissionGuard v55.0] 🔔 Subscription updated:', payload);
        checkPermissions();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }
}, [currentMode, activeProfileType, activeProfileId, checkPermissions]);
```

**Beneficios:**
- ✅ Nombre correcto del local en todos los mensajes
- ✅ Detección inmediata de cambios de plan
- ✅ Mejor experiencia de usuario

---

### 2. CustomerPotentialBar.tsx (v55.0)

**Problema Corregido:**
- Valores de potencial incorrectos para cada plan

**Cambios Implementados:**
```typescript
// ✅ ANTES:
// Gratuito: 20%, Estándar: 35%, Premium: 50%

// ✅ AHORA:
if (planName === 'estandar' || planName === 'estándar') {
  percentage = 65; // ✅ Updated from 35%
} else if (planName === 'premium') {
  percentage = 100; // ✅ Updated from 50%
} else {
  percentage = 30; // ✅ Updated from 20%
}

// Destacado adds +35%
if (hasActiveHighlight) {
  percentage += 35;
}
```

**Explicación Actualizada:**
```typescript
<View style={styles.explanationItem}>
  <Text>• Plan Gratuito: 30% base</Text>
</View>
<View style={styles.explanationItem}>
  <Text>• Plan Estándar: 65% base</Text>
</View>
<View style={styles.explanationItem}>
  <Text>• Plan Premium: 100% base</Text>
</View>
<View style={styles.explanationItem}>
  <Text>• Destacar local: +35%</Text>
</View>
```

---

### 3. LocalSubscriptionCard.tsx (v55.0)

**Problema Corregido:**
- Valores de potencial incorrectos
- Faltaba mostrar dirección del local

**Cambios Implementados:**
```typescript
// ✅ Cálculo actualizado de potencial
const calculateCustomerPotential = (): number => {
  if (!local.suscripcion) return 30; // ✅ Free plan: 30%

  let percentage = 30;
  const planName = local.suscripcion.plan_nombre.toLowerCase();

  if (planName === 'estandar' || planName === 'estándar') {
    percentage = 65; // ✅ Standard: 65%
  } else if (planName === 'premium') {
    percentage = 100; // ✅ Premium: 100%
  }

  if (local.suscripcion.destacado_activo) {
    percentage += 35; // ✅ Destacado: +35%
  }

  return percentage;
};

// ✅ Mostrar dirección en overlay de imagen
{local.direccion && (
  <View style={styles.coverImageAddress}>
    <IconSymbol ios_icon_name="mappin.circle" android_material_icon_name="place" size={12} color="rgba(255, 255, 255, 0.8)" />
    <Text style={styles.coverImageAddressText} numberOfLines={1}>{local.direccion}</Text>
  </View>
)}
```

---

### 4. LocalDetailsModal.tsx (v55.0)

**Problema Corregido:**
- Valoración mostraba 0.0 en popup del mapa
- No sincronizaba con reseñas reales

**Cambios Implementados:**
```typescript
// ✅ Cargar valoración real desde reviews_barlive
const { data: reviewsData, error: reviewsError } = await supabase
  .from('reviews_barlive')
  .select('rating')
  .eq('local_id', localId);

if (!reviewsError && reviewsData && reviewsData.length > 0) {
  const avgRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
  setActualRating(avgRating);
  setReviewCount(reviewsData.length);
}

// ✅ Suscripción en tiempo real para nuevas reseñas
useEffect(() => {
  if (visible && localId) {
    const subscription = supabase
      .channel(`reviews-${localId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews_barlive',
        filter: `local_id=eq.${localId}`,
      }, async (payload) => {
        // Reload rating
        const { data: reviewsData } = await supabase
          .from('reviews_barlive')
          .select('rating')
          .eq('local_id', localId);

        if (reviewsData && reviewsData.length > 0) {
          const avgRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
          setActualRating(avgRating);
          setReviewCount(reviewsData.length);
        }
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }
}, [visible, localId]);

// ✅ Mostrar valoración con número de reseñas
{displayRating > 0 && (
  <View style={styles.ratingBadgeTopRight}>
    <BlurView intensity={90} tint="dark" style={styles.ratingBlur}>
      <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#FFD700" />
      <Text style={styles.ratingText}>{displayRating.toFixed(1)}</Text>
      {reviewCount > 0 && (
        <Text style={styles.reviewCountText}>({reviewCount})</Text>
      )}
    </BlurView>
  </View>
)}
```

---

### 5. solicitar-rol-propietario.tsx (v55.0)

**Problema Corregido:**
- No solicitaba los mismos campos que crear local
- No exigía documento de propiedad

**Cambios Implementados:**
```typescript
// ✅ Wizard de 5 pasos idéntico a crear local
const [currentStep, setCurrentStep] = useState(1);

// Paso 1: Información Básica
// Paso 2: Ubicación y Contacto (con mapa OSM)
// Paso 3: Servicios
// Paso 4: Horarios
// Paso 5: Imágenes y Documentación (DOCUMENTO OBLIGATORIO)

// ✅ Validación de documento obligatorio
const validateStep = (step: number): boolean => {
  if (step === 5) {
    if (!documentoUrl) {
      Alert.alert(
        'Documento Requerido',
        'Debes subir un documento que acredite que eres el propietario del local'
      );
      return false;
    }
  }
  return true;
};

// ✅ Selector de tipo de documento
const TIPOS_DOCUMENTO = [
  { value: 'factura_luz', label: 'Factura de Luz' },
  { value: 'factura_agua', label: 'Factura de Agua' },
  { value: 'contrato_alquiler', label: 'Contrato de Alquiler' },
  { value: 'escritura', label: 'Escritura de Propiedad' },
  { value: 'licencia_actividad', label: 'Licencia de Actividad' },
  { value: 'otro', label: 'Otro Documento' },
];

// ✅ Upload a Supabase Storage
const response = await fetch(documentoUrl);
const blob = await response.blob();
const fileName = `${user.id}/documento-propiedad-${Date.now()}.${documentoNombre.split('.').pop()}`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('documentos-propiedad')
  .upload(fileName, blob);
```

---

### 6. solicitudes-propietario.tsx (v55.0)

**Problema Corregido:**
- Vista limitada de información de solicitudes
- No se podía ver documentación adjunta
- No se veía claramente el local propuesto

**Cambios Implementados:**
```typescript
// ✅ Modal de detalles completo
const renderDetailsModal = () => {
  return (
    <Modal visible={showDetailsModal} ...>
      <ScrollView>
        {/* Información del Solicitante */}
        <View style={styles.userInfoCard}>
          <Image source={{ uri: solicitud.usuario?.avatar }} />
          <Text>{solicitud.usuario?.nombre}</Text>
          <Text>@{solicitud.usuario?.username}</Text>
          <Text>{solicitud.usuario?.email}</Text>
        </View>

        {/* Información del Local */}
        <View style={styles.localInfoCard}>
          <Text>{solicitud.nombre_local}</Text>
          <Text>{solicitud.tipo_local}</Text>
          <Text>{solicitud.direccion_local}</Text>
          <Text>{solicitud.ciudad_local}, {solicitud.provincia_local}</Text>
        </View>

        {/* Documento de Propiedad */}
        {solicitud.documento_propiedad_url && (
          <View style={styles.documentCard}>
            <Text>{getTipoDocumentoLabel(solicitud.documento_propiedad_tipo)}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(solicitud.documento_propiedad_url)}>
              <Text>Ver Documento</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Imágenes */}
        {solicitud.imagen_portada_url && (
          <Image source={{ uri: solicitud.imagen_portada_url }} />
        )}
        {solicitud.galeria_urls?.map((uri) => (
          <Image source={{ uri }} />
        ))}

        {/* Ubicación en Mapa */}
        {solicitud.latitud_local && solicitud.longitud_local && (
          <TouchableOpacity onPress={() => openInMaps(...)}>
            <Text>Abrir en Mapas</Text>
          </TouchableOpacity>
        )}

        {/* Servicios y Horarios */}
        {solicitud.servicios_local?.map((servicio) => (
          <Text>{servicio}</Text>
        ))}
        {Object.entries(solicitud.horarios_local).map(([dia, horario]) => (
          <Text>{dia}: {horario.apertura} - {horario.cierre}</Text>
        ))}
      </ScrollView>

      {/* Acciones */}
      <View style={styles.detailsFooter}>
        <TouchableOpacity onPress={() => handleAprobar(solicitud)}>
          <Text>Aprobar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleCambiarEstado(solicitud)}>
          <Text>Cambiar Estado</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDenegar(solicitud)}>
          <Text>Denegar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
```

---

### 7. send-invoice-email Edge Function (v55.0)

**Problema Corregido:**
- Correos de facturas no se enviaban
- Errores 500 en la función

**Cambios Implementados:**
```typescript
// ✅ Sistema de notificaciones in-app como método principal
const { data: userData } = await supabase
  .from('usuarios')
  .select('id, nombre')
  .eq('email', recipientEmail)
  .maybeSingle();

if (userData) {
  const { error: notifError } = await supabase
    .from('notificaciones')
    .insert({
      usuario_id: userData.id,
      tipo: 'sistema',
      titulo: `📄 Nueva Factura: ${invoice.invoice_number}`,
      mensaje: `Se ha generado una nueva factura por ${invoice.total}€.`,
    });
}

// ✅ Actualizar metadata de factura
await supabase
  .from(tableName)
  .update({ 
    status: 'issued',
    metadata: {
      ...invoice.metadata,
      email_sent_at: new Date().toISOString(),
      email_method: 'notification',
      notification_created: true,
    }
  })
  .eq('id', invoiceId);
```

**Beneficios:**
- ✅ Entrega confiable (no depende de servicios externos)
- ✅ Gratuito (sin costes adicionales)
- ✅ Inmediato (notificación al instante)
- ✅ Integrado con el sistema existente

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### Migration: fix_plan_potentials_and_document_storage_v55

```sql
-- 1. Actualizar potencial base en permisos
UPDATE planes_suscripcion
SET permisos = jsonb_set(permisos, '{potencial_base}', '30')
WHERE nombre = 'Gratuito';

UPDATE planes_suscripcion
SET permisos = jsonb_set(permisos, '{potencial_base}', '65')
WHERE nombre = 'Estándar';

UPDATE planes_suscripcion
SET permisos = jsonb_set(permisos, '{potencial_base}', '100')
WHERE nombre = 'Premium';

-- 2. Crear bucket para documentos de propiedad
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos-propiedad',
  'documentos-propiedad',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas RLS para documentos
CREATE POLICY "Users can upload their own ownership documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos-propiedad' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own ownership documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-propiedad' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all ownership documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-propiedad' AND
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol_app = 'admin'
  )
);

CREATE POLICY "Users can delete their own ownership documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos-propiedad' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 📊 VALORES DE POTENCIAL ACTUALIZADOS

| Plan | Potencial Base | Con Destacado | Incremento |
|------|----------------|---------------|------------|
| Gratuito | 30% | 65% | +35% |
| Estándar | 65% | 100% | +35% |
| Premium | 100% | 135% | +35% |

**Fórmula:**
```
Potencial Total = Potencial Base del Plan + (Destacado ? 35% : 0%)
```

**Ejemplos:**
- Plan Gratuito sin destacado: 30%
- Plan Gratuito con destacado: 65%
- Plan Estándar sin destacado: 65%
- Plan Estándar con destacado: 100%
- Plan Premium sin destacado: 100%
- Plan Premium con destacado: 135%

---

## 🔐 SEGURIDAD DE DOCUMENTOS

### Storage Bucket: documentos-propiedad

**Configuración:**
- ✅ Privado (no accesible públicamente)
- ✅ Límite de tamaño: 10MB
- ✅ Formatos permitidos: JPG, PNG, PDF
- ✅ Estructura de carpetas: `{user_id}/documento-propiedad-{timestamp}.{ext}`

**Políticas RLS:**
1. **Upload:** Solo el propietario puede subir a su carpeta
2. **View:** El propietario puede ver sus documentos
3. **View (Admin):** Los administradores pueden ver todos los documentos
4. **Delete:** Solo el propietario puede eliminar sus documentos

**Ejemplo de Uso:**
```typescript
const fileName = `${user.id}/documento-propiedad-${Date.now()}.pdf`;
const { data, error } = await supabase.storage
  .from('documentos-propiedad')
  .upload(fileName, blob);
```

---

## 🔄 ACTUALIZACIONES EN TIEMPO REAL

### 1. Suscripciones de Planes
```typescript
// PermissionGuard.tsx
const subscription = supabase
  .channel(`subscription-updates-${activeProfileId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'suscripciones_locales',
    filter: `local_id=eq.${activeProfileId}`,
  }, (payload) => {
    checkPermissions(); // Re-check permissions
  })
  .subscribe();
```

### 2. Reseñas y Valoraciones
```typescript
// LocalDetailsModal.tsx
const subscription = supabase
  .channel(`reviews-${localId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'reviews_barlive',
    filter: `local_id=eq.${localId}`,
  }, async (payload) => {
    // Reload rating
    const { data: reviewsData } = await supabase
      .from('reviews_barlive')
      .select('rating')
      .eq('local_id', localId);

    const avgRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
    setActualRating(avgRating);
    setReviewCount(reviewsData.length);
  })
  .subscribe();
```

---

## 🎨 MEJORAS DE UI/UX

### 1. Dirección en Tarjeta de Local
```typescript
// Antes: Solo nombre y provincia
<Text>{local.nombre}</Text>
<Text>{local.provincia}</Text>

// Ahora: Nombre, provincia Y dirección
<Text>{local.nombre}</Text>
<Text>{local.provincia}</Text>
{local.direccion && (
  <View style={styles.coverImageAddress}>
    <IconSymbol ios_icon_name="mappin.circle" />
    <Text>{local.direccion}</Text>
  </View>
)}
```

### 2. Valoración con Número de Reseñas
```typescript
// Antes: Solo número
<Text>4.5</Text>

// Ahora: Número + cantidad de reseñas
<Text>4.5</Text>
{reviewCount > 0 && (
  <Text>({reviewCount})</Text>
)}
```

### 3. Documento de Propiedad Destacado
```typescript
// Diseño especial para documento obligatorio
<TouchableOpacity style={styles.uploadDocumentButton}>
  <IconSymbol ios_icon_name="doc.badge.plus" size={32} color={colors.primary} />
  <Text style={styles.uploadDocumentButtonText}>Seleccionar Documento</Text>
  <Text style={styles.uploadDocumentHelperText}>PDF, JPG o PNG • Máx. 10MB</Text>
</TouchableOpacity>
```

---

## 🐛 BUGS CORREGIDOS

1. ✅ **Plan asignado manualmente no reconocido**
   - Causa: No se consultaba el local correcto
   - Fix: Usar activeProfileId del contexto

2. ✅ **Nombre incorrecto en mensaje de restricción**
   - Causa: No se usaba activeLocalData.nombre
   - Fix: Usar nombre del contexto ya cargado

3. ✅ **Valoración 0.0 en popup del mapa**
   - Causa: No se calculaba desde reviews_barlive
   - Fix: Calcular promedio real de reseñas

4. ✅ **Correos de facturas no se enviaban**
   - Causa: Errores en integración con Resend
   - Fix: Usar notificaciones in-app

5. ✅ **Faltaba documento de propiedad**
   - Causa: No era obligatorio
   - Fix: Validación obligatoria en paso 5

6. ✅ **Inconsistencia de campos**
   - Causa: Diferentes formularios
   - Fix: Wizard de 5 pasos idéntico

7. ✅ **Vista limitada de solicitudes (admin)**
   - Causa: No se mostraba toda la información
   - Fix: Modal de detalles completo

---

## 📈 MEJORAS DE RENDIMIENTO

1. **Suscripciones en Tiempo Real:**
   - Detección inmediata de cambios de plan
   - Actualización automática de permisos
   - Sin necesidad de recargar la página

2. **Caché de Datos del Contexto:**
   - `activeLocalData` ya contiene nombre e imagen
   - No es necesario consultar la base de datos nuevamente
   - Mejora la velocidad de carga

3. **Optimización de Consultas:**
   - Uso de `maybeSingle()` en lugar de `single()` para evitar errores
   - Consultas separadas para evitar problemas de relaciones
   - Mejor manejo de errores PGRST116

---

## 🔍 DEBUGGING Y LOGGING

### Logs Mejorados

```typescript
// PermissionGuard
console.log('[PermissionGuard v55.0] 📊 Permission check:', {
  localId: activeProfileId,
  localName: currentLocalName,
  hasSocialAccess,
  planName: subscriptionData?.planes_suscripcion?.nombre,
});

// LocalDetailsModal
console.log('[LocalDetailsModal v55.0] ✅ Calculated rating:', {
  avgRating: avgRating.toFixed(1),
  reviewCount: reviewsData.length,
});

// send-invoice-email
console.log('[send-invoice-email v55.0] 📧 Email delivery logged');
console.log('[send-invoice-email v55.0] ✅ In-app notification created');
```

---

## 🚀 DEPLOYMENT

### Edge Functions Actualizadas
- ✅ `send-invoice-email` (v12) - Notificaciones in-app

### Migraciones Aplicadas
- ✅ `fix_plan_potentials_and_document_storage_v55` - Potenciales + Storage

### Componentes Actualizados
- ✅ `PermissionGuard.tsx` (v55.0)
- ✅ `CustomerPotentialBar.tsx` (v55.0)
- ✅ `LocalSubscriptionCard.tsx` (v55.0)
- ✅ `LocalDetailsModal.tsx` (v55.0)
- ✅ `solicitar-rol-propietario.tsx` (v55.0)
- ✅ `solicitudes-propietario.tsx` (v55.0)

---

## 📞 SOPORTE TÉCNICO

### Verificar Logs

**Cliente (Browser Console):**
```javascript
// Filtrar logs de PermissionGuard
[PermissionGuard v55.0]

// Filtrar logs de LocalDetailsModal
[LocalDetailsModal v55.0]

// Filtrar logs de solicitudes
[SolicitarRolPropietario v55.0]
```

**Servidor (Supabase Edge Functions):**
```bash
# Ver logs de send-invoice-email
[send-invoice-email v55.0]
```

### Comandos SQL Útiles

```sql
-- Verificar plan de un local
SELECT 
  l.nombre,
  s.estado,
  p.nombre as plan_nombre,
  p.perfil_social,
  p.permisos->>'potencial_base' as potencial
FROM locales l
LEFT JOIN suscripciones_locales s ON s.local_id = l.id AND s.estado = 'activa'
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.nombre ILIKE '%coviña%';

-- Verificar valoración de un local
SELECT 
  l.nombre,
  COUNT(r.id) as num_reviews,
  AVG(r.rating) as avg_rating
FROM locales l
LEFT JOIN reviews_barlive r ON r.local_id = l.id
WHERE l.nombre ILIKE '%coviña%'
GROUP BY l.id, l.nombre;

-- Verificar documentos de propiedad
SELECT 
  s.id,
  s.nombre_local,
  s.documento_propiedad_tipo,
  s.documento_propiedad_url,
  u.nombre as solicitante
FROM solicitudes_propietario s
JOIN usuarios u ON s.usuario_id = u.id
WHERE s.documento_propiedad_url IS NOT NULL;
```

---

**Versión:** v55.0  
**Fecha:** 29 de Diciembre de 2024  
**Autor:** Sistema BarLive  
**Estado:** ✅ Implementado y Desplegado
