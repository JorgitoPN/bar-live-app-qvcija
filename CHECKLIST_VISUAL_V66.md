
# ✅ CHECKLIST VISUAL v66.0

## 📱 VERIFICACIÓN SIMPLE

---

## 🍎 iOS - 3 CHECKS

### ✅ CHECK 1: Inicio de App
```
Abre Expo Go → Escanea QR

¿Qué ves?

✅ CORRECTO:
   Pantalla "Explorar" con locales

❌ INCORRECTO:
   Menú con "Standard Modal", "Form Sheet", etc.
```

### ✅ CHECK 2: Navegación
```
Toca cada tab del menú inferior

¿Funcionan todos?

✅ CORRECTO:
   Todos los tabs abren correctamente

❌ INCORRECTO:
   Algún tab no funciona o da error
```

### ✅ CHECK 3: Tamaños
```
Compara con versiones anteriores

¿Se ve igual?

✅ CORRECTO:
   Todo tiene el mismo tamaño que antes

❌ INCORRECTO:
   Algo se ve diferente
```

---

## 🤖 ANDROID - 7 CHECKS

### ✅ CHECK 1: Header de Explorar
```
Abre pantalla de Explorar

Observa el título "Explorar"

✅ CORRECTO:
   Título legible pero NO gigante (~17.6px)

❌ INCORRECTO:
   Título muy grande (como antes)
```

### ✅ CHECK 2: Caja de Búsqueda
```
Observa la caja de búsqueda

¿Es compacta?

✅ CORRECTO:
   Altura ~30px, compacta y discreta

❌ INCORRECTO:
   Altura ~50px, muy prominente
```

### ✅ CHECK 3: Tarjetas de Locales - Imagen
```
Observa la imagen de una tarjeta de local

¿Cuánto ocupa?

✅ CORRECTO:
   ~1/3 de la pantalla (~110px)
   Puedes ver 2-3 tarjetas completas

❌ INCORRECTO:
   ~1/2 de la pantalla (~200px)
   Solo ves 1 tarjeta completa
```

### ✅ CHECK 4: Tarjetas de Locales - Contenido
```
Observa el contenido de una tarjeta

¿Los textos son proporcionados?

✅ CORRECTO:
   Nombre: ~9.9px (legible pero no grande)
   Dirección: ~7.7px (proporcionada)
   Badges: ~6.6px (compactos)

❌ INCORRECTO:
   Todos los textos muy grandes
```

### ✅ CHECK 5: Menú Inferior - Cobertura
```
Observa el botón central "Explorar"

¿Cuánto cubre el fondo?

✅ CORRECTO:
   Fondo cubre ~65% del botón
   ~35% superior visible
   Borde blanco visible arriba

❌ INCORRECTO:
   Fondo cubre ~75% o más
   Desbordamiento visible
```

### ✅ CHECK 6: Menú Inferior - Iconos
```
Observa los iconos del menú inferior

¿Son visibles?

✅ CORRECTO:
   Iconos ~26px (bien visibles)
   Icono central ~28px

❌ INCORRECTO:
   Iconos ~22px (muy pequeños)
```

### ✅ CHECK 7: Consistencia de Headers
```
Navega entre pantallas:
- Explorar
- Favoritos
- Eventos
- Social
- Perfil

¿Todos los headers tienen la misma altura?

✅ CORRECTO:
   Todos ~75px de altura
   Títulos en la misma posición

❌ INCORRECTO:
   Alturas diferentes entre páginas
```

---

## 📊 TABLA DE VERIFICACIÓN

| Check | iOS | Android | Descripción |
|-------|-----|---------|-------------|
| 1 | ✅ | ✅ | App inicia correctamente |
| 2 | ✅ | ✅ | Navegación funciona |
| 3 | ✅ | ✅ | Sin errores en consola |
| 4 | ✅ | ✅ | Textos legibles |
| 5 | - | ✅ | Tarjetas compactas |
| 6 | - | ✅ | Búsqueda compacta |
| 7 | - | ✅ | Menú al 65% |
| 8 | - | ✅ | Headers consistentes |

---

## 🎯 CRITERIOS DE ÉXITO

### iOS:
```
✅ App inicia en Explorar
✅ No muestra menú de modales
✅ Sin cambios visuales
✅ Navegación fluida

→ SI TODO ES ✅: iOS CORRECTO
```

### Android:
```
✅ Textos más pequeños (pero legibles)
✅ Iconos proporcionados
✅ Búsqueda compacta
✅ Tarjetas con imagen pequeña
✅ Menú inferior al 65%
✅ Headers consistentes

→ SI TODO ES ✅: ANDROID CORRECTO
```

---

## 🔍 INSPECCIÓN VISUAL

### Tarjeta de Local (Android):

```
Mide visualmente:

┌─────────────────┐
│   IMAGEN        │  ← ¿Ocupa ~1/3 de pantalla?
│  (110px)        │     ✅ Sí → Correcto
├─────────────────┤     ❌ No → Problema
│ Nombre          │  ← ¿Es legible pero no grande?
│ Dirección       │     ✅ Sí → Correcto
│ [Categorías]    │     ❌ No → Problema
│ [Botones]       │
└─────────────────┘
```

### Menú Inferior (Android):

```
Observa el botón "Explorar":

        ┌─────────┐
        │ VISIBLE │  ← ¿Ves ~35% del botón?
        ├─────────┤     ✅ Sí → Correcto
    ┌───┴─────────┴───┐  ❌ No → Problema
    │   FONDO (65%)   │
    └─────────────────┘

¿El borde blanco es visible arriba?
✅ Sí → Correcto
❌ No → Problema
```

---

## 🚨 SEÑALES DE ALERTA

### iOS:

❌ **PROBLEMA**: Aparece menú de modales
→ **SOLUCIÓN**: Reinicia Expo Go completamente

❌ **PROBLEMA**: App no inicia
→ **SOLUCIÓN**: Verifica código QR, reinicia dispositivo

### Android:

❌ **PROBLEMA**: Textos aún muy grandes
→ **SOLUCIÓN**: Verifica que la app se haya actualizado

❌ **PROBLEMA**: Tarjetas aún grandes
→ **SOLUCIÓN**: Fuerza actualización (cierra y abre Expo Go)

❌ **PROBLEMA**: Menú desbordado
→ **SOLUCIÓN**: Verifica que sea la última versión

---

## 📸 CAPTURAS DE REFERENCIA

### Toma estas capturas para comparar:

#### iOS:
1. Pantalla de inicio (debe ser Explorar)
2. Menú inferior
3. Una pantalla cualquiera

#### Android:
1. Pantalla de Explorar (vista completa)
2. Una tarjeta de local (detalle)
3. Menú inferior (enfoque en botón Explorar)
4. Caja de búsqueda (detalle)
5. Header de cualquier pantalla

---

## ✅ CONFIRMACIÓN FINAL

### Marca cada item cuando lo verifiques:

#### iOS:
- [ ] App inicia en Explorar
- [ ] No hay menú de modales
- [ ] Navegación funciona
- [ ] Sin cambios visuales

#### Android:
- [ ] Textos más pequeños
- [ ] Iconos proporcionados
- [ ] Búsqueda compacta
- [ ] Tarjetas con imagen pequeña
- [ ] Menú inferior al 65%
- [ ] Headers consistentes
- [ ] Todo legible

### Si todos los checks están marcados:

```
┌─────────────────────────────────┐
│                                 │
│    ✅ IMPLEMENTACIÓN EXITOSA    │
│                                 │
│  La app funciona perfectamente  │
│   en ambas plataformas ✅       │
│                                 │
└─────────────────────────────────┘
```

---

## 🎉 RESULTADO ESPERADO

Después de verificar todos los checks:

### iOS:
- Profesional ✅
- Sin cambios ✅
- Funcional ✅

### Android:
- Profesional ✅
- Proporcionado ✅
- Consistente ✅

### Ambas:
- Paridad visual ✅
- Navegación fluida ✅
- Experiencia óptima ✅

---

**Versión**: v66.0  
**Tipo**: Checklist Visual  
**Tiempo**: 5 minutos  
**Estado**: 📋 LISTO PARA USAR
