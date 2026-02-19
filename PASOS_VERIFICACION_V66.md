
# 🔍 PASOS DE VERIFICACIÓN v66.0

## 📱 VERIFICACIÓN EN iOS (5 PASOS)

### PASO 1: Preparación
```
1. Cierra completamente Expo Go
   - Desliza hacia arriba en el selector de apps
   - Desliza Expo Go hacia arriba para cerrarla

2. Abre Expo Go nuevamente
   - Toca el icono de Expo Go

3. Escanea el código QR del proyecto
   - O selecciona el proyecto de la lista
```

### PASO 2: Verificación de Inicio
```
✅ CORRECTO:
┌─────────────────────┐
│    BarLive          │
├─────────────────────┤
│  Explorar      🗺️ ⚙️│  ← Pantalla de Explorar
│  🔍 Buscar...       │
│  ☕ 🍽️ 🍺 🍻 🍸 💃 │
│  [Tarjetas...]      │
└─────────────────────┘

❌ INCORRECTO:
┌─────────────────────┐
│    Expo Go          │
├─────────────────────┤
│ Standard Modal      │  ← Menú de modales
│   Try It            │     (NO DEBE APARECER)
│ Form Sheet          │
│   Try It            │
└─────────────────────┘
```

### PASO 3: Navegación
```
Toca cada tab del menú inferior:
1. Eventos → ✅ Debe abrir
2. Favoritos → ✅ Debe abrir
3. Explorar → ✅ Debe abrir
4. Social → ✅ Debe abrir
5. Perfil → ✅ Debe abrir
```

### PASO 4: Verificación Visual
```
Compara con versiones anteriores:
- ¿Los textos tienen el mismo tamaño? ✅
- ¿Los iconos tienen el mismo tamaño? ✅
- ¿Las tarjetas se ven igual? ✅
- ¿El menú inferior se ve igual? ✅
```

### PASO 5: Confirmación
```
Si todo lo anterior es ✅:
→ iOS FUNCIONA CORRECTAMENTE
```

---

## 🤖 VERIFICACIÓN EN ANDROID (10 PASOS)

### PASO 1: Pantalla de Explorar - Header
```
Abre la pantalla de Explorar

Verifica el header:
┌─────────────────────────┐
│ Explorar          🗺️ ⚙️ │ ← Título: ~17.6px
└─────────────────────────┘   Iconos: ~14.4px

✅ El título debe ser legible pero NO gigante
✅ Los iconos deben ser proporcionados
✅ La altura total debe ser ~75px
```

### PASO 2: Pantalla de Explorar - Búsqueda
```
Observa la caja de búsqueda:
┌─────────────────────────┐
│ 🔍 Buscar locales... 🎛️│ ← Altura: ~30px
└─────────────────────────┘   Texto: 8.8px

✅ Debe ser COMPACTA (aproximadamente la mitad que antes)
✅ El texto debe ser legible
✅ Los iconos deben ser proporcionados
```

### PASO 3: Pantalla de Explorar - Categorías
```
Observa las categorías:
☕    🍽️    🍺    🍻    🍸    💃
Cafés  Rest  Bares Pubs  Coct  Disc

✅ Iconos: ~16.8px (visibles pero no gigantes)
✅ Texto: ~6.6px (legible)
✅ Contenedores: ~36x36px (compactos)
```

### PASO 4: Pantalla de Explorar - Tarjetas de Locales
```
Observa una tarjeta de local:
┌─────────────────────────┐
│ ┌─────────────────────┐ │
│ │                     │ │
│ │   IMAGEN (110px)    │ │ ← CRÍTICO: Debe ser ~110px
│ │                     │ │   (aproximadamente 1/3 de pantalla)
│ ├─────────────────────┤ │
│ │ Nombre (9.9px)      │ │ ← Legible pero no grande
│ │ Dirección (7.7px)   │ │ ← Proporcionado
│ │ [Categorías] (6.6px)│ │ ← Compactas
│ │ [Botones] (7.15px)  │ │ ← Adecuados
│ └─────────────────────┘ │
└─────────────────────────┘

✅ Debes poder ver 2-3 tarjetas completas sin scroll
✅ La imagen debe ocupar ~1/3 de la pantalla
✅ Todos los textos deben ser legibles
```

### PASO 5: Pantalla de Explorar - Banner "Reclama tu local"
```
Observa el banner:
┌─────────────────────────────┐
│ 🏢 Reclama tu local o crea  │ ← Título: 7.7px
│    uno nuevo                │   Subtítulo: 6.3px
│    ¿Eres propietario?...    │   Icono: 13.2px
└─────────────────────────────┘

✅ Debe ser compacto
✅ Texto legible
✅ No debe ocupar mucho espacio
```

### PASO 6: Pantalla de Favoritos
```
Navega a Favoritos

Verifica:
┌─────────────────────────┐
│ Locales Favoritos       │ ← Header: 75px
│ 🔍 Buscar... 🎛️         │ ← Búsqueda: ~30px
│ ☕ 🍽️ 🍺 🍻 🍸 💃      │ ← Categorías
│ [Tarjetas...]           │ ← Mismas que Explorar
└─────────────────────────┘

✅ Header misma altura que Explorar
✅ Búsqueda compacta
✅ Tarjetas proporcionadas
```

### PASO 7: Pantalla de Eventos
```
Navega a Eventos

Verifica:
┌─────────────────────────┐
│ Eventos                 │ ← Header: 75px
│ 🔍 Buscar... 🎛️         │ ← Búsqueda: ~30px
│ [Hoy] [Próximos]        │ ← Tabs: 8.25px
│ ☕ 🍽️ 🍺 🍻 🍸 💃      │ ← Categorías
│ [Tarjetas eventos...]   │ ← Imagen: 110px
└─────────────────────────┘

✅ Todo consistente con otras pantallas
✅ FAB (botón +): 44x44px
```

### PASO 8: Pantalla Social
```
Navega a Social

Verifica:
┌─────────────────────────┐
│ Social      💬 🔔 🔍 ➕ │ ← Header: 75px
│                         │   Iconos: 13.2px
│ [Momentos...]           │
│ [Ubicaciones amigos...] │ ← Tarjetas: 80px ancho
│ [Posts...]              │ ← Contenido: 8.25px
└─────────────────────────┘

✅ Header consistente
✅ Tarjetas de ubicación compactas
✅ Posts proporcionados
```

### PASO 9: Pantalla de Perfil
```
Navega a Perfil

Verifica:
┌─────────────────────────┐
│ Mi Perfil    💬 🔔 ⚙️   │ ← Header: 75px
│                         │
│ 👤 Nombre (12.1px)      │ ← Nombre: 12.1px
│    @username (8.25px)   │   Username: 8.25px
│                         │
│  50    100    75        │ ← Stats: 12.1px
│ Posts  Seg.  Sig.       │   Labels: 7.7px
│                         │
│ [Grid de posts...]      │
└─────────────────────────┘

✅ Estadísticas legibles
✅ Grid proporcionado
```

### PASO 10: Menú Inferior (CRÍTICO)
```
Observa el menú inferior en cualquier pantalla:

        ┌─────────┐
        │         │
        │ EXPLORAR│  ← 35% visible
        │         │    (19.6px)
        ├─────────┤
    ┌───┴─────────┴───┐
    │                 │
    │  FONDO (65%)    │  ← 36.4px cubiertos
    │                 │
    │  📅 ❤️ 🧭 👥 👤 │  ← Iconos: 26px
    │                 │
    └─────────────────┘

✅ CRÍTICO: El fondo NO debe cubrir más del 65% del botón
✅ El 35% superior del botón debe quedar visible
✅ El borde blanco debe ser visible en todo el perímetro superior
✅ Los iconos deben ser más grandes que antes (26px vs 22px)
```

---

## 🎨 COMPARACIÓN VISUAL RÁPIDA

### Tarjeta de Local (Android):

**ANTES**:
```
┌─────────────────┐
│                 │
│                 │
│     IMAGEN      │  200px
│   MUY GRANDE    │
│                 │
│                 │
├─────────────────┤
│ Nombre Grande   │  18px
│ Dirección Grande│  14px
└─────────────────┘
```

**AHORA**:
```
┌─────────────────┐
│   IMAGEN        │  110px
│  COMPACTA       │
├─────────────────┤
│ Nombre          │  9.9px
│ Dirección       │  7.7px
└─────────────────┘
```

---

## ⚡ PRUEBA ULTRA RÁPIDA (2 MINUTOS)

### iOS:
1. Abre app
2. ¿Va a Explorar? → ✅

### Android:
1. Abre Explorar
2. ¿Tarjetas pequeñas? → ✅
3. ¿Búsqueda compacta? → ✅
4. ¿Menú al 65%? → ✅

**Si todo es ✅ → ÉXITO**

---

## 📞 AYUDA RÁPIDA

### Problema: iOS menú de modales
→ Reinicia Expo Go

### Problema: Android textos grandes
→ Verifica Platform.OS

### Problema: Menú desbordado
→ Verifica coveragePercent

---

## 🎯 ARCHIVOS CLAVE

1. `app/index.tsx` → Redirect
2. `app/_layout.tsx` → Modales
3. `styles/commonStyles.ts` → Tamaños
4. `TabNavigationBar.tsx` → Menú
5. `TarjetaLocal.tsx` → Tarjetas

---

**v66.0** | ⚡ Quick Ref | 📋 2 min read
