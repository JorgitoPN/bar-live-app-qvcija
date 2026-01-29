
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
 * ✅ IOS/WEB FALLBACK FOR SIMPLE FILTERS PAGE v280.0
 * 
 * This is the fallback file for iOS/Web platforms.
 * On Android, the .android.tsx version will be used instead.
 * This provides a modal-based interface for iOS/Web.
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
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={() => router.back()}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => router.back()}
      >
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Filtros</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleLimpiar} style={styles.clearButton}>
                <Text style={[styles.limpiarText, { fontSize: scaleFontSize(13) }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={scaleIconSize(24)} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
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

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.limpiarButton}
              onPress={handleLimpiar}
            >
              <Text style={[styles.limpiarButtonText, { fontSize: scaleFontSize(16) }]}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aplicarButtonModal}
              onPress={handleAplicar}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.aplicarButtonGradient}
              >
                <Text style={[styles.aplicarButtonText, { fontSize: scaleFontSize(16) }]}>Aplicar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  limpiarText: {
    fontWeight: '600',
    color: colors.text,
  },
  modalScrollView: {
    maxHeight: '100%',
    paddingHorizontal: 20,
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
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  limpiarButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  limpiarButtonText: {
    fontWeight: '600',
    color: colors.text,
  },
  aplicarButtonModal: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  aplicarButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  aplicarButtonText: {
    fontWeight: '600',
    color: colors.white,
  },
});
