
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface PerfilProfesional {
  id: string;
  nombre: string;
  avatar?: string;
  puesto: string;
  experiencia: string;
  ubicacion: string;
  habilidades: string[];
  disponibilidad: string;
}

interface PerfilProfesionalCardProps {
  perfil: PerfilProfesional;
  onPress?: () => void;
}

export default function PerfilProfesionalCard({ perfil, onPress }: PerfilProfesionalCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        {perfil.avatar ? (
          <Image source={{ uri: perfil.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <IconSymbol name="person.fill" size={32} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.nombre}>{perfil.nombre}</Text>
          <Text style={styles.puesto}>{perfil.puesto}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <IconSymbol name="briefcase" size={14} color={colors.primary} />
          <Text style={styles.infoText}>{perfil.experiencia}</Text>
        </View>
        <View style={styles.infoItem}>
          <IconSymbol name="location.fill" size={14} color={colors.primary} />
          <Text style={styles.infoText}>{perfil.ubicacion}</Text>
        </View>
      </View>

      <View style={styles.habilidadesContainer}>
        {perfil.habilidades.slice(0, 3).map((habilidad, index) => (
          <View key={index} style={styles.habilidadBadge}>
            <Text style={styles.habilidadText}>{habilidad}</Text>
          </View>
        ))}
        {perfil.habilidades.length > 3 && (
          <View style={styles.habilidadBadge}>
            <Text style={styles.habilidadText}>+{perfil.habilidades.length - 3}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.disponibilidadBadge}>
          <View style={styles.disponibilidadDot} />
          <Text style={styles.disponibilidadText}>{perfil.disponibilidad}</Text>
        </View>
        <TouchableOpacity style={styles.contactarButton} onPress={onPress}>
          <Text style={styles.contactarText}>Ver perfil</Text>
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  puesto: {
    fontSize: 14,
    color: colors.textSecondary,
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
  },
  habilidadesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  habilidadBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  habilidadText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disponibilidadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disponibilidadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  disponibilidadText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  contactarButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  contactarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
});
