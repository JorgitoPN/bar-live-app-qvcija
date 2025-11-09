
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Evento } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface EventoCardProps {
  evento: Evento;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');

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
    const hoy = new Date();
    const fechaEvento = new Date(evento.fecha);
    const diff = fechaEvento.getTime() - hoy.getTime();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias;
  };

  const calcularPorcentajeVendido = () => {
    if (!evento.entradasVendidas || !evento.entradasTotales) return 0;
    return Math.round((evento.entradasVendidas / evento.entradasTotales) * 100);
  };

  const diasRestantes = calcularDiasRestantes();
  const porcentajeVendido = calcularPorcentajeVendido();

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <Image source={{ uri: evento.imagen }} style={styles.image} />
      
      {evento.destacado && (
        <View style={styles.badgeDestacado}>
          <Text style={styles.badgeDestacadoText}>⭐ Destacado</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.titulo} numberOfLines={2}>{evento.titulo}</Text>
        <Text style={styles.localNombre} numberOfLines={1}>
          <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
          {' '}{evento.localNombre}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <IconSymbol name="calendar" size={14} color={colors.primary} />
            <Text style={styles.infoText}>
              {new Date(evento.fecha).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <IconSymbol name="clock" size={14} color={colors.primary} />
            <Text style={styles.infoText}>{evento.hora}</Text>
          </View>
          {evento.precio && (
            <View style={styles.infoItem}>
              <IconSymbol name="ticket" size={14} color={colors.primary} />
              <Text style={styles.infoText}>{evento.precio}€</Text>
            </View>
          )}
        </View>

        {evento.entradasVendidas && evento.entradasTotales && (
          <View style={styles.entradasContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${porcentajeVendido}%` }]} />
            </View>
            <Text style={styles.entradasText}>
              {porcentajeVendido}% vendido • {evento.entradasVendidas}/{evento.entradasTotales} entradas
            </Text>
          </View>
        )}

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
  entradasContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  entradasText: {
    fontSize: 12,
    color: colors.textSecondary,
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
