
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Empleo } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface OfertaTrabajoCardProps {
  empleo: Empleo;
  onPress?: () => void;
}

export default function OfertaTrabajoCard({ empleo, onPress }: OfertaTrabajoCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/detalle/oferta?id=${empleo.id}`);
    }
  };

  const calcularDiasPublicado = () => {
    const hoy = new Date();
    const fechaPublicacion = new Date(empleo.fechaPublicacion);
    const diff = hoy.getTime() - fechaPublicacion.getTime();
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
    return `Hace ${Math.floor(dias / 30)} meses`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <IconSymbol name="briefcase.fill" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.titulo} numberOfLines={1}>{empleo.titulo}</Text>
          <Text style={styles.localNombre} numberOfLines={1}>{empleo.localNombre}</Text>
        </View>
      </View>

      <Text style={styles.descripcion} numberOfLines={2}>{empleo.descripcion}</Text>

      <View style={styles.infoRow}>
        <View style={styles.badge}>
          <IconSymbol name="clock" size={12} color={colors.primary} />
          <Text style={styles.badgeText}>{empleo.tipo}</Text>
        </View>
        {empleo.salario && (
          <View style={styles.badge}>
            <IconSymbol name="banknote" size={12} color={colors.primary} />
            <Text style={styles.badgeText}>{empleo.salario}</Text>
          </View>
        )}
        <View style={styles.badge}>
          <IconSymbol name="location.fill" size={12} color={colors.primary} />
          <Text style={styles.badgeText}>{empleo.provincia}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.fechaText}>{calcularDiasPublicado()}</Text>
        <TouchableOpacity style={styles.aplicarButton} onPress={handlePress}>
          <Text style={styles.aplicarText}>Ver oferta</Text>
          <IconSymbol name="arrow.right" size={14} color={colors.headerText} />
        </TouchableOpacity>
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
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  localNombre: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  descripcion: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fechaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  aplicarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  aplicarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
});
