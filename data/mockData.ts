
import { Local, Evento, Empleo, Post, Historia, Chat, Notificacion, User } from '@/types';

// Empty user - will be populated from database
export const mockUsuario: User & { username?: string; publicaciones?: number; seguidores?: number; siguiendo?: number } = {
  id: '1',
  nombre: 'Usuario',
  username: 'usuario',
  email: 'usuario@barlive.com',
  avatar: undefined,
  bio: '',
  seguidores: 0,
  siguiendo: 0,
  publicaciones: 0,
  posts: 0,
  seguidos: 0,
  rol_app: 'cliente',
};

// Empty arrays - data will come from database
export const mockLocales: Local[] = [];

export const mockEventos: Evento[] = [];

export const mockEmpleos: Empleo[] = [];

export const mockPosts: Post[] = [];

export const mockHistorias: Historia[] = [];

export const mockChats: (Chat & { hora?: string; leido?: boolean; mensajesNoLeidos?: number; online?: boolean })[] = [];

export const mockNotificaciones: (Notificacion & { titulo?: string; mensaje?: string })[] = [];
