
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

const { width, height } = Dimensions.get('window');

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
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

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
          duration: 500,
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
          duration: 400,
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
      // Build URLs for different map applications
      const destination = evento.local_latitud && evento.local_longitud
        ? `${evento.local_latitud},${evento.local_longitud}`
        : encodeURIComponent(address);

      const googleMapsUrl = evento.local_latitud && evento.local_longitud
        ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        : `https://www.google.com/maps/search/?api=1&query=${destination}`;

      const appleMapsUrl = evento.local_latitud && evento.local_longitud
        ? `http://maps.apple.com/?daddr=${destination}`
        : `http://maps.apple.com/?q=${destination}`;

      const wazeUrl = evento.local_latitud && evento.local_longitud
        ? `https://waze.com/ul?ll=${destination}&navigate=yes`
        : `https://waze.com/ul?q=${destination}&navigate=yes`;

      // Show options to user
      Alert.alert(
        'Cómo Llegar',
        'Selecciona tu aplicación de mapas preferida:',
        [
          {
            text: 'Google Maps',
            onPress: async () => {
              try {
                const canOpen = await Linking.canOpenURL(googleMapsUrl);
                if (canOpen) {
                  await Linking.openURL(googleMapsUrl);
                } else {
                  Alert.alert('Error', 'No se pudo abrir Google Maps');
                }
              } catch (error) {
                console.error('[DetalleEvento] Error opening Google Maps:', error);
                Alert.alert('Error', 'No se pudo abrir Google Maps');
              }
            },
          },
          ...(Platform.OS === 'ios' ? [{
            text: 'Apple Maps',
            onPress: async () => {
              try {
                const canOpen = await Linking.canOpenURL(appleMapsUrl);
                if (canOpen) {
                  await Linking.openURL(appleMapsUrl);
                } else {
                  Alert.alert('Error', 'No se pudo abrir Apple Maps');
                }
              } catch (error) {
                console.error('[DetalleEvento] Error opening Apple Maps:', error);
                Alert.alert('Error', 'No se pudo abrir Apple Maps');
              }
            },
          }] : []),
          {
            text: 'Waze',
            onPress: async () => {
              try {
                const canOpen = await Linking.canOpenURL(wazeUrl);
                if (canOpen) {
                  await Linking.openURL(wazeUrl);
                } else {
                  // If Waze app is not installed, open in browser
                  await Linking.openURL(wazeUrl);
                }
              } catch (error) {
                console.error('[DetalleEvento] Error opening Waze:', error);
                Alert.alert('Error', 'No se pudo abrir Waze');
              }
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
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

    // Navigate to local details page instead of profile
    router.push(`/detalle/local?id=${evento.local_id}`);
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
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Full Width Cover Image - More Compact */}
        <View style={styles.coverImageContainer}>
          {evento.imagen_url ? (
            <Image 
              source={{ uri: evento.imagen_url }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverImage, styles.coverImagePlaceholder]}>
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <IconSymbol 
                ios_icon_name="music.note" 
                android_material_icon_name="music_note"
                size={80} 
                color="rgba(255,255,255,0.3)" 
              />
            </View>
          )}
          
          {/* Dark gradient overlay for better text visibility */}
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.coverOverlay}
          />

          {/* Back Button - WHITE ICON with HIGH CONTRAST */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonContainer}>
              <IconSymbol 
                ios_icon_name="chevron.left" 
                android_material_icon_name="arrow_back"
                size={32} 
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>

          {/* Destacado Badge */}
          {evento.destacado && (
            <View style={styles.destacadoBadge}>
              <IconSymbol 
                ios_icon_name="star.fill" 
                android_material_icon_name="star" 
                size={14} 
                color="#92400E" 
              />
              <Text style={styles.destacadoText}>DESTACADO</Text>
            </View>
          )}

          {/* Event Title Overlay - More Compact */}
          <View style={styles.titleOverlay}>
            <Animated.View 
              style={[
                styles.titleContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                }
              ]}
            >
              <Text style={styles.eventTitle}>{evento.titulo}</Text>
              <View style={styles.titleUnderline} />
            </Animated.View>

            {/* Date and Time Info - More Compact */}
            <Animated.View 
              style={[
                styles.dateTimeContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              <View style={styles.dateBox}>
                <Text style={styles.dateDia}>{dia}</Text>
                <Text style={styles.dateMes}>{mes}</Text>
              </View>
              
              <View style={styles.timeLocationInfo}>
                <View style={styles.infoRow}>
                  <IconSymbol 
                    ios_icon_name="clock.fill" 
                    android_material_icon_name="schedule"
                    size={18} 
                    color={colors.white} 
                  />
                  <Text style={styles.infoText}>{formatHora(evento.hora)}</Text>
                </View>
                
                {evento.local_nombre && (
                  <View style={styles.infoRow}>
                    <IconSymbol 
                      ios_icon_name="location.fill" 
                      android_material_icon_name="location_on"
                      size={18} 
                      color={colors.white} 
                    />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {evento.local_nombre}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Content Section - More Compact */}
        <Animated.View 
          style={[
            styles.contentSection,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Price Card - More Compact */}
          {evento.precio !== null && (
            <View style={styles.priceCard}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.priceGradient}
              >
                {evento.precio === 0 ? (
                  <React.Fragment>
                    <IconSymbol 
                      ios_icon_name="gift.fill" 
                      android_material_icon_name="card_giftcard"
                      size={28} 
                      color={colors.white} 
                    />
                    <Text style={styles.priceFreeText}>ENTRADA GRATUITA</Text>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <Text style={styles.priceLabel}>PRECIO</Text>
                    <Text style={styles.priceAmount}>{evento.precio}€</Text>
                  </React.Fragment>
                )}
              </LinearGradient>
            </View>
          )}

          {/* Local Info Card - More Compact */}
          {evento.local_nombre && (
            <View style={styles.localCard}>
              <View style={styles.localCardContent}>
                {/* Mini Local Photo */}
                {evento.local_imagen_url && (
                  <View style={styles.localPhotoContainer}>
                    <Image 
                      source={{ uri: evento.local_imagen_url }} 
                      style={styles.localPhoto}
                    />
                  </View>
                )}
                
                <View style={styles.localDetails}>
                  <Text style={styles.localName}>{evento.local_nombre}</Text>
                  
                  {/* Category and Distance in one row */}
                  <View style={styles.localMetaRow}>
                    {evento.local_categoria && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryIcon}>
                          {getCategoryIcon(evento.local_categoria)}
                        </Text>
                        <Text style={styles.categoryText}>
                          {evento.local_categoria.charAt(0).toUpperCase() + evento.local_categoria.slice(1)}
                        </Text>
                      </View>
                    )}
                    
                    {distance !== null && (
                      <View style={styles.distanceRow}>
                        <IconSymbol 
                          ios_icon_name="location.circle.fill" 
                          android_material_icon_name="my_location"
                          size={16} 
                          color={colors.secondary} 
                        />
                        <Text style={styles.distanceText}>
                          {distance < 1 
                            ? `${Math.round(distance * 1000)} m` 
                            : `${distance.toFixed(1)} km`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons - More Compact */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleComoLlegar}
              activeOpacity={0.8}
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
                  size={20} 
                  color={colors.white} 
                />
                <Text style={styles.buttonText}>Cómo Llegar</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleVerLocal}
              activeOpacity={0.8}
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
                  size={20} 
                  color={colors.white} 
                />
                <Text style={styles.buttonText}>Ver Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Full Date - More Compact */}
          <View style={styles.infoCard}>
            <IconSymbol 
              ios_icon_name="calendar" 
              android_material_icon_name="calendar_today"
              size={20} 
              color={colors.primary} 
            />
            <Text style={styles.infoCardText}>{formatFecha(evento.fecha)}</Text>
          </View>

          {/* Address - More Compact */}
          {getLocalAddress() && (
            <View style={styles.infoCard}>
              <IconSymbol 
                ios_icon_name="mappin.circle.fill" 
                android_material_icon_name="place"
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.infoCardText}>{getLocalAddress()}</Text>
            </View>
          )}

          {/* Description - More Compact */}
          {evento.descripcion && (
            <View style={styles.descriptionSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionTitle}>SOBRE EL EVENTO</Text>
                <View style={styles.sectionLine} />
              </View>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{evento.descripcion}</Text>
              </View>
            </View>
          )}
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
    paddingBottom: 120, // Space for bottom navigation
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
  
  // Full Width Cover Image - More Compact (reduced from 60% to 45%)
  coverImageContainer: {
    width: width,
    height: height * 0.45,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  coverImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // Back Button - WHITE ICON with HIGH CONTRAST
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 60,
    left: 16,
    zIndex: 100,
  },
  backButtonContainer: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  
  destacadoBadge: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.badgeDestacado,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  destacadoText: {
    color: colors.badgeDestacadoText,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  // Title Overlay - More Compact
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    paddingHorizontal: 10,
  },
  titleUnderline: {
    width: 80,
    height: 3,
    backgroundColor: colors.white,
    marginTop: 10,
    borderRadius: 2,
  },
  
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBox: {
    backgroundColor: colors.white,
    width: 60,
    height: 70,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    letterSpacing: 0.8,
  },
  timeLocationInfo: {
    flex: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flex: 1,
  },
  
  // Content Section - More Compact
  contentSection: {
    padding: 16,
  },
  
  // Price Card - More Compact
  priceCard: {
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  priceGradient: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 1.2,
    opacity: 0.9,
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.white,
  },
  priceFreeText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 1.5,
  },
  
  // Local Card - More Compact
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  localCardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  localPhotoContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardBorder,
  },
  localPhoto: {
    width: '100%',
    height: '100%',
  },
  localDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  localName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
  },
  localMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  
  // Action Buttons - More Compact
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  
  // Info Cards - More Compact
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoCardText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
  
  // Description Section - More Compact
  descriptionSection: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  descriptionCard: {
    backgroundColor: colors.cardBackground,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
  },
});
