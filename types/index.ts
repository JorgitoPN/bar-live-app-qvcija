
export type UserRole = 'cliente' | 'propietario' | 'admin';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol_app: UserRole;
  avatar?: string;
  seguidores?: number;
  seguidos?: number;
  posts?: number;
  bio?: string;
}

export interface PlanSuscripcion {
  id: string;
  nombre: 'basico' | 'estandar' | 'premium';
  precio_mensual: number;
  eventos_mes: number;
  promos_destacadas: number;
  perfil_social: boolean;
  panel_analisis: boolean;
  soporte_prioritario: boolean;
  visibilidad_extra: boolean;
  visibilidad_maxima: boolean;
  descripcion: string;
  activo: boolean;
}

export interface SuscripcionLocal {
  id: string;
  local_id: string;
  propietario_id: string;
  plan_id: string;
  estado: 'activa' | 'cancelada' | 'pausada' | 'vencida';
  fecha_inicio: string;
  fecha_fin?: string;
  fecha_proximo_pago?: string;
  eventos_usados_mes: number;
  promos_usadas_mes: number;
  ultimo_reset_contador: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  cancelar_al_final_periodo: boolean;
}

export interface HistorialPago {
  id: string;
  suscripcion_id: string;
  propietario_id: string;
  monto: number;
  estado: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  fecha_pago?: string;
  metodo_pago?: string;
  descripcion?: string;
  created_at: string;
}

// Tipos de categorías de locales
export type LocalCategory = 
  | 'cafe' 
  | 'bar' 
  | 'restaurante' 
  | 'pub' 
  | 'cocteleria' 
  | 'discoteca' 
  | 'lounge' 
  | 'terraza' 
  | 'rooftop';

export interface Local {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  coordenadas: {
    lat: number;
    lng: number;
  };
  distancia?: number | null;
  imagenes: string[];
  rating: number;
  precioMedio: number;
  horarios: Horario[];
  ambiente: string[];
  musica: string[];
  servicios: string[];
  metodosPago: string[];
  destacado?: boolean;
  nuevo?: boolean;
  abierto?: boolean;
  horaApertura?: string;
  horaCierre?: string;
  popularidad?: number;
  checkIns?: number;
  seguidores?: number;
  telefono?: string;
  web?: string;
  google_place_id?: string;
  google_rating?: number;
  google_user_ratings_total?: number;
  google_price_level?: number;
  google_business_status?: string;
  estado_negocio?: string;
  
  // Campos adicionales del enriquecimiento
  valoracion_google?: number;
  numero_reviews_google?: number;
  website_url?: string;
  tipos_google?: string[];
  nivel_precio_google?: number;
  google_maps_url?: string;
  descripcion_google?: string;
  horarios_completos?: Record<string, string[]>;
  estado_actual?: 'abierto_ahora' | 'cerrado_ahora';
  servicios_disponibles?: Record<string, boolean>;
  ambiente_google?: Record<string, boolean>;
  clientela?: Record<string, boolean>;
  imagen_url?: string;
  galeria_urls?: string[];
  reviews_google?: {
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }[];
  activo?: boolean;
  source_type?: 'osm' | 'manual' | 'google';
  source_id?: string;
  comunidad?: string;
  fecha_importacion_google?: string;
  enriquecido?: boolean;
  barlive_type?: string;
  barlive_types?: LocalCategory[];
  
  // Campos para ordenamiento
  esDestacado?: boolean;
  estadoBadge?: string;
}

export interface LocalCatalogo {
  id: string;
  osm_id: string;
  nombre: string;
  tipo_osm: string;
  barlive_types: LocalCategory[];
  direccion: string;
  provincia: string;
  comunidad: string;
  latitud: number;
  longitud: number;
  telefono?: string;
  website?: string;
  etiquetas_osm: Record<string, any>;
  outdoor_seating?: boolean;
  enriquecido: boolean;
  notas?: string;
  fecha_catalogado: string;
  google_place_id?: string;
  local_id?: string;
  google_data?: GooglePlaceDetails;
  fecha_enriquecido?: string;
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text: string[];
    open_now?: boolean;
  };
  photos?: {
    photo_reference: string;
    height: number;
    width: number;
  }[];
  types?: string[];
  price_level?: number;
  url?: string;
  reviews?: {
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }[];
  editorial_summary?: {
    overview: string;
  };
  business_status?: string;
}

export interface EnrichmentResult {
  success: boolean;
  localCatalogoId: string;
  google_place_id?: string;
  strategy_used?: string;
  error?: string;
  notas?: string;
}

export interface LocalEnriquecido {
  // Datos básicos
  google_place_id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  telefono?: string;
  website?: string;
  
  // Valoraciones
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  
  // Tipos y categorías
  barlive_types: LocalCategory[];
  google_types: string[];
  
  // Horarios
  horarios: Record<string, string[]>;
  abierto_ahora?: boolean;
  
  // Atributos
  servicios: Record<string, boolean>;
  ambiente: Record<string, boolean>;
  clientela: Record<string, boolean>;
  metodos_pago: Record<string, boolean>;
  
  // Fotos
  fotos: string[];
  
  // Metadata
  google_url?: string;
  business_status?: string;
  editorial_summary?: string;
}

export interface ConfiguracionAPIs {
  id: string;
  singleton_key: 'global';
  google_places_activa: boolean;
  google_places_contador_mes: number;
  limite_mensual_places: number;
  pausar_automaticamente: boolean;
  alerta_80_porciento: boolean;
  alerta_95_porciento: boolean;
  ultimo_reset: string;
  mes_actual: string;
}

export interface Horario {
  dia: string;
  apertura: string;
  cierre: string;
}

export interface Evento {
  id: string;
  localId: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora: string;
  precio?: number | null;
  imagen: string;
  localNombre: string;
  provincia: string;
  entradasVendidas?: number;
  entradasTotales?: number;
  destacado?: boolean;
  propietario_id?: string;
  local_direccion?: string;
  local_ciudad?: string;
  activo?: boolean;
}

export interface Empleo {
  id: string;
  localId: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  salario?: string;
  localNombre: string;
  fechaPublicacion: string;
  provincia: string;
  requisitos?: string[];
}

export interface Post {
  id: string;
  autorId: string;
  autorNombre: string;
  autorAvatar?: string;
  tipo: 'usuario' | 'local';
  contenido: string;
  imagen?: string;
  imagenes?: string[];
  likes: number;
  comentarios: number;
  fecha: string;
  localId?: string;
  liked?: boolean;
  ubicacion?: string;
}

export interface Historia {
  id: string;
  autorId: string;
  autorNombre: string;
  autorAvatar?: string;
  tipo: 'usuario' | 'local';
  imagen: string;
  fecha: string;
  visto?: boolean;
}

export interface Chat {
  id: string;
  nombre: string;
  avatar?: string;
  ultimoMensaje: string;
  fecha: string;
  noLeidos: number;
  tipo: 'individual' | 'grupo';
}

export interface Mensaje {
  id: string;
  chatId: string;
  autorId: string;
  autorNombre: string;
  contenido: string;
  fecha: string;
  leido: boolean;
  tipo: 'texto' | 'imagen' | 'audio' | 'ubicacion' | 'archivo';
}

export interface Notificacion {
  id: string;
  tipo: 'like' | 'comentario' | 'seguidor' | 'mencion' | 'solicitud';
  usuarioId: string;
  usuarioNombre: string;
  usuarioAvatar?: string;
  contenido: string;
  fecha: string;
  leida: boolean;
  postId?: string;
}

export interface Filtros {
  tipo?: string[];
  musica?: string[];
  precio?: [number, number];
  servicios?: string[];
  ambiente?: string[];
  distancia?: number;
  provincia?: string;
  comunidad?: string;
  busqueda?: string;
  precioRango?: string;
}
