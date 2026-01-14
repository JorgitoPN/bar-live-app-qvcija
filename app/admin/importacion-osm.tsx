
import React, { useState, useEffect, useCallback } from 'react';
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
import { 
  importarCatalogoOSM, 
  verificarEstadoOverpassAPI,
  obtenerEstadoImportacionActual,
  cancelarImportacionActual,
} from '@/utils/osmImportService';
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

interface ImportacionEstado {
  provincia: string;
  tipos: string[];
  limite_total: number;
  locales_procesados: number;
  locales_importados: number;
  locales_duplicados: number;
  locales_excluidos: number;
  ultima_posicion: number;
  completada: boolean;
  fecha_inicio: string;
}

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
    excluidos: 0,
  });

  // Estado de importación existente
  const [importacionExistente, setImportacionExistente] = useState<ImportacionEstado | null>(null);
  const [verificandoEstado, setVerificandoEstado] = useState(false);

  // Estado de la API
  const [estadoAPI, setEstadoAPI] = useState<{
    verificando: boolean;
    disponible: boolean;
    mensaje: string;
  }>({
    verificando: false,
    disponible: true,
    mensaje: '',
  });

  const verificarEstadoAPI = useCallback(async () => {
    setEstadoAPI({ verificando: true, disponible: true, mensaje: '' });
    agregarLog('🔍 Verificando estado de Overpass API...');
    
    try {
      const estado = await verificarEstadoOverpassAPI();
      setEstadoAPI({
        verificando: false,
        disponible: estado.disponible,
        mensaje: estado.mensaje,
      });
      
      if (estado.disponible) {
        agregarLog(`✅ ${estado.mensaje}`);
      } else {
        agregarLog(`⚠️ ${estado.mensaje}`);
      }
    } catch (error) {
      console.error('[OSM Import] Error checking API status:', error);
      setEstadoAPI({
        verificando: false,
        disponible: false,
        mensaje: 'No se pudo verificar el estado de la API',
      });
      agregarLog('❌ Error al verificar estado de la API');
    }
  }, []);

  // Verificar si hay una importación existente
  const verificarImportacionExistente = useCallback(async () => {
    if (tiposSeleccionados.length === 0) return;
    
    setVerificandoEstado(true);
    try {
      const estado = await obtenerEstadoImportacionActual(provinciaSeleccionada, tiposSeleccionados);
      setImportacionExistente(estado);
      
      if (estado && !estado.completada) {
        agregarLog('📋 Se encontró una importación en progreso');
        agregarLog(`   Procesados: ${estado.locales_procesados}/${estado.limite_total}`);
        agregarLog(`   Importados: ${estado.locales_importados}`);
        agregarLog(`   Duplicados: ${estado.locales_duplicados}`);
        agregarLog(`   Excluidos: ${estado.locales_excluidos}`);
        agregarLog(`   Posición: ${estado.ultima_posicion}`);
      }
    } catch (error) {
      console.error('[OSM Import] Error checking existing import:', error);
    } finally {
      setVerificandoEstado(false);
    }
  }, [provinciaSeleccionada, tiposSeleccionados]);

  // Verificar estado de la API al cargar
  useEffect(() => {
    verificarEstadoAPI();
  }, [verificarEstadoAPI]);

  // Verificar importación existente cuando cambian provincia o tipos
  useEffect(() => {
    verificarImportacionExistente();
  }, [verificarImportacionExistente]);

  const agregarLog = (mensaje: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${mensaje}`].slice(-50));
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

  const cancelarImportacion = async () => {
    if (!importacionExistente) return;

    Alert.alert(
      'Cancelar Importación',
      '¿Estás seguro de que quieres cancelar la importación en progreso? El progreso actual se guardará.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            const cancelado = await cancelarImportacionActual(provinciaSeleccionada, tiposSeleccionados);
            if (cancelado) {
              setImportacionExistente(null);
              agregarLog('❌ Importación cancelada');
              Alert.alert('Cancelado', 'La importación ha sido cancelada');
            }
          },
        },
      ]
    );
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

    // Si hay una importación existente, preguntar si continuar
    if (importacionExistente && !importacionExistente.completada) {
      Alert.alert(
        'Continuar Importación',
        `Se encontró una importación en progreso:\n\n` +
        `Procesados: ${importacionExistente.locales_procesados}/${importacionExistente.limite_total}\n` +
        `Importados: ${importacionExistente.locales_importados}\n` +
        `Duplicados: ${importacionExistente.locales_duplicados}\n` +
        `Excluidos: ${importacionExistente.locales_excluidos}\n\n` +
        `¿Deseas continuar desde donde se quedó?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            onPress: () => ejecutarImportacion(limiteNum),
          },
        ]
      );
      return;
    }

    // Verificar estado de la API antes de importar
    if (!estadoAPI.disponible) {
      Alert.alert(
        'API no disponible',
        'La API de Overpass no está disponible en este momento. ¿Deseas intentar de todas formas? El sistema intentará con múltiples endpoints y reintentos automáticos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Intentar de todas formas', onPress: () => ejecutarImportacion(limiteNum) },
        ]
      );
      return;
    }

    ejecutarImportacion(limiteNum);
  };

  const ejecutarImportacion = async (limiteNum: number) => {
    setImportando(true);
    setResultados([]);
    setLogs([]);
    setEstadisticas({ importados: 0, duplicados: 0, errores: 0, excluidos: 0 });
    setProgreso({ actual: 0, total: limiteNum });

    if (importacionExistente && !importacionExistente.completada) {
      agregarLog('🔄 Continuando importación existente...');
      agregarLog(`📍 Provincia: ${provinciaSeleccionada}`);
      agregarLog(`🏷️ Tipos: ${tiposSeleccionados.join(', ')}`);
      agregarLog(`📊 Progreso anterior: ${importacionExistente.locales_procesados}/${importacionExistente.limite_total}`);
      agregarLog(`📍 Continuando desde posición: ${importacionExistente.ultima_posicion}`);
    } else {
      agregarLog('🚀 Iniciando nueva importación desde OpenStreetMap...');
      agregarLog(`📍 Provincia: ${provinciaSeleccionada}`);
      agregarLog(`🏷️ Tipos: ${tiposSeleccionados.join(', ')}`);
      agregarLog(`🔢 Límite: ${limiteNum} locales`);
    }
    
    agregarLog('⏳ Esto puede tardar varios minutos...');
    agregarLog('🔄 Sistema de reintentos automático activado');
    agregarLog('💾 El progreso se guarda automáticamente');
    agregarLog('🔄 Puedes continuar más tarde si hay errores');

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

      agregarLog(`🎉 Sesión de importación completada: ${localesImportados.length} locales en esta sesión`);
      agregarLog(`💾 Datos guardados en LocalCatalogo`);
      agregarLog(`💰 COSTE: 0€ (OSM es gratis)`);

      // Verificar si la importación está completa
      const estadoFinal = await obtenerEstadoImportacionActual(provinciaSeleccionada, tiposSeleccionados);
      
      let mensaje = `✅ Se importaron ${localesImportados.length} locales en esta sesión.`;
      
      if (estadoFinal && estadoFinal.completada) {
        mensaje += `\n\n📊 Importación completa:`;
        mensaje += `\n• Total procesados: ${estadoFinal.locales_procesados}`;
        mensaje += `\n• Importados: ${estadoFinal.locales_importados}`;
        mensaje += `\n• Duplicados: ${estadoFinal.locales_duplicados}`;
        mensaje += `\n• Excluidos: ${estadoFinal.locales_excluidos}`;
        mensaje += `\n\nSiguiente paso: Enriquecer con Google Places`;
      } else if (estadoFinal) {
        mensaje += `\n\n⏸️ Importación pausada:`;
        mensaje += `\n• Procesados: ${estadoFinal.locales_procesados}/${estadoFinal.limite_total}`;
        mensaje += `\n• Importados: ${estadoFinal.locales_importados}`;
        mensaje += `\n• Duplicados: ${estadoFinal.locales_duplicados}`;
        mensaje += `\n• Excluidos: ${estadoFinal.locales_excluidos}`;
        mensaje += `\n\nPuedes continuar la importación más tarde.`;
      }

      Alert.alert(
        'Importación completada',
        mensaje,
        [
          { text: 'Ver Resultados', style: 'cancel' },
          {
            text: 'Ir a Enriquecimiento',
            onPress: () => router.push('/admin/enriquecimiento-google'),
          },
        ]
      );

      // Actualizar estado de importación existente
      setImportacionExistente(estadoFinal);
    } catch (error: any) {
      console.error('[OSM Import] Error:', error);
      agregarLog(`❌ Error: ${error.message || error}`);
      
      let errorMessage = 'Ocurrió un error durante la importación.';
      
      if (error.message?.includes('504') || error.message?.includes('timeout')) {
        errorMessage = 'La API de Overpass está sobrecargada o no responde.\n\n' +
          '✅ El progreso se ha guardado automáticamente.\n\n' +
          'Puedes:\n' +
          '1. Esperar unos minutos y continuar la importación\n' +
          '2. Reducir el límite de locales\n' +
          '3. Seleccionar menos tipos de locales';
      } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        errorMessage = 'Has excedido el límite de peticiones.\n\n' +
          '✅ El progreso se ha guardado automáticamente.\n\n' +
          'Por favor, espera unos minutos antes de continuar.';
      }
      
      Alert.alert('Error de Importación', errorMessage);

      // Actualizar estado de importación existente
      const estadoActual = await obtenerEstadoImportacionActual(provinciaSeleccionada, tiposSeleccionados);
      setImportacionExistente(estadoActual);
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
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Importación OSM</Text>
        <Text style={styles.headerSubtitle}>
          Fase 1: Importar locales desde OpenStreetMap
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Estado de importación existente */}
        {importacionExistente && !importacionExistente.completada && (
          <View style={styles.existingImportCard}>
            <View style={styles.existingImportHeader}>
              <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="sync" size={24} color={colors.primary} />
              <Text style={styles.existingImportTitle}>Importación en Progreso</Text>
            </View>
            <Text style={styles.existingImportText}>
              Se encontró una importación en progreso para {importacionExistente.provincia}
            </Text>
            <View style={styles.existingImportStats}>
              <View style={styles.existingImportStat}>
                <Text style={styles.existingImportStatValue}>{importacionExistente.locales_procesados}</Text>
                <Text style={styles.existingImportStatLabel}>Procesados</Text>
              </View>
              <View style={styles.existingImportStat}>
                <Text style={[styles.existingImportStatValue, { color: '#10B981' }]}>{importacionExistente.locales_importados}</Text>
                <Text style={styles.existingImportStatLabel}>Importados</Text>
              </View>
              <View style={styles.existingImportStat}>
                <Text style={[styles.existingImportStatValue, { color: '#F59E0B' }]}>{importacionExistente.locales_duplicados}</Text>
                <Text style={styles.existingImportStatLabel}>Duplicados</Text>
              </View>
              <View style={styles.existingImportStat}>
                <Text style={[styles.existingImportStatValue, { color: '#EF4444' }]}>{importacionExistente.locales_excluidos}</Text>
                <Text style={styles.existingImportStatLabel}>Excluidos</Text>
              </View>
            </View>
            <View style={styles.existingImportProgress}>
              <View style={styles.existingImportProgressBar}>
                <View
                  style={[
                    styles.existingImportProgressFill,
                    { width: `${(importacionExistente.locales_procesados / importacionExistente.limite_total) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.existingImportProgressText}>
                {importacionExistente.locales_procesados} / {importacionExistente.limite_total}
              </Text>
            </View>
            <View style={styles.existingImportActions}>
              <TouchableOpacity
                style={styles.existingImportCancelButton}
                onPress={cancelarImportacion}
              >
                <Text style={styles.existingImportCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.existingImportContinueButton}
                onPress={() => ejecutarImportacion(importacionExistente.limite_total)}
              >
                <Text style={styles.existingImportContinueButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Estado de la API */}
        <View style={[
          styles.apiStatusCard,
          estadoAPI.disponible ? styles.apiStatusCardSuccess : styles.apiStatusCardWarning
        ]}>
          <View style={styles.apiStatusHeader}>
            {estadoAPI.verificando ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol 
                ios_icon_name={estadoAPI.disponible ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"}
                android_material_icon_name={estadoAPI.disponible ? "check-circle" : "warning"}
                size={24} 
                color={estadoAPI.disponible ? '#10B981' : '#F59E0B'} 
              />
            )}
            <Text style={styles.apiStatusTitle}>
              {estadoAPI.verificando ? 'Verificando API...' : 'Estado de Overpass API'}
            </Text>
          </View>
          <Text style={styles.apiStatusText}>{estadoAPI.mensaje}</Text>
          {!estadoAPI.verificando && (
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={verificarEstadoAPI}
            >
              <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={16} color={colors.primary} />
              <Text style={styles.refreshButtonText}>Verificar de nuevo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Información sobre OSM */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={32} color={colors.primary} />
            <Text style={styles.infoTitle}>OpenStreetMap (OSM)</Text>
          </View>
          <Text style={styles.infoText}>
            Base de datos gratuita y abierta de mapas mundiales mantenida por la comunidad.
          </Text>
          <Text style={[styles.infoText, { fontWeight: '600', color: colors.primary }]}>
            ✅ API 100% GRATIS sin límites
          </Text>
          <Text style={[styles.infoText, { fontWeight: '600', color: colors.primary }]}>
            ✅ Sistema de continuación automática
          </Text>
          <Text style={[styles.infoText, { fontWeight: '600', color: colors.primary }]}>
            ✅ Progreso guardado automáticamente
          </Text>
          <Text style={[styles.infoText, { fontWeight: '600', color: colors.primary }]}>
            ✅ Reintentos automáticos
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
                <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Selector de provincia */}
              <Text style={styles.label}>Provincia:</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setMostrarSelectorProvincia(true)}
              >
                <Text style={styles.selectorButtonText}>{provinciaSeleccionada}</Text>
                <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.textSecondary} />
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
              <Text style={[styles.helperText, { color: '#10B981', marginTop: 4 }]}>
                ✅ El progreso se guarda automáticamente
              </Text>
              <Text style={[styles.helperText, { color: '#10B981', marginTop: 2 }]}>
                ✅ Puedes continuar más tarde si hay errores
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
                <IconSymbol 
                  ios_icon_name={importacionExistente && !importacionExistente.completada ? "arrow.clockwise.circle.fill" : "arrow.down.circle.fill"}
                  android_material_icon_name={importacionExistente && !importacionExistente.completada ? "sync" : "download"}
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.importButtonText}>
                  {importacionExistente && !importacionExistente.completada ? 'Continuar Importación' : 'Iniciar Importación'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Progreso de importación */}
        {importando && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Importando desde OSM...</Text>
            <Text style={styles.progressSubtitle}>
              El progreso se guarda automáticamente. Puedes cerrar y continuar más tarde.
            </Text>
            
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
                  {estadisticas.excluidos}
                </Text>
                <Text style={styles.statLabel}>Excluidos</Text>
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
              ✅ Locales Importados en esta sesión ({resultados.length})
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
              <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow-forward" size={20} color="#fff" />
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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
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
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
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
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
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
  existingImportCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  existingImportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  existingImportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  existingImportText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  existingImportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  existingImportStat: {
    alignItems: 'center',
  },
  existingImportStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  existingImportStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  existingImportProgress: {
    marginBottom: 12,
  },
  existingImportProgressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  existingImportProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  existingImportProgressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  existingImportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  existingImportCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  existingImportCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  existingImportContinueButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  existingImportContinueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  apiStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  apiStatusCardSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  apiStatusCardWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  apiStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  apiStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  apiStatusText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  progressSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
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
