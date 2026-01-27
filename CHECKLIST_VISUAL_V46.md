
# ✅ CHECKLIST VISUAL - v46.0

## 🎯 VERIFICACIÓN COMPLETA DE CORRECCIONES

---

## 1️⃣ AVATAR DE @JORGE

### ✅ Miniavatar del Menú Inferior
**Ubicación**: Parte inferior de la pantalla, botón de "Perfil"

**Qué verificar**:
- [ ] El avatar circular se muestra correctamente
- [ ] La imagen es la foto de perfil de Google de @jorge
- [ ] No hay icono de placeholder (persona)
- [ ] El avatar tiene borde blanco si hay momentos no vistos

**Cómo probar**:
1. Iniciar sesión como @jorge (jorgepereznoyagh@gmail.com)
2. Mirar el menú inferior
3. El último botón (Perfil) debe mostrar la foto de @jorge

---

### ✅ Avatar en Feed de Publicaciones
**Ubicación**: Página Social, en cada publicación

**Qué verificar**:
- [ ] El avatar se muestra en la esquina superior izquierda de cada publicación
- [ ] La imagen es la foto de perfil de @jorge
- [ ] El avatar es circular y del tamaño correcto

**Cómo probar**:
1. Ir a la página Social
2. Buscar publicaciones de @jorge
3. Verificar que el avatar se muestra correctamente

---

### ✅ Avatar en Mensajes
**Ubicación**: Página de Chats, en cada conversación

**Qué verificar**:
- [ ] El avatar se muestra en la lista de chats
- [ ] El avatar se muestra en la conversación
- [ ] La imagen es la foto de perfil de @jorge

**Cómo probar**:
1. Ir a Perfil → Chats
2. Abrir una conversación
3. Verificar que el avatar se muestra correctamente

---

## 2️⃣ SECCIÓN DE MOMENTOS

### ✅ Página Social - Carrusel de Momentos
**Ubicación**: Página Social, parte superior (debajo del header)

**Qué verificar**:
- [ ] El carrusel de momentos es visible
- [ ] El primer avatar es "Tu Momento" con botón +
- [ ] Los avatares son de 70px de diámetro (tamaño Instagram)
- [ ] Los avatares con momentos no vistos tienen borde verde neón
- [ ] Los avatares son clickeables

**Cómo probar**:
1. Ir a la página Social
2. Scroll hasta arriba
3. Verificar que el carrusel de momentos está visible
4. Hacer clic en un avatar con borde verde
5. Ver el momento
6. Cerrar el visor
7. Verificar que el borde verde desapareció

---

### ✅ Perfil de Usuario - Avatar con Momentos
**Ubicación**: Página de Perfil de Usuario, parte superior

**Qué verificar**:
- [ ] El avatar tiene borde verde si hay momentos no vistos
- [ ] El avatar es clickeable
- [ ] Al hacer clic, se abre el visor de momentos
- [ ] Hay un botón + en la esquina inferior derecha del avatar

**Cómo probar**:
1. Ir a Perfil
2. Verificar el avatar principal
3. Hacer clic en el avatar
4. Verificar que se abre el visor de momentos

---

### ✅ Perfil de Local - Avatar con Momentos
**Ubicación**: Página de Perfil de Local, parte superior

**Qué verificar**:
- [ ] El avatar tiene borde verde si hay momentos no vistos
- [ ] El avatar es clickeable
- [ ] Al hacer clic, se abre el visor de momentos
- [ ] Hay un botón + en la esquina inferior derecha del avatar (solo para propietarios)

**Cómo probar**:
1. Ir a un perfil de local
2. Verificar el avatar principal
3. Hacer clic en el avatar
4. Verificar que se abre el visor de momentos

---

## 3️⃣ BORDE VERDE EN MOMENTOS

### ✅ Comportamiento Correcto
**Qué debe pasar**:
1. **Antes de ver**: Borde verde neón brillante
2. **Durante la visualización**: Borde verde permanece
3. **Después de ver**: Borde verde desaparece INMEDIATAMENTE
4. **Sincronización**: El cambio se refleja en TODAS las páginas

**Cómo probar**:
1. Usuario A crea un momento
2. Usuario B inicia sesión
3. Usuario B ve el momento de A en:
   - Página Social (carrusel)
   - Perfil de Usuario A
4. Usuario B hace clic en el avatar con borde verde
5. Usuario B ve el momento completo
6. Usuario B cierra el visor
7. **VERIFICAR**: El borde verde debe haber desaparecido en:
   - Carrusel de momentos (página social)
   - Perfil de Usuario A
   - Miniavatar (si aplica)

---

## 4️⃣ PERFILES DE LOCALES

### ✅ Acciones Eliminadas
**Qué NO debe aparecer en perfiles de locales**:
- ❌ Botón "Estoy en este local"
- ❌ Botón "Entrar en la sala virtual"
- ❌ Sección de check-in
- ❌ Sección de sala virtual

**Qué SÍ debe aparecer**:
- ✅ Botón "Seguir" / "Siguiendo"
- ✅ Botón "Llamar" (si tiene teléfono)
- ✅ Botón "Mensaje"
- ✅ Botón "Cómo llegar"
- ✅ Información del local
- ✅ Eventos del local
- ✅ Ofertas de empleo

**Cómo probar**:
1. Ir a cualquier perfil de local
2. Scroll por toda la página
3. Verificar que NO aparecen los botones eliminados

---

## 5️⃣ BAR A COVIÑA - PERFIL SOCIAL

### ✅ Sin Plan de Pago
**Estado actual**: Plan FREE (sin perfil social)

**Qué debe pasar al intentar acceder**:
1. Se muestra un Alert con mensaje persuasivo
2. Opciones:
   - "Volver" → Regresa a Explorar
   - "Ver Planes" → Abre página de planes

**Mensaje del Alert**:
```
🔒 Perfil Social No Disponible

Este local no tiene un perfil social activo.

💡 ¿Eres el propietario?

Activa un plan de suscripción para:
✓ Hacer visible tu perfil social
✓ Publicar eventos y promociones
✓ Destacar tu local en búsquedas
✓ Acceder a estadísticas avanzadas
✓ Atraer más clientes cada día

No estás comprando un plan, estás invirtiendo en más clientes.
```

**Cómo probar**:
1. Buscar "Bar A Coviña" en Explorar
2. Hacer clic en el local
3. Intentar acceder al perfil social
4. Verificar que se muestra el mensaje
5. Hacer clic en "Ver Planes"
6. Verificar que se abre la página de planes

---

### ✅ Métricas Sociales Ocultas
**Ubicación**: Perfil de Local, sección de estadísticas

**Qué debe mostrarse**:
```
┌─────────────────────────────┐
│ Publicaciones | 🔒 Perfil   │
│      0        │    Social   │
│               │  No Activo  │
└─────────────────────────────┘
```

**Qué NO debe mostrarse**:
- ❌ Número de seguidores
- ❌ Número de siguiendo
- ❌ Botones clickeables para ver listas

**Cómo probar**:
1. Ir al perfil de Bar A Coviña
2. Verificar la sección de estadísticas
3. Solo debe mostrar "Publicaciones" y "🔒 Perfil Social No Activo"

---

## 6️⃣ TARJETA "CRÉDITOS DISPONIBLES"

### ✅ Diseño Mejorado
**Ubicación**: Página de Gestión, sección de créditos

**Estructura visual**:
```
┌─────────────────────────────────────┐
│ 🎁 Créditos Disponibles             │
│    Úsalos para promocionar tu local │
├─────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐          │
│ │ ⭐       │  │ 📅       │          │
│ │    3     │  │    5     │          │
│ │Destacados│  │ Eventos  │          │
│ │Aparece   │  │Publica   │          │
│ │primero   │  │eventos   │          │
│ └──────────┘  └──────────┘          │
├─────────────────────────────────────┤
│ 🔄 Tus créditos se renuevan el      │
│    15 de febrero                    │
├─────────────────────────────────────┤
│ ❓ Los créditos se renuevan cada    │
│    mes con tu plan. Úsalos para     │
│    destacar tu local y publicar     │
│    eventos.                         │
└─────────────────────────────────────┘
```

**Qué verificar**:
- [ ] Título claro: "Créditos Disponibles"
- [ ] Subtítulo explicativo
- [ ] Grid de 2 columnas (Destacados y Eventos)
- [ ] Números grandes y visibles
- [ ] Iconos coloridos
- [ ] Descripción de cada tipo de crédito
- [ ] Fecha de renovación
- [ ] Texto de ayuda

---

## 7️⃣ PÁGINA "VER PLANES"

### ✅ Sin Solapamientos
**Ubicación**: Gestión → Ver Planes

**Estructura visual**:
```
┌─────────────────────────────┐
│ 📈 Haz Crecer Tu Negocio    │
│ No estás comprando un plan, │
│ estás invirtiendo en más    │
│ clientes                    │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ℹ️ Plan actual: FREE        │
└─────────────────────────────┘

┌─────────────────────────────┐
│ PLAN FREE                   │
│ Gratis                      │
│                             │
│ ✓ Sin eventos               │
│ ✓ Sin destacados            │
│ ✗ Sin perfil social         │
│                             │
│ [Continuar con lo básico]   │
└─────────────────────────────┘

    ↓ ESPACIO (24px) ↓

┌─────────────────────────────┐
│ ⭐ MÁS POPULAR              │
│ PLAN ESTÁNDAR               │
│ 9.99€/mes                   │
│ Menos de un café al día     │
│                             │
│ ✓ Crea 5 eventos al mes     │
│ ✓ Supera a tu competencia   │
│   3 veces/mes               │
│ ✓ Perfil social activo      │
│ ✓ Visibilidad mejorada      │
│                             │
│ [Empezar a Crecer]          │
└─────────────────────────────┘

    ↓ ESPACIO (24px) ↓

┌─────────────────────────────┐
│ PLAN PREMIUM                │
│ 19.99€/mes                  │
│ Menos de un café al día     │
│                             │
│ ✓ Crea 15 eventos al mes    │
│ ✓ Supera a tu competencia   │
│   10 veces/mes              │
│ ✓ Descubre quién te visita  │
│ ✓ Visibilidad máxima        │
│                             │
│ [Dominar mi Zona]           │
└─────────────────────────────┘
```

**Qué verificar**:
- [ ] Las cards NO se solapan
- [ ] Hay espacio entre cada card (24px)
- [ ] El Plan Estándar tiene badge "MÁS POPULAR"
- [ ] El Plan Estándar es ligeramente más grande (scale: 1.05)
- [ ] Los mensajes son persuasivos (no técnicos)
- [ ] Los botones tienen textos motivadores
- [ ] Hay sección de prueba social al final
- [ ] Hay garantía de satisfacción al final

---

## 8️⃣ POTENCIAL ALCANZADO

### ✅ Cálculo Correcto
**Ubicación**: Página de Gestión, sección de potencial

**Estructura visual**:
```
┌─────────────────────────────────────┐
│ 👥 Potencial de clientes alcanzado  │
│                                     │
│ ✅ Excelente alcance!               │
├─────────────────────────────────────┤
│ ████████████░░░░░░░░░░░░░░░ 50%    │
├─────────────────────────────────────┤
│ ⭐ Destacado Activo (+30%)          │
│ ⚡ Plan Estándar (+15%)             │
├─────────────────────────────────────┤
│ 💡 Mejora tu alcance: Contrata un   │
│    plan superior para destacar tu   │
│    local y atraer más clientes.     │
│    [Ver Planes →]                   │
├─────────────────────────────────────┤
│ ❓ ¿Cómo se calcula?                │
│ • Base: 20%                         │
│ • Destacar local: +30%              │
│ • Plan Estándar: +15%               │
│ • Plan Premium: +30%                │
└─────────────────────────────────────┘
```

**Qué verificar**:
- [ ] Barra de progreso con color según porcentaje
- [ ] Porcentaje visible y grande
- [ ] Chips de características activas
- [ ] Mensaje explicativo con emoji
- [ ] Botón para ver planes (si potencial < 80%)
- [ ] Explicación del cálculo
- [ ] NO incluye eventos en el cálculo

**Cómo probar**:
1. Ir a Gestión (como propietario)
2. Buscar la sección "Potencial de clientes alcanzado"
3. Verificar que el cálculo es correcto:
   - Base: 20%
   - Si tiene destacado activo: +30%
   - Si tiene Plan Estándar: +15%
   - Si tiene Plan Premium: +30%

---

## 9️⃣ PLAN GRATUITO AUTOMÁTICO

### ✅ Asignación Automática
**Qué debe pasar**:
1. Propietario reclama un local
2. Sistema asigna automáticamente plan FREE
3. Local queda visible en la plataforma
4. Propietario puede mejorar el plan cuando quiera

**Cómo probar**:
1. Crear una solicitud de propietario
2. Aprobar la solicitud (como admin)
3. Verificar en base de datos:
```sql
SELECT 
  l.nombre,
  s.estado,
  p.nombre as plan_nombre
FROM locales l
JOIN suscripciones_locales s ON l.id = s.local_id
JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.propietario_id = '[ID_DEL_PROPIETARIO]'
  AND s.estado = 'activa';
```
4. Debe mostrar plan "free" con estado "activa"

---

## 🔟 MÉTRICAS SOCIALES

### ✅ Ocultas sin Plan Activo
**Ubicación**: Perfil de Local, sección de estadísticas

**Con Plan FREE (sin perfil social)**:
```
┌─────────────────────────────┐
│ Publicaciones | 🔒 Perfil   │
│      0        │    Social   │
│               │  No Activo  │
└─────────────────────────────┘
```

**Con Plan ESTÁNDAR o PREMIUM (con perfil social)**:
```
┌─────────────────────────────┐
│ Publicaciones | Seguidores  │
│      5        │     120     │
│               |             │
│               | Siguiendo   │
│               │     45      │
└─────────────────────────────┘
```

**Qué verificar**:
- [ ] Si plan FREE: Solo muestra "Publicaciones" y "🔒 Perfil Social No Activo"
- [ ] Si plan ESTÁNDAR/PREMIUM: Muestra "Publicaciones", "Seguidores" y "Siguiendo"
- [ ] Los números son clickeables (si tiene perfil social)
- [ ] Al hacer clic, se abre la lista de seguidores/siguiendo

**Cómo probar**:
1. Ir al perfil de Bar A Coviña (plan FREE)
2. Verificar que solo muestra "Publicaciones" y candado
3. Ir al perfil de un local con plan ESTÁNDAR
4. Verificar que muestra todas las métricas

---

## 🎨 DISEÑO GENERAL

### ✅ Coherencia Visual
**Qué verificar en toda la app**:
- [ ] Los avatares se cargan correctamente
- [ ] No hay iconos de placeholder donde debería haber fotos
- [ ] Los bordes verdes funcionan correctamente
- [ ] Las cards no se solapan
- [ ] Los mensajes son claros y persuasivos
- [ ] Los botones tienen textos motivadores
- [ ] La navegación es fluida

---

## 🐛 ERROR DE LOGIN

### ⚠️ "Database error granting user"
**Estado**: Corregido en v46.0

**Qué se hizo**:
1. ✅ Añadido trigger `sync_last_sign_in` para sincronizar `last_sign_in_at`
2. ✅ Mejorado trigger `sync_avatar_from_auth_metadata`
3. ✅ Sincronizados todos los avatares de usuarios Google existentes

**Si el error persiste**:
1. Cerrar y abrir la app
2. Intentar login nuevamente
3. Verificar conexión de red
4. Revisar logs de Supabase Auth

**Cómo probar**:
1. Cerrar sesión
2. Iniciar sesión con @jorge
3. Verificar que NO aparece el error
4. Verificar que el login es exitoso

---

## 📊 RESUMEN DE ESTADO

### ✅ Correcciones Implementadas: 10/10

| # | Corrección | Estado | Archivo Principal |
|---|------------|--------|-------------------|
| 1 | Avatar @jorge | ✅ CORREGIDO | Base de datos + triggers |
| 2 | Momentos en social | ✅ VISIBLE | `app/(tabs)/social/index.tsx` |
| 3 | Borde verde | ✅ FUNCIONA | `components/momento/MomentoCarousel.tsx` |
| 4 | Acciones locales | ✅ ELIMINADAS | `app/(tabs)/perfil/local.tsx` |
| 5 | Bar A Coviña | ✅ BLOQUEADO | `app/(tabs)/perfil/local.tsx` |
| 6 | Créditos | ✅ MEJORADA | `components/gestion/SimplifiedCreditsCard.tsx` |
| 7 | Planes | ✅ REDISEÑADA | `app/gestion/planes-suscripcion.tsx` |
| 8 | Potencial | ✅ CORREGIDO | `components/gestion/CustomerPotentialBar.tsx` |
| 9 | Plan gratuito | ✅ AUTOMÁTICO | Triggers en base de datos |
| 10 | Métricas | ✅ OCULTAS | `app/(tabs)/perfil/local.tsx` |

---

## 🚀 PRÓXIMOS PASOS

1. **Probar todas las funcionalidades** siguiendo este checklist
2. **Verificar que @jorge ve su avatar** en todas las secciones
3. **Verificar que Bar A Coviña** muestra el mensaje correcto
4. **Verificar que los momentos** se sincronizan correctamente
5. **Verificar que las páginas** se ven correctamente sin solapamientos

---

**Versión**: v46.0  
**Fecha**: 2025-01-29  
**Estado**: ✅ LISTO PARA PRUEBAS  
**Siguiente Paso**: Verificación de usuario
