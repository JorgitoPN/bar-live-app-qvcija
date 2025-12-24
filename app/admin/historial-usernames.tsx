
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UsernameChange {
  id: string;
  entity_type: 'user' | 'local';
  entity_id: string;
  old_username: string | null;
  new_username: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
  changed_by_name?: string;
  entity_name?: string;
}

export default function HistorialUsernamesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<UsernameChange[]>([]);
  const [filter, setFilter] = useState<'all' | 'user' | 'local'>('all');

  useEffect(() => {
    loadHistory();
  }, [filter]);

  const loadHistory = async () => {
    try {
      setLoading(true);

      // Check if user is admin
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol_app')
        .eq('id', user?.id)
        .single();

      if (userData?.rol_app !== 'admin') {
        Alert.alert('Error', 'No tienes permisos para ver esta página');
        router.back();
        return;
      }

      // Load username history
      let query = supabase
        .from('username_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('entity_type', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[HistorialUsernames] Error loading history:', error);
        Alert.alert('Error', 'No se pudo cargar el historial');
        return;
      }

      // Enrich with user and entity names
      const enrichedData = await Promise.all(
        (data || []).map(async (change) => {
          const enriched: UsernameChange = { ...change };

          // Get changed_by name
          if (change.changed_by) {
            const { data: changedByUser } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('id', change.changed_by)
              .single();
            
            if (changedByUser) {
              enriched.changed_by_name = changedByUser.nombre;
            }
          }

          // Get entity name
          if (change.entity_type === 'user') {
            const { data: entityUser } = await supabase
              .from('usuarios')
              .select('nombre')
              .eq('id', change.entity_id)
              .single();
            
            if (entityUser) {
              enriched.entity_name = entityUser.nombre;
            }
          } else if (change.entity_type === 'local') {
            const { data: entityLocal } = await supabase
              .from('locales')
              .select('nombre')
              .eq('id', change.entity_id)
              .single();
            
            if (entityLocal) {
              enriched.entity_name = entityLocal.nombre;
            }
          }

          return enriched;
        })
      );

      setHistory(enrichedData);
    } catch (error) {
      console.error('[HistorialUsernames] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEntityIcon = (type: 'user' | 'local') => {
    if (type === 'user') {
      return {
        ios: 'person.fill',
        android: 'person',
        color: colors.primary,
      };
    }
    return {
      ios: 'building.2.fill',
      android: 'store',
      color: colors.secondary,
    };
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.headerText}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Usernames</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'user' && styles.filterChipActive]}
          onPress={() => setFilter('user')}
        >
          <IconSymbol
            ios_icon_name="person.fill"
            android_material_icon_name="person"
            size={16}
            color={filter === 'user' ? '#fff' : colors.text}
          />
          <Text style={[styles.filterText, filter === 'user' && styles.filterTextActive]}>
            Usuarios
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'local' && styles.filterChipActive]}
          onPress={() => setFilter('local')}
        >
          <IconSymbol
            ios_icon_name="building.2.fill"
            android_material_icon_name="store"
            size={16}
            color={filter === 'local' ? '#fff' : colors.text}
          />
          <Text style={[styles.filterText, filter === 'local' && styles.filterTextActive]}>
            Locales
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="clock.arrow.circlepath"
            android_material_icon_name="history"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>No hay cambios registrados</Text>
          <Text style={styles.emptySubtext}>
            Los cambios de nombre de usuario aparecerán aquí
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {history.map((change) => {
            const entityIcon = getEntityIcon(change.entity_type);
            
            return (
              <View key={change.id} style={styles.changeCard}>
                <View style={styles.changeHeader}>
                  <View style={styles.entityBadge}>
                    <IconSymbol
                      ios_icon_name={entityIcon.ios}
                      android_material_icon_name={entityIcon.android}
                      size={16}
                      color={entityIcon.color}
                    />
                    <Text style={styles.entityType}>
                      {change.entity_type === 'user' ? 'Usuario' : 'Local'}
                    </Text>
                  </View>
                  <Text style={styles.changeDate}>{formatDate(change.created_at)}</Text>
                </View>

                {change.entity_name && (
                  <Text style={styles.entityName}>{change.entity_name}</Text>
                )}

                <View style={styles.usernameChange}>
                  {change.old_username ? (
                    <React.Fragment>
                      <View style={styles.usernameBox}>
                        <Text style={styles.usernameLabel}>Anterior:</Text>
                        <Text style={styles.usernameOld}>@{change.old_username}</Text>
                      </View>
                      <IconSymbol
                        ios_icon_name="arrow.right"
                        android_material_icon_name="arrow_forward"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </React.Fragment>
                  ) : (
                    <View style={styles.usernameBox}>
                      <Text style={styles.usernameLabel}>Asignado:</Text>
                    </View>
                  )}
                  <View style={styles.usernameBox}>
                    <Text style={styles.usernameLabel}>Nuevo:</Text>
                    <Text style={styles.usernameNew}>@{change.new_username}</Text>
                  </View>
                </View>

                {change.changed_by_name && (
                  <View style={styles.changeInfo}>
                    <IconSymbol
                      ios_icon_name="person.circle.fill"
                      android_material_icon_name="account_circle"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.changeInfoText}>
                      Cambiado por: {change.changed_by_name}
                    </Text>
                  </View>
                )}

                {change.change_reason && (
                  <View style={styles.changeInfo}>
                    <IconSymbol
                      ios_icon_name="info.circle.fill"
                      android_material_icon_name="info"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.changeInfoText}>{change.change_reason}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  placeholder: {
    width: 40,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  changeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  changeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
  },
  entityType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  changeDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  entityName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  usernameChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  usernameBox: {
    flex: 1,
  },
  usernameLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  usernameOld: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  usernameNew: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  changeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  changeInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
