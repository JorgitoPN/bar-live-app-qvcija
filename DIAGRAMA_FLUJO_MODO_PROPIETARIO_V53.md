
# 🔄 Diagrama de Flujo: Modo Propietario v53.0

**Versión:** 53.0  
**Fecha:** 29 de Diciembre de 2024

---

## 📊 Flujo de Cambio de Modo

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO INICIA SESIÓN                     │
│                                                              │
│  Rol del usuario: propietario                                │
│  Modo inicial: cliente                                       │
│  Perfil activo: Usuario (Jorge)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              USUARIO ABRE SELECTOR DE MODO                   │
│                                                              │
│  Opciones disponibles:                                       │
│  • Modo Cliente                                              │
│  • Modo Propietario ← SELECCIONA ESTE                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           SISTEMA CARGA LOCALES DEL PROPIETARIO              │
│                                                              │
│  Query: SELECT * FROM propietarios_locales                   │
│         WHERE propietario_id = user.id                       │
│                                                              │
│  Resultado: 1 local encontrado                               │
│  • Casa Adolfo (id: abc-123)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        ✅ ASIGNACIÓN AUTOMÁTICA DEL PRIMER LOCAL             │
│                                                              │
│  Modo: propietario                                           │
│  Perfil activo: Local (Casa Adolfo)                          │
│  activeProfileType: 'local'                                  │
│  activeProfileId: 'abc-123'                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              USUARIO NAVEGA EN MODO PROPIETARIO              │
│                                                              │
│  Comportamiento:                                             │
│  • Solo puede interactuar con locales                        │
│  • Botones "Estoy en este local" OCULTOS                     │
│  • Botones "Sala Virtual" OCULTOS                            │
│  • Puede gestionar sus locales                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           USUARIO ABRE SELECTOR DE PERFIL                    │
│                                                              │
│  Opciones disponibles:                                       │
│  • Perfil de Usuario (Jorge) ← SELECCIONA ESTE              │
│  • Casa Adolfo (Local)                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        ✅ CAMBIO AUTOMÁTICO A MODO CLIENTE                   │
│                                                              │
│  Modo: cliente                                               │
│  Perfil activo: Usuario (Jorge)                              │
│  activeProfileType: 'cliente'                                │
│  activeProfileId: user.id                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               USUARIO NAVEGA EN MODO CLIENTE                 │
│                                                              │
│  Comportamiento:                                             │
│  • Puede interactuar como usuario normal                     │
│  • Botones "Estoy en este local" VISIBLES                    │
│  • Botones "Sala Virtual" VISIBLES                           │
│  • Puede hacer check-in en locales                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔀 Casos de Uso

### Caso 1: Propietario con 1 Local

```
Usuario: Jorge
Rol: propietario
Locales: 1 (Casa Adolfo)

Selecciona "Modo Propietario"
    ↓
✅ Se asigna automáticamente "Casa Adolfo"
    ↓
Modo: propietario
Perfil: Casa Adolfo
Botones: OCULTOS
```

---

### Caso 2: Propietario con Múltiples Locales

```
Usuario: María
Rol: propietario
Locales: 3 (Bar A, Bar B, Bar C)

Selecciona "Modo Propietario"
    ↓
✅ Se asigna automáticamente "Bar A" (primer local)
    ↓
Modo: propietario
Perfil: Bar A
Botones: OCULTOS

Puede cambiar a Bar B o Bar C desde selector de perfil
```

---

### Caso 3: Propietario sin Locales

```
Usuario: Pedro
Rol: propietario
Locales: 0

Selecciona "Modo Propietario"
    ↓
❌ No hay locales para asignar
    ↓
✅ Vuelve automáticamente a modo Cliente
    ↓
Modo: cliente
Perfil: Pedro
Botones: VISIBLES

Mensaje: "No tienes locales registrados"
```

---

### Caso 4: Propietario Cambia a Usuario

```
Usuario: Jorge
Modo actual: propietario
Perfil actual: Casa Adolfo

Abre selector de perfil
    ↓
Selecciona "Perfil de Usuario (Jorge)"
    ↓
✅ Cambia automáticamente a modo Cliente
    ↓
Modo: cliente
Perfil: Jorge
Botones: VISIBLES
```

---

## 🎯 Reglas de Visibilidad de Botones

### "Estoy en este local"

**VISIBLE cuando:**
- ✅ Modo = cliente
- ✅ activeProfileType = 'cliente'
- ✅ Usuario autenticado
- ✅ Local abierto

**OCULTO cuando:**
- ❌ Modo = propietario
- ❌ activeProfileType = 'local'
- ❌ Usuario no autenticado
- ❌ Local cerrado

---

### "Sala Virtual"

**VISIBLE cuando:**
- ✅ Modo = cliente
- ✅ activeProfileType = 'cliente'
- ✅ Usuario autenticado
- ✅ Local abierto

**OCULTO cuando:**
- ❌ Modo = propietario
- ❌ activeProfileType = 'local'
- ❌ Usuario no autenticado
- ❌ Local cerrado

---

## 🔍 Verificación de Estado

### Cómo saber en qué modo estás:

1. **Selector de modo (Explorar):**
   - Arriba a la derecha
   - Muestra: "Modo Cliente" o "Modo Propietario"

2. **Selector de perfil:**
   - Icono de usuario
   - Muestra perfil activo
   - Indica modo en la descripción

3. **Logs de consola:**
   ```
   [ModeContext v53.0] 📊 Context State Changed:
   {
     currentMode: 'propietario',
     activeProfileType: 'local',
     activeLocalName: 'Casa Adolfo'
   }
   ```

---

## 🧪 Prueba Rápida (5 minutos)

### Test 1: Correos (2 min)
```
1. Admin > Facturación
2. Enviar factura de prueba a tu email
3. ✅ Verificar que llega
```

### Test 2: Modo Propietario (2 min)
```
1. Explorar > Modo Propietario
2. ✅ Verificar asignación automática
3. Abrir local desde mapa
4. ✅ Verificar botones ocultos
5. Selector de perfil > Usuario
6. ✅ Verificar cambio a Cliente
7. ✅ Verificar botones visibles
```

### Test 3: Valoraciones (1 min)
```
1. Mapa > Abrir "Bar A Coviña"
2. ✅ Verificar que muestra 5.0 (no 0.0)
```

---

## 📞 ¿Necesitas Ayuda?

### Documentación Completa

- **GUIA_RAPIDA_CORRECCIONES_V53.md** - Guía rápida en español
- **TECHNICAL_CHANGES_V53.md** - Cambios técnicos
- **GUIA_PRUEBAS_V53.md** - Guía de pruebas completa
- **RESUMEN_CORRECCIONES_V53.md** - Resumen ejecutivo

### Soporte

- **Email:** soporte@barlive.app
- **Incluir:** Capturas de pantalla y logs

---

## ✅ Checklist Rápido

- [ ] Correos de factura funcionan
- [ ] Modo Propietario asigna automáticamente
- [ ] Valoraciones sincronizadas
- [ ] Avatares más grandes
- [ ] Borde más delgado
- [ ] Página de solicitudes clara
- [ ] Configuración funcional

---

**¡Todo listo! Empieza a probar.** 🚀

**Versión:** 53.0  
**Estado:** ✅ PRODUCCIÓN
