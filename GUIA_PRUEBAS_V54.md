
# 🧪 Guía de Pruebas v54.0

## 📋 Checklist de Verificación

### ✅ 1. Plan de @jorge - Sincronización Correcta

**Usuario de prueba:** @jorge (jorgepereznoyagh@gmail.com)

**Pasos:**
1. Iniciar sesión como @jorge
2. Cambiar a modo "Propietario"
3. Seleccionar "Bar A Coviña" (tiene plan Estándar activo)
4. Ir a la pestaña "Social"

**Resultado esperado:**
- ✅ Debe tener acceso a la red social
- ✅ NO debe mostrar mensaje de "Acceso Restringido"
- ✅ Si aparece restricción, debe decir "Bar A Coviña", NO "Pub Momo"

**Si falla:**
```sql
-- Verificar plan activo
SELECT 
  l.nombre,
  p.nombre as plan,
  p.perfil_social,
  s.estado
FROM locales l
JOIN suscripciones_locales s ON s.local_id = l.id
JOIN planes_suscripcion p ON p.id = s.plan_id
WHERE l.nombre = 'Bar A Coviña';
```

---

### ✅ 2. Potencial de Planes - Nuevos Porcentajes

**Pasos:**
1. Como propietario, ir a "Gestión de Locales"
2. Ver la tarjeta de cada local
3. Verificar la barra de "Potencial de clientes alcanzado"

**Resultado esperado:**

| Plan | Sin Destacado | Con Destacado |
|------|---------------|---------------|
| Gratuito | 30% | 65% |
| Estándar | 65% | 100% |
| Premium | 100% | 135% |

**Verificación visual:**
- ✅ Plan Gratuito muestra "30% base"
- ✅ Plan Estándar muestra "65% base"
- ✅ Plan Premium muestra "100% base"
- ✅ Destacado activo muestra "+35%"

---

### ✅ 3. Envío de Facturas - Email Real

**Pasos:**
1. Como admin, ir a "Admin > Facturación"
2. Crear una factura de prueba
3. Introducir tu email personal
4. Enviar factura de prueba

**Resultado esperado:**
- ✅ Debe mostrar mensaje de éxito
- ✅ El email debe llegar a tu bandeja de entrada
- ✅ El email debe tener formato profesional
- ✅ Debe incluir todos los datos de la factura
- ✅ Debe tener botón "Ver Factura Completa"

**Si no llega el email:**
1. Verificar que `RESEND_API_KEY` está configurada en Edge Functions
2. Verificar logs de la función:
```bash
# En Supabase Dashboard > Edge Functions > send-invoice-email > Logs
```
3. Verificar que el dominio está verificado en Resend

---

### ✅ 4. Valoración en Popup del Mapa

**Pasos:**
1. Ir a "Explorar > Mapa"
2. Buscar un local que tenga reseñas (ej: "Cafetería Regos Bar")
3. Tocar el marcador del local
4. Ver el popup que se abre

**Resultado esperado:**
- ✅ La valoración debe mostrar el promedio real (ej: 4.5)
- ✅ Debe mostrar el número de reseñas (ej: "(2)")
- ✅ NO debe mostrar "0.0" si hay reseñas

**Verificación SQL:**
```sql
-- Ver reseñas de un local
SELECT 
  l.nombre,
  AVG(r.rating) as promedio,
  COUNT(r.id) as num_reseñas
FROM locales l
LEFT JOIN reviews_barlive r ON r.local_id = l.id
WHERE l.nombre ILIKE '%regos%'
GROUP BY l.id, l.nombre;
```

---

### ✅ 5. Solicitud de Propietario - Documento Obligatorio

**Pasos:**
1. Como usuario nuevo (sin rol propietario)
2. Ir a "Solicitar Rol de Propietario"
3. Seleccionar "Crear Nuevo Local"
4. Completar wizard:
   - **Paso 1:** Nombre y tipo ✅
   - **Paso 2:** Dirección y mapa ✅
   - **Paso 3:** Servicios
   - **Paso 4:** Horarios
   - **Paso 5:** Imágenes + **DOCUMENTO**

**Resultado esperado:**
- ✅ Paso 1: No permite continuar sin nombre y tipo
- ✅ Paso 2: No permite continuar sin dirección completa y ubicación en mapa
- ✅ Paso 5: **NO permite enviar sin documento de propiedad**
- ✅ Debe mostrar selector de tipo de documento
- ✅ Debe permitir subir PDF, JPG o PNG
- ✅ Debe mostrar preview del documento seleccionado
- ✅ Al enviar, debe subir documento a storage
- ✅ Solicitud debe crearse con todos los datos

**Tipos de documento disponibles:**
- Factura de Luz
- Factura de Agua
- Contrato de Alquiler
- Escritura de Propiedad
- Licencia de Actividad
- Otro Documento

---

### ✅ 6. Vista de Admin - Información Completa

**Pasos:**
1. Como admin, ir a "Admin > Solicitudes de Propietario"
2. Tocar una solicitud que tenga documento e imágenes
3. Ver el modal de detalles

**Resultado esperado:**
- ✅ Sección "Solicitante" con avatar, nombre, username, email
- ✅ Sección "Nuevo Local Propuesto" con todos los datos
- ✅ Sección "Documento de Propiedad" con:
  - Tipo de documento
  - Botón "Ver Documento" que abre el archivo
- ✅ Sección "Imágenes del Local" con:
  - Preview de portada
  - Galería scrollable
- ✅ Sección "Ubicación en el Mapa" con:
  - Coordenadas GPS
  - Botón "Abrir en Mapas"
- ✅ Sección "Servicios" con chips de servicios
- ✅ Sección "Horarios" con tabla completa
- ✅ Footer con botones: Aprobar, Cambiar Estado, Denegar

**Acciones disponibles:**
- ✅ Tocar teléfono → Abre marcador
- ✅ Tocar email → Abre cliente de email
- ✅ Tocar "Ver Documento" → Abre documento en navegador
- ✅ Tocar "Abrir en Mapas" → Abre Google Maps / Apple Maps

---

## 🐛 Problemas Conocidos y Soluciones

### Problema: Email de factura no llega

**Solución:**
1. Verificar configuración de Resend:
```bash
# En Supabase Dashboard:
Settings > Edge Functions > Environment Variables
Verificar que existe: RESEND_API_KEY
```

2. Verificar dominio en Resend:
```bash
# En Resend Dashboard:
Domains > barlive.app
Estado: Verified ✅
```

3. Ver logs de la función:
```bash
# En Supabase Dashboard:
Edge Functions > send-invoice-email > Logs
Buscar errores de Resend API
```

---

### Problema: Documento no se sube

**Solución:**
1. Verificar que el bucket existe:
```sql
SELECT * FROM storage.buckets WHERE name = 'documentos-propiedad';
```

2. Verificar RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%ownership%';
```

3. Verificar permisos del usuario:
```sql
-- El usuario debe estar autenticado
SELECT auth.uid();
```

---

### Problema: Mapa no carga en solicitud

**Solución:**
1. Verificar conexión a internet
2. Verificar que WebView está habilitado
3. Verificar logs de consola:
```javascript
console.log('[SolicitarRolPropietario] WebView message:', data);
```

---

## 📊 Métricas de Éxito

### Antes de v54.0
- ❌ @jorge no podía acceder a red social con plan Estándar
- ❌ Potencial de planes: 20% / 35% / 50%
- ❌ Emails de facturas no se enviaban
- ❌ Valoración en mapa mostraba 0.0
- ❌ Solicitud de propietario sin campos obligatorios
- ❌ Sin documento de propiedad requerido
- ❌ Admin no podía ver información completa

### Después de v54.0
- ✅ @jorge tiene acceso correcto con plan Estándar
- ✅ Potencial de planes: 30% / 65% / 100%
- ✅ Emails de facturas se envían correctamente
- ✅ Valoración en mapa muestra promedio real
- ✅ Solicitud con campos obligatorios
- ✅ Documento de propiedad OBLIGATORIO
- ✅ Admin ve toda la información y documentos

---

## 🎯 Casos de Uso Principales

### Caso 1: Propietario con Plan Asignado Manualmente
```
Usuario: @jorge
Local: Bar A Coviña
Plan: Estándar (asignado por admin)

Flujo:
1. Cambiar a modo Propietario
2. Seleccionar "Bar A Coviña"
3. Acceder a red social
4. ✅ Acceso concedido
5. ✅ Puede publicar contenido
6. ✅ Potencial: 65% (sin destacado)
```

### Caso 2: Nuevo Propietario Solicitando Local
```
Usuario: Nuevo usuario
Acción: Crear nuevo local

Flujo:
1. Ir a "Solicitar Rol de Propietario"
2. Completar 5 pasos del wizard
3. Subir documento de propiedad (OBLIGATORIO)
4. Subir imágenes del local
5. Enviar solicitud
6. ✅ Solicitud creada con todos los datos
7. ✅ Admin recibe notificación
8. ✅ Admin puede ver toda la información
```

### Caso 3: Admin Revisando Solicitud
```
Usuario: Admin
Acción: Revisar solicitud de propietario

Flujo:
1. Ir a "Admin > Solicitudes de Propietario"
2. Tocar solicitud pendiente
3. Ver modal con detalles completos
4. Revisar documento de propiedad
5. Ver imágenes del local
6. Ver ubicación en mapa
7. Aprobar o denegar
8. ✅ Usuario recibe notificación
9. ✅ Si aprobado, se crea el local
```

---

## 📧 Contacto

Para reportar problemas o sugerencias:
- Email: soporte@barlive.app
- En la app: Admin > Soporte y Ayuda
