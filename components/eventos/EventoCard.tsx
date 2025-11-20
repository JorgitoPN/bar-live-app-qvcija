
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { calcularDistancia, formatearDistancia } from '@/utils/locationUtils';
import EventBanner from './EventBanner';

interface EventoCardProps {
  evento: {
    id: string;
    titulo: string;
    descripcion?: string | null;
    fecha: string;
    fecha_fin?: string | null;
    hora: string;
    hora_fin?: string | null;
    precio?: number | null;
    imagen_url?: string | null;
    local_id?: string | null;
    provincia?: string | null;
    destacado?: boolean;
    activo?: boolean;
    local_nombre?: string;
    local_direccion?: string;
    local_ciudad?: string;
    local_latitud?: number;
    local_longitud?: number;
  };
  onPress?: () => void;
  showBanner?: boolean; // Option to show/hide banner
}

export default function EventoCard({ evento, onPress, showBanner = true }: EventoCardProps) {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    obtenerUbicacionUsuario();
  }, []);

  useEffect(() => {
    if (userLocation && evento.local_latitud && evento.local_longitud) {
      const dist = calcularDistancia(
        userLocation.latitude,
        userLocation.longitude,
        evento.local_latitud,
        evento.local_longitud
      );
      setDistance(dist);
    }
  }, [userLocation, evento.local_latitud, evento.local_longitud]);

  const obtenerUbicacionUsuario = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[EventoCard] Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('[EventoCard] Error getting location:', error);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/detalle/evento?id=${evento.id}`);
    }
  };

  const calcularDiasRestantes = () => {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaEvento = new Date(evento.fecha);
      fechaEvento.setHours(0, 0, 0, 0);
      const diff = fechaEvento.getTime() - hoy.getTime();
      const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return dias;
    } catch (error) {
      console.error('[EventoCard] Error calculating days:', error);
      return -1;
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

  const formatFecha = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });
    } catch (error) {
      return fecha;
    }
  };

  const diasRestantes = calcularDiasRestantes();

  // Use event image or fallback to a default event image
  const imageUrl = evento.imagen_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800';

  return (
    <View style={styles.cardContainer}>
      {/* Event Banner - Compact Mode */}
      {showBanner && (
        <EventBanner 
          evento={{
            id: evento.id,
            titulo: evento.titulo,
            fecha: evento.fecha,
            fecha_fin: evento.fecha_fin,
            hora: evento.hora,
            hora_fin: evento.hora_fin,
            imagen_url: evento.imagen_url,
            precio: evento.precio,
          }}
          compact={true}
        />
      )}

      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
        {/* Cover Photo */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverImage, styles.imagePlaceholder]}>
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <IconSymbol name="music.note" size={48} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          
          {/* Gradient overlay for better text visibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          />
          
          {evento.destacado && (
            <View style={styles.badgeDestacado}>
              <IconSymbol name="star.fill" size={12} color={colors.badgeDestacadoText} />
              <Text style={styles.badgeDestacadoText}>Destacado</Text>
            </View>
          )}

          {/* Distance Badge */}
          {distance !== null && (
            <View style={styles.distanceBadge}>
              <IconSymbol name="location.fill" size={12} color={colors.white} />
              <Text style={styles.distanceBadgeText}>
                {formatearDistancia(distance)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.titulo} numberOfLines={2}>{evento.titulo}</Text>
          
          {evento.descripcion && (
            <Text style={styles.descripcion} numberOfLines={2}>
              {evento.descripcion}
            </Text>
          )}
          
          {evento.local_nombre && (
            <View style={styles.localInfo}>
              <IconSymbol name="building.2.fill" size={14} color={colors.primary} />
              <Text style={styles.localNombre} numberOfLines={1}>
                {evento.local_nombre}
              </Text>
            </View>
          )}

          {evento.local_direccion && (
            <View style={styles.localInfo}>
              <IconSymbol name="mappin.circle.fill" size={14} color={colors.textSecondary} />
              <Text style={styles.localDireccion} numberOfLines={1}>
                {evento.local_direccion}
                {evento.local_ciudad && `, ${evento.local_ciudad}`}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <IconSymbol name="calendar" size={14} color={colors.primary} />
              <Text style={styles.infoText}>{formatFecha(evento.fecha)}</Text>
            </View>
            <View style={styles.infoItem}>
              <IconSymbol name="clock" size={14} color={colors.primary} />
              <Text style={styles.infoText}>{formatHora(evento.hora)}</Text>
            </View>
            {evento.precio !== null && evento.precio !== undefined && (
              <View style={styles.infoItem}>
                <IconSymbol name="ticket" size={14} color={colors.primary} />
                <Text style={styles.infoText}>
                  {evento.precio === 0 ? 'Gratis' : `${evento.precio}€`}
                </Text>
              </View>
            )}
          </View>

          {diasRestantes >= 0 && (
            <View style={styles.diasContainer}>
              <Text style={styles.diasText}>
                {diasRestantes === 0
                  ? '¡Hoy!'
                  : diasRestantes === 1
                  ? 'Mañana'
                  : `En ${diasRestantes} días`}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
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
    height: '50%',
  },
  badgeDestacado: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.badgeDestacado,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 10,
  },
  badgeDestacadoText: {
    color: colors.badgeDestacadoText,
    fontSize: 12,
    fontWeight: '700',
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  distanceBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  localInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  localNombre: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  localDireccion: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  diasContainer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  diasText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.headerText,
  },
});
