
# 🧪 Guía de Pruebas - Casa Adolfo Visibilidad v35.0

## 📋 Objetivo

Verificar que el local "Casa Adolfo" aparece correctamente en búsqueda y en la página "Explorar" para todos los usuarios, independientemente de si son propietarios, administradores o usuarios regulares.

## 🎯 Escenarios de Prueba

### Escenario 1: Búsqueda con Usuario Regular (@barlive1)

**Usuario**: @barlive1 (barliveapp@gmail.com)
**Rol**: Cliente

#### Pasos:
1. Iniciar sesión con @barlive1
2. Ir a la página "Social"
3. Hacer clic en el icono de búsqueda (lupa) en el header
4. Buscar "Casa Adolfo"

#### Resultado Esperado:
✅ Casa Adolfo debe aparecer en los resultados de búsqueda con:
- Nombre: "Casa Adolfo"
- Username: "@casa_adolfo"
- Badge: "Local"
- Imagen del local

#### Resultado Anterior (Antes de la Corrección):
❌ No aparecía ningún resultado

---

### Escenario 2: Página Explorar con Usuario Regular (@barlive1)

**Usuario**: @barlive1 (barliveapp@gmail.com)
**Rol**: Cliente

#### Pasos:
1. Iniciar sesión con @barlive1
2. Ir a la página "Explorar"
3. Buscar "Casa Adolfo" en el buscador de la página
4. Alternativamente, navegar por la lista de locales

#### Resultado Esperado:
✅ Casa Adolfo debe aparecer en la lista de locales

#### Resultado Anterior (Antes de la Corrección):
❌ No aparecía en la lista

---

### Escenario 3: Búsqueda Sin Iniciar Sesión

**Usuario**: Sin autenticar

#### Pasos:
1. Cerrar sesión (si está iniciada)
2. Ir a la página "Social"
3. Hacer clic en el icono de búsqueda
4. Buscar "Casa Adolfo"

#### Resultado Esperado:
✅ Casa Adolfo debe aparecer en los resultados de búsqueda

---

### Escenario 4: Página Explorar Sin Iniciar Sesión

**Usuario**: Sin autenticar

#### Pasos:
1. Cerrar sesión (si está iniciada)
2. Ir a la página "Explorar"
3. Buscar "Casa Adolfo" en el buscador

#### Resultado Esperado:
✅ Casa Adolfo debe aparecer en la lista de locales

---

### Escenario 5: Búsqueda con Usuario Propietario (@jorge)

**Usuario**: @jorge (jorgitopn)
**Rol**: Propietario de Casa Adolfo

#### Pasos:
1. Iniciar sesión con @jorge
2. Ir a la página "Social"
3. Hacer clic en el icono de búsqueda
4. Buscar "Casa Adolfo"

#### Resultado Esperado:
✅ Casa Adolfo debe aparecer en los resultados de búsqueda

---

### Escenario 6: Verificar Estado de Suscripción

**Usuario**: Cualquier usuario

#### Pasos:
1. Buscar "Casa Adolfo" en la búsqueda
2. Hacer clic en el resultado para ir al perfil del local
3. Verificar que el perfil se carga correctamente

#### Resultado Esperado:
✅ El perfil de Casa Adolfo debe cargarse correctamente
✅ Debe mostrar información del local
✅ Debe mostrar el badge de "Local" o indicador de plan activo

---

## 🔍 Verificación Técnica

### Consulta SQL de Verificación

```sql
-- Verificar que Casa Adolfo tiene suscripción activa
SELECT 
  l.id,
  l.nombre,
  l.username,
  l.activo,
  l.perfil_visible,
  sl.estado as subscription_estado,
  sl.fecha_inicio
FROM locales l
LEFT JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE l.nombre ILIKE '%casa adolfo%';
```

**Resultado Esperado**:
```json
{
  "nombre": "Casa Adolfo",
  "username": "casa_adolfo",
  "activo": true,
  "perfil_visible": true,
  "subscription_estado": "activa"
}
```

### Verificar Política RLS

```sql
-- Verificar que la política RLS existe
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'suscripciones_locales'
  AND policyname = 'Everyone can view active subscriptions for local discovery';
```

**Resultado Esperado**:
```json
{
  "policyname": "Everyone can view active subscriptions for local discovery",
  "cmd": "SELECT",
  "qual": "(estado = 'activa'::text)"
}
```

---

## 📊 Checklist de Verificación

### Búsqueda
- [ ] Casa Adolfo aparece en búsqueda con usuario @barlive1
- [ ] Casa Adolfo aparece en búsqueda sin iniciar sesión
- [ ] Casa Adolfo aparece en búsqueda con usuario @jorge
- [ ] La búsqueda muestra la imagen del local correctamente
- [ ] La búsqueda muestra el badge "Local" correctamente

### Página Explorar
- [ ] Casa Adolfo aparece en la lista de locales con usuario @barlive1
- [ ] Casa Adolfo aparece en la lista de locales sin iniciar sesión
- [ ] Casa Adolfo aparece en la lista de locales con usuario @jorge
- [ ] El local se muestra con la información correcta (nombre, imagen, ubicación)

### Perfil del Local
- [ ] Se puede acceder al perfil de Casa Adolfo desde búsqueda
- [ ] Se puede acceder al perfil de Casa Adolfo desde Explorar
- [ ] El perfil muestra toda la información correctamente
- [ ] El perfil muestra el indicador de plan activo

### Verificación Técnica
- [ ] La consulta SQL de verificación devuelve Casa Adolfo
- [ ] La política RLS existe y está activa
- [ ] No hay errores en los logs relacionados con RLS

---

## 🐛 Problemas Conocidos (Resueltos)

### Problema 1: Local No Aparece en Búsqueda
**Estado**: ✅ Resuelto
**Causa**: Política RLS restrictiva en `suscripciones_locales`
**Solución**: Nueva política que permite ver suscripciones activas

### Problema 2: Local Desaparece Cuando Propietario Inactivo
**Estado**: ✅ Resuelto
**Causa**: Misma que Problema 1
**Solución**: La visibilidad del local ya no depende del estado del propietario

---

## 📝 Notas Adicionales

### Usuarios de Prueba

| Usuario | Email | Rol | Contraseña |
|---------|-------|-----|------------|
| @barlive1 | barliveapp@gmail.com | Cliente | (solicitar) |
| @jorge | (solicitar) | Propietario | (solicitar) |

### Locales de Prueba

| Local | Username | Propietario | Suscripción |
|-------|----------|-------------|-------------|
| Casa Adolfo | @casa_adolfo | @jorge | Activa ✅ |

---

## 🚀 Próximos Pasos Después de las Pruebas

1. Si todas las pruebas pasan ✅:
   - Marcar el ticket como resuelto
   - Documentar en el changelog
   - Notificar al equipo

2. Si alguna prueba falla ❌:
   - Documentar el fallo específico
   - Revisar los logs de la aplicación
   - Verificar las políticas RLS en Supabase
   - Contactar al equipo de desarrollo

---

**Fecha de Creación**: 2025-01-XX
**Versión**: v35.0
**Estado**: 📋 Listo para Pruebas
