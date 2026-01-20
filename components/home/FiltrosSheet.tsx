
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { Filtros } from '@/types';

interface FiltrosSheetProps {
  visible: boolean;
  onClose: () => void;
  filtros: Filtros;
  onAplicarFiltros: (filtros: Filtros) => void;
}

const TIPOS = ['Café', 'Bar', 'Restaurante', 'Pub', 'Discoteca'];
const MUSICA = ['Rock', 'Pop', 'Jazz', 'Electrónica', 'Reggaeton', 'Indie', 'Clásica'];
const AMBIENTE = ['Tranquilo', 'Animado', 'Romántico', 'Familiar', 'Moderno', 'Tradicional'];
const SERVICIOS = ['WiFi', 'Terraza', 'Parking', 'Accesible', 'Reservas', 'Música en vivo'];

export default function FiltrosSheet({
  visible,
  onClose,
  filtros,
  onAplicarFiltros,
}: FiltrosSheetProps) {
  const [filtrosTemp, setFiltrosTemp] = useState<Filtros>(filtros);

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
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
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
            <Text style={styles.headerTitle}>Filtros</Text>
            <TouchableOpacity onPress={handleLimpiar}>
              <Text style={styles.limpiarText}>Limpiar</Text>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Tipo de local */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de local</Text>
              <View style={styles.chipContainer}>
                {TIPOS.map((tipo) => (
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

            {/* Música */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Música</Text>
              <View style={styles.chipContainer}>
                {MUSICA.map((musica) => (
                  <TouchableOpacity
                    key={musica}
                    style={[
                      styles.chip,
                      filtrosTemp.musica?.includes(musica) && styles.chipActivo,
                    ]}
                    onPress={() =>
                      setFiltrosTemp({
                        ...filtrosTemp,
                        musica: toggleArrayItem(filtrosTemp.musica, musica),
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filtrosTemp.musica?.includes(musica) && styles.chipTextActivo,
                      ]}
                    >
                      {musica}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ambiente */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ambiente</Text>
              <View style={styles.chipContainer}>
                {AMBIENTE.map((ambiente) => (
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

            {/* Servicios */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Servicios</Text>
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

            {/* Distancia */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distancia máxima</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 5 km"
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
});
