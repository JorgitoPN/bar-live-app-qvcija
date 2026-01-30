
# 🔧 GUÍA DE IMPLEMENTACIÓN DEL BACKEND DE STRIPE

## 📋 RESUMEN

Esta guía detalla todos los endpoints que deben implementarse en el backend para que el sistema de suscripciones con Stripe funcione completamente.

## 🚀 ENDPOINTS REQUERIDOS

### 1. GESTIÓN DE SUSCRIPCIONES

#### POST /api/stripe/create-subscription

Crea una nueva suscripción para un local.

**Request Body:**
```typescript
{
  localId: string;
  planId: string;
  acceptedAutoCharge: boolean;
  acceptedTerms: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  subscription: {
    id: string;
    stripe_subscription_id: string;
    status: string;
    trial_end: string | null;
  };
  requires_payment_method: boolean;
  setup_intent_client_secret?: string;
}
```

**Lógica:**
1. Verificar que el usuario es propietario del local
2. Verificar que el plan existe y está activo
3. Crear o recuperar Stripe Customer
4. Si el plan tiene trial habilitado:
   - Crear SetupIntent para recoger método de pago
   - Retornar client_secret para CardField
5. Si no tiene trial:
   - Crear suscripción directamente con cobro inmediato
6. Guardar en `stripe_subscriptions` y `suscripciones_locales`
7. Registrar aceptación en `subscription_trial_acceptances`

---

#### POST /api/stripe/start-trial

Activa el trial después de guardar método de pago.

**Request Body:**
```typescript
{
  localId: string;
  planId: string;
  setupIntentId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  subscription: {
    id: string;
    status: 'trialing';
    trial_end: string;
  };
}
```

**Lógica:**
1. Verificar que SetupIntent fue exitoso
2. Crear suscripción en Stripe con trial_period_days
3. Actualizar `stripe_subscriptions` con trial_start y trial_end
4. Actualizar `suscripciones_locales` con trial_activo = true
5. Activar perfil del local (perfil_visible = true, activo = true)
6. Programar emails de recordatorio

---

#### POST /api/stripe/cancel-subscription

Cancela una suscripción al final del período.

**Request Body:**
```typescript
{
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  canceled_at: string;
  access_until: string;
}
```

**Lógica:**
1. Verificar que el usuario es propietario de la suscripción
2. Cancelar suscripción en Stripe con cancel_at_period_end = true
3. Actualizar `stripe_subscriptions` con cancel_at_period_end = true
4. Actualizar `suscripciones_locales` con cancelar_al_final_periodo = true
5. Programar email de confirmación
6. Programar ocultación del perfil para fecha de fin

---

#### POST /api/stripe/change-plan

Cambia el plan de una suscripción existente.

**Request Body:**
```typescript
{
  subscriptionId: string;
  newPlanId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  subscription: {
    id: string;
    new_plan: string;
    proration_amount: number;
  };
}
```

**Lógica:**
1. Verificar que el usuario es propietario de la suscripción
2. Obtener nuevo plan de base de datos
3. Actualizar suscripción en Stripe con nuevo price_id
4. Calcular proration (Stripe lo hace automáticamente)
5. Actualizar `stripe_subscriptions` y `suscripciones_locales`
6. Actualizar créditos según nuevo plan
7. Enviar email de confirmación

---

### 2. MÉTODOS DE PAGO

#### POST /api/stripe/create-setup-intent

Crea un SetupIntent para recoger método de pago.

**Request Body:**
```typescript
{
  customerId: string;
  localId: string;
  planId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  client_secret: string;
  setup_intent_id: string;
}
```

**Lógica:**
1. Crear o recuperar Stripe Customer
2. Crear SetupIntent en Stripe
3. Guardar en `stripe_setup_intents`
4. Retornar client_secret para CardField

---

#### POST /api/stripe/attach-payment-method

Adjunta un método de pago a un customer.

**Request Body:**
```typescript
{
  customerId: string;
  paymentMethodId: string;
  localId: string;
  setAsDefault: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  paymentMethod: {
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}
```

**Lógica:**
1. Adjuntar PaymentMethod al Customer en Stripe
2. Si setAsDefault = true, establecer como predeterminado
3. Actualizar `stripe_customers` con payment_methods array
4. Actualizar `suscripciones_locales` con payment_method_saved = true

---

#### GET /api/stripe/payment-methods/:customerId

Obtiene todos los métodos de pago de un customer.

**Response:**
```typescript
{
  success: boolean;
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    is_default: boolean;
  }>;
}
```

**Lógica:**
1. Obtener PaymentMethods del Customer desde Stripe
2. Identificar cuál es el predeterminado
3. Retornar lista formateada

---

#### DELETE /api/stripe/payment-method/:paymentMethodId

Elimina un método de pago.

**Response:**
```typescript
{
  success: boolean;
}
```

**Lógica:**
1. Verificar que el usuario es dueño del método de pago
2. Detach PaymentMethod en Stripe
3. Actualizar `stripe_customers` removiendo de payment_methods array

---

### 3. FACTURAS

#### GET /api/stripe/invoices/:subscriptionId

Obtiene historial de facturas de una suscripción.

**Response:**
```typescript
{
  success: boolean;
  invoices: Array<{
    id: string;
    invoice_number: string;
    amount_due: number;
    amount_paid: number;
    status: string;
    period_start: string;
    period_end: string;
    paid_at: string | null;
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
  }>;
}
```

**Lógica:**
1. Verificar que el usuario es propietario de la suscripción
2. Obtener invoices de Stripe
3. Sincronizar con `stripe_invoices` en base de datos
4. Retornar lista ordenada por fecha

---

#### GET /api/stripe/invoice/:invoiceId

Obtiene detalles de una factura específica.

**Response:**
```typescript
{
  success: boolean;
  invoice: {
    id: string;
    invoice_number: string;
    amount_due: number;
    status: string;
    period_start: string;
    period_end: string;
    line_items: Array<{
      description: string;
      amount: number;
    }>;
    hosted_invoice_url: string;
    invoice_pdf: string;
  };
}
```

---

### 4. WEBHOOKS

#### POST /api/stripe/webhook

Recibe y procesa eventos de Stripe.

**Request Body:**
```typescript
// Stripe webhook event (raw body)
```

**Response:**
```typescript
{
  received: boolean;
}
```

**Eventos a manejar:**

**invoice.paid**:
1. Actualizar estado de suscripción a `active`
2. Registrar pago en `stripe_invoices`
3. Resetear contador de fallos de pago
4. Enviar email de confirmación
5. Activar perfil del local

**invoice.payment_failed**:
1. Incrementar contador de fallos
2. Registrar en `payment_failure_tracking`
3. Programar reintento según política
4. Enviar email de aviso
5. Si es el 4to fallo, ocultar perfil

**customer.subscription.deleted**:
1. Actualizar estado a `canceled`
2. Ocultar perfil del local
3. Enviar email de confirmación
4. Cambiar a plan básico gratuito

**customer.subscription.updated**:
1. Sincronizar cambios de Stripe
2. Actualizar fechas de período
3. Actualizar estado si cambió

**customer.subscription.trial_will_end**:
1. Verificar que emails de recordatorio fueron enviados
2. Enviar email final de recordatorio

**Seguridad:**
- Verificar firma del webhook con `webhook_secret`
- Validar que el evento no fue procesado antes
- Guardar evento en `stripe_webhook_events`
- Marcar como procesado tras éxito

---

### 5. SINCRONIZACIÓN

#### POST /api/stripe/sync-plan

Sincroniza un plan con Stripe (crea Product y Price).

**Request Body:**
```typescript
{
  planId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  stripe_product_id: string;
  stripe_price_id: string;
}
```

**Lógica:**
1. Obtener plan de base de datos
2. Crear Product en Stripe:
   ```typescript
   {
     name: plan.nombre,
     description: plan.descripcion,
     metadata: {
       plan_id: plan.id,
       eventos_mes: plan.eventos_mes,
       promos_destacadas: plan.promos_destacadas,
     }
   }
   ```
3. Crear Price en Stripe:
   ```typescript
   {
     product: product_id,
     unit_amount: plan.precio_mensual * 100, // cents
     currency: 'eur',
     recurring: {
       interval: 'month',
       interval_count: plan.duracion_meses,
       trial_period_days: plan.trial_habilitado ? plan.trial_dias : null,
     }
   }
   ```
4. Actualizar plan en base de datos con IDs de Stripe

---

### 6. EMAILS

#### POST /api/stripe/send-subscription-email

Envía un email de suscripción.

**Request Body:**
```typescript
{
  notificationId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  sent_at: string;
}
```

**Lógica:**
1. Obtener notificación de `subscription_email_notifications`
2. Obtener datos de suscripción y propietario
3. Renderizar plantilla de email según tipo
4. Enviar email usando servicio de emails
5. Marcar como enviado en base de datos

---

## 🔐 AUTENTICACIÓN

Todos los endpoints (excepto webhook) requieren autenticación:

```typescript
headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

El webhook debe verificar la firma de Stripe:

```typescript
const signature = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  request.body,
  signature,
  webhookSecret
);
```

## 🛠️ CONFIGURACIÓN DE STRIPE

### Variables de Entorno

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Webhooks en Stripe Dashboard

1. Ir a Developers → Webhooks
2. Agregar endpoint: `https://tu-backend.com/api/stripe/webhook`
3. Seleccionar eventos:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `customer.subscription.trial_will_end`
4. Copiar webhook secret

### Productos en Stripe

Los productos se crean automáticamente al sincronizar planes desde el admin panel.

Alternativamente, puedes crearlos manualmente en Stripe Dashboard y luego actualizar los IDs en la base de datos.

## 📧 PLANTILLAS DE EMAIL

### trial_started

**Asunto**: ¡Tu prueba gratuita de {plan_nombre} ha comenzado!

**Contenido**:
- Bienvenida al plan
- Funcionalidades disponibles
- Duración del trial
- Fecha de finalización
- Recordatorio de cobro automático
- Enlace a "Mi Suscripción"

### trial_ending_X_days

**Asunto**: Tu prueba gratuita finaliza en {X} días

**Contenido**:
- Días restantes
- Monto que se cobrará
- Fecha del cobro
- Opción de cancelar
- Enlace a gestión de suscripción

### payment_succeeded

**Asunto**: Pago procesado correctamente - {plan_nombre}

**Contenido**:
- Confirmación de pago
- Monto cobrado
- Próxima fecha de cobro
- Enlace a factura
- Enlace a "Mi Suscripción"

### payment_failed

**Asunto**: ⚠️ Problema con tu pago - Acción requerida

**Contenido**:
- Información del fallo
- Instrucciones para actualizar método de pago
- Fecha del próximo reintento
- Consecuencias si no se resuelve
- Enlace a actualizar método de pago

### subscription_canceled

**Asunto**: Tu suscripción ha sido cancelada

**Contenido**:
- Confirmación de cancelación
- Fecha hasta la que tendrás acceso
- Qué sucederá después
- Opción de reactivar
- Enlace a planes

## 🔄 LÓGICA DE WEBHOOKS

### invoice.paid

```typescript
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // 1. Obtener subscription_id del invoice
  const subscriptionId = invoice.subscription as string;
  
  // 2. Actualizar estado en base de datos
  await supabase
    .from('stripe_subscriptions')
    .update({ estado: 'active' })
    .eq('stripe_subscription_id', subscriptionId);
  
  await supabase
    .from('suscripciones_locales')
    .update({ 
      estado: 'activa',
      payment_failed_count: 0,
      last_payment_failure: null,
    })
    .eq('stripe_subscription_id', subscriptionId);
  
  // 3. Guardar factura
  await supabase
    .from('stripe_invoices')
    .insert({
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: subscriptionId,
      amount_due: invoice.amount_due / 100,
      amount_paid: invoice.amount_paid / 100,
      status: 'paid',
      paid_at: new Date(invoice.status_transitions.paid_at * 1000),
      // ... más campos
    });
  
  // 4. Enviar email de confirmación
  await sendSubscriptionEmail('payment_succeeded', subscriptionId);
  
  // 5. Activar perfil del local
  const { data: sub } = await supabase
    .from('stripe_subscriptions')
    .select('local_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  
  if (sub) {
    await supabase
      .from('locales')
      .update({ perfil_visible: true, activo: true })
      .eq('id', sub.local_id);
  }
}
```

### invoice.payment_failed

```typescript
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  // 1. Obtener suscripción actual
  const { data: sub } = await supabase
    .from('suscripciones_locales')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  
  if (!sub) return;
  
  const failureCount = (sub.payment_failed_count || 0) + 1;
  
  // 2. Actualizar contador de fallos
  await supabase
    .from('suscripciones_locales')
    .update({
      payment_failed_count: failureCount,
      last_payment_failure: new Date().toISOString(),
      estado: 'past_due',
    })
    .eq('id', sub.id);
  
  // 3. Registrar fallo
  const nextRetry = calculateNextRetry(failureCount);
  
  await supabase
    .from('payment_failure_tracking')
    .insert({
      subscription_id: sub.id,
      attempt_number: failureCount,
      failure_reason: invoice.last_finalization_error?.message,
      failure_code: invoice.last_finalization_error?.code,
      next_retry_at: nextRetry,
    });
  
  // 4. Aplicar restricciones según número de fallos
  if (failureCount >= 3) {
    // Restringir funcionalidades premium
    await supabase
      .from('suscripciones_locales')
      .update({ features_restricted: true })
      .eq('id', sub.id);
  }
  
  if (failureCount >= 4) {
    // Ocultar perfil
    await supabase
      .from('locales')
      .update({ perfil_visible: false, activo: false })
      .eq('id', sub.local_id);
    
    await supabase
      .from('suscripciones_locales')
      .update({ estado: 'unpaid' })
      .eq('id', sub.id);
  }
  
  // 5. Enviar email de aviso
  await sendSubscriptionEmail('payment_failed', sub.id);
}

function calculateNextRetry(failureCount: number): Date {
  const now = new Date();
  switch (failureCount) {
    case 1: return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 días
    case 2: return new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 días
    case 3: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días
    default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}
```

### customer.subscription.deleted

```typescript
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // 1. Actualizar estado
  await supabase
    .from('stripe_subscriptions')
    .update({
      estado: 'canceled',
      ended_at: new Date(),
    })
    .eq('stripe_subscription_id', subscription.id);
  
  await supabase
    .from('suscripciones_locales')
    .update({ estado: 'cancelada' })
    .eq('stripe_subscription_id', subscription.id);
  
  // 2. Ocultar perfil del local
  const { data: sub } = await supabase
    .from('stripe_subscriptions')
    .select('local_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();
  
  if (sub) {
    await supabase
      .from('locales')
      .update({ perfil_visible: false, activo: false })
      .eq('id', sub.local_id);
  }
  
  // 3. Enviar email de confirmación
  await sendSubscriptionEmail('subscription_canceled', subscription.id);
}
```

## 🔧 UTILIDADES DE STRIPE

### Crear Customer

```typescript
async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  // 1. Buscar customer existente
  const { data: existing } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();
  
  if (existing) {
    return existing.stripe_customer_id;
  }
  
  // 2. Crear nuevo customer en Stripe
  const customer = await stripe.customers.create({
    email,
    metadata: {
      user_id: userId,
    },
  });
  
  // 3. Guardar en base de datos
  await supabase
    .from('stripe_customers')
    .insert({
      user_id: userId,
      stripe_customer_id: customer.id,
      email,
    });
  
  return customer.id;
}
```

### Crear Suscripción con Trial

```typescript
async function createSubscriptionWithTrial(
  customerId: string,
  priceId: string,
  trialDays: number
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  });
}
```

### Verificar Webhook Signature

```typescript
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    throw new Error('Invalid webhook signature');
  }
}
```

## 📊 MONITOREO Y LOGS

### Logs Recomendados

```typescript
console.log('[Stripe] Creating subscription:', {
  customerId,
  planId,
  trialDays,
});

console.log('[Stripe] Webhook received:', {
  type: event.type,
  subscriptionId: event.data.object.id,
});

console.log('[Stripe] Payment failed:', {
  subscriptionId,
  attemptNumber: failureCount,
  nextRetry,
});
```

### Métricas a Trackear

- Total de suscripciones activas
- Tasa de conversión de trials
- Tasa de cancelación (churn rate)
- Ingresos mensuales recurrentes (MRR)
- Valor de vida del cliente (LTV)
- Tasa de fallos de pago

## 🧪 TESTING

### Test Cases

1. **Crear suscripción con trial**:
   - Verificar que no se cobra durante trial
   - Verificar que trial se activa correctamente
   - Verificar emails programados

2. **Finalizar trial**:
   - Verificar cobro automático
   - Verificar cambio de estado a `active`
   - Verificar email de confirmación

3. **Fallo de pago**:
   - Simular fallo con tarjeta de prueba
   - Verificar reintentos
   - Verificar restricciones progresivas
   - Verificar emails de aviso

4. **Cancelar suscripción**:
   - Verificar que acceso continúa hasta fin de período
   - Verificar que perfil se oculta al finalizar
   - Verificar email de confirmación

5. **Cambiar de plan**:
   - Verificar proration
   - Verificar actualización de créditos
   - Verificar email de confirmación

### Tarjetas de Prueba de Stripe

```
Éxito: 4242 4242 4242 4242
Fallo: 4000 0000 0000 0002
Requiere autenticación: 4000 0025 0000 3155
```

## 🚀 DEPLOYMENT

### Checklist de Producción

- [ ] Configurar Stripe en modo producción
- [ ] Actualizar API keys en variables de entorno
- [ ] Configurar webhook endpoint en Stripe
- [ ] Probar flujo completo en staging
- [ ] Configurar plantillas de email
- [ ] Configurar monitoreo de webhooks
- [ ] Configurar alertas de fallos de pago
- [ ] Documentar proceso de soporte

### Monitoreo

- Stripe Dashboard para métricas
- Logs de webhooks en `stripe_webhook_events`
- Logs de fallos en `payment_failure_tracking`
- Emails programados en `subscription_email_notifications`

## 📞 SOPORTE

### Problemas Comunes

**Webhook no se recibe**:
- Verificar que endpoint está accesible públicamente
- Verificar firma del webhook
- Revisar logs de Stripe Dashboard

**Pago falla siempre**:
- Verificar que customer tiene método de pago válido
- Verificar que método de pago no expiró
- Verificar fondos suficientes

**Trial no se activa**:
- Verificar que SetupIntent fue exitoso
- Verificar que método de pago se guardó
- Verificar que usuario aceptó términos

## ✅ VERIFICACIÓN DE IMPLEMENTACIÓN

### Checklist Backend

- [ ] Todos los endpoints implementados
- [ ] Webhooks configurados y probados
- [ ] Emails configurados y probados
- [ ] Manejo de errores implementado
- [ ] Logs implementados
- [ ] Tests unitarios escritos
- [ ] Tests de integración escritos
- [ ] Documentación de API completa

### Checklist Stripe

- [ ] Cuenta de Stripe creada
- [ ] API keys configuradas
- [ ] Webhook endpoint configurado
- [ ] Productos creados o sincronizados
- [ ] Precios configurados
- [ ] Modo de prueba probado
- [ ] Modo de producción configurado

### Checklist Emails

- [ ] Servicio de emails configurado
- [ ] Plantillas de email creadas
- [ ] Emails de prueba enviados
- [ ] Programación de emails probada
- [ ] Unsubscribe links implementados

## 🎉 ¡LISTO PARA IMPLEMENTAR!

Esta guía contiene toda la información necesaria para implementar el backend del sistema de suscripciones con Stripe.

**Tiempo estimado**: 6-8 horas de desarrollo + 2-3 horas de testing

**Prioridad**: Alta - Sistema crítico para monetización

**Dependencias**: Stripe SDK, servicio de emails, base de datos configurada
