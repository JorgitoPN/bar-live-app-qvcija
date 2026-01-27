
# 💳 CONFIGURACIÓN DE PASARELAS DE PAGO

## Estado Actual y Próximos Pasos

---

## ✅ LO QUE YA ESTÁ IMPLEMENTADO

### 1. Estructura de Base de Datos
- ✅ Tabla `shopping_cart` creada
- ✅ Tabla `planes_suscripcion` existente
- ✅ Tabla `suscripciones_locales` existente
- ✅ RLS policies configuradas
- ✅ Foreign keys y constraints

### 2. Interfaz de Usuario
- ✅ Icono de carrito en header (solo propietarios)
- ✅ Badge con contador de artículos
- ✅ Modal de carrito completo
- ✅ Cálculo de totales (subtotal + IVA 21%)
- ✅ Botón "Proceder al Pago"

### 3. Lógica de Negocio
- ✅ Añadir planes al carrito
- ✅ Eliminar planes del carrito
- ✅ Calcular total con IVA
- ✅ Validar permisos de suscripción

---

## ⚠️ LO QUE FALTA POR CONFIGURAR

### 1. Claves API de Stripe

**Necesitas obtener:**
- `STRIPE_SECRET_KEY` - Clave secreta de Stripe
- `STRIPE_PUBLISHABLE_KEY` - Clave pública de Stripe
- `STRIPE_WEBHOOK_SECRET` - Secreto para webhooks

**Dónde obtenerlas:**
1. Ir a [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Crear cuenta o iniciar sesión
3. Ir a "Developers" → "API keys"
4. Copiar las claves

**Dónde configurarlas:**
1. En Supabase Dashboard:
   - Ir a Project Settings → Edge Functions → Secrets
   - Añadir las 3 claves como secretos

2. En archivo `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

### 2. Productos en Stripe

**Crear productos para cada plan:**

#### Plan Básico (€9.99/mes)
```
Nombre: Plan Básico BarLive
Precio: €9.99/mes
Descripción: Ficha básica en el catálogo
```

#### Plan Estándar (€29.99/mes)
```
Nombre: Plan Estándar BarLive
Precio: €29.99/mes
Descripción: Perfil social + 2 eventos/mes + 1 destacado/mes
```

#### Plan Premium (€49.99/mes)
```
Nombre: Plan Premium BarLive
Precio: €49.99/mes
Descripción: Perfil social + 5 eventos/mes + 3 destacados/mes
```

**Pasos en Stripe:**
1. Ir a "Products" → "Add product"
2. Crear cada plan con su precio
3. Copiar el `price_id` de cada plan
4. Guardar en tabla `planes_suscripcion`:
   ```sql
   UPDATE planes_suscripcion
   SET stripe_price_id = 'price_...'
   WHERE nombre = 'basico';
   ```

---

### 3. Webhook Endpoint

**Crear endpoint para recibir eventos de Stripe:**

1. **URL del webhook:**
   ```
   https://[tu-proyecto].supabase.co/functions/v1/stripe-webhook
   ```

2. **Eventos a escuchar:**
   - `checkout.session.completed` - Pago completado
   - `customer.subscription.created` - Suscripción creada
   - `customer.subscription.updated` - Suscripción actualizada
   - `customer.subscription.deleted` - Suscripción cancelada
   - `invoice.payment_succeeded` - Pago exitoso
   - `invoice.payment_failed` - Pago fallido

3. **Configurar en Stripe:**
   - Ir a "Developers" → "Webhooks"
   - Click "Add endpoint"
   - Pegar URL del webhook
   - Seleccionar eventos
   - Copiar "Signing secret"

---

### 4. Edge Function para Stripe

**Crear:** `supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        // Manejar pago completado
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        // Manejar actualización de suscripción
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        // Manejar cancelación de suscripción
        await handleSubscriptionDeleted(event.data.object);
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 400 });
  }
});

async function handleCheckoutCompleted(session: any) {
  // Implementar lógica de activación de suscripción
  console.log('Checkout completed:', session);
}

async function handleSubscriptionUpdated(subscription: any) {
  // Implementar lógica de actualización
  console.log('Subscription updated:', subscription);
}

async function handleSubscriptionDeleted(subscription: any) {
  // Implementar lógica de cancelación
  console.log('Subscription deleted:', subscription);
}
```

---

### 5. Flujo de Pago en la App

**Actualizar:** `components/payment/ShoppingCart.tsx`

```typescript
const handleCartCheckout = async (items: CartItem[], total: number) => {
  try {
    // 1. Crear sesión de Stripe Checkout
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        items: items.map(item => ({
          plan_id: item.plan_id,
          local_id: item.local_id,
          quantity: item.quantity,
        })),
        success_url: 'https://barlive.app/pago/exito',
        cancel_url: 'https://barlive.app/pago/cancelado',
      },
    });

    if (error) throw error;

    // 2. Redirigir a Stripe Checkout
    if (data.url) {
      Linking.openURL(data.url);
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    Alert.alert('Error', 'No se pudo iniciar el proceso de pago');
  }
};
```

---

## 📋 CHECKLIST DE CONFIGURACIÓN

### Stripe Dashboard:
- [ ] Cuenta de Stripe creada
- [ ] Modo de prueba activado
- [ ] Productos creados (Básico, Estándar, Premium)
- [ ] Precios configurados
- [ ] Webhook endpoint añadido
- [ ] Eventos de webhook seleccionados

### Supabase:
- [ ] Claves de Stripe añadidas como secretos
- [ ] Edge Function `stripe-webhook` desplegada
- [ ] Edge Function `create-checkout-session` desplegada
- [ ] Tabla `stripe_customers` creada (opcional)
- [ ] Tabla `stripe_subscriptions` creada (opcional)

### App:
- [ ] Carrito funcional
- [ ] Botón de pago conectado
- [ ] Redirección a Stripe Checkout
- [ ] Manejo de éxito/cancelación
- [ ] Actualización de suscripciones

---

## 🧪 PRUEBAS DE PAGO

### Tarjetas de Prueba de Stripe:

**Pago exitoso:**
```
Número: 4242 4242 4242 4242
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

**Pago rechazado:**
```
Número: 4000 0000 0000 0002
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

**Requiere autenticación 3D Secure:**
```
Número: 4000 0025 0000 3155
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

---

## 🔄 FLUJO COMPLETO DE PAGO

### Paso a Paso:

1. **Usuario añade plan al carrito**
   - Plan guardado en `shopping_cart`
   - Badge actualizado

2. **Usuario hace checkout**
   - App llama a `create-checkout-session`
   - Edge Function crea sesión en Stripe
   - Usuario redirigido a Stripe Checkout

3. **Usuario completa pago en Stripe**
   - Stripe procesa pago
   - Stripe envía webhook a app

4. **Webhook recibido**
   - Edge Function `stripe-webhook` procesa evento
   - Crea/actualiza registro en `suscripciones_locales`
   - Estado cambia a 'activa'

5. **Trigger automático**
   - `trigger_auto_assign_username` se dispara
   - Username asignado al local
   - `perfil_visible` cambia a `true`

6. **Usuario ve confirmación**
   - Perfil del local ahora visible
   - Puede publicar en red social
   - Username disponible para menciones

---

## 💰 PRECIOS Y COMISIONES

### Stripe Fees (España):
- **Tarjetas europeas:** 1.5% + €0.25 por transacción
- **Tarjetas no europeas:** 2.9% + €0.25 por transacción
- **Suscripciones:** Sin costo adicional

### Ejemplo de Cálculo:
```
Plan Estándar: €29.99/mes
IVA (21%): €6.30
Total cliente: €36.29

Stripe fee: €0.79 (1.5% + €0.25)
Neto para BarLive: €35.50
```

---

## 🚀 DESPLIEGUE A PRODUCCIÓN

### Antes de activar pagos reales:

1. **Cambiar a modo producción en Stripe**
   - Usar claves de producción (no test)
   - Verificar webhook en producción

2. **Probar flujo completo**
   - Hacer pago de prueba
   - Verificar webhook recibido
   - Verificar suscripción activada
   - Verificar username asignado

3. **Configurar facturación**
   - Datos fiscales de la empresa
   - Dirección de facturación
   - NIF/CIF

4. **Cumplimiento legal**
   - Términos y condiciones actualizados
   - Política de privacidad
   - Política de reembolsos
   - Aviso legal

---

## 📞 SOPORTE STRIPE

**Documentación:**
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)

**Contacto:**
- Email: support@stripe.com
- Chat: Disponible en dashboard
- Teléfono: +34 911 23 77 83 (España)

---

## ✅ RESUMEN

**Estado actual:**
- ✅ Estructura de carrito implementada
- ✅ UI de carrito completa
- ✅ Lógica de negocio lista
- ⚠️ Integración con Stripe pendiente

**Para completar:**
1. Obtener claves API de Stripe
2. Crear productos en Stripe
3. Configurar webhook
4. Desplegar Edge Functions
5. Probar flujo completo

**Tiempo estimado:** 2-3 horas

---

**Versión:** 1.0  
**Fecha:** 2025  
**Estado:** ⚠️ CONFIGURACIÓN PENDIENTE
