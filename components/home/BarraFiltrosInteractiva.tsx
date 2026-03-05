
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useFilters } from '@/contexts/FilterContext';

interface Filtro {
  id: string;
  label: string;
  icon?: string;
  activo?: boolean;
}

interface BarraFiltrosInteractivaProps {
  onMasFiltrosPress: () => void;
}

/**
 * ✅ INTERACTIVE FILTER BAR v2.0 - SYNCHRONIZED SINGLE LOCAL TYPE SELECTION
 * 
 * NEW FEATURES v2.0:
 * - 🎯 SINGLE SELECTION: Only one "Tipo de Local" can be active at a time
 * - 🔄 BIDIRECTIONAL SYNC: Automatically syncs with Advanced Filters page
 * - ✅ EXCLUSIVE TOGGLE: Clicking a type deselects the previous one
 * - 🌐 GLOBAL STATE: Uses selectedLocalType from Zustand store
 * - 💫 SMOOTH UX: Visual feedback for active selection
 * 
 * USAGE:
 * - Displays available local types as filter chips
 * - Clicking a chip toggles single selection (exclusive)
 * - Changes sync automatically with Advanced Filters page
 * - "Más filtros" button opens Advanced Filters page
 */
export default function BarraFiltrosInteractiva({
  onMasFiltrosPress,
}: BarraFiltrosInteractivaProps) {
  const { 
    dynamicOptions, 
    selectedLocalType, 
    toggleLocalType,
    hasActiveFilters,
  } = useFilters();

  // ✅ Generate filter chips from dynamic options
  const filtros = useMemo<Filtro[]>(() => {
    // Filter out discoteca and pub types
    const availableTipos = dynamicOptions.tipos.filter(
      tipo => tipo !== 'discoteca' && tipo !== 'pub'
    );

    return availableTipos.map(tipo => {
      let icon = 'store';
      if (tipo === 'restaurante') icon = 'restaurant';
      else if (tipo === 'bar') icon = 'local_bar';
      else if (tipo === 'cafe' || tipo === 'cafeteria') icon = 'local_cafe';
      else if (tipo === 'club') icon = 'nightlife';
      else if (tipo === 'terraza') icon = 'deck';

      return {
        id: tipo,
        label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
        icon: icon,
        activo: selectedLocalType === tipo, // ✅ Check if this type is selected
      };
    });
  }, [dynamicOptions.tipos, selectedLocalType]);

  // ✅ Handle filter chip press
  const handleFiltroPress = (filtroId: string) => {
    console.log('[BarraFiltrosInteractiva v2.0] 🏷️ Toggling local type:', filtroId);
    toggleLocalType(filtroId);
  };

  // ✅ Don't render if no filters available
  if (!filtros || filtros.length === 0) {
    return null;
  }

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
            onPress={() => handleFiltroPress(filtro.id)}
            activeOpacity={0.7}
          >
            {filtro.icon && (
              <IconSymbol
                ios_icon_name="building.2.fill"
                android_material_icon_name={filtro.icon}
                size={16}
                color={filtro.activo ? colors.headerText : colors.text}
              />
            )}
            <Text style={[styles.filtroText, filtro.activo && styles.filtroTextActivo]}>
              {filtro.label}
            </Text>
            {filtro.activo && (
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={14}
                color={colors.headerText}
              />
            )}
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={[
            styles.masFiltrosButton,
            hasActiveFilters && styles.masFiltrosButtonActive,
          ]}
          onPress={onMasFiltrosPress}
          activeOpacity={0.7}
        >
          <IconSymbol 
            ios_icon_name="slider.horizontal.3" 
            android_material_icon_name="tune" 
            size={16} 
            color={hasActiveFilters ? colors.headerText : colors.text} 
          />
          <Text style={[
            styles.masFiltrosText,
            hasActiveFilters && styles.masFiltrosTextActive,
          ]}>
            Más filtros
          </Text>
          {hasActiveFilters && (
            <View style={styles.activeFiltersBadge}>
              <IconSymbol
                ios_icon_name="checkmark"
                android_material_icon_name="check"
                size={10}
                color={colors.headerText}
              />
            </View>
          )}
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
    fontWeight: '700',
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
  masFiltrosButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  masFiltrosText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  masFiltrosTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  activeFiltersBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
