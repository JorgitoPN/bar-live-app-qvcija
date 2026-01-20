
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface LocalExcluido {
  id: string;
  nombre: string;
  direccion: string;
  motivo_exclusion: string;
  descripcion_exclusion: string;
  fecha_exclusion: string;
  osm_id: string | null;
  google_place_id: string | null;
}

export default function LocalesRechazadosScreen() {
  const router = useRouter();
  const [localesExcluidos, setLocalesExcluidos] = useState<LocalExcluido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState<string | null>(null);

  useEffect(() => {
    cargarLocalesExcluidos();
  }, []);

  const cargarLocalesExcluidos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('locales_excluidos')
        .select('*')
        .order('fecha_exclusion', { ascending: false });

      if (error) {
        console.error('Error loading excluded locals:', error);
        Alert.alert('Error', 'No se pudieron cargar los locales excluidos');
        return;
      }

      setLocalesExcluidos(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los datos');
    } finally {
      setCargando(false);
    }
  };

  const eliminarExclusion = async (id: string, nombre: string) => {
    Alert.alert(
      'Eliminar Exclusión',
      `¿Estás seguro de que quieres eliminar la exclusión de "${nombre}"?\n\nEsto permitirá que el local pueda ser importado y enriquecido nuevamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('locales_excluidos')
                .delete()
                .eq('id', id);

              if (error) {
                console.error('Error deleting exclusion:', error);
                Alert.alert('Error', 'No se pudo eliminar la exclusión');
                return;
              }

              Alert.alert('Éxito', 'Exclusión eliminada correctamente');
              cargarLocalesExcluidos();
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'Ocurrió un error al eliminar la exclusión');
            }
          },
        },
      ]
    );
  };

  const limpiarTodosLosExcluidos = async () => {
    Alert.alert(
      'Limpiar Todos los Excluidos',
      `¿Estás seguro de que quieres eliminar TODAS las exclusiones (${localesExcluidos.length} locales)?\n\nEsto permitirá que todos los locales puedan ser importados y enriquecidos nuevamente.\n\n⚠️ Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Todos',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('locales_excluidos')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

              if (error) {
                console.error('Error deleting all exclusions:', error);
                Alert.alert('Error', 'No se pudieron eliminar las exclusiones');
                return;
              }

              Alert.alert('Éxito', 'Todas las exclusiones han sido eliminadas');
              cargarLocalesExcluidos();
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'Ocurrió un error al eliminar las exclusiones');
            }
          },
        },
      ]
    );
  };

  const localesFiltrados = localesExcluidos.filter(local => {
    const matchBusqueda = busqueda === '' || 
      local.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      local.direccion?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchMotivo = filtroMotivo === null || local.motivo_exclusion === filtroMotivo;
    
    return matchBusqueda && matchMotivo;
  });

  const motivosUnicos = Array.from(new Set(localesExcluidos.map(l => l.motivo_exclusion)));

  const getColorMotivo = (motivo: string) => {
    switch (motivo) {
      case 'duplicado':
        return '#F59E0B';
      case 'invalido':
        return '#EF4444';
      case 'fuera_categoria':
        return '#8B5CF6';
      case 'datos_incorrectos':
        return '#EC4899';
      case 'cerrado_permanentemente':
        return '#6B7280';
      case 'no_existe':
        return '#DC2626';
      default:
        return colors.textSecondary;
    }
  };

  const getIconoMotivo = (motivo: string) => {
    switch (motivo) {
      case 'duplicado':
        return 'doc.on.doc.fill';
      case 'invalido':
        return 'xmark.circle.fill';
      case 'fuera_categoria':
        return 'tag.fill';
      case 'datos_incorrectos':
        return 'exclamationmark.triangle.fill';
      case 'cerrado_permanentemente':
        return 'lock.fill';
      case 'no_existe':
        return 'trash.fill';
      default:
        return 'questionmark.circle.fill';
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
        <Text style={commonStyles.headerTitle}>Locales Rechazados</Text>
        <Text style={styles.headerSubtitle}>
          Gestión de locales excluidos del enriquecimiento
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Estadísticas */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {localesExcluidos.length}
              </Text>
              <Text style={styles.statLabel}>Total Excluidos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {localesFiltrados.length}
              </Text>
              <Text style={styles.statLabel}>Filtrados</Text>
            </View>
          </View>
        </View>

        {/* Información */}
        <View style={[styles.infoBox, { backgroundColor: '#DBEAFE', marginBottom: 15 }]}>
          <Text style={[styles.infoBoxTitle, { color: '#1E40AF' }]}>ℹ️ Información</Text>
          <Text style={[styles.infoBoxText, { color: '#1E40AF' }]}>
            Los locales rechazados durante el enriquecimiento se almacenan aquí para evitar que se intenten procesar nuevamente.
            {'\n\n'}
            Esto ahorra costes de API y mantiene el catálogo limpio.
          </Text>
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o dirección..."
            value={busqueda}
            onChangeText={setBusqueda}
            placeholderTextColor={colors.textSecondary}
          />
          {busqueda !== '' && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros por motivo */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtrosContainer}
        >
          <TouchableOpacity
            style={[
              styles.filtroChip,
              filtroMotivo === null && styles.filtroChipSelected,
            ]}
            onPress={() => setFiltroMotivo(null)}
          >
            <Text
              style={[
                styles.filtroChipText,
                filtroMotivo === null && styles.filtroChipTextSelected,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          {motivosUnicos.map(motivo => (
            <TouchableOpacity
              key={motivo}
              style={[
                styles.filtroChip,
                filtroMotivo === motivo && styles.filtroChipSelected,
              ]}
              onPress={() => setFiltroMotivo(motivo)}
            >
              <Text
                style={[
                  styles.filtroChipText,
                  filtroMotivo === motivo && styles.filtroChipTextSelected,
                ]}
              >
                {motivo}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Botón de limpiar todos */}
        {localesExcluidos.length > 0 && (
          <TouchableOpacity
            style={styles.limpiarButton}
            onPress={limpiarTodosLosExcluidos}
          >
            <IconSymbol name="trash.fill" size={20} color="#fff" />
            <Text style={styles.limpiarButtonText}>
              Limpiar Todos ({localesExcluidos.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* Lista de locales excluidos */}
        {cargando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando locales excluidos...</Text>
          </View>
        ) : localesFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="checkmark.circle.fill" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>
              {busqueda || filtroMotivo ? 'Sin resultados' : 'Sin locales excluidos'}
            </Text>
            <Text style={styles.emptyText}>
              {busqueda || filtroMotivo 
                ? 'No se encontraron locales con los filtros aplicados'
                : 'No hay locales excluidos en este momento'}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.listaContainer} showsVerticalScrollIndicator={false}>
            {localesFiltrados.map(local => (
              <View key={local.id} style={styles.localCard}>
                <View style={styles.localHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.localNombre}>{local.nombre}</Text>
                    {local.direccion && (
                      <Text style={styles.localDireccion}>📍 {local.direccion}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => eliminarExclusion(local.id, local.nombre)}
                  >
                    <IconSymbol name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.localInfo}>
                  <View style={[styles.motivoBadge, { backgroundColor: getColorMotivo(local.motivo_exclusion) + '20' }]}>
                    <IconSymbol 
                      name={getIconoMotivo(local.motivo_exclusion)} 
                      size={16} 
                      color={getColorMotivo(local.motivo_exclusion)} 
                    />
                    <Text style={[styles.motivoText, { color: getColorMotivo(local.motivo_exclusion) }]}>
                      {local.motivo_exclusion}
                    </Text>
                  </View>
                </View>

                {local.descripcion_exclusion && (
                  <Text style={styles.descripcionExclusion}>
                    {local.descripcion_exclusion}
                  </Text>
                )}

                <View style={styles.localFooter}>
                  {local.osm_id && (
                    <Text style={styles.localMeta}>🗺️ OSM: {local.osm_id}</Text>
                  )}
                  {local.google_place_id && (
                    <Text style={styles.localMeta}>📍 Google: {local.google_place_id}</Text>
                  )}
                  <Text style={styles.localFecha}>
                    {new Date(local.fecha_exclusion).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...commonStyles.shadow,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoBox: {
    borderRadius: 12,
    padding: 12,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    ...commonStyles.shadow,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  filtrosContainer: {
    marginBottom: 12,
  },
  filtroChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtroChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtroChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  filtroChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  limpiarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  limpiarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  listaContainer: {
    flex: 1,
  },
  localCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...commonStyles.shadow,
  },
  localHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  localNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  localDireccion: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
  },
  localInfo: {
    marginBottom: 8,
  },
  motivoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  motivoText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  descripcionExclusion: {
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  localFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 8,
  },
  localMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  localFecha: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
