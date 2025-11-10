
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { descargarYSubirFotosLocal, descargarYSubirFotosDesdeUrls } from '@/utils/enrichmentPhotos';
import { googlePlacesDetails } from '@/utils/googlePlacesApi';
import * as Clipboard from 'expo-clipboard';

interface LogEntry {
  timestamp: string;
  tipo: 'info' | 'success' | 'error' | 'warning';
  mensaje: string;
}

interface LocalConFotosGoogle {
  id: string;
  nombre: string;
  imagen_url: string | null;
  galeria_urls: string[] | null;
  fotos_google: any[] | null;
  google_place_id: string | null;
}

const MAX_LOGS = 100;

export default function MigrarFotosSupabaseScreen() {
  const router = useRouter();
  
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    totalLocales: 0,
    conFotosGoogle: 0,
    conFotosSupabase: 0,
    sinFotos: 0,
  });
  const [localesConFotosGoogle, setLocalesConFotosGoogle] = useState<LocalConFotosGoogle[]>([]);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });

  const agregarLog = useCallback((tipo: LogEntry['tipo'], mensaje: string) => {
    const nuevoLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      tipo,
      mensaje,
    };
    setLogs(prev => [nuevoLog, ...prev].slice(0, MAX_LOGS));
  }, []);

  const copiarLogs = async () => {
    try {
      const logsTexto = logs
        .map(log => `[${log.timestamp}] ${log.tipo.toUpperCase()}: ${log.mensaje}`)
        .join('\n');
      
      await Clipboard.setStringAsync(logsTexto);
      Alert.alert('Logs copiados', 'Los logs se han copiado al portapapeles');
    } catch (error) {
      console.error('Error copiando logs:', error);
      Alert.alert('Error', 'No se pudieron copiar los logs');
    }
  };

  const analizarFotos = useCallback(async () => {
    setCargando(true);
    agregarLog('info', '🔍 Analizando fotos de locales...');

    try {
      // Obtener todos los locales activos y enriquecidos
      const { data: locales, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, galeria_urls, fotos_google, google_place_id')
        .eq('activo', true)
        .eq('enriquecido', true);

      if (error) {
        console.error('Error loading locales:', error);
        agregarLog('error', 'Error al cargar locales');
        return;
      }

      console.log('[MigrarFotos] Loaded locales:', locales?.length || 0);

      let conFotosGoogle = 0;
      let conFotosSupabase = 0;
      let sinFotos = 0;
      const localesConGoogle: LocalConFotosGoogle[] = [];

      locales?.forEach((local) => {
        const imagenUrl = local.imagen_url;
        const galeriaUrls = local.galeria_urls || [];

        // Verificar si tiene fotos de Google Places (contienen 'googleapis.com' o 'googleusercontent.com')
        const tieneImagenGoogle = imagenUrl && (
          imagenUrl.includes('googleapis.com') || 
          imagenUrl.includes('googleusercontent.com') ||
          imagenUrl.includes('maps.gstatic.com')
        );
        
        const tieneGaleriaGoogle = galeriaUrls.some((url: string) => 
          url.includes('googleapis.com') || 
          url.includes('googleusercontent.com') ||
          url.includes('maps.gstatic.com')
        );

        // Verificar si tiene fotos de Supabase
        const tieneImagenSupabase = imagenUrl && imagenUrl.includes('supabase');
        const tieneGaleriaSupabase = galeriaUrls.some((url: string) => url.includes('supabase'));

        if (tieneImagenGoogle || tieneGaleriaGoogle) {
          conFotosGoogle++;
          localesConGoogle.push(local);
        } else if (tieneImagenSupabase || tieneGaleriaSupabase) {
          conFotosSupabase++;
        } else {
          sinFotos++;
        }
      });

      setEstadisticas({
        totalLocales: locales?.length || 0,
        conFotosGoogle,
        conFotosSupabase,
        sinFotos,
      });

      setLocalesConFotosGoogle(localesConGoogle);

      agregarLog('success', `✅ Análisis completado:`);
      agregarLog('info', `   📊 Total locales: ${locales?.length || 0}`);
      agregarLog('warning', `   🔗 Con fotos de Google: ${conFotosGoogle}`);
      agregarLog('success', `   ✅ Con fotos de Supabase: ${conFotosSupabase}`);
      agregarLog('info', `   ⚠️ Sin fotos: ${sinFotos}`);

      if (conFotosGoogle > 0) {
        agregarLog('warning', `⚠️ Hay ${conFotosGoogle} locales que necesitan migración`);
      } else {
        agregarLog('success', '🎉 ¡Todos los locales ya tienen fotos en Supabase!');
      }
    } catch (error) {
      console.error('Error analizando fotos:', error);
      agregarLog('error', 'Error al analizar fotos');
    } finally {
      setCargando(false);
    }
  }, [agregarLog]);

  useEffect(() => {
    analizarFotos();
  }, [analizarFotos]);

  const migrarFotos = async () => {
    if (localesConFotosGoogle.length === 0) {
      Alert.alert('Sin locales', 'No hay locales con fotos de Google para migrar');
      return;
    }

    Alert.alert(
      'Confirmar Migración',
      `Se migrarán las fotos de ${localesConFotosGoogle.length} locales desde Google Places a Supabase Storage.\n\n📸 Esto descargará las fotos y las subirá a tu almacenamiento.\n\n¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Migrar',
          onPress: () => procesarMigracion(),
        },
      ]
    );
  };

  const procesarMigracion = async () => {
    setProcesando(true);
    setProgreso({ actual: 0, total: localesConFotosGoogle.length });
    agregarLog('info', `🚀 Iniciando migración de ${localesConFotosGoogle.length} locales...`);

    let exitosos = 0;
    let fallidos = 0;

    try {
      for (let i = 0; i < localesConFotosGoogle.length; i++) {
        const local = localesConFotosGoogle[i];
        setProgreso({ actual: i + 1, total: localesConFotosGoogle.length });
        
        agregarLog('info', `[${i + 1}/${localesConFotosGoogle.length}] Migrando: ${local.nombre}...`);
        
        try {
          let galeriaUrls: string[] = [];

          // ESTRATEGIA 1: Si tiene fotos_google (metadatos), usarlos
          if (local.fotos_google && local.fotos_google.length > 0) {
            agregarLog('info', `   📸 Usando metadatos de fotos (${local.fotos_google.length} fotos)`);
            
            const placeDetails = {
              photos: local.fotos_google,
              geometry: null,
            };

            galeriaUrls = await descargarYSubirFotosLocal(local.id, placeDetails as any, 4);
          }
          // ESTRATEGIA 2: Si tiene google_place_id, obtener detalles de nuevo
          else if (local.google_place_id) {
            agregarLog('info', `   🔍 Obteniendo detalles de Google Places...`);
            
            try {
              const placeDetails = await googlePlacesDetails(local.google_place_id, ['photos', 'geometry']);
              
              if (placeDetails && placeDetails.photos && placeDetails.photos.length > 0) {
                agregarLog('info', `   📸 Descargando ${placeDetails.photos.length} fotos de Google...`);
                galeriaUrls = await descargarYSubirFotosLocal(local.id, placeDetails, 4);
              } else {
                agregarLog('warning', `   ⚠️ No se encontraron fotos en Google Places`);
              }
            } catch (apiError) {
              console.error('Error fetching Google Place details:', apiError);
              agregarLog('error', `   ❌ Error al obtener detalles de Google: ${apiError}`);
            }
          }
          // ESTRATEGIA 3: Si tiene URLs de Google, intentar descargarlas directamente
          else if (local.imagen_url || (local.galeria_urls && local.galeria_urls.length > 0)) {
            agregarLog('info', `   🔗 Descargando fotos desde URLs de Google...`);
            
            const urlsGoogle: string[] = [];
            if (local.imagen_url && (
              local.imagen_url.includes('googleapis.com') || 
              local.imagen_url.includes('googleusercontent.com') ||
              local.imagen_url.includes('maps.gstatic.com')
            )) {
              urlsGoogle.push(local.imagen_url);
            }
            
            if (local.galeria_urls) {
              local.galeria_urls.forEach((url: string) => {
                if (url.includes('googleapis.com') || 
                    url.includes('googleusercontent.com') ||
                    url.includes('maps.gstatic.com')) {
                  urlsGoogle.push(url);
                }
              });
            }
            
            if (urlsGoogle.length > 0) {
              agregarLog('info', `   📥 Descargando ${urlsGoogle.length} fotos...`);
              galeriaUrls = await descargarYSubirFotosDesdeUrls(local.id, urlsGoogle);
            }
          }

          // Si se descargaron fotos, actualizar el local
          if (galeriaUrls.length > 0) {
            const { error: updateError } = await supabase
              .from('locales')
              .update({
                imagen_url: galeriaUrls[0],
                galeria_urls: galeriaUrls,
                fecha_actualizacion: new Date().toISOString(),
              })
              .eq('id', local.id);

            if (updateError) {
              console.error('Error updating local:', updateError);
              agregarLog('error', `   ❌ Error al actualizar ${local.nombre}`);
              fallidos++;
            } else {
              agregarLog('success', `   ✅ ${local.nombre} - ${galeriaUrls.length} fotos migradas`);
              exitosos++;
            }
          } else {
            agregarLog('warning', `   ⚠️ ${local.nombre} - No se pudieron descargar fotos`);
            fallidos++;
          }
        } catch (error) {
          console.error('Error migrando local:', error);
          agregarLog('error', `   ❌ Error: ${local.nombre} - ${error}`);
          fallidos++;
        }
        
        // Pequeña pausa para no saturar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      agregarLog('success', `🎉 Migración completada: ${exitosos} exitosos, ${fallidos} fallidos`);
      
      Alert.alert(
        'Migración Completada',
        `Se procesaron ${localesConFotosGoogle.length} locales.\n\n✅ Exitosos: ${exitosos}\n❌ Fallidos: ${fallidos}`,
        [
          {
            text: 'Actualizar',
            onPress: () => analizarFotos(),
          },
        ]
      );
    } catch (error) {
      console.error('Error en migración:', error);
      agregarLog('error', 'Error durante la migración');
      Alert.alert('Error', 'Ocurrió un error durante la migración');
    } finally {
      setProcesando(false);
    }
  };

  const getLogColor = (tipo: LogEntry['tipo']) => {
    switch (tipo) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      default:
        return colors.text;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Migrar Fotos a Supabase</Text>
        <Text style={styles.headerSubtitle}>
          Descarga fotos de Google y súbelas a Supabase
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estadísticas */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Estadísticas de Fotos</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{estadisticas.totalLocales}</Text>
              <Text style={styles.statLabel}>Total Locales</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{estadisticas.conFotosGoogle}</Text>
              <Text style={styles.statLabel}>Fotos Google</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{estadisticas.conFotosSupabase}</Text>
              <Text style={styles.statLabel}>Fotos Supabase</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#9CA3AF' }]}>{estadisticas.sinFotos}</Text>
              <Text style={styles.statLabel}>Sin Fotos</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${estadisticas.totalLocales > 0 
                      ? (estadisticas.conFotosSupabase / estadisticas.totalLocales) * 100 
                      : 0}%`,
                    backgroundColor: '#10B981',
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {estadisticas.totalLocales > 0 
                ? ((estadisticas.conFotosSupabase / estadisticas.totalLocales) * 100).toFixed(1) 
                : 0}% migrado a Supabase
            </Text>
          </View>
        </View>

        {/* Información */}
        <View style={[styles.infoBox, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.infoBoxTitle, { color: '#1E40AF' }]}>ℹ️ Información</Text>
          <Text style={[styles.infoBoxText, { color: '#1E40AF' }]}>
            Esta herramienta descarga las fotos de Google Places que aún no están en Supabase y las sube a tu almacenamiento.{'\n\n'}
            ✅ Evita llamadas continuas a la API de Google{'\n'}
            ✅ Mayor control sobre tus imágenes{'\n'}
            ✅ Mejor rendimiento de carga{'\n'}
            ✅ Sin dependencia de URLs externas
          </Text>
        </View>

        {estadisticas.conFotosGoogle > 0 && (
          <View style={[styles.infoBox, { backgroundColor: '#FEF3C7', marginTop: 15 }]}>
            <Text style={[styles.infoBoxTitle, { color: '#92400E' }]}>⚠️ Acción Requerida</Text>
            <Text style={[styles.infoBoxText, { color: '#92400E' }]}>
              Hay {estadisticas.conFotosGoogle} locales con fotos de Google Places que necesitan ser migradas a Supabase.{'\n\n'}
              Haz clic en &quot;Migrar Fotos&quot; para iniciar el proceso.
            </Text>
          </View>
        )}

        {estadisticas.conFotosGoogle === 0 && estadisticas.conFotosSupabase > 0 && (
          <View style={[styles.infoBox, { backgroundColor: '#D1FAE5', marginTop: 15 }]}>
            <Text style={[styles.infoBoxTitle, { color: '#065F46' }]}>✅ Todo Listo</Text>
            <Text style={[styles.infoBoxText, { color: '#065F46' }]}>
              ¡Excelente! Todos los locales ya tienen sus fotos almacenadas en Supabase.{'\n\n'}
              No es necesario realizar ninguna migración.
            </Text>
          </View>
        )}

        {/* Botones de Acción */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={analizarFotos}
            disabled={cargando || procesando}
          >
            {cargando ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <IconSymbol name="arrow.clockwise" size={20} color="white" />
                <Text style={styles.buttonText}>Actualizar Análisis</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button, 
              styles.buttonPrimary,
              (procesando || estadisticas.conFotosGoogle === 0) && styles.buttonDisabled
            ]}
            onPress={migrarFotos}
            disabled={procesando || estadisticas.conFotosGoogle === 0}
          >
            {procesando ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <IconSymbol name="arrow.down.circle.fill" size={20} color="white" />
                <Text style={styles.buttonText}>
                  Migrar Fotos ({estadisticas.conFotosGoogle})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Progreso */}
        {procesando && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>
              Procesando {progreso.actual} de {progreso.total}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { 
                      width: `${(progreso.actual / progreso.total) * 100}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>
                {((progreso.actual / progreso.total) * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        )}

        {/* Logs en tiempo real */}
        {logs.length > 0 && (
          <View style={styles.logsCard}>
            <View style={styles.logsHeader}>
              <Text style={styles.logsTitle}>📡 Logs en Tiempo Real</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copiarLogs}
              >
                <IconSymbol name="doc.on.doc" size={20} color={colors.primary} />
                <Text style={styles.copyButtonText}>Copiar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.logsContainer} nestedScrollEnabled>
              {logs.map((log, index) => (
                <View key={index} style={styles.logEntry}>
                  <Text style={[styles.logTimestamp, { color: getLogColor(log.tipo) }]}>
                    [{log.timestamp}]
                  </Text>
                  <Text style={[styles.logMessage, { color: getLogColor(log.tipo) }]}>
                    {log.mensaje}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  progressBarContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    gap: 12,
    ...commonStyles.shadow,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  logsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 5,
  },
  logsContainer: {
    maxHeight: 400,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  logTimestamp: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  logMessage: {
    fontSize: 11,
    flex: 1,
  },
});
