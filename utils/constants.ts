
export const PROVINCIAS_ESPAÑA = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
  'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria',
  'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Gerona', 'Granada',
  'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares',
  'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lérida',
  'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Orense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia',
  'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia',
  'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza',
];

export const TIPOS_LOCAL = [
  { id: 'cafe', label: 'Café', icon: 'cup.and.saucer.fill' },
  { id: 'bar', label: 'Bar', icon: 'wineglass.fill' },
  { id: 'restaurante', label: 'Restaurante', icon: 'fork.knife' },
  { id: 'pub', label: 'Pub', icon: 'mug.fill' },
  { id: 'cocteleria', label: 'Coctelería', icon: 'wineglass' },
  { id: 'discoteca', label: 'Discoteca', icon: 'music.note' },
];

// Categories to exclude from display throughout the app
export const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];

export const TIPOS_MUSICA = [
  'Rock', 'Pop', 'Jazz', 'Electrónica', 'Reggaeton', 'Indie',
  'Clásica', 'Flamenco', 'Salsa', 'Hip Hop', 'House', 'Techno',
  'Acústica', 'Blues', 'Funk', 'Soul', 'Latina',
];

export const AMBIENTES = [
  'Tranquilo', 'Animado', 'Romántico', 'Familiar', 'Moderno',
  'Tradicional', 'Elegante', 'Informal', 'Joven', 'Fiesta',
  'Acogedor', 'Espacioso', 'Íntimo',
];

export const SERVICIOS = [
  'WiFi', 'Terraza', 'Parking', 'Accesible', 'Reservas',
  'Música en vivo', 'Karaoke', 'Billar', 'Dardos', 'Futbolín',
  'Zona VIP', 'Guardarropa', 'Cocina hasta tarde', 'Desayunos',
  'Menú del día', 'Tapas', 'Comida para llevar', 'Delivery',
];

export const METODOS_PAGO = [
  'Efectivo', 'Tarjeta', 'Bizum', 'PayPal', 'Apple Pay', 'Google Pay',
];

export const DIAS_SEMANA = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
];

export const RANGOS_PRECIO = [
  { id: 1, label: '€', min: 0, max: 15 },
  { id: 2, label: '€€', min: 15, max: 30 },
  { id: 3, label: '€€€', min: 30, max: 50 },
  { id: 4, label: '€€€€', min: 50, max: 999 },
];

export const TIPOS_EMPLEO = [
  'Jornada completa',
  'Media jornada',
  'Freelance',
  'Temporal',
  'Prácticas',
  'Fin de semana',
];

export const PUESTOS_TRABAJO = [
  'Camarero/a',
  'Cocinero/a',
  'Ayudante de cocina',
  'Barman/Barmaid',
  'Jefe de sala',
  'Sumiller',
  'DJ',
  'Relaciones públicas',
  'Seguridad',
  'Limpieza',
  'Gerente',
];

export const MAX_IMAGENES_PUBLICACION = 10;
export const MAX_CARACTERES_PUBLICACION = 2200;
export const MAX_CARACTERES_COMENTARIO = 500;
export const MAX_CARACTERES_BIO = 150;

export const DURACION_HISTORIA_SEGUNDOS = 15;
export const DURACION_HISTORIA_HORAS = 24;
