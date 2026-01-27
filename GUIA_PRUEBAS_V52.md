
# 🧪 Guía de Pruebas - Versión 52.0

## 📋 Resumen de Cambios

Esta versión incluye las siguientes correcciones críticas:

1. ✅ **Grosor del borde neón reducido a la mitad** (de 4px a 2px)
2. ✅ **Visibilidad correcta de botones para propietarios en modo cliente**
3. ✅ **Botón "Cancelar plan" eliminado de planes gratuitos** (ya estaba corregido en v51.0)
4. ✅ **Error de asignación manual de planes corregido** (campo "destacado" eliminado)
5. ✅ **Sistema de envío de emails de facturas corregido** (usa sistema nativo de Supabase)

---

## 🎨 Prueba 1: Grosor del Borde Neón

### Objetivo
Verificar que el borde verde neón de los avatares de Momentos tiene la mitad del grosor anterior.

### Pasos
1. Inicia sesión en la app
2. Sube un Momento desde tu perfil (o pide a otro usuario que suba uno)
3. Ve a la página **Social**
4. Observa el avatar con el borde verde neón

### Resultado Esperado
- ✅ El borde verde neón es **más fino** que antes (2px en lugar de 4px)
- ✅ El borde sigue siendo **claramente visible**
- ✅ La estética del avatar es **más limpia y profesional**
- ✅ La imagen del perfil **NO cubre el borde**

### Verificación Técnica
```typescript
// En UnifiedMomentoAvatar.tsx
const BORDER_WIDTH = 2; // Reducido de 4 a 2
```

---

## 🎭 Prueba 2: Visibilidad de Botones para Propietarios en Modo Cliente

### Objetivo
Verificar que los propietarios pueden ver y usar los botones "Estoy en este local" y "Sala Virtual" cuando están en modo cliente.

### Escenario A: Propietario SIN Perfil de Local Seleccionado

#### Pasos
1. Inicia sesión como **propietario** de un local
2. Asegúrate de estar en **modo cliente** (no selecciones un perfil de local)
3. Abre la página de detalle de **cualquier local**
4. Verifica que el local esté **abierto**

#### Resultado Esperado
- ✅ El botón **"Estoy en este local"** está **VISIBLE**
- ✅ El botón **"Sala Virtual"** está **VISIBLE**
- ✅ Puedes hacer clic en ambos botones
- ✅ Las funciones funcionan correctamente

### Escenario B: Propietario CON Perfil de Local Seleccionado

#### Pasos
1. Inicia sesión como **propietario** de un local
2. Selecciona un **perfil de local** (cambia a modo propietario)
3. Abre la página de detalle de **cualquier local**
4. Verifica que el local esté **abierto**

#### Resultado Esperado
- ✅ El botón **"Estoy en este local"** está **OCULTO**
- ✅ El botón **"Sala Virtual"** está **OCULTO**
- ✅ Esto es correcto: los perfiles de local no pueden hacer check-in

### Escenario C: Usuario Normal (No Propietario)

#### Pasos
1. Inicia sesión como **usuario normal** (no propietario)
2. Abre la página de detalle de **cualquier local**
3. Verifica que el local esté **abierto**

#### Resultado Esperado
- ✅ El botón **"Estoy en este local"** está **VISIBLE**
- ✅ El botón **"Sala Virtual"** está **VISIBLE**
- ✅ Puedes hacer clic en ambos botones
- ✅ Las funciones funcionan correctamente

### Verificación Técnica
```typescript
// En app/detalle/local.tsx
const isClientMode = currentMode === 'cliente' || activeProfileType === 'cliente';

// Los botones se muestran cuando isClientMode === true
{user && isOpen && isClientMode && (
  <View style={styles.checkInButtonsContainer}>
    {/* Botón "Estoy en este local" */}
  </View>
)}

{isOpen && isClientMode && (
  <TouchableOpacity onPress={handleVirtualRoom}>
    {/* Botón "Sala Virtual" */}
  </TouchableOpacity>
)}
```

---

## 🚫 Prueba 3: Botón "Cancelar Plan" en Plan Gratuito

### Objetivo
Verificar que el botón "Cancelar plan" NO aparece en planes gratuitos.

### Escenario A: Plan Gratuito

#### Pasos
1. Inicia sesión como **propietario** de un local
2. Ve a **Gestión** → **Planes de Suscripción**
3. Verifica que tu local tiene el **plan gratuito** activo

#### Resultado Esperado
- ✅ **NO hay** botón "Cancelar plan"
- ✅ Solo se muestran los otros planes disponibles
- ✅ Puedes cambiar a un plan de pago si lo deseas

### Escenario B: Plan de Pago

#### Pasos
1. Inicia sesión como **propietario** de un local
2. Ve a **Gestión** → **Planes de Suscripción**
3. Verifica que tu local tiene un **plan de pago** activo (Estándar o Premium)

#### Resultado Esperado
- ✅ **SÍ hay** botón "Cancelar plan"
- ✅ El botón tiene un **color gris discreto** (no rojo)
- ✅ Al hacer clic, muestra una confirmación
- ✅ La cancelación se programa para el final del período

### Verificación Técnica
```typescript
// En app/gestion/planes-suscripcion.tsx
const isFreePlan = (nombre: string): boolean => {
  return nombre.toLowerCase() === 'free' || 
         nombre.toLowerCase() === 'basico' || 
         nombre.toLowerCase() === 'básico';
};

// Solo se muestra si NO es plan gratuito
{isActive && !isFreePlan(currentPlanName) && !isCancelPending && (
  <TouchableOpacity style={styles.cancelPlanButton}>
    {/* Botón con color gris discreto */}
  </TouchableOpacity>
)}
```

---

## 🔧 Prueba 4: Asignación Manual de Planes (Admin)

### Objetivo
Verificar que la asignación manual de planes desde el panel de administración funciona sin errores.

### Pasos
1. Inicia sesión como **administrador**
2. Ve a **Admin** → **Gestionar Planes** → **Asignar**
3. Haz clic en **"Asignar Nuevo Plan"**
4. Busca un local (escribe al menos 2 caracteres)
5. Selecciona un local de los resultados
6. Selecciona un plan (Free, Estándar o Premium)
7. Haz clic en **"Asignar Plan"**

### Resultado Esperado
- ✅ **NO hay errores** en la consola
- ✅ **NO aparece** el error: `record "new" has no field "destacado"`
- ✅ Se muestra el mensaje: **"Plan asignado correctamente"**
- ✅ La suscripción se crea en la base de datos
- ✅ El perfil del local se activa automáticamente

### Verificación en Base de Datos
```sql
-- Verifica que la suscripción se creó correctamente
SELECT 
  sl.id,
  sl.local_id,
  sl.plan_id,
  sl.estado,
  sl.creditos_destacados_restantes,
  sl.creditos_eventos_restantes,
  l.nombre as local_nombre,
  p.nombre as plan_nombre
FROM suscripciones_locales sl
JOIN locales l ON l.id = sl.local_id
JOIN planes_suscripcion p ON p.id = sl.plan_id
WHERE sl.estado = 'activa'
ORDER BY sl.fecha_inicio DESC
LIMIT 10;
```

### Verificación Técnica
```typescript
// En app/admin/gestionar-planes.tsx
// ✅ CRITICAL FIX v52.0: NO incluye el campo "destacado"
const { error: subscriptionError } = await supabase
  .from('suscripciones_locales')
  .insert({
    local_id: selectedLocal.id,
    plan_id: selectedPlan,
    usuario_id: user?.id,
    propietario_id: selectedLocal.propietario_id || user?.id,
    estado: 'activa',
    fecha_inicio: fechaInicio.toISOString(),
    fecha_proximo_pago: nextMonth.toISOString(),
    fecha_renovacion_creditos: nextMonth.toISOString(),
    creditos_destacados_restantes: selectedPlanData.promos_destacadas || 0,
    creditos_eventos_restantes: selectedPlanData.eventos_mes || 0,
    eventos_usados_mes: 0,
    promos_usadas_mes: 0,
    ultimo_reset_contador: fechaInicio.toISOString(),
    // ✅ REMOVED: destacado field (doesn't exist in table)
  });
```

---

## 📧 Prueba 5: Envío de Emails de Facturas

### Objetivo
Verificar que el sistema de envío de emails de facturas funciona correctamente sin errores 403.

### Preparación
1. Inicia sesión como **administrador**
2. Ve a **Admin** → **Facturación** → **Configuración**
3. Haz clic en **"Editar"**
4. Completa los datos fiscales obligatorios:
   - Nombre de la Empresa
   - CIF/NIF
   - Dirección
   - Ciudad
   - Código Postal

### Prueba A: Email de Prueba

#### Pasos
1. Ve a **Admin** → **Facturación** → **Configuración**
2. En la sección **"Enviar Factura de Prueba"**
3. Ingresa tu **email personal**
4. Haz clic en **"Enviar Prueba"**

#### Resultado Esperado
- ✅ **NO hay errores** en la consola
- ✅ **NO aparece** el error: `Resend API error (403): Not authorized to send emails from barlive.es`
- ✅ Se muestra el mensaje: **"Email de Prueba Enviado"**
- ✅ Recibes un email en tu bandeja de entrada
- ✅ El email tiene un diseño profesional

### Prueba B: Email de Factura Real

#### Pasos
1. Ve a **Admin** → **Facturación** → **Manuales**
2. Haz clic en **"Nueva Factura"**
3. Completa los datos del cliente:
   - Nombre del Cliente
   - Email del Cliente
4. Añade al menos un producto/servicio:
   - Concepto: "Suscripción Premium - Enero 2025"
   - Precio: 50.00
5. Haz clic en **"Crear Factura"**
6. Cuando aparezca el diálogo, haz clic en **"Enviar Email"**

#### Resultado Esperado
- ✅ **NO hay errores** en la consola
- ✅ **NO aparece** el error: `Resend API error (403)`
- ✅ Se muestra el mensaje: **"Email Enviado"**
- ✅ El cliente recibe el email con la factura
- ✅ El email tiene un diseño profesional

### Verificación Técnica
```typescript
// En supabase/functions/send-invoice-email/index.ts
// ✅ CRITICAL FIX v52.0: Usa el sistema nativo de Supabase

// Para usuarios en el sistema de autenticación:
await supabase.auth.resetPasswordForEmail(recipientEmail, {
  redirectTo: invoiceUrl,
});

// Para usuarios que no están en el sistema:
await supabase.auth.signInWithOtp({
  email: recipientEmail,
  options: {
    emailRedirectTo: invoiceUrl,
    data: {
      invoice_number: invoice.invoice_number,
      invoice_total: invoice.total,
      is_invoice_email: true,
    },
  },
});
```

---

## 🔍 Verificación de Logs

### Logs Esperados en la Consola

#### Para Grosor del Borde Neón
```
[UnifiedMomentoAvatar v52.0] 🔍 Checking momentos for: { userId: '...', localId: null }
[UnifiedMomentoAvatar v52.0] ✅ Found momentos: 1
[UnifiedMomentoAvatar v52.0] 🎯 Result: { totalMomentos: 1, viewedCount: 0, hasUnviewed: true }
```

#### Para Visibilidad de Botones
```
[DetalleLocal v52.0] 🎭 Mode check: {
  currentMode: 'cliente',
  activeProfileType: 'cliente',
  isClientMode: true,
  isOwnerOfLocal: true,
  shouldShowButtons: true
}
```

#### Para Asignación de Planes
```
[GestionarPlanes] ✅ Cargando planes...
[GestionarPlanes] ✅ Planes cargados: 3
[GestionarPlanes] ✅ Locales encontrados: 5
```

#### Para Envío de Emails
```
[send-invoice-email v52.0] 📧 Starting invoice email send...
[send-invoice-email v52.0] ✅ Using Supabase Native Email System (same as verification emails)
[send-invoice-email v52.0] ✅ Fiscal data loaded
[send-invoice-email v52.0] ✅ Invoice loaded: BL000001
[send-invoice-email v52.0] 🚀 Using Supabase native email system...
[send-invoice-email v52.0] ✅ Invoice email sent successfully
```

---

## ❌ Errores que YA NO Deberían Aparecer

### Error 1: Campo "destacado" no existe
```
❌ ANTES:
[GestionarPlanesV7] Error creando suscripción:
{"code":"42703","details":null,"hint":null,"message":"record \"new\" has no field \"destacado\""}

✅ AHORA:
Este error ya no debería aparecer. La suscripción se crea correctamente.
```

### Error 2: Resend API error (403)
```
❌ ANTES:
[Facturacion] Error enviando email de prueba: Error: Resend API error (403): Not authorized to send emails from barlive.es

✅ AHORA:
Este error ya no debería aparecer. Los emails se envían usando el sistema nativo de Supabase.
```

---

## 🎯 Casos de Uso Específicos

### Caso 1: Propietario con Múltiples Locales

#### Situación
Un propietario tiene 3 locales registrados.

#### Comportamiento Esperado
1. **Modo Cliente (sin perfil seleccionado):**
   - ✅ Ve los botones "Estoy en este local" y "Sala Virtual"
   - ✅ Puede hacer check-in como cliente
   - ✅ Puede acceder a la Sala Virtual

2. **Modo Propietario (con perfil de local seleccionado):**
   - ✅ NO ve los botones "Estoy en este local" y "Sala Virtual"
   - ✅ Esto es correcto: está interactuando como el local, no como cliente

### Caso 2: Cambio de Plan

#### Situación
Un local quiere cambiar de plan gratuito a plan de pago.

#### Comportamiento Esperado
1. **Con Plan Gratuito:**
   - ✅ NO hay botón "Cancelar plan"
   - ✅ Puede seleccionar un plan de pago
   - ✅ El cambio se realiza inmediatamente

2. **Con Plan de Pago:**
   - ✅ SÍ hay botón "Cancelar plan" (color gris discreto)
   - ✅ Al cancelar, el plan sigue activo hasta el final del período
   - ✅ Después vuelve al plan gratuito automáticamente

### Caso 3: Facturación Manual

#### Situación
Un administrador necesita crear una factura personalizada.

#### Comportamiento Esperado
1. **Crear Factura:**
   - ✅ Completa los datos del cliente
   - ✅ Añade productos/servicios
   - ✅ El sistema calcula automáticamente IVA (21%) y total
   - ✅ La factura se crea sin errores

2. **Enviar Factura:**
   - ✅ Hace clic en "Enviar Email"
   - ✅ El email se envía usando el sistema nativo de Supabase
   - ✅ NO hay errores 403
   - ✅ El cliente recibe el email

---

## 📊 Checklist de Verificación

### Antes de Marcar como Completado

- [ ] El borde neón de los avatares es más fino (2px)
- [ ] Los propietarios en modo cliente VEN los botones
- [ ] Los propietarios con perfil de local NO VEN los botones
- [ ] El botón "Cancelar plan" NO aparece en planes gratuitos
- [ ] El botón "Cancelar plan" SÍ aparece en planes de pago (color gris)
- [ ] La asignación manual de planes funciona sin errores
- [ ] Los emails de facturas se envían sin errores 403
- [ ] Los emails de facturas tienen un diseño profesional

---

## 🐛 Solución de Problemas

### Problema: Los botones siguen ocultos para propietarios en modo cliente

**Solución:**
1. Verifica que estás en modo cliente (no has seleccionado un perfil de local)
2. Revisa los logs de la consola:
   ```
   [DetalleLocal v52.0] 🎭 Mode check: { currentMode: '...', activeProfileType: '...', isClientMode: ... }
   ```
3. Si `isClientMode` es `false`, cambia a modo cliente desde el selector de perfil

### Problema: El botón "Cancelar plan" sigue apareciendo en plan gratuito

**Solución:**
1. Verifica que el plan es realmente gratuito (precio_mensual = 0)
2. Revisa el nombre del plan en la base de datos
3. Asegúrate de que el nombre es "free", "basico" o "básico"

### Problema: Error al asignar plan manualmente

**Solución:**
1. Verifica que el local existe en la base de datos
2. Verifica que el plan existe y está activo
3. Revisa los logs de la consola para ver el error específico
4. Asegúrate de que el usuario tiene permisos de administrador

### Problema: Error al enviar email de factura

**Solución:**
1. Verifica que los datos fiscales están configurados
2. Verifica que el email del destinatario es válido
3. Revisa los logs de la Edge Function:
   ```
   [send-invoice-email v52.0] ✅ Using Supabase Native Email System
   ```
4. Si el error persiste, verifica que la Edge Function está desplegada (versión 8)

---

## 📞 Contacto y Soporte

Si encuentras algún problema:

1. **Revisa los logs de la consola** para identificar el error específico
2. **Verifica la versión** en los logs (debe ser v52.0)
3. **Comprueba los permisos** del usuario (admin, propietario, cliente)
4. **Revisa la configuración** (datos fiscales, planes activos, etc.)

---

**Versión:** v52.0  
**Fecha:** 2025  
**Estado:** ✅ Implementado y Listo para Pruebas  
**Edge Function:** send-invoice-email v8 (desplegada)
