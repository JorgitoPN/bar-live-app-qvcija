
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { Filtros } from '@/types';
import { BlurView } from 'expo-blur';

interface FiltrosAvanzadosSheetProps {
  visible: boolean;
  onClose: () => void;
  filtros: Filtros;
  onAplicarFiltros: (filtros: Filtros) => void;
}

const COMUNIDADES = [
  'Todas las Comunidades',
  'Andalucía',
  'Aragón',
  'Asturias',
  'Baleares',
  'Canarias',
  'Cantabria',
  'Castilla y León',
  'Castilla-La Mancha',
  'Cataluña',
  'Comunidad de Madrid',
  'Comunidad Valenciana',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Navarra',
  'País Vasco',
  'Región de Murcia',
  'Ceuta',
  'Melilla',
];

const PROVINCIAS = [
  'Todas las Provincias',
  'A Coruña',
  'Álava',
  'Albacete',
  'Alicante',
  'Almería',
  'Asturias',
  'Ávila',
  'Badajoz',
  'Barcelona',
  'Burgos',
  'Cáceres',
  'Cádiz',
  'Cantabria',
  'Castellón',
  'Ceuta',
  'Ciudad Real',
  'Córdoba',
  'Cuenca',
  'Girona',
  'Granada',
  'Guadalajara',
  'Guipúzcoa',
  'Huelva',
  'Huesca',
  'Islas Baleares',
  'Jaén',
  'La Rioja',
  'Las Palmas',
  'León',
  'Lleida',
  'Lugo',
  'Madrid',
  'Málaga',
  'Melilla',
  'Murcia',
  'Navarra',
  'Ourense',
  'Palencia',
  'Pontevedra',
  'Salamanca',
  'Santa Cruz de Tenerife',
  'Segovia',
  'Sevilla',
  'Soria',
  'Tarragona',
  'Teruel',
  'Toledo',
  'Valencia',
  'Valladolid',
  'Vizcaya',
  'Zamora',
  'Zaragoza',
];

const TIPOS_LOCAL = [
  { id: 'todos', label: 'Todos', icon: '🏪' },
  { id: 'cafes', label: 'Cafés', icon: '☕' },
  { id: 'restaurantes', label: 'Restaurantes', icon: '🍽️' },
  { id: 'bares', label: 'Bares', icon: '🍷' },
  { id: 'pubs', label: 'Pubs', icon: '🍺' },
  { id: 'cocteleria', label: 'Coctelería', icon: '🍸' },
  { id: 'discotecas', label: 'Discotecas', icon: '🎵' },
];

const SERVICIOS = [
  { id: 'terraza', label: 'Terraza', icon: '☀️' },
  { id: 'wifi', label: 'WiFi', icon: '📶' },
  { id: 'parking', label: 'Parking', icon: '🅿️' },
  { id: 'accesible', label: 'Accesible', icon: '♿' },
  { id: 'musica_vivo', label: 'Música en vivo', icon: '🎸' },
  { id: 'deportes_tv', label: 'Deportes TV', icon: '📺' },
  { id: 'reservas', label: 'Reservas', icon: '📅' },
  { id: 'delivery', label: 'Delivery', icon: '🚚' },
];

const AMBIENTES = [
  { id: 'cualquiera', label: 'Cualquiera', icon: '✨' },
  { id: 'tranquilo', label: 'Tranquilo', icon: '🌙' },
  { id: 'animado', label: 'Animado', icon: '🎉' },
  { id: 'romantico', label: 'Romántico', icon: '💕' },
  { id: 'familiar', label: 'Familiar', icon: '👨‍👩‍👧‍👦' },
  { id: 'juvenil', label: 'Juvenil', icon: '🎮' },
  { id: 'elegante', label: 'Elegante', icon: '🎩' },
  { id: 'informal', label: 'Informal', icon: '👕' },
];

export default function FiltrosAvanzadosSheet({
  visible,
  onClose,
  filtros,
  onAplicarFiltros,
}: FiltrosAvanzadosSheetProps) {
  const [filtrosTemp, setFiltrosTemp] = useState<Filtros>(filtros);
  const [showComunidadModal, setShowComunidadModal] = useState(false);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);
  const [searchComunidad, setSearchComunidad] = useState('');
  const [searchProvincia, setSearchProvincia] = useState('');

  const toggleArrayItem = (array: string[] | undefined, item: string): string[] => {
    const arr = array || [];
    if (arr.includes(item)) {
      return arr.filter((i) => i !== item);
    }
    return [...arr, item];
  };

  const handleAplicar = () => {
    onAplicarFiltros(filtrosTemp);
    onClose();
  };

  const handleLimpiar = () => {
    setFiltrosTemp({});
  };

  const filteredComunidades = COMUNIDADES.filter(c =>
    c.toLowerCase().includes(searchComunidad.toLowerCase())
  );

  const filteredProvincias = PROVINCIAS.filter(p =>
    p.toLowerCase().includes(searchProvincia.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable 
          style={{ flex: 1 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheet}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={22} color={colors.headerText} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Filtros Avanzados</Text>
              <TouchableOpacity onPress={handleLimpiar} style={styles.clearButton}>
                <Text style={styles.limpiarText}>Limpiar</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.compactSection}>
                <View style={styles.sectionHeader}>
                  <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Ubicación</Text>
                </View>
                
                <View style={styles.twoColumnGrid}>
                  <TouchableOpacity
                    style={styles.compactSelectButton}
                    onPress={() => setShowComunidadModal(true)}
                  >
                    <Text style={styles.selectLabel}>Comunidad</Text>
                    <Text style={styles.selectValue} numberOfLines={1}>
                      {filtrosTemp.comunidad || 'Todas'}
                    </Text>
                    <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.compactSelectButton}
                    onPress={() => setShowProvinciaModal(true)}
                  >
                    <Text style={styles.selectLabel}>Provincia</Text>
                    <Text style={styles.selectValue} numberOfLines={1}>
                      {filtrosTemp.provincia || 'Todas'}
                    </Text>
                    <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.distanceRow}>
                  <IconSymbol ios_icon_name="location.circle" android_material_icon_name="my_location" size={18} color={colors.primary} />
                  <Text style={styles.distanceLabel}>Radio de búsqueda</Text>
                  <TextInput
                    style={styles.distanceInput}
                    placeholder="km"
                    keyboardType="numeric"
                    value={filtrosTemp.distancia?.toString() || ''}
                    onChangeText={(text) =>
                      setFiltrosTemp({
                        ...filtrosTemp,
                        distancia: text ? parseFloat(text) : undefined,
                      })
                    }
                  />
                </View>
              </View>

              <View style={styles.compactSection}>
                <View style={styles.sectionHeader}>
                  <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Tipo de Local</Text>
                </View>
                <View style={styles.compactChipContainer}>
                  {TIPOS_LOCAL.map((tipo) => (
                    <TouchableOpacity
                      key={tipo.id}
                      style={[
                        styles.compactChip,
                        filtrosTemp.tipo?.includes(tipo.id) && styles.compactChipActive,
                      ]}
                      onPress={() =>
                        setFiltrosTemp({
                          ...filtrosTemp,
                          tipo: toggleArrayItem(filtrosTemp.tipo, tipo.id),
                        })
                      }
                    >
                      <Text style={styles.chipIcon}>{tipo.icon}</Text>
                      <Text
                        style={[
                          styles.compactChipText,
                          filtrosTemp.tipo?.includes(tipo.id) && styles.compactChipTextActive,
                        ]}
                      >
                        {tipo.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.compactSection}>
                <View style={styles.sectionHeader}>
                  <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Servicios</Text>
                </View>
                <View style={styles.compactChipContainer}>
                  {SERVICIOS.map((servicio) => (
                    <TouchableOpacity
                      key={servicio.id}
                      style={[
                        styles.compactChip,
                        filtrosTemp.servicios?.includes(servicio.id) && styles.compactChipActive,
                      ]}
                      onPress={() =>
                        setFiltrosTemp({
                          ...filtrosTemp,
                          servicios: toggleArrayItem(filtrosTemp.servicios, servicio.id),
                        })
                      }
                    >
                      <Text style={styles.chipIcon}>{servicio.icon}</Text>
                      <Text
                        style={[
                          styles.compactChipText,
                          filtrosTemp.servicios?.includes(servicio.id) && styles.compactChipTextActive,
                        ]}
                      >
                        {servicio.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.compactSection}>
                <View style={styles.sectionHeader}>
                  <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Ambiente</Text>
                </View>
                <View style={styles.compactChipContainer}>
                  {AMBIENTES.map((ambiente) => (
                    <TouchableOpacity
                      key={ambiente.id}
                      style={[
                        styles.compactChip,
                        filtrosTemp.ambiente?.includes(ambiente.id) && styles.compactChipActive,
                      ]}
                      onPress={() =>
                        setFiltrosTemp({
                          ...filtrosTemp,
                          ambiente: toggleArrayItem(filtrosTemp.ambiente, ambiente.id),
                        })
                      }
                    >
                      <Text style={styles.chipIcon}>{ambiente.icon}</Text>
                      <Text
                        style={[
                          styles.compactChipText,
                          filtrosTemp.ambiente?.includes(ambiente.id) && styles.compactChipTextActive,
                        ]}
                      >
                        {ambiente.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.aplicarButton} onPress={handleAplicar}>
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aplicarGradient}
                >
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={22} color={colors.headerText} />
                  <Text style={styles.aplicarText}>Aplicar filtros</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>

      <Modal
        visible={showComunidadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComunidadModal(false)}
      >
        <Pressable
          style={styles.selectorModalOverlay}
          onPress={() => setShowComunidadModal(false)}
        >
          <Pressable style={styles.selectorModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>Comunidad Autónoma</Text>
              <TouchableOpacity onPress={() => setShowComunidadModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar comunidad..."
                placeholderTextColor={colors.textSecondary}
                value={searchComunidad}
                onChangeText={setSearchComunidad}
              />
              {searchComunidad.length > 0 && (
                <TouchableOpacity onPress={() => setSearchComunidad('')}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.selectorModalBody}>
              {filteredComunidades.map((comunidad) => (
                <TouchableOpacity
                  key={comunidad}
                  style={[
                    styles.selectorModalOption,
                    filtrosTemp.comunidad === comunidad && styles.selectorModalOptionActive,
                  ]}
                  onPress={() => {
                    setFiltrosTemp({
                      ...filtrosTemp,
                      comunidad: filtrosTemp.comunidad === comunidad ? undefined : comunidad,
                    });
                    setShowComunidadModal(false);
                    setSearchComunidad('');
                  }}
                >
                  <Text
                    style={[
                      styles.selectorModalOptionText,
                      filtrosTemp.comunidad === comunidad && styles.selectorModalOptionTextActive,
                    ]}
                  >
                    {comunidad}
                  </Text>
                  {filtrosTemp.comunidad === comunidad && (
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showProvinciaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProvinciaModal(false)}
      >
        <Pressable
          style={styles.selectorModalOverlay}
          onPress={() => setShowProvinciaModal(false)}
        >
          <Pressable style={styles.selectorModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>Provincia</Text>
              <TouchableOpacity onPress={() => setShowProvinciaModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar provincia..."
                placeholderTextColor={colors.textSecondary}
                value={searchProvincia}
                onChangeText={setSearchProvincia}
              />
              {searchProvincia.length > 0 && (
                <TouchableOpacity onPress={() => setSearchProvincia('')}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.selectorModalBody}>
              {filteredProvincias.map((provincia) => (
                <TouchableOpacity
                  key={provincia}
                  style={[
                    styles.selectorModalOption,
                    filtrosTemp.provincia === provincia && styles.selectorModalOptionActive,
                  ]}
                  onPress={() => {
                    setFiltrosTemp({
                      ...filtrosTemp,
                      provincia: filtrosTemp.provincia === provincia ? undefined : provincia,
                    });
                    setShowProvinciaModal(false);
                    setSearchProvincia('');
                  }}
                >
                  <Text
                    style={[
                      styles.selectorModalOptionText,
                      filtrosTemp.provincia === provincia && styles.selectorModalOptionTextActive,
                    ]}
                  >
                    {provincia}
                  </Text>
                  {filtrosTemp.provincia === provincia && (
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.headerText,
  },
  limpiarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  compactSection: {
    marginTop: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  compactSelectButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  selectValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  distanceLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  distanceInput: {
    width: 60,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  compactChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  compactChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    fontSize: 16,
  },
  compactChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  compactChipTextActive: {
    color: colors.headerText,
    fontWeight: '700',
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  aplicarGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aplicarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headerText,
  },
  selectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  selectorModalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  selectorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  selectorModalBody: {
    maxHeight: 400,
  },
  selectorModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  selectorModalOptionActive: {
    backgroundColor: `${colors.primary}15`,
  },
  selectorModalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  selectorModalOptionTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
});
