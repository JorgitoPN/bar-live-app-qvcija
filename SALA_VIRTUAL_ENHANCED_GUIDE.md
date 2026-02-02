
# 🎭 Sala Virtual Enhanced - Guía Completa

## 📋 Descripción General

La **Sala Virtual Enhanced** es un entorno digital que actúa como "gemelo social" de un local físico, eliminando el miedo al rechazo y fomentando que los clientes se conozcan en tiempo real.

## 🎨 Características Principales

### 1. **Modo Día/Noche Adaptativo**

El sistema detecta automáticamente la hora local y cambia la estética:

#### Modo Día (08:00 - 20:00)
- **Estética**: Glassmorphism clara
- **Fondos**: Blancos/crema con transparencias
- **Acentos**: Azul cielo (#0EA5E9) y coral (#FB923C)
- **Tipografía**: Oscura y limpia (#1E293B)

#### Modo Noche (20:00 - 08:00)
- **Estética**: Neon-Night
- **Fondos**: Negro profundo/morado (#0F0A1F, #1A0B2E)
- **Acentos**: Rosa eléctrico (#EC4899), cian (#06B6D4), verde lima (#84CC16)
- **Tipografía**: Blanca con efecto glow
- **Efectos**: Sombras de neón, bordes brillantes

### 2. **Interaction Bubble Carousel**

Al tocar un avatar de usuario, se despliega un carrusel circular de burbujas animadas con mensajes predeterminados:

#### Categorías de Mensajes:

**💃 Ligar/Atrevido:**
- "¿Me sacas a bailar? 💃"
- "¿Te puedo sacar a bailar? 🕺✨"
- "Te he visto y no he podido no saludarte... 👀"
- "Me gusta tu estilo. 😊"

**🥂 Invitación:**
- "¿Te invito a una copa? 🥂"
- "¿Me invitas a una copa? 😇"
- "Pago yo la siguiente ronda 🍸"
- "¿Qué estás tomando? 🍹"

**😊 Rompehielos:**
- "S.O.S: Mis amigos son unos pesados, ¿me rescatas? 😂"
- "¿Te apetece charlar un rato? 😊"
- "¿Vienes mucho por aquí? ✨"

### 3. **Mensajes Rápidos Públicos (Sticky Bar)**

Carrusel horizontal sobre el input con mensajes para todos:
- "¡Salud a todos! 🍻"
- "¡Vaya temazo está sonando! 🎶"
- "¡Qué ambientazo hay hoy! 🔥"
- "¿Quién se pide la siguiente ronda? 🍺"

### 4. **Radar de Proximidad**

Sistema visual que resalta usuarios a menos de 5 metros:
- **Halo pulsante** alrededor del avatar
- **Badge de distancia** mostrando metros
- **Icono de ubicación** destacado
- **Efecto glow** en modo noche

### 5. **Lógica de "Los 3 Pasos"**

#### Paso 1: Selección
El usuario identifica a alguien en el radar/lista de usuarios activos.

#### Paso 2: Animación
Al enviar un mensaje predeterminado:
- **Modo Día**: Burbujas de champagne flotantes
- **Modo Noche**: Chispas de neón y efectos de glow
- El receptor ve una animación visual en pantalla completa

#### Paso 3: Conexión
- Si el receptor **responde**, se habilita el chat libre privado
- Si **no responde**, el mensaje expira al final de la noche (privacidad efímera)
- Los mensajes privados solo son visibles para emisor y receptor

## 🔧 Arquitectura Técnica

### Real-time con Supabase

```typescript
// Suscripción a mensajes
supabase.channel(`room:${localId}:chat`)
  .on('broadcast', { event: 'message_created' }, handleNewMessage)
  .subscribe();

// Suscripción a presencia de usuarios
supabase.channel(`room:${localId}:presence`)
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'sala_virtual_checkins' 
  }, handleUserChange)
  .subscribe();
```

### Geolocalización

```typescript
// Solicitar permisos
const { status } = await Location.requestForegroundPermissionsAsync();

// Obtener ubicación actual
const location = await Location.getCurrentPositionAsync({});

// Calcular distancia
const distance = calcularDistancia(lat1, lon1, lat2, lon2);
```

### Estructura de Datos

```typescript
interface Message {
  id: string;
  usuario_id: string;
  local_id: string;
  tipo: 'mensaje' | 'emoticon' | 'predefinido';
  contenido: string;
  created_at: string;
  is_private?: boolean;
  recipient_id?: string;
  usuario: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

interface ActiveUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  checked_in_at: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}
```

## 🎯 Flujo de Usuario

### Entrada a la Sala

1. Usuario navega a detalle del local
2. Presiona botón "Sala Virtual"
3. Sistema verifica si el local está abierto
4. Auto check-in si no está registrado
5. Carga mensajes y usuarios activos
6. Suscripción a actualizaciones en tiempo real

### Interacción con Usuarios

1. Usuario ve lista de personas activas
2. Usuarios cercanos (<5m) tienen halo pulsante
3. Al tocar avatar, se abre Interaction Bubble Carousel
4. Usuario selecciona mensaje predeterminado
5. Animación se dispara en pantalla del receptor
6. Si receptor responde, se habilita chat privado

### Mensajes Públicos

1. Usuario puede escribir mensaje libre
2. O seleccionar mensaje rápido del sticky bar
3. Mensaje se envía a todos en la sala
4. Actualización instantánea vía Supabase Realtime

### Salida de la Sala

1. Usuario presiona "Salir de la Sala"
2. Confirmación de salida
3. Auto check-out en base de datos
4. Broadcast de salida a otros usuarios
5. Navegación de vuelta al detalle del local

## 🔒 Privacidad y Seguridad

### Mensajes Efímeros
- Los mensajes NO se guardan en base de datos
- Chat volátil: solo existe mientras la sala está activa
- Mensajes privados expiran si no hay respuesta

### Geolocalización
- Permisos explícitos requeridos
- Ubicación solo usada para radar de proximidad
- No se almacena historial de ubicaciones
- Usuario puede denegar permisos y seguir usando la sala

### Reportes
- Sistema de reporte de usuarios
- Moderación por administradores
- Bloqueo temporal/permanente disponible

## 📱 Componentes Principales

### `app/detalle/sala-virtual-enhanced.tsx`
Pantalla principal de la Sala Virtual con:
- Detección automática de modo día/noche
- Gestión de check-in/check-out
- Chat público y privado
- Lista de usuarios activos
- Radar de proximidad

### `components/sala-virtual/InteractionBubbleCarousel.tsx`
Modal con mensajes predeterminados organizados por categorías.

### `components/sala-virtual/QuickPublicMessagesBar.tsx`
Barra sticky con mensajes rápidos públicos.

### `components/sala-virtual/AnimationOverlay.tsx`
Animaciones visuales para mensajes recibidos.

### `components/sala-virtual/ProximityRadar.tsx`
Indicador visual de usuarios cercanos.

### `components/sala-virtual/ReceivedMessageAnimation.tsx`
Animación específica para mensajes predeterminados recibidos.

## 🚀 Uso

### Navegación a Sala Virtual

```typescript
// Desde detalle de local
router.push({
  pathname: '/detalle/sala-virtual-enhanced',
  params: { localId: local.id }
});
```

### Enviar Mensaje Predeterminado

```typescript
const sendPredefinedMessage = async (recipientId: string, messageText: string) => {
  const message = {
    id: generateId(),
    usuario_id: user.id,
    local_id: localId,
    tipo: 'predefinido',
    contenido: messageText,
    is_private: true,
    recipient_id: recipientId,
    created_at: new Date().toISOString(),
  };
  
  // Broadcast via Supabase Realtime
  await chatChannel.send({
    type: 'broadcast',
    event: 'message_created',
    payload: message,
  });
};
```

### Calcular Proximidad

```typescript
import { calculateProximity, getNearbyUsers } from '@/utils/proximityUtils';

const nearbyUserIds = getNearbyUsers(currentLocation, userLocations);
const proximityResults = calculateProximity(currentLocation, userLocations);
```

## 🎨 Personalización de Tema

Los colores se adaptan automáticamente según la hora:

```typescript
const DAY_COLORS = {
  background: ['#F0F9FF', '#FFF7ED'],
  primary: '#0EA5E9',
  secondary: '#FB923C',
  // ...
};

const NIGHT_COLORS = {
  background: ['#0F0A1F', '#1A0B2E'],
  primary: '#EC4899',
  secondary: '#06B6D4',
  glow: 'rgba(236, 72, 153, 0.5)',
  // ...
};
```

## 📊 Métricas y Analytics

El sistema rastrea:
- Tiempo de permanencia en sala
- Mensajes enviados (públicos/privados)
- Interacciones totales
- Usuarios únicos contactados
- Respuestas a mensajes predeterminados

## 🔄 Actualizaciones en Tiempo Real

### Sin Refresh Manual
La UI se actualiza instantáneamente cuando:
- ✅ Un usuario entra/sale del recinto
- ✅ Se recibe un mensaje público o privado
- ✅ Alguien envía una reacción
- ✅ Cambia la proximidad de usuarios

### Broadcast Events

```typescript
// Usuario entra
channel.send({ event: 'user_joined', payload: { usuario_id, nombre } });

// Usuario sale
channel.send({ event: 'user_left', payload: { usuario_id } });

// Nuevo mensaje
channel.send({ event: 'message_created', payload: message });

// Sala cerrando
channel.send({ event: 'room_closing_soon', payload: { minutes } });
```

## 🎯 Mejores Prácticas

### Performance
- Usar `FlatList` para listas de mensajes y usuarios
- Implementar `keyExtractor` único para cada item
- Limitar mensajes en memoria (últimos 100)
- Desuscribirse de canales al salir

### UX
- Feedback inmediato en todas las acciones
- Animaciones suaves y no intrusivas
- Indicadores claros de estado (enviando, cargando)
- Confirmaciones para acciones destructivas

### Seguridad
- Validar permisos de ubicación
- Sanitizar contenido de mensajes
- Rate limiting en envío de mensajes
- Sistema de reportes accesible

## 🐛 Troubleshooting

### Mensajes no se actualizan
- Verificar suscripción a canal de Supabase
- Comprobar que `chatChannelRef.current` no es null
- Revisar logs de Supabase Realtime

### Ubicación no funciona
- Verificar permisos en dispositivo
- Comprobar que Location.requestForegroundPermissionsAsync() fue llamado
- En iOS, verificar Info.plist tiene NSLocationWhenInUseUsageDescription

### Animaciones no se muestran
- Verificar que `useNativeDriver: true` está configurado
- Comprobar que valores de Animated.Value se resetean correctamente
- Revisar que componente no se desmonta antes de completar animación

## 📝 Notas de Implementación

- **Chat Volátil**: Los mensajes NO persisten en base de datos
- **Privacidad**: Mensajes privados solo visibles para emisor y receptor
- **Expiración**: Interacciones expiran al cierre del local
- **Geolocalización**: Opcional, la sala funciona sin ella
- **Modo Automático**: Cambio día/noche cada minuto

## 🔮 Futuras Mejoras

- [ ] Reacciones en tiempo real a mensajes
- [ ] Stickers y GIFs personalizados
- [ ] Juegos y desafíos en sala
- [ ] Sistema de badges y logros
- [ ] Ranking de usuarios más activos
- [ ] Integración con eventos del local
- [ ] Notificaciones push para mensajes privados
- [ ] Traducción automática de mensajes
- [ ] Filtros de contenido inapropiado con IA
- [ ] Modo "invisible" para observar sin aparecer en lista

## 📞 Soporte

Para problemas o sugerencias, contactar al equipo de desarrollo de BarLive.
