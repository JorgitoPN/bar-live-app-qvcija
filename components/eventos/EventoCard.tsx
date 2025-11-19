
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface EventoCardProps {
  evento: {
    id: string;
    titulo: string;
    descripcion?: string | null;
    fecha: string;
    hora: string;
    precio?: number | null;
    imagen_url?: string | null;
    local_id?: string | null;
    provincia?: string | null;
    destacado?: boolean;
    activo?: boolean;
    local_nombre?: string;
    local_direccion?: string;
    local_ciudad?: string;
  };
  onPress?: () => void;
}

export default function EventoCard({ evento, onPress }: EventoCardProps) {
  const router = useRouter();

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

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {evento.imagen_url ? (
        <Image source={{ uri: evento.imagen_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <IconSymbol name="photo" size={48} color={colors.textSecondary} />
        </View>
      )}
      
      {evento.destacado && (
        <View style={styles.badgeDestacado}>
          <Text style={styles.badgeDestacadoText}>⭐ Destacado</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.titulo} numberOfLines={2}>{evento.titulo}</Text>
        
        {evento.local_nombre && (
          <Text style={styles.localNombre} numberOfLines={1}>
            <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
            {' '}{evento.local_nombre}
          </Text>
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
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardBorder,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDestacado: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.badgeDestacado,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeDestacadoText: {
    color: colors.badgeDestacadoText,
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
  localNombre: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
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
