
# 🎯 Guía Rápida: Asignación de Locales a Usuarios

## ✅ Problema Resuelto

**Antes:** Después de asignar un local a un usuario, el usuario no podía ver el local en su perfil.

**Ahora:** El sistema sincroniza automáticamente todos los datos y el usuario puede ver y gestionar su local inmediatamente.

## 🔧 Cómo Asignar un Local

### Paso 1: Acceder al Panel de Asignación
1. Inicia sesión como **Admin**
2. Ve a **Admin** → **Asignar Local a Usuario**

### Paso 2: Buscar Usuario
1. En la sección "Buscar Usuario", escribe:
   - Nombre del usuario
   - Email
   - Username
2. Selecciona el usuario de los resultados

### Paso 3: Buscar Local
1. En la sección "Buscar Local", escribe:
   - Nombre del local
   - Dirección
2. Selecciona el local de los resultados

### Paso 4: Seleccionar Rol
Elige el rol que tendrá el usuario:
- **Propietario**: Control total del local (recomendado)
- **Administrador**: Gestión y moderación
- **Editor**: Solo edición de contenido

### Paso 5: Confirmar
1. Revisa el resumen de asignación
2. Click en **"Confirmar Asignación"**
3. ✅ ¡Listo! El sistema hace automáticamente:
   - Crea la asignación en la base de datos
   - Sincroniza el propietario del local
   - Cambia el rol del usuario a "propietario"
   - Crea una suscripción gratuita
   - Otorga créditos de bienvenida (1 destacado + 1 evento)
   - Envía notificación al usuario

## 🎁 Créditos de Bienvenida

Cuando asignas un local, el usuario recibe automáticamente:

- **1 Crédito de Destacado**: Para destacar su local durante 24 horas
- **1 Crédito de Evento**: Para publicar un evento gratis

Estos créditos permiten al usuario probar las funciones premium antes de suscribirse.

## 👤 Qué Ve el Usuario

### En "Gestión de Locales" → "Mis Locales":
```
✅ El local aparece en la lista
✅ Puede ver el estado (Aprobado)
✅ Puede editar el local
✅ Puede ver el perfil del local
```

### En "Perfil":
```
✅ Puede cambiar entre perfil personal y perfil del local
✅ No aparece mensaje de error
✅ Puede gestionar el local desde su perfil
```

### En "Perfil del Local":
```
✅ El perfil se muestra correctamente
✅ No aparece mensaje de suscripción requerida
✅ Puede crear publicaciones, eventos, ofertas de empleo
✅ Puede usar sus créditos de bienvenida
```

## 🔄 Sincronización Automática

El sistema ahora mantiene la consistencia automáticamente mediante triggers:

### Cuando se Asigna un Local:
1. Se crea entrada en `propietarios_locales`
2. **TRIGGER** actualiza `locales.propietario_id`
3. **TRIGGER** crea suscripción gratuita con créditos
4. Usuario recibe notificación

### Cuando se Quita una Asignación:
1. Se desactiva entrada en `propietarios_locales`
2. **TRIGGER** limpia `locales.propietario_id`
3. Suscripción se cancela
4. Local queda libre

## 📊 Ver Asignaciones Actuales

En la página "Asignar Local a Usuario", la sección superior muestra:

- **Locales Asignados**: Lista de todos los locales con propietario
- **Información del Local**: Nombre, dirección, tipo
- **Información del Propietario**: Nombre, email, avatar
- **Rol**: Propietario, Administrador o Editor
- **Botón Quitar**: Para eliminar la asignación

## ⚠️ Notas Importantes

### Roles:
- **Propietario**: Tiene control total y puede gestionar suscripciones
- **Administrador**: Puede moderar pero no gestionar pagos
- **Editor**: Solo puede editar contenido

### Suscripciones:
- Se crea automáticamente una suscripción **gratuita**
- El usuario puede actualizar a planes de pago desde su panel
- Los créditos de bienvenida se otorgan una sola vez

### Múltiples Locales:
- Un usuario puede tener múltiples locales asignados
- Cada local tiene su propia suscripción independiente
- El usuario puede cambiar entre perfiles de locales

## 🐛 Solución de Problemas

### Si el local no aparece en "Mis Locales":
1. Verifica que la asignación esté activa en el panel de admin
2. Refresca la página (pull to refresh)
3. Cierra sesión y vuelve a iniciar sesión

### Si aparece error de suscripción:
1. Verifica en Admin que la suscripción esté activa
2. El trigger debería haberla creado automáticamente
3. Si no existe, quita y vuelve a asignar el local

### Si el propietario_id no se sincroniza:
1. Los triggers deberían hacerlo automáticamente
2. Si falla, verifica los logs de la base de datos
3. Contacta con soporte técnico

## 🎉 Resultado Final

Ahora el proceso de asignación es:
- ✅ **Automático**: Todo se sincroniza sin intervención manual
- ✅ **Confiable**: Los triggers garantizan consistencia
- ✅ **Completo**: Incluye suscripción y créditos de bienvenida
- ✅ **Inmediato**: El usuario puede usar su local al instante

## 📞 Contacto

Si encuentras algún problema con la asignación de locales, verifica:
1. Logs de la consola del navegador
2. Logs de la base de datos (triggers)
3. Estado de las tablas: `propietarios_locales`, `locales`, `suscripciones_locales`

---

**Versión:** 1.0.0  
**Fecha:** 2025-01-27  
**Estado:** ✅ Implementado y Verificado
