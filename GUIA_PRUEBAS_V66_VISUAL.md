
# 🧪 GUÍA DE PRUEBAS VISUALES v66.0

## 📋 CHECKLIST COMPLETO DE VERIFICACIÓN

Esta guía te ayudará a verificar sistemáticamente todos los cambios implementados en la versión v66.0.

---

## 🍎 PRUEBAS EN iOS

### ✅ PRUEBA 1: Inicio de la App (CRÍTICO)

**Objetivo**: Verificar que la app NO muestre el menú de modales de Expo Go

**Pasos**:
1. Cierra completamente la app de Expo Go
2. Abre Expo Go nuevamente
3. Escanea el código QR o abre el proyecto

**Resultado Esperado**:
- ✅ La app debe iniciar directamente en la pantalla "Explorar"
- ✅ NO debe aparecer ningún menú con opciones de modales
- ✅ NO debe mostrar "Standard Modal", "Form Sheet", "Transparent Modal"

**Si falla**:
- Verifica que `app/_layout.tsx` tenga la condición `{Platform.OS !== 'ios' && (...)}`
- Verifica que `app/index.tsx` haga redirect directo a `/(tabs)/explorar`

### ✅ PRUEBA 2: Navegación General

**Objetivo**: Verificar que todas las pantallas sean accesibles

**Pasos**:
1. Navega a cada tab del menú inferior:
   - Eventos
   - Favoritos
   - Explorar (botón central)
   - Social
   - Perfil

**Resultado Esperado**:
- ✅ Todas las pantallas deben cargar correctamente
- ✅ No debe haber errores de navegación
- ✅ El menú inferior debe funcionar perfectamente

### ✅ PRUEBA 3: Tamaños Visuales

**Objetivo**: Verificar que NO haya cambios en los tamaños

**Pasos**:
1. Compara visualmente con versiones anteriores
2. Verifica que todos los textos tengan el mismo tamaño
3. Verifica que todos los iconos tengan el mismo tamaño

**Resultado Esperado**:
- ✅ NINGÚN cambio visual en iOS
- ✅ Todos los elementos deben verse exactamente igual que antes

---

## 🤖 PRUEBAS EN ANDROID

### ✅ PRUEBA 1: Pantalla de Explorar

**Elementos a verificar**:

1. **Header**:
   - [ ] Título "Explorar": Debe ser legible pero no excesivamente grande
   - [ ] Iconos de header: Deben ser proporcionados (no gigantes)
   - [ ] Altura total del header: Debe ser consistente con otras páginas

2. **Caja de búsqueda**:
   - [ ] Altura: Debe ser compacta (aproximadamente la mitad que antes)
   - [ ] Texto placeholder: Debe ser legible
   - [ ] Icono de búsqueda: Proporcionado

3. **Categorías**:
   - [ ] Iconos de categorías: Deben ser visibles pero no gigantes
   - [ ] Texto de categorías: Legible y proporcionado
   - [ ] Contenedores: Tamaño adecuado

4. **Sección "Reclama tu local"**:
   - [ ] Título: Legible pero no excesivo
   - [ ] Subtítulo: Proporcionado
   - [ ] Icono: Tamaño adecuado
   - [ ] Altura total: Compacta

5. **Tarjetas de locales**:
   - [ ] **CRÍTICO**: Imagen debe ser aproximadamente la mitad de altura que antes
   - [ ] Nombre del local: Legible y proporcionado
   - [ ] Dirección: Texto pequeño pero legible
   - [ ] Badges (Abierto, Destacado, Rating, Nuevo): Compactos
   - [ ] Categorías: Texto e iconos pequeños
   - [ ] Botones de acción: Proporcionados

**Comparación visual**:
- Antes: Tarjetas muy grandes, ocupaban mucho espacio
- Después: Tarjetas compactas, más locales visibles sin scroll

### ✅ PRUEBA 2: Pantalla de Favoritos

**Elementos a verificar**:

1. **Header**:
   - [ ] Título "Locales Favoritos": Proporcionado
   - [ ] Botón "Limpiar": Tamaño adecuado

2. **Caja de búsqueda**:
   - [ ] Altura: Muy compacta (60% más pequeña)
   - [ ] Iconos: Proporcionados

3. **Chips de categorías**:
   - [ ] Emojis: Tamaño adecuado
   - [ ] Texto: Legible

4. **Tarjetas de locales**:
   - [ ] Mismas verificaciones que en Explorar
   - [ ] Imagen: 110px de altura (45% más pequeña)
   - [ ] Todos los textos reducidos proporcionalmente

### ✅ PRUEBA 3: Pantalla de Eventos

**Elementos a verificar**:

1. **Header**:
   - [ ] Título "Eventos": Proporcionado
   - [ ] Caja de búsqueda: Compacta

2. **Tabs "Hoy/Próximos"**:
   - [ ] Texto: Legible y proporcionado
   - [ ] Altura: Adecuada

3. **Chips de categorías**:
   - [ ] Emojis y texto: Proporcionados

4. **Tarjetas de eventos**:
   - [ ] Imagen: 110px de altura
   - [ ] Título: Legible
   - [ ] Descripción: Proporcionada
   - [ ] Badges: Compactos

5. **FAB (botón flotante)**:
   - [ ] Tamaño: 44x44 (más pequeño que antes)
   - [ ] Icono: Proporcionado

### ✅ PRUEBA 4: Pantalla Social

**Elementos a verificar**:

1. **Header**:
   - [ ] Título "Social": Proporcionado
   - [ ] Iconos (mensajes, notificaciones, búsqueda): Adecuados
   - [ ] Badges de contador: Compactos

2. **Tarjetas de ubicación de amigos**:
   - [ ] Ancho: 80px (más pequeñas)
   - [ ] Altura de imagen: 55px
   - [ ] Avatares: Pequeños pero visibles
   - [ ] Texto: Legible

3. **Publicaciones**:
   - [ ] Header de post: Proporcionado
   - [ ] Contenido: Legible
   - [ ] Botones de acción: Adecuados

### ✅ PRUEBA 5: Pantalla de Perfil

**Elementos a verificar**:

1. **Header**:
   - [ ] Título "Mi Perfil": Proporcionado
   - [ ] Iconos: Adecuados
   - [ ] Badges: Compactos

2. **Información de perfil**:
   - [ ] Nombre: Legible
   - [ ] Username: Proporcionado
   - [ ] Estadísticas: Números y labels legibles

3. **Check-in actual** (si aplica):
   - [ ] Título: Proporcionado
   - [ ] Nombre del local: Legible
   - [ ] Badge "EN VIVO": Compacto

4. **Grid de publicaciones**:
   - [ ] Tamaño de celdas: Adecuado
   - [ ] Indicador de múltiples imágenes: Visible

### ✅ PRUEBA 6: Pantalla de Gestión

**Elementos a verificar**:

1. **Header**:
   - [ ] Título "Gestión de Locales": Proporcionado

2. **Botones de acción rápida**:
   - [ ] Tamaño: Compactos (80px de altura)
   - [ ] Texto: Legible
   - [ ] Iconos: Proporcionados

3. **Tarjetas de locales**:
   - [ ] Contenido: Proporcionado
   - [ ] Botones: Adecuados

### ✅ PRUEBA 7: Pantalla de Empleo

**Elementos a verificar**:

1. **Header**:
   - [ ] Título "Bolsa de Trabajo": Proporcionado
   - [ ] Caja de búsqueda: Compacta

2. **Tabs "Ofertas/Profesionales"**:
   - [ ] Texto: Legible

3. **Tarjetas**:
   - [ ] Imagen: 130px de altura (si aplica)
   - [ ] Título: Proporcionado
   - [ ] Descripción: Legible
   - [ ] Chips de detalles: Compactos

4. **FAB**:
   - [ ] Tamaño: 44x44

### ✅ PRUEBA 8: Menú Inferior (CRÍTICO)

**Elementos a verificar**:

1. **Fondo del menú**:
   - [ ] **CRÍTICO**: El fondo debe cubrir exactamente el 65% del botón "Explorar"
   - [ ] El 35% superior del botón debe quedar visible
   - [ ] NO debe haber desbordamiento

2. **Iconos**:
   - [ ] Iconos regulares: 26px (bien visibles)
   - [ ] Icono central: 28px
   - [ ] Avatar: 16px (si aplica)

3. **Botón central "Explorar"**:
   - [ ] Debe sobresalir correctamente
   - [ ] Gradiente visible
   - [ ] Borde blanco visible

**Medición visual**:
- Toma una captura de pantalla
- Mide la altura total del botón "Explorar" (56px)
- Verifica que el fondo cubra aproximadamente 36.4px (65%)
- Verifica que queden visibles aproximadamente 19.6px (35%)

---

## 🎨 COMPARACIÓN VISUAL ANDROID vs iOS

### Proporciones Esperadas:

**Textos**:
- iOS: Tamaño base
- Android: 55% del tamaño de iOS

**Iconos**:
- iOS: Tamaño base
- Android: 60% del tamaño de iOS

**Espaciado**:
- iOS: Espaciado base
- Android: 60-65% del espaciado de iOS

**Imágenes**:
- iOS: Altura base
- Android: 55% de la altura de iOS

### Verificación de Consistencia:

Compara visualmente estas pantallas en ambas plataformas:

1. **Explorar**: Las tarjetas deben verse proporcionalmente iguales
2. **Favoritos**: El contenido debe tener las mismas proporciones
3. **Eventos**: Las tarjetas de eventos deben verse similares
4. **Social**: Los posts deben tener proporciones similares
5. **Perfil**: El grid debe verse proporcionado

**Nota**: Los tamaños absolutos serán diferentes, pero las **proporciones** deben ser idénticas.

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: Textos aún muy grandes en Android

**Solución**:
- Verifica que el componente importe `Platform` de 'react-native'
- Verifica que use la sintaxis: `Platform.OS === 'ios' ? X : X * 0.55`
- Verifica que no haya estilos inline que sobrescriban los estilos

### Problema 2: Iconos desproporcionados

**Solución**:
- Verifica que use `IconSymbol` component
- Verifica que el prop `size` use Platform.OS
- Ejemplo: `size={Platform.OS === 'ios' ? 24 : 14.4}`

### Problema 3: Cajas de búsqueda aún altas

**Solución**:
- Verifica el `paddingVertical` del searchContainer
- Debe ser: `Platform.OS === 'ios' ? 12 : 5` o similar
- Reducción del 58-60%

### Problema 4: Menú inferior desbordado

**Solución**:
- Verifica `TabNavigationBar.tsx`
- La constante `coveragePercent` debe ser 0.65 para Android
- Verifica que no haya estilos que sobrescriban el height

### Problema 5: iOS muestra menú de modales

**Solución**:
- Verifica `app/_layout.tsx`
- Los Stack.Screen de modales deben estar dentro de `{Platform.OS !== 'ios' && (...)}`
- Verifica que `app/index.tsx` haga redirect directo a explorar

---

## 📊 MÉTRICAS DE RENDIMIENTO

### Tiempos de Carga Esperados:

- **iOS**: Sin cambios respecto a versiones anteriores
- **Android**: Posible mejora del 5-10% por elementos más pequeños

### Uso de Memoria:

- **iOS**: Sin cambios
- **Android**: Posible reducción del 3-5% por imágenes más pequeñas

### Fluidez de Scroll:

- **iOS**: Sin cambios
- **Android**: Mejora esperada por menos contenido en pantalla

---

## 🎯 CRITERIOS DE ACEPTACIÓN

### Para considerar la implementación exitosa:

#### iOS:
- [x] App inicia en explorar (no muestra menú de modales)
- [x] Navegación funciona correctamente
- [x] Todos los tamaños sin cambios
- [x] No hay regresiones visuales

#### Android:
- [x] Todos los textos son legibles y proporcionados
- [x] Todos los iconos son visibles y adecuados
- [x] Cajas de búsqueda son compactas
- [x] Tarjetas de locales tienen contenido proporcionado
- [x] Menú inferior tiene cobertura del 65%
- [x] Headers consistentes en todas las páginas
- [x] Paridad visual con iOS

#### Ambas Plataformas:
- [x] No hay crashes
- [x] No hay errores en consola
- [x] La navegación es fluida
- [x] Los gestos funcionan correctamente

---

## 📸 CAPTURAS DE REFERENCIA

### Toma capturas de estas pantallas para comparación:

1. **Explorar**:
   - Vista completa con header, búsqueda, categorías y tarjetas
   - Enfoque en una tarjeta de local individual

2. **Favoritos**:
   - Vista completa
   - Detalle de una tarjeta

3. **Eventos**:
   - Vista completa con tabs
   - Detalle de una tarjeta de evento

4. **Social**:
   - Vista completa con header
   - Detalle de una publicación

5. **Perfil**:
   - Vista completa con estadísticas
   - Grid de publicaciones

6. **Menú Inferior**:
   - Captura enfocada en el botón "Explorar"
   - Debe mostrar claramente la cobertura del fondo

### Comparación Lado a Lado:

Coloca las capturas de iOS y Android lado a lado y verifica:

- [ ] Las proporciones son similares
- [ ] Los elementos tienen el mismo peso visual
- [ ] La jerarquía visual es consistente
- [ ] No hay elementos que destaquen más en una plataforma que en otra

---

## 🔍 INSPECCIÓN DETALLADA

### Elementos Críticos a Inspeccionar:

#### 1. Tarjetas de Locales (CRÍTICO)

**Antes (Android)**:
- Imagen: ~200px de altura
- Nombre: ~18px
- Badges: ~12px
- Contenido total: Muy grande

**Después (Android)**:
- Imagen: 110px de altura ✅
- Nombre: 9.9px ✅
- Badges: 6.6px ✅
- Contenido total: Compacto ✅

**Cómo verificar**:
1. Abre la pantalla de Explorar
2. Observa una tarjeta de local
3. La imagen debe ocupar aproximadamente 1/3 de la pantalla
4. Debe ser posible ver 2-3 tarjetas completas sin scroll

#### 2. Cajas de Búsqueda

**Antes (Android)**:
- Altura: ~50-60px
- Muy prominentes

**Después (Android)**:
- Altura: ~30-35px ✅
- Compactas y discretas ✅

**Cómo verificar**:
1. Compara la altura de la caja de búsqueda con el título del header
2. La caja debe ser aproximadamente 1/2 de la altura del título
3. Debe verse compacta pero funcional

#### 3. Menú Inferior

**Antes (Android)**:
- Fondo cubría ~75% del botón "Explorar"
- Desbordamiento visible

**Después (Android)**:
- Fondo cubre exactamente 65% ✅
- No hay desbordamiento ✅

**Cómo verificar**:
1. Observa el botón central "Explorar"
2. El fondo turquesa debe llegar aproximadamente a 2/3 del botón
3. El 1/3 superior del botón debe quedar completamente visible
4. El borde blanco del botón debe ser visible en todo el perímetro superior

#### 4. Headers de Páginas

**Antes (Android)**:
- Alturas inconsistentes entre páginas
- Algunos headers muy grandes

**Después (Android)**:
- Todas las páginas usan `HEADER_DIMENSIONS` ✅
- Altura consistente: 75px ✅

**Cómo verificar**:
1. Navega entre diferentes páginas (Explorar, Favoritos, Eventos, Social, Perfil)
2. Observa la altura del header en cada página
3. Todas deben tener la misma altura
4. El título debe estar en la misma posición vertical

---

## 📝 REGISTRO DE PRUEBAS

### Plantilla de Reporte:

```
FECHA: ___________
DISPOSITIVO: ___________
PLATAFORMA: [ ] iOS  [ ] Android
VERSIÓN DE EXPO GO: ___________

PANTALLA PROBADA: ___________

ELEMENTOS VERIFICADOS:
- [ ] Header (altura, título, iconos)
- [ ] Caja de búsqueda (altura, texto)
- [ ] Contenido principal (tarjetas, listas)
- [ ] Menú inferior (cobertura, iconos)
- [ ] Modales (si aplica)

PROBLEMAS ENCONTRADOS:
1. ___________
2. ___________
3. ___________

CAPTURAS ADJUNTAS:
- [ ] Vista completa
- [ ] Detalle de problema (si aplica)

ESTADO: [ ] ✅ APROBADO  [ ] ❌ REQUIERE AJUSTES
```

---

## 🚀 PRUEBA RÁPIDA (5 MINUTOS)

Si tienes poco tiempo, realiza esta prueba rápida:

### iOS (2 minutos):
1. ✅ Abre la app - debe ir directo a Explorar
2. ✅ Navega a Social, Perfil, Favoritos
3. ✅ Verifica que no haya cambios visuales

### Android (3 minutos):
1. ✅ Abre Explorar - verifica tarjetas de locales (imagen pequeña)
2. ✅ Verifica caja de búsqueda (compacta)
3. ✅ Verifica menú inferior (fondo al 65%)
4. ✅ Navega a Favoritos - verifica consistencia
5. ✅ Navega a Social - verifica posts

**Si todo se ve bien en esta prueba rápida, la implementación es exitosa.**

---

## 🎉 CONFIRMACIÓN FINAL

Una vez completadas todas las pruebas, confirma:

- [ ] iOS: App inicia correctamente sin menú de modales
- [ ] iOS: No hay cambios visuales
- [ ] Android: Todos los textos son proporcionados
- [ ] Android: Todos los iconos son adecuados
- [ ] Android: Cajas de búsqueda son compactas
- [ ] Android: Tarjetas de locales tienen contenido reducido
- [ ] Android: Menú inferior tiene cobertura del 65%
- [ ] Android: Headers consistentes en todas las páginas
- [ ] Ambas: Navegación fluida y sin errores

**Si todos los checkboxes están marcados: ✅ IMPLEMENTACIÓN EXITOSA**

---

**Versión**: v66.0  
**Tipo**: Guía de Pruebas Visuales  
**Estado**: 📋 LISTA PARA USAR
