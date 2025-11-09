
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface Filtro {
  id: string;
  label: string;
  icon?: string;
  activo?: boolean;
}

interface BarraFiltrosInteractivaProps {
  filtros: Filtro[];
  onFiltroPress: (filtroId: string) => void;
  onMasFiltrosPress: () => void;
}

export default function BarraFiltrosInteractiva({
  filtros,
  onFiltroPress,
  onMasFiltrosPress,
}: BarraFiltrosInteractivaProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filtros.map((filtro) => (
          <TouchableOpacity
            key={filtro.id}
            style={[styles.filtroChip, filtro.activo && styles.filtroChipActivo]}
            onPress={() => onFiltroPress(filtro.id)}
            activeOpacity={0.7}
          >
            {filtro.icon && (
              <IconSymbol
                name={filtro.icon as any}
                size={16}
                color={filtro.activo ? colors.headerText : colors.text}
              />
            )}
            <Text style={[styles.filtroText, filtro.activo && styles.filtroTextActivo]}>
              {filtro.label}
            </Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={styles.masFiltrosButton}
          onPress={onMasFiltrosPress}
          activeOpacity={0.7}
        >
          <IconSymbol name="slider.horizontal.3" size={16} color={colors.text} />
          <Text style={styles.masFiltrosText}>Más filtros</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  filtroChipActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtroText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filtroTextActivo: {
    color: colors.headerText,
  },
  masFiltrosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  masFiltrosText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
