
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { getCategoryIcon } from '@/utils/categoryIcons';

const { width } = Dimensions.get('window');

interface EventoData {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string;
  precio: number | null;
  imagen_url: string | null;
  local_id: string | null;
  provincia: string | null;
  destacado: boolean;
  local_nombre?: string;
  local_direccion?: string;
  local_ciudad?: string;
  local_latitud?: number;
  local_longitud?: number;
  local_imagen_url?: string;
  local_categoria?: string;
}

export default function DetalleEventoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [evento, setEvento] = useState<EventoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    cargarEvento();
    obtenerUbicacionUsuario();
  }, [params.id]);

  useEffect(() => {
    if (evento) {
      // Trigger animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [evento]);

  const obtenerUbicacionUsuario = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[DetalleEvento] Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('[DetalleEvento] Error getting location:', error);
    }
  };

  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (userLocation && evento?.local_latitud && evento?.local_longitud) {
      const dist = calcularDistancia(
        userLocation.latitude,
        userLocation.longitude,
        evento.local_latitud,
        evento.local_longitud
      );
      setDistance(dist);
    }
  }, [userLocation, evento]);

  const cargarEvento = async () => {
    try {
      setLoading(true);
      const eventoId = params.id as string;

      if (!eventoId) {
        console.error('[DetalleEvento] No event ID provided');
        router.back();
        return;
      }

      console.log('[DetalleEvento] Loading event:', eventoId);

      const { data, error } = await supabase
        .from('eventos')
        .select(`
          *,
          locales:local_id (
            nombre,
            direccion,
            ciudad,
            latitud,
            longitud,
            imagen_url,
            barlive_type
          )
        `)
        .eq('id', eventoId)
        .eq('activo', true)
        .single();

      if (error) {
        console.error('[DetalleEvento] Error loading event:', error);
        router.back();
        return;
      }

      if (!data) {
        console.error('[DetalleEvento] Event not found');
        router.back();
        return;
      }

      // Transform the data to match our interface
      const eventoData: EventoData = {
        id: data.id,
        titulo: data.titulo,
        descripcion: data.descripcion,
        fecha: data.fecha,
        hora: data.hora,
        precio: data.precio,
        imagen_url: data.imagen_url,
        local_id: data.local_id,
        provincia: data.provincia,
        destacado: data.destacado,
        local_nombre: data.locales?.nombre,
        local_direccion: data.locales?.direccion,
        local_ciudad: data.locales?.ciudad,
        local_latitud: data.locales?.latitud,
        local_longitud: data.locales?.longitud,
        local_imagen_url: data.locales?.imagen_url,
        local_categoria: data.locales?.barlive_type,
      };

      console.log('[DetalleEvento] Event loaded:', eventoData.titulo);
      setEvento(eventoData);
    } catch (error) {
      console.error('[DetalleEvento] Error:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).toUpperCase();
    } catch (error) {
      return fecha;
    }
  };

  const formatDiaMes = (fecha: string): { dia: string; mes: string } => {
    try {
      const date = new Date(fecha);
      const dia = date.getDate().toString();
      const mes = date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
      return { dia, mes };
    } catch (error) {
      return { dia: '', mes: '' };
    }
  };

  const formatHora = (hora: string): string => {
    try {
      // hora comes in format "HH:MM:SS"
      const parts = hora.split(':');
      return `${parts[0]}:${parts[1]}`;
    } catch (error) {
      return hora;
    }
  };

  const getLocalAddress = (): string => {
    if (!evento) return '';
    
    let address = evento.local_direccion || '';
    if (evento.local_ciudad) {
      address += address ? `, ${evento.local_ciudad}` : evento.local_ciudad;
    }
    if (evento.provincia) {
      address += address ? `, ${evento.provincia}` : evento.provincia;
    }
    return address;
  };

  const handleComoLlegar = async () => {
    if (!evento) return;

    const address = getLocalAddress();
    
    if (!address && !evento.local_latitud && !evento.local_longitud) {
      Alert.alert(
        'Ubicación no disponible',
        'No se ha encontrado la dirección del local.'
      );
      return;
    }

    try {
      let url = '';
      
      // Use coordinates if available, otherwise use address
      if (evento.local_latitud && evento.local_longitud) {
        if (Platform.OS === 'ios') {
          url = `maps://app?daddr=${evento.local_latitud},${evento.local_longitud}`;
        } else {
          url = `google.navigation:q=${evento.local_latitud},${evento.local_longitud}`;
        }
      } else {
        const encodedAddress = encodeURIComponent(address);
        if (Platform.OS === 'ios') {
          url = `maps://app?daddr=${encodedAddress}`;
        } else {
          url = `google.navigation:q=${encodedAddress}`;
        }
      }

      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web maps
        const webUrl = evento.local_latitud && evento.local_longitud
          ? `https://www.google.com/maps/dir/?api=1&destination=${evento.local_latitud},${evento.local_longitud}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('[DetalleEvento] Error opening maps:', error);
      Alert.alert(
        'Error',
        'No se pudo abrir la aplicación de mapas. Por favor, intenta de nuevo.'
      );
    }
  };

  const handleVerLocal = () => {
    if (!evento || !evento.local_id) {
      Alert.alert(
        'Local no disponible',
        'No se ha encontrado información del local.'
      );
      return;
    }

    router.push(`/perfil/local?localId=${evento.local_id}`);
  };

  const { dia, mes } = evento ? formatDiaMes(evento.fecha) : { dia: '', mes: '' };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando evento...</Text>
        </View>
      </View>
    );
  }

  if (!evento) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Evento no encontrado</Text>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToListText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Concert Poster Style Header */}
        <Animated.View 
          style={[
            styles.posterContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.posterGradient}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <View style={styles.backButtonCircle}>
                <IconSymbol 
                  ios_icon_name="chevron.left" 
                  android_material_icon_name="arrow_back"
                  size={24} 
                  color={colors.text} 
                />
              </View>
            </TouchableOpacity>

            {/* Destacado Badge */}
            {evento.destacado && (
              <View style={styles.destacadoBadge}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color="#92400E" />
                <Text style={styles.destacadoText}>DESTACADO</Text>
              </View>
            )}

            {/* Date Badge - Festival Style */}
            <View style={styles.dateBadge}>
              <Text style={styles.dateDia}>{dia}</Text>
              <Text style={styles.dateMes}>{mes}</Text>
            </View>

            {/* Event Image */}
            <View style={styles.imageWrapper}>
              {evento.imagen_url ? (
                <Image source={{ uri: evento.imagen_url }} style={styles.eventImage} />
              ) : (
                <View style={[styles.eventImage, styles.imagePlaceholder]}>
                  <IconSymbol 
                    ios_icon_name="music.note" 
                    android_material_icon_name="music_note"
                    size={80} 
                    color="rgba(255,255,255,0.5)" 
                  />
                </View>
              )}
              {/* Overlay gradient for better text visibility */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.imageOverlay}
              />
            </View>

            {/* Event Title - Concert Poster Style */}
            <View style={styles.titleContainer}>
              <Text style={styles.eventTitle}>{evento.titulo}</Text>
              <View style={styles.titleUnderline} />
            </View>

            {/* Time and Location Info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <IconSymbol 
                  ios_icon_name="clock.fill" 
                  android_material_icon_name="schedule"
                  size={20} 
                  color={colors.white} 
                />
                <Text style={styles.infoText}>{formatHora(evento.hora)}</Text>
              </View>
              
              {evento.local_nombre && (
                <View style={styles.infoItem}>
                  <IconSymbol 
                    ios_icon_name="location.fill" 
                    android_material_icon_name="location_on"
                    size={20} 
                    color={colors.white} 
                  />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {evento.local_nombre}
                  </Text>
                </View>
              )}
            </View>

            {/* Price - Ticket Style */}
            {evento.precio !== null && (
              <View style={styles.priceContainer}>
                <View style={styles.priceTicket}>
                  {evento.precio === 0 ? (
                    <Text style={styles.priceText}>ENTRADA GRATUITA</Text>
                  ) : (
                    <React.Fragment>
                      <Text style={styles.priceLabel}>PRECIO</Text>
                      <Text style={styles.priceAmount}>{evento.precio}€</Text>
                      <Text style={styles.priceNote}>Informativo</Text>
                    </React.Fragment>
                  )}
                </View>
              </View>
            )}

            {/* Decorative Elements - Festival Style */}
            <View style={styles.decorativeTop} />
            <View style={styles.decorativeBottom} />
          </LinearGradient>
        </Animated.View>

        {/* Content Section */}
        <Animated.View 
          style={[
            styles.contentSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Local Info Card - NEW */}
          {evento.local_nombre && (
            <View style={styles.localInfoCard}>
              <View style={styles.localInfoHeader}>
                <IconSymbol 
                  ios_icon_name="building.2.fill" 
                  android_material_icon_name="store"
                  size={24} 
                  color={colors.primary} 
                />
                <Text style={styles.localInfoTitle}>INFORMACIÓN DEL LOCAL</Text>
              </View>
              
              <View style={styles.localInfoContent}>
                {/* Mini Local Cover Photo */}
                {evento.local_imagen_url && (
                  <View style={styles.localMiniPhotoContainer}>
                    <Image 
                      source={{ uri: evento.local_imagen_url }} 
                      style={styles.localMiniPhoto}
                    />
                  </View>
                )}
                
                <View style={styles.localInfoDetails}>
                  <Text style={styles.localName}>{evento.local_nombre}</Text>
                  
                  {/* Local Category */}
                  {evento.local_categoria && (
                    <View style={styles.localCategoryBadge}>
                      <Text style={styles.localCategoryIcon}>
                        {getCategoryIcon(evento.local_categoria)}
                      </Text>
                      <Text style={styles.localCategoryText}>
                        {evento.local_categoria.charAt(0).toUpperCase() + evento.local_categoria.slice(1)}
                      </Text>
                    </View>
                  )}
                  
                  {/* Distance */}
                  {distance !== null && (
                    <View style={styles.distanceContainer}>
                      <IconSymbol 
                        ios_icon_name="location.circle.fill" 
                        android_material_icon_name="my_location"
                        size={16} 
                        color={colors.secondary} 
                      />
                      <Text style={styles.distanceText}>
                        {distance < 1 
                          ? `${Math.round(distance * 1000)} m` 
                          : `${distance.toFixed(1)} km`} de distancia
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleComoLlegar}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <IconSymbol 
                  ios_icon_name="map.fill" 
                  android_material_icon_name="directions"
                  size={24} 
                  color={colors.white} 
                />
                <Text style={styles.buttonText}>Cómo Llegar</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleVerLocal}
            >
              <LinearGradient
                colors={[colors.secondary, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <IconSymbol 
                  ios_icon_name="building.2.fill" 
                  android_material_icon_name="store"
                  size={24} 
                  color={colors.white} 
                />
                <Text style={styles.buttonText}>Ver Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Full Date */}
          <View style={styles.fullDateContainer}>
            <IconSymbol 
              ios_icon_name="calendar" 
              android_material_icon_name="calendar_today"
              size={20} 
              color={colors.primary} 
            />
            <Text style={styles.fullDateText}>{formatFecha(evento.fecha)}</Text>
          </View>

          {/* Address */}
          {getLocalAddress() && (
            <View style={styles.addressContainer}>
              <IconSymbol 
                ios_icon_name="mappin.circle.fill" 
                android_material_icon_name="place"
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.addressText}>{getLocalAddress()}</Text>
            </View>
          )}

          {/* Description */}
          {evento.descripcion && (
            <View style={styles.descriptionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLine} />
                <Text style={styles.sectionTitle}>SOBRE EL EVENTO</Text>
                <View style={styles.sectionHeaderLine} />
              </View>
              <Text style={styles.descripcion}>{evento.descripcion}</Text>
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <IconSymbol 
              ios_icon_name="info.circle.fill" 
              android_material_icon_name="info"
              size={24} 
              color={colors.primary} 
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.infoBoxTitle}>Información importante</Text>
              <Text style={styles.infoBoxText}>
                Para más información sobre este evento, horarios y disponibilidad, 
                contacta directamente con el local.
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 20,
  },
  backToListButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToListText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Concert Poster Styles
  posterContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  posterGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  backButtonCircle: {
    backgroundColor: colors.white,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  destacadoBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.badgeDestacado,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  destacadoText: {
    color: colors.badgeDestacadoText,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dateBadge: {
    position: 'absolute',
    top: 100,
    left: 16,
    backgroundColor: colors.white,
    width: 60,
    height: 70,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dateDia: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    lineHeight: 32,
  },
  dateMes: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  imageWrapper: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  eventImage: {
    width: '100%',
    height: 280,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  titleContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleUnderline: {
    width: 80,
    height: 3,
    backgroundColor: colors.white,
    marginTop: 12,
    borderRadius: 2,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  priceContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  priceTicket: {
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 180,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
    marginVertical: 4,
  },
  priceNote: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  decorativeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  decorativeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'transparent',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  
  // Content Section
  contentSection: {
    padding: 20,
  },
  
  // Local Info Card - NEW
  localInfoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  localInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  localInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  localInfoContent: {
    flexDirection: 'row',
    gap: 12,
  },
  localMiniPhotoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardBorder,
  },
  localMiniPhoto: {
    width: '100%',
    height: '100%',
  },
  localInfoDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  localName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  localCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  localCategoryIcon: {
    fontSize: 14,
  },
  localCategoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  fullDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fullDateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  addressText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  descripcion: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 16,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#0C4A6E',
    lineHeight: 20,
  },
});
