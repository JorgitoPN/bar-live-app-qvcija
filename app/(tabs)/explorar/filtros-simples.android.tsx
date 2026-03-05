
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';

// ✅ v450.0 SYNCHRONIZED WITH MAPA PAGE - EXACT SAME ICONS
// These icons MUST match exactly with app/(tabs)/explorar/mapa.tsx
const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', iosIcon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', nombre: 'Cafés', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', nombre: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', nombre: 'Bares', iosIcon: 'wineglass.fill', androidIcon: 'local_bar' },
  { id: 'pub', nombre: 'Pubs', iosIcon: 'mug.fill', androidIcon: 'sports_bar' },
  { id: 'cocteleria', nombre: 'Coctelería', iosIcon: 'wineglass', androidIcon: 'liquor' },
  { id: 'discoteca', nombre: 'Discotecas', iosIcon: 'music.note', androidIcon: 'nightlife' },
  { id: 'terraza', nombre: 'Terrazas', iosIcon: 'sun.max.fill', androidIcon: 'wb_sunny' },
  { id: 'rooftop', nombre: 'Rooftops', iosIcon: 'building.2.fill', androidIcon: 'apartment' },
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
 * ✅ ANDROID FULL-SCREEN SIMPLE FILTERS PAGE v280.0
 * 
 * This is a full-screen page for Android that replaces the modal in Explorar.
 * Provides proper scaling and full-height display on Android.
 * 
 * NOTE: This file has a fallback sibling (filtros-simples.tsx) for iOS/Web compatibility.
 */
export default function FiltrosSimplesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState<string>(params.categoria as string || 'todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState<string>(params.provincia as string || 'Todas');

  const handleAplicar = () => {
    console.log('[FiltrosSimples Android] ✅ Applying filters:', { selectedCategory, provinciaSeleccionada });
    // Navigate back with params
    router.back();
  };

  const handleLimpiar = () => {
    console.log('[FiltrosSimples Android] 🧹 Clearing filters');
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
                  console.log('[FiltrosSimples Android] 👆 Usuario seleccionó categoría:', categoria.id);
                  setSelectedCategory(categoria.id);
                }}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name={categoria.iosIcon}
                  android_material_icon_name={categoria.androidIcon}
                  size={scaleIconSize(20)}
                  color={selectedCategory === categoria.id ? colors.white : colors.primary}
                />
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
    paddingTop: 48,
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
  categoryFilterText: {
    fontWeight: '600',
    color: colors.text,
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
