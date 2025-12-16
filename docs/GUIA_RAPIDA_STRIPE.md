
# Guía Rápida: Configuración de Stripe

## ¿Qué es Stripe?

Stripe es una plataforma de pagos online que te permite aceptar pagos con tarjeta de crédito, débito y otros métodos de pago de forma segura.

## Pasos para Configurar Stripe

### 1. Crear una Cuenta en Stripe

1. Ve a [https://stripe.com](https://stripe.com)
2. Haz clic en "Registrarse"
3. Completa el formulario con tus datos
4. Verifica tu email

### 2. Obtener las Claves API

#### Modo de Prueba (Recomendado para empezar)

1. Inicia sesión en [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Asegúrate de estar en modo "Test" (esquina superior derecha)
3. Ve a "Developers" → "API keys"
4. Copia la "Publishable key" (comienza con `pk_test_`)
5. Copia la "Secret key" (comienza con `sk_test_`)

#### Modo de Producción (Cuando estés listo para lanzar)

1. Activa tu cuenta completando la información de tu negocio
2. Cambia a modo "Live" (esquina superior derecha)
3. Ve a "Developers" → "API keys"
4. Copia la "Publishable key" (comienza con `pk_live_`)
5. Copia la "Secret key" (comienza con `sk_live_`)

### 3. Configurar Webhooks

Los webhooks permiten que Stripe notifique a tu aplicación cuando ocurren eventos (pagos exitosos, fallos, etc.)

1. Ve a "Developers" → "Webhooks"
2. Haz clic en "Add endpoint"
3. Pega la URL del webhook que te proporciona el asistente
4. Selecciona los eventos a escuchar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Haz clic en "Add endpoint"
6. Copia el "Signing secret" (comienza con `whsec_`)

### 4. Datos Fiscales

Necesitarás proporcionar:

- **Nombre de la empresa**: El nombre legal de tu negocio
- **CIF/NIF**: Tu número de identificación fiscal
- **Dirección**: Dirección fiscal completa
- **Email de contacto**: Email para facturas y notificaciones
- **Teléfono**: Número de contacto

### 5. Probar el Sistema

Usa estas tarjetas de prueba de Stripe:

- **Pago exitoso**: `4242 4242 4242 4242`
- **Pago rechazado**: `4000 0000 0000 0002`
- **Requiere autenticación**: `4000 0025 0000 3155`

Para todas las tarjetas de prueba:
- Usa cualquier fecha futura como fecha de expiración
- Usa cualquier CVC de 3 dígitos
- Usa cualquier código postal

## Preguntas Frecuentes

### ¿Cuánto cobra Stripe?

- **Europa**: 1.5% + 0.25€ por transacción exitosa
- **Tarjetas internacionales**: 2.5% + 0.25€
- Sin cuotas mensuales ni costes de configuración

### ¿Es seguro?

Sí, Stripe es PCI DSS Level 1 certificado, el más alto nivel de seguridad en la industria de pagos.

### ¿Cuándo recibo el dinero?

- **Primeros pagos**: 7-14 días
- **Pagos posteriores**: 2-7 días laborables
- Puedes configurar transferencias automáticas a tu cuenta bancaria

### ¿Puedo usar Stripe en España?

Sí, Stripe está completamente disponible en España y soporta pagos en euros.

### ¿Qué pasa si cambio de modo Test a Live?

Deberás:
1. Actualizar las claves API en el asistente
2. Configurar un nuevo webhook para el modo Live
3. Completar la activación de tu cuenta en Stripe

## Soporte

Si tienes problemas:

1. **Documentación de Stripe**: [https://stripe.com/docs](https://stripe.com/docs)
2. **Soporte de Stripe**: [https://support.stripe.com](https://support.stripe.com)
3. **Centro de ayuda de Barlive**: Dentro de la app

## Próximos Pasos

Una vez configurado Stripe:

1. ✅ Crea tus planes de suscripción
2. ✅ Configura los precios
3. ✅ Prueba el flujo de pago completo
4. ✅ Activa el modo de producción cuando estés listo

---

**¡Importante!**: Nunca compartas tus claves secretas (`sk_test_` o `sk_live_`) con nadie. Mantenlas seguras.
