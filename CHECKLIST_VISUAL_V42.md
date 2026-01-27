
# ✅ CHECKLIST VISUAL - CORRECCIONES v42.0

## 📱 Verificación Visual Paso a Paso

### 1. Miniavatar del menú inferior (@jorge)

**Pasos:**
1. Abre la app como usuario @jorge
2. Ve a cualquier página
3. Mira el menú inferior (bottom tab bar)
4. Busca el icono de perfil (último icono a la derecha)

**✅ Debe verse:**
- Avatar circular con foto de perfil
- O icono de persona si no tiene foto
- Borde blanco cuando está activo

**❌ NO debe verse:**
- Icono roto
- Espacio en blanco
- Error de carga

---

### 2. Sección de Momentos en página social

**Pasos:**
1. Ve a la página Social (icono de 2 personas)
2. Mira la parte superior de la página
3. Busca la sección de momentos (scroll horizontal)

**✅ Debe verse:**
- Sección SIEMPRE visible (incluso sin momentos)
- Avatar grande (70px - tamaño Instagram)
- Tu foto de perfil en el primer avatar
- Botón + pequeño en la esquina inferior derecha del avatar
- Texto "Tu Momento" debajo del avatar
- Otros avatares de amigos con momentos

**❌ NO debe verse:**
- Sección oculta o vacía
- Avatar pequeño
- Sin botón +
- Sin foto de perfil

**Interacción:**
- Toca el botón + → Debe abrir el editor de momentos
- Toca tu avatar → Debe abrir el visor de momentos (si tienes momentos)
- Toca avatar de amigo → Debe abrir sus momentos

---

### 3. Borde verde en Momentos

**Pasos:**
1. Crea un momento nuevo
2. Verifica que tu avatar tiene borde verde neón
3. Toca tu avatar para ver el momento
4. Cierra el visor de momentos
5. Verifica el avatar nuevamente

**✅ Debe verse:**
- Borde verde ANTES de ver el momento
- Borde gris DESPUÉS de ver el momento

**❌ NO debe verse:**
- Borde verde permanente después de ver el momento

---

### 4. Perfil de local (Bar A Coviña)

**Pasos:**
1. Ve al perfil de Bar A Coviña
2. Mira la sección de estadísticas (debajo del avatar)

**✅ Debe verse:**
- Número de publicaciones
- Icono de candado 🔒
- Texto "Perfil Social"
- Texto "No Activo"

**❌ NO debe verse:**
- Número de seguidores
- Número de siguiendo
- Botón "Seguir" funcional

**Si intentas acceder como visitante:**
- Debe aparecer un Alert con mensaje persuasivo
- Debe ofrecer botón "Ver Planes"
- Debe explicar los beneficios de contratar un plan

---

### 5. Acciones en perfil de local

**Pasos:**
1. Ve a cualquier perfil de local
2. Scroll hasta la sección "Info"

**✅ Debe verse:**
- Descripción
- Contacto
- Horarios
- Servicios
- Ubicación
- Botón "Cómo llegar"
- Botón "Ver información completa"

**❌ NO debe verse:**
- Sección "Estoy en este local"
- Sección "Sala Virtual"
- Botón "Entrar en la sala virtual"

---

### 6. Tarjeta "Créditos disponibles"

**Pasos:**
1. Ve a Gestión > Mis Locales
2. Selecciona un local con plan activo
3. Busca la tarjeta "Créditos disponibles"

**✅ Debe verse:**
- Icono de tarjeta de crédito
- Título "Créditos Disponibles"
- Barra de progreso para "Destacados" (color naranja)
- Barra de progreso para "Eventos" (color morado)
- Texto "X / Y" mostrando créditos restantes
- Fecha de renovación de créditos
- Sección "¿Cómo se calcula?" con explicación

**❌ NO debe verse:**
- Diseño confuso
- Información poco clara
- Barras de progreso sin etiquetas

---

### 7. Página "Ver planes"

**Pasos:**
1. Ve a Gestión > Mis Locales
2. Toca "Ver Planes" o "Cambiar Plan"
3. Observa las tarjetas de planes

**✅ Debe verse:**
- 3 tarjetas (Free, Estándar, Premium)
- Espaciado claro entre tarjetas (24px)
- Plan Estándar ligeramente más grande
- Badge "MÁS POPULAR" en Plan Estándar
- Cada tarjeta con:
  - Icono distintivo
  - Nombre del plan
  - Precio
  - Lista de beneficios con iconos ✓ o ✗
  - Botón de acción claro

**❌ NO debe verse:**
- Tarjetas solapadas
- Tarjetas cortadas
- Texto ilegible
- Botones ocultos

---

### 8. Sección "Potencial alcanzado"

**Pasos:**
1. Ve a Gestión > Mis Locales
2. Selecciona un local
3. Busca la tarjeta "Potencial de clientes alcanzado"

**✅ Debe verse:**
- Barra de progreso con porcentaje
- Badge de estado (Excelente/Buen/Bajo alcance)
- Chips mostrando:
  - "Destacado Activo (+30%)" si está destacado
  - "Plan Estándar (+15%)" o "Plan Premium (+30%)"
- Caja amarilla con mensaje de mejora (si < 80%)
- Sección "¿Cómo se calcula?" con desglose:
  - Base: 20%
  - Destacar local: +30%
  - Plan Estándar: +15%
  - Plan Premium: +30%

**❌ NO debe verse:**
- Eventos sumando al porcentaje
- Porcentaje mayor a 100%
- Cálculo incorrecto

**Prueba:**
1. Crea un evento → El porcentaje NO debe cambiar
2. Activa destacado → El porcentaje debe aumentar +30%

---

### 9. Asignación automática de plan gratuito

**Pasos:**
1. Como admin, asigna un local a un usuario
2. Ve a Gestión > Mis Locales como ese usuario
3. Verifica el plan del local

**✅ Debe verse:**
- Plan "FREE" asignado automáticamente
- 1 crédito de destacado disponible
- 1 crédito de evento disponible
- Estado "activa"

**❌ NO debe verse:**
- Local sin plan
- Local sin créditos de bienvenida

---

## 🎨 Comparación Visual

### Momentos - ANTES vs AHORA

**ANTES:**
```
[Avatar pequeño] [Avatar pequeño] [Avatar pequeño]
    (50px)           (50px)           (50px)
```

**AHORA:**
```
[Avatar grande + botón +] [Avatar grande] [Avatar grande]
      (70px)                  (70px)          (70px)
   Tu Momento              Amigo 1         Amigo 2
```

---

### Perfil de local - ANTES vs AHORA

**ANTES:**
```
Publicaciones: 5
Seguidores: 4      ← ❌ No debería mostrarse sin perfil social
Siguiendo: 2       ← ❌ No debería mostrarse sin perfil social

[Estoy en este local]     ← ❌ No tiene sentido para locales
[Entrar en la sala virtual] ← ❌ No tiene sentido para locales
```

**AHORA:**
```
Publicaciones: 5
🔒 Perfil Social       ← ✅ Correcto
   No Activo

[Seguir] [Llamar] [Mensaje]  ← ✅ Solo acciones relevantes
```

---

### Planes - ANTES vs AHORA

**ANTES:**
```
[Plan Free]
[Plan Estándar] ← Solapado
[Plan Premium]  ← Solapado
```

**AHORA:**
```
[Plan Free]
    ↓ 24px espacio
[Plan Estándar] ← 5% más grande + badge "MÁS POPULAR"
    ↓ 24px espacio
[Plan Premium]
```

---

## 🔍 Verificación Rápida

Marca cada item cuando lo hayas verificado:

- [ ] Avatar de @jorge visible en menú inferior
- [ ] Sección de momentos visible en página social
- [ ] Avatar de momentos tamaño Instagram (70px)
- [ ] Botón + visible en avatar de momentos
- [ ] Borde verde desaparece después de ver momento
- [ ] Bar A Coviña no muestra seguidores
- [ ] Bar A Coviña muestra mensaje persuasivo
- [ ] Perfil de local sin "Estoy en este local"
- [ ] Perfil de local sin "Entrar en la sala virtual"
- [ ] Tarjeta "Créditos disponibles" clara y legible
- [ ] Página "Ver planes" sin solapamientos
- [ ] Plan Estándar destacado con badge
- [ ] Potencial alcanzado NO incluye eventos
- [ ] Potencial alcanzado incluye plan y destacado
- [ ] Locales reclamados tienen plan gratuito automático
- [ ] Plan gratuito incluye 1 crédito de bienvenida

---

## 📸 Capturas Recomendadas

Para verificar que todo funciona, toma capturas de:

1. Menú inferior mostrando avatar de @jorge
2. Sección de momentos en página social
3. Perfil de Bar A Coviña (sin seguidores)
4. Alert de "Perfil Social No Disponible"
5. Tarjeta "Créditos disponibles"
6. Página "Ver planes" completa
7. Tarjeta "Potencial alcanzado"

---

**Versión:** v42.0  
**Estado:** ✅ LISTO PARA VERIFICACIÓN  
**Fecha:** 2025
