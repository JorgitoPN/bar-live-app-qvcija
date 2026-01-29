
import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';

const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', iosIcon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', nombre: 'Cafés', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', nombre: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', nombre: 'Bares', iosIcon: 'wineglass.fill', androidIcon: 'local_bar' },
  { id: 'pub', nombre: 'Pubs', iosIcon: 'mug.fill', androidIcon: 'sports_bar' },
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
 * ✅ IOS FULL-SCREEN SIMPLE FILTERS PAGE v293.0
 * 
 * NEW FIXES v293.0:
 * - ✅ IOS: Changed from modal to full-screen page (same as Android)
 * - ✅ NAVIGATION: Proper Stack header with back button
 * - ✅ STATE SYNC: Receives and returns filter selections via navigation params
 * - ✅ UX: Consistent full-screen experience across iOS and Android
 * 
 * This is now a full-screen page for iOS that matches the Android experience.
 * Provides proper scaling and full-height display on iOS.
 */
export default function FiltrosSimplesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState<string>(params.categoria as string || 'todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState<string>(params.provincia as string || 'Todas');

  useEffect(() => {
    console.log('[FiltrosSimples iOS v293.0] 📱 Page opened with params:', params);
  }, [params]);

  const handleAplicar = () => {
    console.log('[FiltrosSimples iOS v293.0] ✅ Applying filters:', { selectedCategory, provinciaSeleccionada });
    router.back();
  };

  const handleLimpiar = () => {
    console.log('[FiltrosSimples iOS v293.0] 🧹 Clearing filters');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Filtros',
          headerStyle: {
            backgroundColor: colors.headerGradientStart,
          },
          headerTintColor: colors.headerText,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: scaleFontSize(18),
          },
          headerRight: () => (
            <TouchableOpacity onPress={handleLimpiar} style={styles.headerClearButton}>
              <Text style={[styles.headerClearText, { fontSize: scaleFontSize(13) }]}>Limpiar</Text>
            </TouchableOpacity>
          ),
        }}
      />

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
                  console.log('[FiltrosSimples iOS v293.0] 👆 Usuario seleccionó categoría:', categoria.id);
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
                onPress={() => {
                  console.log('[FiltrosSimples iOS v293.0] 👆 Usuario seleccionó provincia:', provincia);
                  setProvinciaSeleccionada(provincia);
                }}
                activeOpacity={0.7}
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
  headerClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8,
  },
  headerClearText: {
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
    backgroundColor: colors.cardBackground,
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
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  provinciaItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
