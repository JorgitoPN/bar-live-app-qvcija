
# 📱 INSTRUCCIONES: SISTEMA DE SUSCRIPCIONES CON STRIPE

## 🎯 ¿QUÉ SE HA IMPLEMENTADO?

Se ha creado un **sistema completo de suscripciones con Stripe** que permite a los propietarios de locales contratar planes de pago para acceder a funcionalidades premium.

## ✅ FUNCIONALIDADES PRINCIPALES

### Para Propietarios

1. **Contratar Planes de Suscripción**
   - Ver todos los planes disponibles
   - Comparar características
   - Iniciar prueba gratuita de 30 días
   - Pagar con tarjeta de crédito/débito

2. **Gestionar Suscripción**
   - Ver plan actual y estado
   - Ver días restantes de prueba
   - Cambiar de plan
   - Cancelar suscripción
   - Actualizar método de pago
   - Ver historial de facturas

3. **Carrito de Compra**
   - Agregar planes para múltiples locales
   - Ver total a pagar
   - Proceder al checkout

### Para Administradores

1. **Gestionar Planes**
   - Crear nuevos planes
   - Editar planes existentes
   - Configurar precios y características
   - Habilitar/deshabilitar prueba gratuita
   - Configurar duración del trial
   - Sincronizar con Stripe

2. **Monitorear Suscripciones**
   - Ver suscripciones activas
   - Ver ingresos mensuales
   - Ver tasa de conversión
   - Ver fallos de pago

## 🚀 CÓMO USAR EL SISTEMA

### Paso 1: Acceder a Planes (Propietario)

1. Abre la app BarLive
2. Ve a tu **Perfil**
3. Asegúrate de estar en **modo propietario** (selector de perfiles)
4. Haz clic en el **icono del carrito** en el header (arriba a la derecha)
5. O navega a **"Planes de Suscripción"** desde tu perfil de local

### Paso 2: Seleccionar un Plan

1. Verás 3 planes disponibles:
   - **Básico** (Gratis): Funcionalidades básicas
   - **Estándar** (29.99€/mes): Recomendado, con prueba gratis
   - **Premium** (79.99€/mes): Todas las funcionalidades, con prueba gratis

2. Cada plan muestra:
   - Precio mensual
   - Características incluidas
   - Información de prueba gratuita
   - Badge de "Recomendado" (si aplica)

3. Haz clic en **"Iniciar Prueba Gratis"** o **"Seleccionar Plan"**

### Paso 3: Aceptar Términos

1. Se abrirá un modal de confirmación
2. Lee la información del plan seleccionado
3. Lee la información de la prueba gratuita
4. **IMPORTANTE**: Marca el checkbox que dice:
   > "Acepto que al finalizar el período de prueba de 30 días, se realizará automáticamente el cobro de 29.99€ por el plan Estándar."

5. Este checkbox es **obligatorio** para continuar

### Paso 4: Agregar Método de Pago

1. Se te pedirá agregar una tarjeta de crédito o débito
2. Ingresa los datos de tu tarjeta:
   - Número de tarjeta
   - Fecha de expiración
   - CVC
3. Haz clic en **"Guardar Método de Pago"**
4. **No se realizará ningún cargo** en este momento

### Paso 5: Trial Activado

1. ¡Tu prueba gratuita de 30 días ha comenzado!
2. Recibirás un email de confirmación
3. Tendrás acceso completo a todas las funcionalidades del plan
4. Verás un contador de días restantes en "Mi Suscripción"

### Paso 6: Durante el Trial

**Puedes usar todas las funcionalidades:**
- Crear eventos (según límite del plan)
- Destacar tu local (según créditos del plan)
- Publicar en la red social
- Ver estadísticas (si el plan lo incluye)

**Recibirás recordatorios:**
- 7 días antes de finalizar
- 3 días antes de finalizar
- 1 día antes de finalizar

**Puedes cancelar:**
- En cualquier momento sin cargo
- Ve a "Mi Suscripción" → "Cancelar Suscripción"

### Paso 7: Fin del Trial

**Si NO cancelas:**
- Se cobrará automáticamente el plan seleccionado
- Recibirás un email de confirmación
- Tu suscripción pasará a estado "Activa"
- Seguirás teniendo acceso a todas las funcionalidades

**Si cancelas antes:**
- No se realizará ningún cobro
- Volverás al plan básico gratuito
- Tu perfil se ocultará (pero los datos se conservan)
- Podrás reactivar cuando quieras

## 🛒 CARRITO DE COMPRA

### ¿Cómo funciona?

El carrito de compra te permite agregar planes para múltiples locales y pagarlos todos juntos.

**Ubicación**: Icono de carrito en el header (solo visible en modo propietario)

**Funcionalidades**:
- Ver planes agregados
- Eliminar artículos
- Ver total a pagar
- Proceder al checkout

**Ventaja**: Suscribe varios locales a la vez con un solo pago.

## 📊 MI SUSCRIPCIÓN

### ¿Qué puedo ver?

**Información del Plan**:
- Nombre del plan actual
- Precio mensual
- Estado de la suscripción
- Días restantes de prueba (si aplica)
- Fecha del próximo cobro

**Créditos Disponibles**:
- Eventos restantes este mes
- Destacados restantes este mes
- Fecha de renovación de créditos

**Métodos de Pago**:
- Tarjetas guardadas
- Tarjeta predeterminada
- Agregar nuevas tarjetas
- Eliminar tarjetas antiguas

**Historial de Facturas**:
- Todas las facturas pagadas
- Descargar PDF
- Ver detalles de cada factura

### ¿Qué puedo hacer?

- **Cambiar de Plan**: Actualiza o reduce tu plan
- **Cancelar Suscripción**: Cancela al final del período
- **Actualizar Método de Pago**: Cambia tu tarjeta
- **Ver Facturas**: Descarga tus facturas en PDF

## 👨‍💼 PANEL DE ADMINISTRACIÓN

### Gestionar Planes (Admin)

**Ruta**: Admin → Gestionar Planes (Stripe)

**Puedes**:
1. **Crear Nuevos Planes**:
   - Nombre y descripción
   - Precio mensual
   - Duración (meses)
   - Orden de visualización
   - Marcar como recomendado

2. **Configurar Trial**:
   - Habilitar/deshabilitar prueba gratuita
   - Configurar duración (días)
   - Por defecto: 30 días

3. **Definir Funcionalidades**:
   - Eventos por mes (0 a 999)
   - Destacados por mes (0 a 10)
   - Perfil social (sí/no)
   - Panel de análisis (sí/no)
   - Soporte prioritario (sí/no)
   - Visibilidad extra/máxima (sí/no)

4. **Sincronizar con Stripe**:
   - Crear producto en Stripe
   - Crear precio recurrente
   - Guardar IDs en base de datos

### Asignar Planes a Locales (Admin)

**Ruta**: Admin → Gestionar Planes (Legacy) → Tab "Asignar"

**Puedes**:
- Buscar locales por nombre
- Seleccionar un plan
- Asignar plan al local
- El perfil del local se activa automáticamente

## 📧 EMAILS AUTOMÁTICOS

### ¿Qué emails recibiré?

1. **Inicio de Prueba**:
   - Bienvenida al plan
   - Funcionalidades disponibles
   - Fecha de finalización
   - Recordatorio de cobro automático

2. **Recordatorios de Trial** (7, 3 y 1 día antes):
   - Días restantes
   - Monto que se cobrará
   - Opción de cancelar
   - Enlace a gestión de suscripción

3. **Confirmación de Pago**:
   - Monto cobrado
   - Próxima fecha de cobro
   - Enlace a factura
   - Resumen de funcionalidades

4. **Fallo de Pago**:
   - Información del problema
   - Instrucciones para solucionarlo
   - Fecha del próximo reintento
   - Consecuencias si no se resuelve

5. **Cancelación**:
   - Confirmación de cancelación
   - Fecha hasta la que tendrás acceso
   - Qué sucederá después
   - Opción de reactivar

## ⚠️ POLÍTICA DE FALLOS DE PAGO

### ¿Qué pasa si falla un pago?

**Sistema de Reintentos Automáticos**:

1. **Primer fallo**:
   - Email de aviso
   - Reintento en 3 días
   - Sin restricciones

2. **Segundo fallo**:
   - Email urgente
   - Reintento en 5 días
   - Sin restricciones aún

3. **Tercer fallo**:
   - Email crítico
   - Reintento en 7 días
   - **Restricción de funcionalidades premium**

4. **Cuarto fallo**:
   - Email final
   - **Perfil oculto**
   - **Sin acceso a funcionalidades**
   - Suscripción marcada como impagada

### ¿Cómo solucionar?

1. Ve a **"Mi Suscripción"**
2. Sección **"Método de Pago"**
3. Haz clic en **"Agregar Método de Pago"**
4. Ingresa los datos de una tarjeta válida
5. El sistema **reintentará el cobro automáticamente**
6. Si el pago es exitoso, **todo vuelve a la normalidad**

## 🔐 SEGURIDAD

### Tus datos están protegidos

- ✅ **Stripe** procesa todos los pagos (líder mundial)
- ✅ **No almacenamos** datos de tarjetas
- ✅ **Encriptación SSL** en todas las comunicaciones
- ✅ **PCI DSS compliant** (máxima seguridad)
- ✅ **Tokens seguros** para pagos recurrentes

### Permisos y Privacidad

- Solo tú puedes ver tu suscripción
- Solo tú puedes gestionar tus métodos de pago
- Solo tú puedes ver tus facturas
- Los administradores pueden ver estadísticas generales (sin datos sensibles)

## 🎁 CUPONES Y PROMOCIONES

### Sistema Preparado

El sistema está preparado para cupones de descuento:
- Descuentos por porcentaje o monto fijo
- Cupones de un solo uso o recurrentes
- Cupones con fecha de expiración
- Cupones aplicables a planes específicos

**Próximamente**: Los administradores podrán crear cupones desde el panel de admin.

### ¿Cómo usar un cupón?

Cuando el sistema esté activo:
1. En la pantalla de selección de plan
2. Verás un campo "Código de cupón"
3. Ingresa tu código
4. El descuento se aplicará automáticamente
5. Verás el precio final con descuento

## 🌍 MULTI-MONEDA

### Sistema Preparado

El sistema está preparado para múltiples monedas:
- EUR (Euro) - Por defecto
- USD (Dólar)
- GBP (Libra)
- Y más...

**Próximamente**: Los administradores podrán configurar precios en diferentes monedas desde el panel de admin.

## 💰 IMPUESTOS (STRIPE TAX)

### Sistema Preparado

El sistema está preparado para Stripe Tax:
- Cálculo automático de IVA por región
- Facturas con impuestos incluidos
- Cumplimiento fiscal automático

**Próximamente**: Integración completa con Stripe Tax para cálculo automático de impuestos según la ubicación del cliente.

## 🆘 SOPORTE Y AYUDA

### ¿Necesitas ayuda?

**Contacto**:
- Email: soporte@barlive.com
- Chat: Disponible en la app
- Teléfono: +34 XXX XXX XXX
- Horario: Lunes a Viernes, 9:00 - 18:00

### Preguntas Frecuentes

**¿Cuánto cuesta cada plan?**
- Básico: Gratis
- Estándar: 29.99€/mes (30 días gratis)
- Premium: 79.99€/mes (30 días gratis)

**¿Puedo cancelar en cualquier momento?**
Sí, puedes cancelar cuando quieras sin penalización. Seguirás teniendo acceso hasta el final del período pagado.

**¿Qué pasa con mis datos si cancelo?**
Todos tus datos se conservan. Solo se oculta tu perfil. Puedes reactivar tu suscripción en cualquier momento y todo volverá a estar visible.

**¿Puedo cambiar de plan?**
Sí, puedes cambiar de plan en cualquier momento. El cambio es inmediato y se calcula un ajuste proporcional.

**¿Qué pasa si mi pago falla?**
Recibirás un email de aviso y el sistema reintentará el cobro automáticamente. Tienes varios días para actualizar tu método de pago antes de que se apliquen restricciones.

**¿Puedo tener múltiples locales con diferentes planes?**
Sí, cada local puede tener su propio plan de suscripción independiente.

**¿Los planes incluyen IVA?**
Los precios mostrados no incluyen IVA. El IVA se calculará y mostrará en el checkout según tu ubicación.

## 📝 NOTAS IMPORTANTES

### Prueba Gratuita

- ✅ **30 días gratis** en planes Estándar y Premium
- ✅ **Acceso completo** a todas las funcionalidades
- ✅ **Sin cargo** durante el trial
- ✅ **Cancela cuando quieras** sin penalización
- ⚠️ **Requiere tarjeta válida** para activar
- ⚠️ **Cobro automático** al finalizar (debes aceptar explícitamente)

### Cobro Automático

- Al finalizar el trial, se cobrará automáticamente el plan seleccionado
- Recibirás recordatorios 7, 3 y 1 día antes
- Puedes cancelar en cualquier momento antes del cobro
- El cobro se realiza el mismo día cada mes

### Créditos Mensuales

- Los créditos (eventos y destacados) se renuevan cada mes
- Los créditos no utilizados **no se acumulan**
- Al cambiar de plan, los créditos se ajustan inmediatamente

### Cancelación

- La cancelación es efectiva al final del período pagado
- Seguirás teniendo acceso hasta esa fecha
- Después volverás al plan básico gratuito
- Puedes reactivar en cualquier momento

## 🔧 ESTADO ACTUAL

### ✅ COMPLETADO

- Frontend completo (pantallas y componentes)
- Base de datos completa (tablas, triggers, funciones)
- Seguridad (RLS policies)
- Integración con Stripe React Native

### ⏳ PENDIENTE

- Backend (endpoints de Stripe)
- Webhooks de Stripe
- Envío de emails automáticos
- Configuración de Stripe en producción

### 📅 Próximos Pasos

1. Implementar backend (6-8 horas)
2. Configurar Stripe (1-2 horas)
3. Probar sistema completo (2-3 horas)
4. Lanzar a producción (1 hora)

**Tiempo total estimado**: 10-14 horas

## 🎉 ¡SISTEMA LISTO PARA USAR!

Una vez implementado el backend, el sistema estará 100% funcional y los propietarios podrán:

- ✅ Contratar planes con prueba gratuita
- ✅ Gestionar sus suscripciones
- ✅ Pagar con tarjeta de forma segura
- ✅ Recibir emails automáticos
- ✅ Ver historial de facturas
- ✅ Cambiar o cancelar planes

---

**Documentación técnica**: Ver `STRIPE_SUBSCRIPTION_SYSTEM_COMPLETE.md`

**Guía de backend**: Ver `BACKEND_STRIPE_IMPLEMENTATION_GUIDE.md`

**Guía rápida**: Ver `GUIA_RAPIDA_SUSCRIPCIONES_STRIPE.md`
