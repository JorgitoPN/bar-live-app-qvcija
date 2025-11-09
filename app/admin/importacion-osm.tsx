
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { importarCatalogoOSM } from '@/utils/osmImportService';
import { LocalCatalogo } from '@/types';

const COMUNIDADES_PROVINCIAS: Record<string, string[]> = {
  'Andalucía': ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
  'Aragón': ['Huesca', 'Teruel', 'Zaragoza'],
  'Asturias': ['Asturias'],
  'Baleares': ['Baleares'],
  'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife'],
  'Cantabria': ['Cantabria'],
  'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
  'Castilla y León': ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
  'Cataluña': ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
  'Ceuta': ['Ceuta'],
  'Extremadura': ['Badajoz', 'Cáceres'],
  'Galicia': ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
  'La Rioja': ['La Rioja'],
  'Madrid': ['Madrid'],
  'Melilla': ['Melilla'],
  'Murcia': ['Murcia'],
  'Navarra': ['Navarra'],
  'País Vasco': ['Álava', 'Guipúzcoa', 'Vizcaya'],
  'Valencia': ['Alicante', 'Castellón', 'Valencia'],
};

const TIPOS_OSM = [
  { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'cafe', label: 'Café' },
  { value: 'pub', label: 'Pub' },
  { value: 'nightclub', label: 'Discoteca' },
];

export default function ImportacionOSMScreen() {
  const router = useRouter();
  
  // Estado del formulario
  const [comunidadSeleccionada, setComunidadSeleccionada] = useState('Madrid');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Madrid');
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>(['bar']);
  const [limite, setLimite] = useState('1000');
  const [mostrarSelectorComunidad, setMostrarSelectorComunidad] = useState(false);
  const [mostrarSelectorProvincia, setMostrarSelectorProvincia] = useState(false);
  
  // Estado de la importación
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [resultados, setResultados] = useState<LocalCatalogo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    importados: 0,
    duplicados: 0,
    errores: 0,
  });

  const agregarLog = (mensaje: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${mensaje}`].slice(-30)); // Mantener solo últimos 30 logs
  };

  const toggleTipo = (tipo: string) => {
    if (tiposSeleccionados.includes(tipo)) {
      setTiposSeleccionados(tiposSeleccionados.filter(t => t !== tipo));
    } else {
      setTiposSeleccionados([...tiposSeleccionados, tipo]);
    }
  };

  const seleccionarComunidad = (comunidad: string) => {
    setComunidadSeleccionada(comunidad);
    setProvinciaSeleccionada(COMUNIDADES_PROVINCIAS[comunidad][0]);
    setMostrarSelectorComunidad(false);
  };

  const seleccionarProvincia = (provincia: string) => {
    setProvinciaSeleccionada(provincia);
    setMostrarSelectorProvincia(false);
  };

  const iniciarImportacion = async () => {
    if (tiposSeleccionados.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un tipo de local');
      return;
    }

    const limiteNum = parseInt(limite);
    if (isNaN(limiteNum) || limiteNum < 1 || limiteNum > 10000) {
      Alert.alert('Error', 'El límite debe estar entre 1 y 10000');
      return;
    }

    setImportando(true);
    setResultados([]);
    setLogs([]);
    setEstadisticas({ importados: 0, duplicados: 0, errores: 0 });
    setProgreso({ actual: 0, total: limiteNum });

    agregarLog('🚀 Iniciando importación desde OpenStreetMap...');
    agregarLog(`📍 Provincia: ${provinciaSeleccionada}`);
    agregarLog(`🏷️ Tipos: ${tiposSeleccionados.join(', ')}`);
    agregarLog(`🔢 Límite: ${limiteNum} locales`);

    try {
      const localesImportados = await importarCatalogoOSM(
        provinciaSeleccionada,
        tiposSeleccionados,
        limiteNum,
        (actual, total, local) => {
          setProgreso({ actual, total });
          if (local) {
            setResultados(prev => [...prev, local]);
            setEstadisticas(prev => ({
              ...prev,
              importados: prev.importados + 1,
            }));
            agregarLog(`✅ Importado: ${local.nombre}`);
          }
        }
      );

      agregarLog(`🎉 Importación completada: ${localesImportados.length} locales`);
      agregarLog(`💾 Datos guardados en LocalCatalogo`);
      agregarLog(`💰 COSTE: 0€ (OSM es gratis)`);

      Alert.alert(
        'Importación completada',
        `✅ Se importaron ${localesImportados.length} locales desde OpenStreetMap.\n\nSiguiente paso: Enriquecer con Google Places`,
        [
          { text: 'Ver Resultados', style: 'cancel' },
          {
            text: 'Ir a Enriquecimiento',
            onPress: () => router.push('/admin/enriquecimiento-google'),
          },
        ]
      );
    } catch (error) {
      console.error('[OSM Import] Error:', error);
      agregarLog(`❌ Error: ${error}`);
      Alert.alert('Error', 'Ocurrió un error durante la importación');
    } finally {
      setImportando(false);
    }
  };

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={commonStyles.backButton}
        >
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Importación OSM</Text>
        <Text style={styles.headerSubtitle}>
          Fase 1: Importar locales desde OpenStreetMap
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Información sobre OSM */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <IconSymbol name="map.fill" size={32} color={colors.primary} />
            <Text style={styles.infoTitle}>OpenStreetMap (OSM)</Text>
          </View>
          <Text style={styles.infoText}>
            Base de datos gratuita y abierta de mapas mundiales mantenida por la comunidad.
          </Text>
          <Text style={[styles.infoText, { fontWeight: '600', color: colors.primary }]}>
            ✅ API 100% GRATIS sin límites
          </Text>
          <Text style={[styles.infoText, { fontWeight: '600', color: colors.primary }]}>
            ✅ Miles de locales en segundos
          </Text>
          <Text style={[styles.infoText, { fontWeight: '600', color: colors.primary }]}>
            ✅ COSTE: 0€
          </Text>
        </View>

        {/* Formulario de importación */}
        {!importando && (
          <>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Configuración de Importación</Text>

              {/* Selector de comunidad autónoma */}
              <Text style={styles.label}>Comunidad Autónoma:</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setMostrarSelectorComunidad(true)}
              >
                <Text style={styles.selectorButtonText}>{comunidadSeleccionada}</Text>
                <IconSymbol name="chevron.down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Selector de provincia */}
              <Text style={styles.label}>Provincia:</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setMostrarSelectorProvincia(true)}
              >
                <Text style={styles.selectorButtonText}>{provinciaSeleccionada}</Text>
                <IconSymbol name="chevron.down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Selector de tipos */}
              <Text style={styles.label}>Tipos de locales:</Text>
              <View style={styles.tiposContainer}>
                {TIPOS_OSM.map(tipo => (
                  <TouchableOpacity
                    key={tipo.value}
                    style={[
                      styles.tipoChip,
                      tiposSeleccionados.includes(tipo.value) && styles.tipoChipSelected,
                    ]}
                    onPress={() => toggleTipo(tipo.value)}
                  >
                    <Text
                      style={[
                        styles.tipoChipText,
                        tiposSeleccionados.includes(tipo.value) && styles.tipoChipTextSelected,
                      ]}
                    >
                      {tipo.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Límite */}
              <Text style={styles.label}>Límite de locales:</Text>
              <TextInput
                style={styles.input}
                value={limite}
                onChangeText={setLimite}
                keyboardType="number-pad"
                placeholder="1000"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.helperText}>
                Máximo: 10,000 locales por importación
              </Text>
            </View>

            {/* Botón de importación */}
            <TouchableOpacity
              style={styles.importButton}
              onPress={iniciarImportacion}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.importButtonGradient}
              >
                <IconSymbol name="arrow.down.circle.fill" size={24} color="#fff" />
                <Text style={styles.importButtonText}>Iniciar Importación</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Progreso de importación */}
        {importando && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Importando desde OSM...</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(progreso.actual / progreso.total) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progreso.actual} / {progreso.total}
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>
                  {estadisticas.importados}
                </Text>
                <Text style={styles.statLabel}>Importados</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {estadisticas.duplicados}
                </Text>
                <Text style={styles.statLabel}>Duplicados</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {estadisticas.errores}
                </Text>
                <Text style={styles.statLabel}>Errores</Text>
              </View>
            </View>

            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          </View>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <View style={styles.logsCard}>
            <Text style={styles.logsTitle}>📋 Registro de Actividad</Text>
            <ScrollView style={styles.logsScroll} nestedScrollEnabled>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Resultados */}
        {resultados.length > 0 && !importando && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>
              ✅ Locales Importados ({resultados.length})
            </Text>
            {resultados.slice(0, 10).map((local, index) => (
              <View key={local.id} style={styles.resultItem}>
                <Text style={styles.resultName}>{local.nombre}</Text>
                <Text style={styles.resultInfo}>
                  📍 {local.direccion}
                </Text>
                <Text style={styles.resultType}>
                  {local.barlive_types.join(', ')}
                </Text>
              </View>
            ))}
            {resultados.length > 10 && (
              <Text style={styles.moreResults}>
                ... y {resultados.length - 10} locales más
              </Text>
            )}
          </View>
        )}

        {/* Siguiente paso */}
        {resultados.length > 0 && !importando && (
          <View style={styles.nextStepCard}>
            <Text style={styles.nextStepTitle}>🎯 Siguiente Paso</Text>
            <Text style={styles.nextStepText}>
              Los locales han sido importados a LocalCatalogo con estado enriquecido: false.
            </Text>
            <Text style={styles.nextStepText}>
              Ahora puedes enriquecerlos con datos de Google Places para obtener información completa.
            </Text>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => router.push('/admin/enriquecimiento-google')}
            >
              <Text style={styles.nextButtonText}>Ir a Enriquecimiento Google</Text>
              <IconSymbol name="arrow.right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal selector de comunidad */}
      <Modal
        visible={mostrarSelectorComunidad}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarSelectorComunidad(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Comunidad Autónoma</Text>
              <TouchableOpacity onPress={() => setMostrarSelectorComunidad(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {Object.keys(COMUNIDADES_PROVINCIAS).map(comunidad => (
                <TouchableOpacity
                  key={comunidad}
                  style={[
                    styles.modalItem,
                    comunidadSeleccionada === comunidad && styles.modalItemSelected,
                  ]}
                  onPress={() => seleccionarComunidad(comunidad)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      comunidadSeleccionada === comunidad && styles.modalItemTextSelected,
                    ]}
                  >
                    {comunidad}
                  </Text>
                  {comunidadSeleccionada === comunidad && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal selector de provincia */}
      <Modal
        visible={mostrarSelectorProvincia}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarSelectorProvincia(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Provincia</Text>
              <TouchableOpacity onPress={() => setMostrarSelectorProvincia(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {COMUNIDADES_PROVINCIAS[comunidadSeleccionada].map(provincia => (
                <TouchableOpacity
                  key={provincia}
                  style={[
                    styles.modalItem,
                    provinciaSeleccionada === provincia && styles.modalItemSelected,
                  ]}
                  onPress={() => seleccionarProvincia(provincia)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      provinciaSeleccionada === provincia && styles.modalItemTextSelected,
                    ]}
                  >
                    {provincia}
                  </Text>
                  {provinciaSeleccionada === provincia && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  selectorButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  tiposContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tipoChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipoChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tipoChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  tipoChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  importButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  importButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  logsCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  logsScroll: {
    maxHeight: 240,
  },
  logText: {
    fontSize: 12,
    color: '#D1D5DB',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  resultsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 12,
  },
  resultItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  resultInfo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  resultType: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  moreResults: {
    fontSize: 14,
    color: '#166534',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  nextStepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  nextStepText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemSelected: {
    backgroundColor: colors.background,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
