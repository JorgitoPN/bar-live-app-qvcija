
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';

// ✅ v454.0 ICON CONSISTENCY FIX - EXACT SAME ICONS ACROSS ALL PAGES
// These icons MUST match EXACTLY with:
// - app/(tabs)/explorar/filtros-simples.android.tsx
// - app/(tabs)/explorar/mapa.tsx
// CRITICAL: Using IDENTICAL icon names for both iOS and Android
// CRITICAL: Material icon names use hyphens (local-cafe, local-bar, sports-bar)
const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', iosIcon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', nombre: 'Cafés', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local-cafe' },
  { id: 'restaurante', nombre: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', nombre: 'Bares', iosIcon: 'wineglass.fill', androidIcon: 'local-bar' },
  { id: 'pub', nombre: 'Pubs', iosIcon: 'mug.fill', androidIcon: 'sports-bar' },
  { id: 'cocteleria', nombre: 'Coctelería', iosIcon: 'wineglass', androidIcon: 'liquor' },
  { id: 'discoteca', nombre: 'Discotecas', iosIcon: 'music.note', androidIcon: 'nightlife' },
];

const PROVINCIAS = [
  'Todas',
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
  'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real',
  'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva',
  'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León',
  'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
];

/**
 * ✅ FULL-SCREEN SIMPLE FILTERS PAGE FOR iOS/WEB v290.0
 * 
 * UPDATED: Now uses full-screen Stack navigation on iOS, matching Android behavior.
 * Previously used a modal, but now opens as a complete page for consistency.
 * 
 * This provides the same full-screen experience on iOS as Android.
 */
export default function FiltrosSimplesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState<string>(params.categoria as string || 'todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState<string>(params.provincia as string || 'Todas');

  const handleAplicar = () => {
    console.log('[FiltrosSimples iOS/Web] ✅ Applying filters:', { selectedCategory, provinciaSeleccionada });
    router.back();
  };

  const handleLimpiar = () => {
    console.log('[FiltrosSimples iOS/Web] 🧹 Clearing filters');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={scaleIconSize(24)} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>Filtros</Text>
        <TouchableOpacity onPress={handleLimpiar} style={styles.clearButton}>
          <Text style={[styles.limpiarText, { fontSize: scaleFontSize(13) }]}>Limpiar</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: getContentBottomPadding(100) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { fontSize: scaleFontSize(16) }]}>Categoría de Local</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIAS.map((categoria) => (
              <TouchableOpacity
                key={categoria.id}
                style={[
                  styles.categoryFilterItem,
                  selectedCategory === categoria.id && styles.categoryFilterItemActive,
                ]}
                onPress={() => {
                  console.log('[FiltrosSimples iOS/Web] 👆 Usuario seleccionó categoría:', categoria.id);
                  setSelectedCategory(categoria.id);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.categoryIconWrapper}>
                  <IconSymbol
                    ios_icon_name={categoria.iosIcon as any}
                    android_material_icon_name={categoria.androidIcon}
                    size={scaleIconSize(20)}
                    color={selectedCategory === categoria.id ? colors.white : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryFilterText,
                    { fontSize: scaleFontSize(14) },
                    selectedCategory === categoria.id && styles.categoryFilterTextActive,
                  ]}
                >
                  {categoria.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { fontSize: scaleFontSize(16) }]}>Provincia</Text>
          <View style={styles.provinciasListContainer}>
            {PROVINCIAS.map((provincia) => (
              <TouchableOpacity
                key={provincia}
                style={[
                  styles.provinciaItem,
                  provinciaSeleccionada === provincia && styles.provinciaItemActive,
                ]}
                onPress={() => setProvinciaSeleccionada(provincia)}
              >
                <Text
                  style={[
                    styles.provinciaText,
                    { fontSize: scaleFontSize(15) },
                    provinciaSeleccionada === provincia && styles.provinciaTextActive,
                  ]}
                >
                  {provincia}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.aplicarButton} onPress={handleAplicar}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aplicarGradient}
          >
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={scaleIconSize(20)} color={colors.headerText} />
            <Text style={[styles.aplicarText, { fontSize: scaleFontSize(15) }]}>Aplicar filtros</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 48,
    paddingBottom: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
  },
  limpiarText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  filterTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: '47%',
  },
  categoryFilterItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFilterText: {
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  categoryFilterTextActive: {
    color: colors.white,
  },
  provinciasListContainer: {
    gap: 8,
  },
  provinciaItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  provinciaItemActive: {
    backgroundColor: colors.primary,
  },
  provinciaText: {
    color: colors.text,
  },
  provinciaTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  aplicarButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  aplicarGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aplicarText: {
    fontWeight: '700',
    color: colors.headerText,
  },
});
