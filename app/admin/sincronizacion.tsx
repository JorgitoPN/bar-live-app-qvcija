
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';

interface SyncTask {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  frecuencia: string;
  ultimaEjecucion?: string;
  proximaEjecucion?: string;
  estado: 'idle' | 'running' | 'success' | 'error';
}

export default function SincronizacionScreen() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [tareas, setTareas] = useState<SyncTask[]>([
    {
      id: '1',
      nombre: 'Sincronizar Catálogo OSM',
      descripcion: 'Actualizar locales desde OpenStreetMap',
      activo: true,
      frecuencia: 'Diaria',
      ultimaEjecucion: '2025-01-20 08:00',
      proximaEjecucion: '2025-01-21 08:00',
      estado: 'success',
    },
    {
      id: '2',
      nombre: 'Actualizar Fotos Faltantes',
      descripcion: 'Descargar fotos para locales sin imagen',
      activo: true,
      frecuencia: 'Semanal',
      ultimaEjecucion: '2025-01-15 10:00',
      proximaEjecucion: '2025-01-22 10:00',
      estado: 'success',
    },
    {
      id: '3',
      nombre: 'Verificar Locales Cerrados',
      descripcion: 'Comprobar estado de locales en Google',
      activo: false,
      frecuencia: 'Mensual',
      estado: 'idle',
    },
    {
      id: '4',
      nombre: 'Limpiar Datos Duplicados',
      descripcion: 'Detectar y eliminar locales duplicados',
      activo: false,
      frecuencia: 'Manual',
      estado: 'idle',
    },
  ]);

  const toggleTarea = (id: string) => {
    setTareas(prev =>
      prev.map(tarea =>
        tarea.id === id ? { ...tarea, activo: !tarea.activo } : tarea
      )
    );
  };

  const ejecutarTarea = async (tarea: SyncTask) => {
    Alert.alert(
      'Ejecutar Tarea',
      `¿Deseas ejecutar "${tarea.nombre}" ahora?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ejecutar',
          onPress: async () => {
            setTareas(prev =>
              prev.map(t =>
                t.id === tarea.id ? { ...t, estado: 'running' } : t
              )
            );

            // Simular ejecución
            await new Promise(resolve => setTimeout(resolve, 3000));

            setTareas(prev =>
              prev.map(t =>
                t.id === tarea.id
                  ? {
                      ...t,
                      estado: 'success',
                      ultimaEjecucion: new Date().toLocaleString('es-ES'),
                    }
                  : t
              )
            );

            Alert.alert('Éxito', 'Tarea ejecutada correctamente');
          },
        },
      ]
    );
  };

  const getEstadoColor = (estado: SyncTask['estado']) => {
    switch (estado) {
      case 'running':
        return '#F59E0B';
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getEstadoTexto = (estado: SyncTask['estado']) => {
    switch (estado) {
      case 'running':
        return 'Ejecutando...';
      case 'success':
        return 'Completado';
      case 'error':
        return 'Error';
      default:
        return 'Inactivo';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sincronización Continua</Text>
        <Text style={styles.headerSubtitle}>
          Automatizar actualizaciones y mantenimiento de datos
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tareas.filter(t => t.activo).length}</Text>
            <Text style={styles.statLabel}>Tareas Activas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {tareas.filter(t => t.estado === 'success').length}
            </Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {tareas.filter(t => t.estado === 'running').length}
            </Text>
            <Text style={styles.statLabel}>En Ejecución</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Tareas Programadas</Text>

        {tareas.map(tarea => (
          <View key={tarea.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardTitle}>{tarea.nombre}</Text>
                <Text style={styles.cardDescription}>{tarea.descripcion}</Text>
              </View>
              <Switch
                value={tarea.activo}
                onValueChange={() => toggleTarea(tarea.id)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.detailRow}>
                <IconSymbol name="clock" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>Frecuencia: {tarea.frecuencia}</Text>
              </View>

              {tarea.ultimaEjecucion && (
                <View style={styles.detailRow}>
                  <IconSymbol name="checkmark.circle" size={16} color="#10B981" />
                  <Text style={styles.detailText}>
                    Última: {tarea.ultimaEjecucion}
                  </Text>
                </View>
              )}

              {tarea.proximaEjecucion && (
                <View style={styles.detailRow}>
                  <IconSymbol name="calendar" size={16} color={colors.primary} />
                  <Text style={styles.detailText}>
                    Próxima: {tarea.proximaEjecucion}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.estadoBadge,
                    { backgroundColor: getEstadoColor(tarea.estado) },
                  ]}
                >
                  <Text style={styles.estadoText}>{getEstadoTexto(tarea.estado)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                tarea.estado === 'running' && styles.buttonDisabled,
              ]}
              onPress={() => ejecutarTarea(tarea)}
              disabled={tarea.estado === 'running'}
            >
              {tarea.estado === 'running' ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <IconSymbol name="play.fill" size={16} color="white" />
                  <Text style={styles.buttonText}>Ejecutar Ahora</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.infoCard}>
          <IconSymbol name="info.circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Sincronización Automática</Text>
            <Text style={styles.infoText}>
              Las tareas activas se ejecutarán automáticamente según su frecuencia
              configurada. Puedes ejecutarlas manualmente en cualquier momento.
            </Text>
          </View>
        </View>

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
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...commonStyles.shadow,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    marginTop: 20,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
});
