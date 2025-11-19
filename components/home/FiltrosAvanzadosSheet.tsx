
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

// FIXED: Removed "Terrazas", "Rooftops", and "Lounge" categories
const TIPOS_LOCAL = [
  'Todos',
  'Cafés',
  'Restaurantes',
  'Bares',
  'Pubs',
  'Coctelería',
  'Discotecas',
];

const SERVICIOS = [
  'Accesible',
  'Almuerzo',
  'Parking',
  'Aseos',
  'Asientos exterior',
  'Bar completo',
  'Bebidas alcoholicas',
  'Brunch',
  'Cena',
  'Cerveza',
  'Cocteles',
  'Comer alli',
  'Comida llevar',
  'Comida vegetariana',
  'Deportes tv',
  'Desayuno',
  'Entrega domicilio',
  'Licores fuertes',
  'Musica vivo',
  'Pago tarjetas',
  'Recogida acera',
  'Reservas',
  'Servicio mesa',
  'Terraza',
  'Vino',
];

const AMBIENTES = [
  'Cualquiera',
  'Acogedor',
  'Animado',
  'De moda',
  'Elegante',
  'Exclusivo',
  'Familiar',
  'Historico',
  'Informal',
  'Juvenil',
  'Moderno',
  'Romantico',
  'Tranquilo',
];

const PRECIOS = ['Todos', '€', '€€', '€€€'];

export default function FiltrosAvanzadosSheet({
  visible,
  onClose,
  filtros,
  onAplicarFiltros,
}: FiltrosAvanzadosSheetProps) {
  const [filtrosTemp, setFiltrosTemp] = useState<Filtros>(filtros);
  const [showComunidadModal, setShowComunidadModal] = useState(false);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);

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
            {/* Header */}
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <IconSymbol name="xmark" size={24} color={colors.headerText} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Filtros Avanzados</Text>
              <TouchableOpacity onPress={handleLimpiar}>
                <Text style={styles.limpiarText}>Limpiar</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Ubicación y Distancia */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📍 Ubicación y Distancia</Text>
                
                {/* FIXED: Comunidad Autónoma as dropdown selector */}
                <Text style={styles.subsectionTitle}>Comunidad Autónoma</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowComunidadModal(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {filtrosTemp.comunidad || 'Todas las Comunidades'}
                  </Text>
                  <IconSymbol name="chevron.down" size={20} color={colors.text} />
                </TouchableOpacity>

                {/* FIXED: Provincia as dropdown selector */}
                <Text style={styles.subsectionTitle}>Provincia</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowProvinciaModal(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {filtrosTemp.provincia || 'Todas las Provincias'}
                  </Text>
                  <IconSymbol name="chevron.down" size={20} color={colors.text} />
                </TouchableOpacity>

                <Text style={styles.subsectionTitle}>Distancia desde mi ubicación</Text>
                <View style={styles.distanciaContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Sin límite"
                    keyboardType="numeric"
                    value={filtrosTemp.distancia?.toString() || ''}
                    onChangeText={(text) =>
                      setFiltrosTemp({
                        ...filtrosTemp,
                        distancia: text ? parseFloat(text) : undefined,
                      })
                    }
                  />
                  <Text style={styles.distanciaUnit}>km</Text>
                </View>
              </View>

              {/* Tipo de Local */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏪 Tipo de Local</Text>
                <View style={styles.chipContainer}>
                  {TIPOS_LOCAL.map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.chip,
                        filtrosTemp.tipo?.includes(tipo.toLowerCase()) && styles.chipActivo,
                      ]}
                      onPress={() =>
                        setFiltrosTemp({
                          ...filtrosTemp,
                          tipo: toggleArrayItem(filtrosTemp.tipo, tipo.toLowerCase()),
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          filtrosTemp.tipo?.includes(tipo.toLowerCase()) && styles.chipTextActivo,
                        ]}
                      >
                        {tipo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Servicios y Comodidades */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>✨ Servicios y Comodidades</Text>
                <View style={styles.chipContainer}>
                  {SERVICIOS.map((servicio) => (
                    <TouchableOpacity
                      key={servicio}
                      style={[
                        styles.chip,
                        filtrosTemp.servicios?.includes(servicio) && styles.chipActivo,
                      ]}
                      onPress={() =>
                        setFiltrosTemp({
                          ...filtrosTemp,
                          servicios: toggleArrayItem(filtrosTemp.servicios, servicio),
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          filtrosTemp.servicios?.includes(servicio) && styles.chipTextActivo,
                        ]}
                      >
                        {servicio}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ambiente */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎭 Ambiente</Text>
                <View style={styles.chipContainer}>
                  {AMBIENTES.map((ambiente) => (
                    <TouchableOpacity
                      key={ambiente}
                      style={[
                        styles.chip,
                        filtrosTemp.ambiente?.includes(ambiente) && styles.chipActivo,
                      ]}
                      onPress={() =>
                        setFiltrosTemp({
                          ...filtrosTemp,
                          ambiente: toggleArrayItem(filtrosTemp.ambiente, ambiente),
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          filtrosTemp.ambiente?.includes(ambiente) && styles.chipTextActivo,
                        ]}
                      >
                        {ambiente}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rango de Precios */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💰 Rango de Precios</Text>
                <View style={styles.chipContainer}>
                  {PRECIOS.map((precio) => (
                    <TouchableOpacity
                      key={precio}
                      style={[
                        styles.chip,
                        filtrosTemp.precioRango === precio && styles.chipActivo,
                      ]}
                      onPress={() =>
                        setFiltrosTemp({
                          ...filtrosTemp,
                          precioRango: filtrosTemp.precioRango === precio ? undefined : precio,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          filtrosTemp.precioRango === precio && styles.chipTextActivo,
                        ]}
                      >
                        {precio}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.aplicarButton} onPress={handleAplicar}>
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aplicarGradient}
                >
                  <Text style={styles.aplicarText}>Aplicar filtros</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>

      {/* Modal Comunidad Autónoma */}
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
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.selectorModalBody}>
              {COMUNIDADES.map((comunidad) => (
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
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Provincia */}
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
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.selectorModalBody}>
              {PROVINCIAS.map((provincia) => (
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
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.headerText,
  },
  limpiarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  selectButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActivo: {
    color: colors.headerText,
  },
  distanciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  distanciaUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  aplicarButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  aplicarGradient: {
    paddingVertical: 16,
    alignItems: 'center',
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
    backgroundColor: `${colors.primary}10`,
  },
  selectorModalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  selectorModalOptionTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
});
