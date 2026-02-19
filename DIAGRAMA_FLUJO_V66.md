
# 🔄 DIAGRAMA DE FLUJO v66.0

## 📱 FLUJO DE INICIO DE LA APP

### iOS:

```
┌─────────────────────────────────────────────────────────┐
│                    INICIO DE APP (iOS)                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   app/index.tsx                          │
│                                                          │
│  ✅ Platform.OS === 'ios'                               │
│  ✅ No hay condiciones complejas                        │
│  ✅ Redirect directo: <Redirect href="/(tabs)/explorar"/>│
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   app/_layout.tsx                        │
│                                                          │
│  ✅ Modales NO registrados en iOS                       │
│  ✅ {Platform.OS !== 'ios' && (...)}                    │
│  ✅ Solo rutas principales disponibles                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              PANTALLA DE EXPLORAR                        │
│                                                          │
│  ✅ App carga correctamente                             │
│  ✅ No hay menú de modales                              │
│  ✅ Usuario ve la app principal                         │
└─────────────────────────────────────────────────────────┘
```

### Android:

```
┌─────────────────────────────────────────────────────────┐
│                  INICIO DE APP (Android)                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   app/index.tsx                          │
│                                                          │
│  ✅ Platform.OS === 'android'                           │
│  ✅ Redirect directo: <Redirect href="/(tabs)/explorar"/>│
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   app/_layout.tsx                        │
│                                                          │
│  ✅ Modales SÍ registrados en Android                   │
│  ✅ Todas las rutas disponibles                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              PANTALLA DE EXPLORAR                        │
│                                                          │
│  ✅ App carga con tamaños reducidos                     │
│  ✅ Textos 45% más pequeños                             │
│  ✅ Iconos 40% más pequeños                             │
│  ✅ Tarjetas proporcionadas                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 FLUJO DE RENDERIZADO DE TARJETAS

### Android:

```
┌─────────────────────────────────────────────────────────┐
│              TarjetaLocal Component                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Platform.OS Check                       │
│                                                          │
│  Platform.OS === 'ios' ? 200 : 110                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Renderizado Final                       │
│                                                          │
│  iOS:     Imagen 200px                                  │
│  Android: Imagen 110px ✅                               │
│                                                          │
│  iOS:     Nombre 18px                                   │
│  Android: Nombre 9.9px ✅                               │
│                                                          │
│  iOS:     Badge 12px                                    │
│  Android: Badge 6.6px ✅                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 FLUJO DE CORRECCIÓN DE TAMAÑOS

### Proceso Aplicado:

```
┌─────────────────────────────────────────────────────────┐
│              ELEMENTO ORIGINAL (iOS)                     │
│                   fontSize: 32px                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  CÁLCULO DE REDUCCIÓN                    │
│                                                          │
│  Android = iOS × 0.55                                   │
│  Android = 32 × 0.55 = 17.6px                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              APLICACIÓN CON Platform.OS                  │
│                                                          │
│  fontSize: Platform.OS === 'ios' ? 32 : 17.6            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  RESULTADO FINAL                         │
│                                                          │
│  iOS:     32px (sin cambios)                            │
│  Android: 17.6px (45% reducción) ✅                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 FLUJO DE VERIFICACIÓN

### Checklist de Verificación:

```
                    INICIO
                      │
                      ▼
            ┌─────────────────┐
            │  ¿Plataforma?   │
            └─────────────────┘
                 │       │
        iOS ◄────┘       └────► Android
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ ¿Inicia en       │   │ ¿Tarjetas        │
│  Explorar?       │   │  pequeñas?       │
└──────────────────┘   └──────────────────┘
         │                      │
    Sí   │   No            Sí   │   No
         ▼                      ▼
    ┌────────┐            ┌────────┐
    │   ✅   │            │   ✅   │
    └────────┘            └────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ ¿Sin menú de     │   │ ¿Búsqueda        │
│  modales?        │   │  compacta?       │
└──────────────────┘   └──────────────────┘
         │                      │
    Sí   │   No            Sí   │   No
         ▼                      ▼
    ┌────────┐            ┌────────┐
    │   ✅   │            │   ✅   │
    └────────┘            └────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ ¿Sin cambios     │   │ ¿Menú al 65%?    │
│  visuales?       │   │                  │
└──────────────────┘   └──────────────────┘
         │                      │
    Sí   │   No            Sí   │   No
         ▼                      ▼
    ┌────────┐            ┌────────┐
    │   ✅   │            │   ✅   │
    └────────┘            └────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
            ┌──────────────┐
            │ VERIFICACIÓN │
            │   COMPLETA   │
            │      ✅      │
            └──────────────┘
```

---

## 📊 FLUJO DE DATOS DE TAMAÑOS

### Centralización de Estilos:

```
┌─────────────────────────────────────────────────────────┐
│              styles/commonStyles.ts                      │
│                                                          │
│  export const HEADER_DIMENSIONS = {                     │
│    paddingTop: Platform.OS === 'ios' ? 50 : 32,        │
│    paddingBottom: Platform.OS === 'ios' ? 16 : 6,      │
│    totalHeight: Platform.OS === 'ios' ? 110 : 75,      │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│  Explorar        │                  │  Favoritos       │
│  Header: 75px ✅ │                  │  Header: 75px ✅ │
└──────────────────┘                  └──────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│  Eventos         │                  │  Social          │
│  Header: 75px ✅ │                  │  Header: 75px ✅ │
└──────────────────┘                  └──────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│  Perfil          │                  │  Gestión         │
│  Header: 75px ✅ │                  │  Header: 75px ✅ │
└──────────────────┘                  └──────────────────┘
                            │
                            ▼
                ┌───────────────────┐
                │  CONSISTENCIA     │
                │     TOTAL ✅      │
                └───────────────────┘
```

---

## 🔄 FLUJO DE ACTUALIZACIÓN DE COMPONENTES

### Proceso de Corrección:

```
┌─────────────────────────────────────────────────────────┐
│                  COMPONENTE ORIGINAL                     │
│                                                          │
│  style={{                                               │
│    fontSize: 18,                                        │
│    padding: 16,                                         │
│  }}                                                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  IMPORTAR Platform                       │
│                                                          │
│  import { Platform } from 'react-native';               │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  APLICAR REDUCCIÓN                       │
│                                                          │
│  style={{                                               │
│    fontSize: Platform.OS === 'ios' ? 18 : 9.9,         │
│    padding: Platform.OS === 'ios' ? 16 : 10,           │
│  }}                                                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  COMPONENTE CORREGIDO                    │
│                                                          │
│  iOS:     fontSize 18px, padding 16px                   │
│  Android: fontSize 9.9px, padding 10px ✅               │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 FLUJO DE RENDERIZADO DEL MENÚ INFERIOR

### Android:

```
┌─────────────────────────────────────────────────────────┐
│            TabNavigationBar Component                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Cálculo de Dimensiones                      │
│                                                          │
│  const buttonHeight = 56;                               │
│  const coveragePercent = Platform.OS === 'ios'          │
│    ? 0.70 : 0.65;                                       │
│  const backgroundHeight = baseHeight +                  │
│    (buttonHeight × coveragePercent) -                   │
│    (buttonHeight / 2);                                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Valores Calculados                      │
│                                                          │
│  buttonHeight: 56px                                     │
│  coveragePercent: 0.65 (65%)                            │
│  backgroundHeight: 60 + (56 × 0.65) - 28 = 68.4px      │
│  visible: 56 - (56 × 0.65) = 19.6px (35%)              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Renderizado Final                       │
│                                                          │
│         ┌─────────┐                                     │
│         │ EXPLORAR│  ← 19.6px visible (35%)             │
│         ├─────────┤                                     │
│     ┌───┴─────────┴───┐                                │
│     │   FONDO (65%)   │  ← 36.4px cubiertos             │
│     │   📅 ❤️ 🧭 👥 👤│  ← Iconos: 26px                 │
│     └─────────────────┘                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 FLUJO DE VERIFICACIÓN DE PROBLEMAS

### Diagrama de Decisión:

```
                    ¿Problema?
                        │
        ┌───────────────┼───────────────┐
        │                               │
        ▼                               ▼
   ¿En iOS?                        ¿En Android?
        │                               │
        ▼                               ▼
┌──────────────┐              ┌──────────────┐
│ ¿Menú de     │              │ ¿Textos      │
│  modales?    │              │  grandes?    │
└──────────────┘              └──────────────┘
        │                               │
    Sí  │  No                      Sí  │  No
        ▼                               ▼
┌──────────────┐              ┌──────────────┐
│ Reiniciar    │              │ Verificar    │
│ Expo Go      │              │ Platform.OS  │
└──────────────┘              └──────────────┘
        │                               │
        ▼                               ▼
┌──────────────┐              ┌──────────────┐
│ ¿Persiste?   │              │ ¿Búsqueda    │
└──────────────┘              │  alta?       │
        │                     └──────────────┘
    Sí  │  No                         │
        ▼                         Sí  │  No
┌──────────────┐                      ▼
│ Verificar    │              ┌──────────────┐
│ _layout.tsx  │              │ Verificar    │
└──────────────┘              │ padding      │
                              └──────────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │ ¿Menú        │
                              │  desbordado? │
                              └──────────────┘
                                      │
                                  Sí  │  No
                                      ▼
                              ┌──────────────┐
                              │ Verificar    │
                              │ coverage %   │
                              └──────────────┘
```

---

## 📐 FLUJO DE CÁLCULO DE TAMAÑOS

### Fórmula General:

```
┌─────────────────────────────────────────────────────────┐
│                  TAMAÑO EN iOS (X)                       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  TIPO DE ELEMENTO                        │
└─────────────────────────────────────────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────┐        ┌──────────┐        ┌──────────┐
│  Texto   │        │  Icono   │        │ Padding  │
└──────────┘        └──────────┘        └──────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────┐        ┌──────────┐        ┌──────────┐
│ X × 0.55 │        │ X × 0.60 │        │ X × 0.625│
└──────────┘        └──────────┘        └──────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              TAMAÑO EN ANDROID (Y)                       │
│                                                          │
│  Texto:   Y = X × 0.55  (45% reducción)                │
│  Icono:   Y = X × 0.60  (40% reducción)                │
│  Padding: Y = X × 0.625 (37.5% reducción)              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE ACTUALIZACIÓN EN TIEMPO REAL

### Sistema de Sincronización:

```
┌─────────────────────────────────────────────────────────┐
│                  CAMBIO EN BASE DE DATOS                 │
│                  (Like, Comment, etc.)                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Realtime Channel                   │
│                                                          │
│  .on('postgres_changes', ...)                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Componente Recibe Evento                │
│                                                          │
│  payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Actualización de Estado                 │
│                                                          │
│  setLikesCount(newCount)                                │
│  setLocalLikes(newArray)                                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Re-renderizado                          │
│                                                          │
│  ✅ UI actualizada instantáneamente                     │
│  ✅ Tamaños correctos aplicados                         │
│  ✅ Animaciones suaves                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 FLUJO DE NAVEGACIÓN

### Estructura de la App:

```
                    app/index.tsx
                         │
                         ▼
                  /(tabs)/explorar
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    Eventos         Favoritos         Social
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
                     Perfil
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    Gestión          Empleo           Admin
   (Propietario)    (Cliente)      (Admin only)
```

---

## 📱 FLUJO DE PLATAFORMA

### Decisiones de Renderizado:

```
                  Componente
                      │
                      ▼
              Platform.OS Check
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
    iOS Path                   Android Path
        │                           │
        ▼                           ▼
┌──────────────┐          ┌──────────────┐
│ Tamaños      │          │ Tamaños      │
│ Originales   │          │ Reducidos    │
│              │          │              │
│ fontSize: 32 │          │ fontSize:17.6│
│ size: 24     │          │ size: 14.4   │
│ padding: 16  │          │ padding: 10  │
└──────────────┘          └──────────────┘
        │                           │
        └─────────────┬─────────────┘
                      ▼
              Renderizado Final
                      │
                      ▼
        ┌─────────────────────────┐
        │  Paridad Visual ✅      │
        └─────────────────────────┘
```

---

## 🎉 RESULTADO FINAL

### Flujo Completo de Éxito:

```
    Usuario abre app
            │
            ▼
    ┌──────────────┐
    │ ¿Plataforma? │
    └──────────────┘
        │       │
   iOS  │       │  Android
        ▼       ▼
    ┌────┐   ┌────┐
    │ ✅ │   │ ✅ │
    └────┘   └────┘
        │       │
        └───┬───┘
            ▼
    ┌──────────────┐
    │ App carga    │
    │ correctamente│
    └──────────────┘
            │
            ▼
    ┌──────────────┐
    │ Navegación   │
    │ fluida       │
    └──────────────┘
            │
            ▼
    ┌──────────────┐
    │ Experiencia  │
    │ óptima ✅    │
    └──────────────┘
```

---

**Versión**: v66.0  
**Tipo**: Diagrama de Flujo  
**Estado**: 📊 COMPLETO
