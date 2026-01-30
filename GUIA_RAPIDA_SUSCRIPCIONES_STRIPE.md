
# 🚀 GUÍA RÁPIDA: SISTEMA DE SUSCRIPCIONES CON STRIPE

## 📱 PARA PROPIETARIOS

### ¿Cómo contratar un plan?

1. **Accede a tu perfil** en modo propietario
2. **Selecciona tu local** desde el selector de perfiles
3. **Navega a "Planes de Suscripción"**
4. **Elige el plan** que mejor se adapte a tus necesidades
5. **Acepta los términos** de cobro automático (obligatorio)
6. **Agrega tu tarjeta** de crédito o débito
7. **¡Listo!** Tu prueba gratuita de 30 días comienza inmediatamente

### ¿Qué incluye la prueba gratuita?

- ✅ **30 días gratis** con acceso completo
- ✅ **Sin cargo** durante el período de prueba
- ✅ **Cancela cuando quieras** sin penalización
- ✅ **Todas las funcionalidades** del plan seleccionado

### ¿Cuándo se me cobrará?

- **Durante el trial**: No se realiza ningún cobro
- **Al finalizar el trial**: Se cobra automáticamente el plan seleccionado
- **Mensualmente**: Renovación automática cada mes
- **Puedes cancelar**: En cualquier momento antes del próximo cobro

### ¿Cómo gestiono mi suscripción?

**Pantalla "Mi Suscripción":**
- Ver plan actual y estado
- Ver días restantes de prueba
- Ver fecha del próximo cobro
- Cambiar de plan
- Cancelar suscripción
- Actualizar método de pago
- Ver historial de facturas

### ¿Qué pasa si cancelo?

- ✅ Seguirás teniendo acceso hasta el final del período pagado
- ❌ Perderás los créditos no utilizados
- ⬇️ Volverás al plan básico gratuito
- 💾 Tus datos se conservan (puedes reactivar cuando quieras)

## 👨‍💼 PARA ADMINISTRADORES

### Gestión de Planes

**Pantalla**: Admin → Gestionar Planes (Stripe)

Puedes:
- ✅ Crear nuevos planes
- ✅ Editar planes existentes
- ✅ Configurar precios y características
- ✅ Habilitar/deshabilitar prueba gratuita
- ✅ Configurar duración del trial
- ✅ Marcar plan como "Recomendado"
- ✅ Definir orden de visualización
- ✅ Activar/desactivar planes
- ✅ Sincronizar con Stripe

### Configuración de Trial

Para cada plan puedes:
- **Habilitar/Deshabilitar** prueba gratuita
- **Configurar duración** (días)
- **Requiere método de pago**: Siempre obligatorio
- **Cobro automático**: Usuario debe aceptar explícitamente

### Características por Plan

**Plan Básico (Gratis)**:
- 2 eventos por mes
- Sin destacados
- Sin perfil social
- Sin análisis

**Plan Estándar (29.99€/mes)**:
- 10 eventos por mes
- 2 destacados mensuales
- Perfil social completo
- Visibilidad extra
- **30 días de prueba gratis**

**Plan Premium (79.99€/mes)**:
- Eventos ilimitados
- 10 destacados mensuales
- Perfil social completo
- Panel de análisis completo
- Soporte prioritario
- Visibilidad máxima
- **30 días de prueba gratis**

### Sincronización con Stripe

1. Crea el plan en el panel de admin
2. Haz clic en "Sincronizar" en la tarjeta del plan
3. Se creará automáticamente en Stripe:
   - Producto (Product)
   - Precio (Price) con facturación recurrente
4. Los IDs de Stripe se guardan en la base de datos

## 🔔 NOTIFICACIONES POR EMAIL

### Emails Automáticos

Los propietarios recibirán emails en:
- ✅ Inicio de prueba gratuita
- ✅ 7 días antes de finalizar trial
- ✅ 3 días antes de finalizar trial
- ✅ 1 día antes de finalizar trial
- ✅ Confirmación de cobro exitoso
- ✅ Aviso de fallo de pago
- ✅ Confirmación de cancelación

### Contenido de Emails

**Trial Started**:
- Bienvenida al plan
- Información de funcionalidades
- Fecha de finalización del trial
- Recordatorio de cobro automático

**Trial Ending**:
- Días restantes
- Monto que se cobrará
- Opción de cancelar
- Enlace a gestión de suscripción

**Payment Failed**:
- Información del fallo
- Instrucciones para actualizar método de pago
- Fecha del próximo reintento
- Consecuencias si no se resuelve

## 🛡️ POLÍTICA DE FALLOS DE PAGO

### Reintentos Automáticos

1. **Primer fallo**: Reintento en 3 días
2. **Segundo fallo**: Reintento en 5 días
3. **Tercer fallo**: Reintento en 7 días
4. **Cuarto fallo**: Suscripción marcada como `unpaid`

### Restricciones Progresivas

- **Fallo 1-2**: Email de aviso, sin restricciones
- **Fallo 3**: Restricción de funcionalidades premium
- **Fallo 4**: Perfil oculto, sin acceso

### Reactivación

El propietario puede:
- Actualizar método de pago en cualquier momento
- Reactivar suscripción automáticamente tras pago exitoso
- Contactar soporte para asistencia

## 🛒 CARRITO DE COMPRA

### ¿Cómo funciona?

1. **Visible solo en modo propietario**
2. **Icono en header** con badge de cantidad
3. **Agrega planes** para diferentes locales
4. **Procede al checkout** para pagar todos juntos

### Ventajas

- Suscribe múltiples locales a la vez
- Pago único para todos los planes
- Gestión centralizada

## 🔐 SEGURIDAD

### Datos Protegidos

- ✅ Tarjetas procesadas por Stripe (PCI compliant)
- ✅ No almacenamos datos de tarjetas
- ✅ Tokens seguros para métodos de pago
- ✅ Webhooks firmados y verificados
- ✅ RLS en todas las tablas sensibles

### Permisos

- **Propietarios**: Solo ven sus propias suscripciones
- **Admins**: Ven todas las suscripciones
- **Usuarios**: No tienen acceso

## 📊 MÉTRICAS Y ANÁLISIS

### Para Propietarios

En "Mi Suscripción" puedes ver:
- Créditos restantes (eventos y destacados)
- Historial de uso
- Facturas pagadas
- Estado de suscripción

### Para Admins

En el panel de admin puedes ver:
- Total de suscripciones activas
- Ingresos mensuales
- Tasa de conversión de trials
- Planes más populares

## 🆘 SOPORTE

### Problemas Comunes

**"No puedo agregar mi tarjeta"**
- Verifica que la tarjeta sea válida
- Asegúrate de tener fondos suficientes
- Contacta a tu banco si el problema persiste

**"Mi trial no se activó"**
- Verifica que hayas agregado un método de pago
- Verifica que hayas aceptado los términos
- Contacta a soporte si el problema persiste

**"No puedo cancelar mi suscripción"**
- Ve a "Mi Suscripción"
- Haz clic en "Cancelar Suscripción"
- Confirma la cancelación
- La cancelación será efectiva al final del período

### Contacto

- **Email**: soporte@barlive.com
- **Chat**: Disponible en la app
- **Teléfono**: +34 XXX XXX XXX

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Frontend ✅ COMPLETADO

- [x] Pantallas de gestión de planes
- [x] Pantalla de suscripción del propietario
- [x] Carrito de compra
- [x] Componente de entrada de tarjeta
- [x] Integración con Stripe React Native

### Base de Datos ✅ COMPLETADO

- [x] Tablas de suscripciones
- [x] Tablas de métodos de pago
- [x] Tablas de facturas
- [x] Tablas de webhooks
- [x] Tablas de emails
- [x] Tablas de cupones
- [x] RLS policies
- [x] Funciones y triggers

### Backend ⏳ PENDIENTE

- [ ] Endpoints de Stripe
- [ ] Webhooks de Stripe
- [ ] Envío de emails
- [ ] Sincronización de productos
- [ ] Gestión de fallos de pago

### Configuración ⏳ PENDIENTE

- [ ] Cuenta de Stripe
- [ ] API keys de Stripe
- [ ] Webhook endpoint
- [ ] Plantillas de email
- [ ] Productos en Stripe

## 🎉 ¡SISTEMA LISTO!

El sistema de suscripciones con Stripe está completamente implementado en el frontend y la base de datos. Solo falta implementar el backend y configurar Stripe para que esté 100% funcional.

**Tiempo estimado de implementación backend**: 4-6 horas
**Tiempo estimado de configuración Stripe**: 1-2 horas
**Tiempo estimado de testing**: 2-3 horas

**Total**: 7-11 horas para sistema completo en producción
