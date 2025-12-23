
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';

interface PageItem {
  icon: string;
  title: string;
  description: string;
  route: string;
  category: string;
}

export default function NavegacionPaginasScreen() {
  const router = useRouter();

  const allPages: PageItem[] = [
    // Tabs principales
    {
      icon: 'house.fill',
      title: 'Inicio / Explorar',
      description: 'Página principal con exploración de locales',
      route: '/(tabs)/explorar',
      category: 'Principal',
    },
    {
      icon: 'map.fill',
      title: 'Mapa',
      description: 'Vista de mapa con locales cercanos',
      route: '/(tabs)/explorar/mapa',
      category: 'Principal',
    },
    {
      icon: 'calendar',
      title: 'Eventos',
      description: 'Listado de eventos y actividades',
      route: '/(tabs)/eventos',
      category: 'Principal',
    },
    {
      icon: 'briefcase.fill',
      title: 'Empleo',
      description: 'Ofertas de trabajo y perfiles profesionales',
      route: '/(tabs)/empleo',
      category: 'Principal',
    },
    {
      icon: 'person.2.fill',
      title: 'Social',
      description: 'Feed social con publicaciones e historias',
      route: '/(tabs)/social',
      category: 'Principal',
    },
    {
      icon: 'person.circle.fill',
      title: 'Perfil',
      description: 'Perfil de usuario con publicaciones',
      route: '/(tabs)/perfil',
      category: 'Principal',
    },
    
    // Gestión (Propietarios)
    {
      icon: 'building.2.fill',
      title: 'Mis Locales',
      description: 'Gestión de locales del propietario',
      route: '/gestion/mis-locales',
      category: 'Gestión',
    },
    {
      icon: 'creditcard.fill',
      title: 'Planes de Suscripción',
      description: 'Planes y suscripciones para locales',
      route: '/gestion/planes-suscripcion',
      category: 'Gestión',
    },
    
    // Perfil y configuración
    {
      icon: 'message.fill',
      title: 'Chats',
      description: 'Mensajes y conversaciones',
      route: '/(tabs)/perfil/chats',
      category: 'Perfil',
    },
    {
      icon: 'bell.fill',
      title: 'Notificaciones',
      description: 'Centro de notificaciones',
      route: '/(tabs)/perfil/notificaciones',
      category: 'Perfil',
    },
    {
      icon: 'gearshape.fill',
      title: 'Configuración',
      description: 'Ajustes de cuenta y preferencias',
      route: '/(tabs)/perfil/configuracion',
      category: 'Perfil',
    },
    {
      icon: 'megaphone.fill',
      title: 'Preferencias de Anuncios',
      description: 'Gestión de preferencias publicitarias',
      route: '/(tabs)/perfil/preferencias-anuncios',
      category: 'Perfil',
    },
    
    // Crear contenido
    {
      icon: 'plus.square.fill',
      title: 'Crear Publicación',
      description: 'Nueva publicación en el feed social',
      route: '/crear/publicacion',
      category: 'Crear',
    },
    {
      icon: 'camera.circle.fill',
      title: 'Crear Historia',
      description: 'Nueva historia temporal',
      route: '/crear/historia',
      category: 'Crear',
    },
    {
      icon: 'building.fill',
      title: 'Crear Local',
      description: 'Registrar nuevo local',
      route: '/crear/local',
      category: 'Crear',
    },
    {
      icon: 'ticket.fill',
      title: 'Crear Evento',
      description: 'Nuevo evento o actividad',
      route: '/crear/evento',
      category: 'Crear',
    },
    {
      icon: 'doc.text.fill',
      title: 'Crear Oferta de Trabajo',
      description: 'Nueva oferta laboral',
      route: '/crear/oferta-trabajo',
      category: 'Crear',
    },
    {
      icon: 'person.badge.plus',
      title: 'Crear Perfil Profesional',
      description: 'Perfil para búsqueda de empleo',
      route: '/crear/perfil-profesional',
      category: 'Crear',
    },
    
    // Detalles
    {
      icon: 'info.circle.fill',
      title: 'Detalle de Local',
      description: 'Información completa del local',
      route: '/detalle/local',
      category: 'Detalles',
    },
    {
      icon: 'calendar.badge.clock',
      title: 'Detalle de Evento',
      description: 'Información del evento',
      route: '/detalle/evento',
      category: 'Detalles',
    },
    {
      icon: 'video.fill',
      title: 'Sala Virtual',
      description: 'Sala de eventos virtuales',
      route: '/detalle/sala-virtual',
      category: 'Detalles',
    },
    
    // Social
    {
      icon: 'heart.fill',
      title: 'Favoritos',
      description: 'Publicaciones guardadas',
      route: '/social/favoritos',
      category: 'Social',
    },
    {
      icon: 'person.3.fill',
      title: 'Amigos',
      description: 'Lista de amigos y seguidores',
      route: '/social/amigos',
      category: 'Social',
    },
    {
      icon: 'doc.text',
      title: 'Detalle de Post',
      description: 'Vista detallada de publicación',
      route: '/social/post',
      category: 'Social',
    },
    
    // Autenticación
    {
      icon: 'person.crop.circle.badge.checkmark',
      title: 'Login',
      description: 'Inicio de sesión',
      route: '/auth/login-popup',
      category: 'Autenticación',
    },
    {
      icon: 'hand.wave.fill',
      title: 'Bienvenida',
      description: 'Pantalla de bienvenida',
      route: '/auth/bienvenida',
      category: 'Autenticación',
    },
    {
      icon: 'checkmark.circle.fill',
      title: 'Completar Perfil',
      description: 'Finalizar registro de usuario',
      route: '/auth/completar-perfil',
      category: 'Autenticación',
    },
    
    // Solicitudes
    {
      icon: 'person.badge.key.fill',
      title: 'Solicitar Rol Propietario',
      description: 'Solicitud para ser propietario',
      route: '/solicitudes/solicitar-rol-propietario',
      category: 'Solicitudes',
    },
    
    // Admin
    {
      icon: 'shield.fill',
      title: 'Panel Admin',
      description: 'Panel principal de administración',
      route: '/(tabs)/admin',
      category: 'Admin',
    },
    {
      icon: 'map',
      title: 'Importación OSM',
      description: 'Importar desde OpenStreetMap',
      route: '/admin/importacion-osm',
      category: 'Admin',
    },
    {
      icon: 'star.fill',
      title: 'Enriquecimiento Google',
      description: 'Enriquecer con Google Places',
      route: '/admin/enriquecimiento-google',
      category: 'Admin',
    },
    {
      icon: 'dollarsign.circle',
      title: 'Control de Costes API',
      description: 'Monitoreo de uso de APIs',
      route: '/admin/control-costes-api',
      category: 'Admin',
    },
    {
      icon: 'building.2',
      title: 'Gestionar Locales',
      description: 'Administración de locales',
      route: '/admin/gestionar-locales',
      category: 'Admin',
    },
    {
      icon: 'person.2.fill',
      title: 'Gestionar Usuarios',
      description: 'Administración de usuarios',
      route: '/admin/gestionar-usuarios',
      category: 'Admin',
    },
    {
      icon: 'chart.bar.fill',
      title: 'Visión Finanzas',
      description: 'Dashboard financiero',
      route: '/admin/vision-finanzas',
      category: 'Admin',
    },
    {
      icon: 'gearshape.fill',
      title: 'Configuración General',
      description: 'Ajustes del sistema',
      route: '/admin/configuracion-general',
      category: 'Admin',
    },
    {
      icon: 'server.rack',
      title: 'Configuración Supabase',
      description: 'Configurar backend',
      route: '/admin/configuracion-supabase',
      category: 'Admin',
    },
    {
      icon: 'square.grid.2x2',
      title: 'Datos Maestros',
      description: 'Gestión de categorías y tipos',
      route: '/admin/datos-maestros',
      category: 'Admin',
    },
    {
      icon: 'arrow.triangle.2.circlepath',
      title: 'Sincronización',
      description: 'Sincronización de datos',
      route: '/admin/sincronizacion',
      category: 'Admin',
    },
    {
      icon: 'externaldrive.fill',
      title: 'Backups',
      description: 'Gestión de copias de seguridad',
      route: '/admin/backups',
      category: 'Admin',
    },
    {
      icon: 'doc.text',
      title: 'Contenido Legal',
      description: 'Términos y políticas',
      route: '/admin/contenido-legal',
      category: 'Admin',
    },
    {
      icon: 'envelope.fill',
      title: 'Gestión de Emails',
      description: 'Plantillas de correo',
      route: '/admin/gestion-emails',
      category: 'Admin',
    },
    {
      icon: 'paperplane.fill',
      title: 'Probar Emails',
      description: 'Envío de emails de prueba',
      route: '/admin/probar-emails',
      category: 'Admin',
    },
    {
      icon: 'person.badge.clock',
      title: 'Solicitudes Propietario',
      description: 'Gestión de solicitudes',
      route: '/admin/solicitudes-propietario',
      category: 'Admin',
    },
    {
      icon: 'doc.plaintext',
      title: 'Ver Ficha',
      description: 'Detalle de ficha administrativa',
      route: '/admin/ver-ficha',
      category: 'Admin',
    },
    {
      icon: 'arrow.down.doc',
      title: 'Importación Masiva',
      description: 'Importar desde múltiples fuentes',
      route: '/admin/importacion-masiva',
      category: 'Admin',
    },
    {
      icon: 'trash.circle.fill',
      title: 'Sistema de Limpieza Automática',
      description: 'Eliminar duplicados e inválidos',
      route: '/admin/sistema-limpieza-automatica',
      category: 'Admin',
    },
    {
      icon: 'exclamationmark.triangle.fill',
      title: 'Revisar Locales Inválidos',
      description: 'Revisar y excluir locales inválidos',
      route: '/admin/revisar-locales-invalidos',
      category: 'Admin',
    },
    {
      icon: 'xmark.shield.fill',
      title: 'Locales Excluidos',
      description: 'Ver y gestionar locales excluidos',
      route: '/admin/locales-excluidos',
      category: 'Admin',
    },
    {
      icon: 'doc.on.doc.fill',
      title: 'Gestionar Duplicados',
      description: 'Detectar y eliminar duplicados',
      route: '/admin/gestionar-duplicados',
      category: 'Admin',
    },
    {
      icon: 'checkmark.seal.fill',
      title: 'Validar Nombres de Locales',
      description: 'Validar nombres según palabras clave',
      route: '/admin/validar-nombres-locales',
      category: 'Admin',
    },
  ];

  const categories = Array.from(new Set(allPages.map(p => p.category)));

  const handlePagePress = (route: string) => {
    try {
      router.push(route as any);
    } catch (error) {
      console.error('Error navigating to:', route, error);
    }
  };

  const renderCategory = (category: string) => {
    const pagesInCategory = allPages.filter(p => p.category === category);
    
    return (
      <View key={category} style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{category}</Text>
        {pagesInCategory.map((page, index) => (
          <TouchableOpacity
            key={index}
            style={styles.pageCard}
            onPress={() => handlePagePress(page.route)}
          >
            <View style={[styles.pageIcon, { backgroundColor: colors.primary }]}>
              <IconSymbol name={page.icon as any} size={24} color="white" />
            </View>
            <View style={styles.pageContent}>
              <Text style={styles.pageTitle}>{page.title}</Text>
              <Text style={styles.pageDescription}>{page.description}</Text>
              <Text style={styles.pageRoute}>{page.route}</Text>
            </View>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={colors.textSecondary}
              style={styles.pageChevron}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Navegación de Páginas</Text>
          <Text style={styles.headerSubtitle}>
            Todas las páginas disponibles en BarLive ({allPages.length})
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Toca cualquier página para navegar directamente a ella. Esta herramienta te permite
            acceder rápidamente a cualquier sección de la aplicación.
          </Text>
        </View>

        {categories.map(renderCategory)}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    ...commonStyles.shadow,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingLeft: 4,
  },
  pageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...commonStyles.shadow,
  },
  pageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pageContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  pageDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pageRoute: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pageChevron: {
    marginLeft: 10,
  },
});
