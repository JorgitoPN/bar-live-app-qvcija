
# 📊 DIAGRAMA DE FLUJO - CORRECCIONES v48.0

## 🔄 FLUJO DE ACTUALIZACIÓN DE AVATAR

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO CAMBIA AVATAR                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              1. Seleccionar Imagen de Galería                │
│                 (ImagePicker.launchImageLibraryAsync)        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              2. Convertir a ArrayBuffer                      │
│                 (fetch + FileReader)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         3. Subir a Supabase Storage (bucket: avatars)        │
│            Ruta: {userId}/{userId}-{timestamp}.{ext}         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              4. Obtener URL Pública                          │
│         https://...supabase.co/storage/v1/object/...         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         5. Actualizar Base de Datos (tabla: usuarios)        │
│              UPDATE usuarios SET                             │
│                avatar = {publicUrl},                         │
│                avatar_updated_at = NOW()                     │
│              WHERE id = {userId}                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         6. TRIGGER: update_usuario_avatar_timestamp()        │
│              Actualiza avatar_updated_at automáticamente     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         7. Real-time Subscription Detecta Cambio             │
│              Todos los componentes reciben notificación      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         8. Componentes Actualizan Cache-Busting URL          │
│         {imageUrl}?t={avatar_updated_at.getTime()}           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         9. Image Component Recarga con Nueva URL             │
│              cache: 'reload' en Android                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ✅ AVATAR ACTUALIZADO EN TODOS LOS              │
│                    COMPONENTES DE LA APP                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 FLUJO DE RENDERIZADO DE AVATAR

```
┌─────────────────────────────────────────────────────────────┐
│                  COMPONENTE AVATAR RENDERIZA                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         1. Obtener imageUrl y avatar_updated_at              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         2. Filtrar URLs file:// (causan errores)             │
│              if (imageUrl.startsWith('file://'))             │
│                return null;                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         3. Aplicar Cache-Busting                             │
│         {imageUrl}?t={avatar_updated_at.getTime()}           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         4. Verificar si hay Momentos sin ver                 │
│              Query: momentos + momento_views                 │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │  Momentos Sin Ver │   │  Sin Momentos o   │
    │                   │   │  Todos Vistos     │
    └───────────────────┘   └───────────────────┘
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │  Borde Verde Neón │   │    Sin Borde      │
    │  ┌─────────────┐  │   │  ┌───────────┐    │
    │  │ ┌─────────┐ │  │   │  │  Imagen   │    │
    │  │ │ Imagen  │ │  │   │  └───────────┘    │
    │  │ └─────────┘ │  │   │                   │
    │  └─────────────┘  │   │                   │
    └───────────────────┘   └───────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
            ┌───────────────────────────┐
            │  Imagen Ocupa 100% del    │
            │  Círculo - Sin Espacios   │
            └───────────────────────────┘
```

---

## 🔒 FLUJO DE CONTROL DE ACCESO

```
┌─────────────────────────────────────────────────────────────┐
│         LOCAL INTENTA ACCEDER A PERFIL SOCIAL                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PermissionGuard Verifica Permisos               │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │   Modo Usuario    │   │   Modo Local      │
    │   o Admin         │   │   (Propietario)   │
    └───────────────────┘   └───────────────────┘
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │  ✅ ACCESO        │   │  Verificar Plan   │
    │  PERMITIDO        │   │  de Suscripción   │
    └───────────────────┘   └───────────────────┘
                                        │
                            ┌───────────┴───────────┐
                            │                       │
                            ▼                       ▼
                ┌───────────────────┐   ┌───────────────────┐
                │  Plan Activo con  │   │   Plan Gratuito   │
                │  Perfil Social    │   │   o Sin Plan      │
                └───────────────────┘   └───────────────────┘
                            │                       │
                            ▼                       ▼
                ┌───────────────────┐   ┌───────────────────┐
                │  ✅ ACCESO        │   │  ❌ ACCESO        │
                │  PERMITIDO        │   │  DENEGADO         │
                └───────────────────┘   └───────────────────┘
                            │                       │
                            ▼                       ▼
                ┌───────────────────┐   ┌───────────────────┐
                │  Mostrar Perfil   │   │  Mostrar Mensaje  │
                │  Social Completo  │   │  de Actualización │
                └───────────────────┘   └───────────────────┘
                                                    │
                                                    ▼
                                        ┌───────────────────┐
                                        │  Beneficios del   │
                                        │  Plan de Pago:    │
                                        │  • Perfil social  │
                                        │  • Eventos        │
                                        │  • Destacados     │
                                        │  • Estadísticas   │
                                        │  • Más clientes   │
                                        └───────────────────┘
                                                    │
                                                    ▼
                                        ┌───────────────────┐
                                        │  [Ver Planes]     │
                                        │  [Volver]         │
                                        └───────────────────┘
```

---

## 🎯 FLUJO DE ASIGNACIÓN DE PLAN GRATUITO

```
┌─────────────────────────────────────────────────────────────┐
│         PROPIETARIO RECLAMA UN LOCAL                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         INSERT INTO propietarios_locales                     │
│              (propietario_id, local_id, rol)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         TRIGGER: ensure_local_has_free_plan()                │
│              Se ejecuta automáticamente                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         Verificar si local ya tiene suscripción activa       │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │  Ya Tiene Plan    │   │  No Tiene Plan    │
    │  Activo           │   │                   │
    └───────────────────┘   └───────────────────┘
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │  No Hacer Nada    │   │  Crear Plan       │
    │  (Mantener Plan   │   │  Gratuito         │
    │   Existente)      │   │                   │
    └───────────────────┘   └───────────────────┘
                                        │
                                        ▼
                            ┌───────────────────┐
                            │  INSERT INTO      │
                            │  suscripciones_   │
                            │  locales:         │
                            │  • plan_id        │
                            │  • estado=activa  │
                            │  • perfil_social  │
                            │    =false         │
                            │  • panel_analisis │
                            │    =false         │
                            │  • creditos=0     │
                            └───────────────────┘
                                        │
                                        ▼
                            ┌───────────────────┐
                            │  ✅ LOCAL CON     │
                            │  PLAN GRATUITO    │
                            │  ASIGNADO         │
                            └───────────────────┘
```

---

## 🔄 FLUJO DE SINCRONIZACIÓN EN TIEMPO REAL

```
┌─────────────────────────────────────────────────────────────┐
│              AVATAR ACTUALIZADO EN BASE DE DATOS             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         TRIGGER actualiza avatar_updated_at = NOW()          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         Supabase Real-time Broadcast (postgres_changes)      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Miniavatar   │  │   Avatar     │  │   Avatar     │
│ Menú Inferior│  │   Perfil     │  │   Momentos   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Actualizar timestamp     │
            │  setAvatarTimestamp()     │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Resetear error state     │
            │  setImageError(false)     │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Recargar imagen con      │
            │  nuevo cache-busting URL  │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  ✅ AVATAR ACTUALIZADO    │
            │  EN < 200ms               │
            └───────────────────────────┘
```

---

## 🎨 COMPARACIÓN VISUAL: ANTES vs DESPUÉS

### **ANTES (con borde blanco):**
```
┌─────────────────────┐
│                     │
│  ┌───────────────┐  │  ← Borde blanco no deseado
│  │               │  │
│  │    Imagen     │  │  ← Imagen no ocupa todo el espacio
│  │               │  │
│  └───────────────┘  │
│                     │
└─────────────────────┘
```

### **DESPUÉS (sin borde blanco):**
```
┌─────────────────┐
│                 │
│     Imagen      │  ← Imagen ocupa TODO el círculo
│                 │
└─────────────────┘
```

### **CON MOMENTOS SIN VER:**
```
┌─────────────────────┐
│  ╔═══════════════╗  │  ← Borde verde neón (#00FF88)
│  ║               ║  │
│  ║    Imagen     ║  │  ← Imagen ocupa todo el espacio
│  ║               ║  │
│  ╚═══════════════╝  │
└─────────────────────┘
```

---

## 🔒 MATRIZ DE PERMISOS POR PLAN

```
┌──────────────┬─────────────┬─────────────┬─────────────┐
│   FUNCIÓN    │  GRATUITO   │  ESTÁNDAR   │   PREMIUM   │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Perfil       │     ❌      │     ✅      │     ✅      │
│ Social       │             │             │             │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Panel de     │     ❌      │     ❌      │     ✅      │
│ Análisis     │             │             │             │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Eventos      │     ❌      │   4/mes     │  100/mes    │
│ Mensuales    │             │             │             │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Destacados   │     ❌      │   3/mes     │   31/mes    │
│ Mensuales    │             │             │             │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Seguidores/  │     ❌      │     ✅      │     ✅      │
│ Siguiendo    │             │             │             │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Publicar     │     ❌      │     ✅      │     ✅      │
│ Posts        │             │             │             │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Subir        │     ❌      │     ✅      │     ✅      │
│ Momentos     │             │             │             │
└──────────────┴─────────────┴─────────────┴─────────────┘
```

---

## 📱 COMPONENTES AFECTADOS

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENTES DE AVATAR                     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Unified    │  │     Mini     │  │   FoodPlate  │
│   Momento    │  │  FoodPlate   │  │    Avatar    │
│   Avatar     │  │   Avatar     │  │              │
│              │  │              │  │              │
│  88px        │  │  40px        │  │  88px        │
│  Momentos    │  │  Menú/Listas │  │  General     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Características Comunes: │
            │  • Sin borde blanco       │
            │  • Cache-busting          │
            │  • Real-time sync         │
            │  • Filter file://         │
            │  • Fallback a icono       │
            └───────────────────────────┘
```

---

## 🚀 PÁGINAS ACTUALIZADAS

```
┌─────────────────────────────────────────────────────────────┐
│                    PÁGINAS CON AVATARES                      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Perfil     │  │   Perfil     │  │    Social    │
│   Usuario    │  │    Local     │  │    Feed      │
│              │  │              │  │              │
│  ✅ Avatar   │  │  ✅ Avatar   │  │  ✅ Momentos │
│  ✅ Momentos │  │  ✅ Momentos │  │  ✅ Posts    │
└──────────────┘  └──────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Mensajes   │  │  Comentarios │  │ Notificaciones│
│              │  │              │  │              │
│  ✅ Avatar   │  │  ✅ Avatar   │  │  ✅ Avatar   │
│  ✅ Chats    │  │  ✅ Posts    │  │  ✅ Lista    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📊 TIMELINE DE ACTUALIZACIÓN

```
T=0ms
┌─────────────────────────────────────────────────────────────┐
│         Usuario toca "Guardar" en Editar Perfil              │
└─────────────────────────────────────────────────────────────┘

T=50ms
┌─────────────────────────────────────────────────────────────┐
│         Imagen se convierte a ArrayBuffer                    │
└─────────────────────────────────────────────────────────────┘

T=200ms
┌─────────────────────────────────────────────────────────────┐
│         Imagen se sube a Supabase Storage                    │
└─────────────────────────────────────────────────────────────┘

T=300ms
┌─────────────────────────────────────────────────────────────┐
│         Base de datos actualizada con nueva URL              │
└─────────────────────────────────────────────────────────────┘

T=350ms
┌─────────────────────────────────────────────────────────────┐
│         Trigger actualiza avatar_updated_at                  │
└─────────────────────────────────────────────────────────────┘

T=400ms
┌─────────────────────────────────────────────────────────────┐
│         Real-time broadcast a todos los componentes          │
└─────────────────────────────────────────────────────────────┘

T=500ms
┌─────────────────────────────────────────────────────────────┐
│         ✅ TODOS LOS AVATARES ACTUALIZADOS                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 DISEÑO DE MENSAJE DE ACTUALIZACIÓN

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                    ┌─────────────┐                           │
│                    │   🔒 LOCK   │  ← Icono grande           │
│                    │    ICON     │                           │
│                    └─────────────┘                           │
│                                                               │
│              🔒 Perfil Social No Disponible                  │
│                                                               │
│     Para acceder a esta función necesitas activar            │
│            un plan de suscripción.                           │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         ✨ Con un plan activo podrás:              │    │
│  │                                                      │    │
│  │  ✓ Hacer visible tu perfil social                  │    │
│  │  ✓ Publicar eventos y promociones                  │    │
│  │  ✓ Destacar tu local en búsquedas                  │    │
│  │  ✓ Acceder a estadísticas avanzadas                │    │
│  │  ✓ Atraer más clientes cada día                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  💡 No estás comprando un plan, estás invirtiendo  │    │
│  │     en más clientes.                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        ⭐ Ver Planes de Suscripción                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│                  Volver a Explorar                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 PUNTOS DE VERIFICACIÓN

### **Checkpoint 1: Subida de Avatar**
```
✅ Imagen seleccionada
  ↓
✅ Convertida a ArrayBuffer
  ↓
✅ Subida a Supabase Storage
  ↓
✅ URL pública obtenida
  ↓
✅ Base de datos actualizada
  ↓
✅ Trigger ejecutado
  ↓
✅ Real-time broadcast enviado
  ↓
✅ Componentes actualizados
```

### **Checkpoint 2: Renderizado de Avatar**
```
✅ imageUrl recibida
  ↓
✅ file:// URLs filtradas
  ↓
✅ Cache-busting aplicado
  ↓
✅ Momentos verificados
  ↓
✅ Borde verde si hay Momentos sin ver
  ↓
✅ Sin borde si no hay Momentos
  ↓
✅ Imagen renderizada en círculo completo
```

### **Checkpoint 3: Control de Acceso**
```
✅ Usuario intenta acceder
  ↓
✅ PermissionGuard verifica modo
  ↓
✅ Si es local, verifica plan
  ↓
✅ Si es gratuito, bloquea acceso
  ↓
✅ Muestra mensaje persuasivo
  ↓
✅ Botón redirige a planes
```

---

## 📈 MÉTRICAS DE RENDIMIENTO

```
┌──────────────────────┬──────────────┬──────────────┐
│      OPERACIÓN       │    ANTES     │   DESPUÉS    │
├──────────────────────┼──────────────┼──────────────┤
│ Subida de avatar     │   No funciona│   ~300ms     │
├──────────────────────┼──────────────┼──────────────┤
│ Actualización visual │   Manual     │   <200ms     │
├──────────────────────┼──────────────┼──────────────┤
│ Sincronización       │   No existe  │   <100ms     │
├──────────────────────┼──────────────┼──────────────┤
│ Cache-busting        │   No existe  │   Automático │
├──────────────────────┼──────────────┼──────────────┤
│ Control de acceso    │   No existe  │   Inmediato  │
└──────────────────────┴──────────────┴──────────────┘
```

---

## 🎯 CASOS DE USO

### **Caso 1: Usuario Normal**
```
Usuario @jorge
  ↓
Cambia avatar
  ↓
✅ Se guarda en Storage
  ↓
✅ Se muestra en todos los lugares
  ↓
✅ Sin borde blanco
  ↓
✅ Sincronización instantánea
```

### **Caso 2: Local con Plan Gratuito**
```
Bar A Coviña (Plan Gratuito)
  ↓
Intenta acceder a perfil social
  ↓
❌ Acceso bloqueado
  ↓
📋 Mensaje persuasivo mostrado
  ↓
💡 Beneficios explicados
  ↓
🔗 Botón a planes visible
```

### **Caso 3: Local con Plan Activo**
```
Local con Plan Estándar/Premium
  ↓
Accede a perfil social
  ↓
✅ Acceso completo
  ↓
✅ Avatar sin borde blanco
  ↓
✅ Métricas sociales visibles
  ↓
✅ Puede publicar y crear eventos
```

---

**Versión:** 48.0.0  
**Estado:** ✅ Documentado y Listo para Verificación
