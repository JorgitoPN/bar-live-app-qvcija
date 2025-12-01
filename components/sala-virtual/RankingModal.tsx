
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

interface RankingUser {
  id: string;
  usuario_id: string;
  mensajes_enviados: number;
  emoticones_enviados: number;
  interacciones_totales: number;
  puntos_actividad: number;
  usuario: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

interface RankingModalProps {
  visible: boolean;
  onClose: () => void;
  localId: string;
}

export function RankingModal({ visible, onClose, localId }: RankingModalProps) {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensual'>('diario');

  // ✅ Fixed: Added loadRanking to dependencies
  useEffect(() => {
    if (visible) {
      loadRanking();
    }
  }, [visible, period, loadRanking]);

  const loadRanking = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sala_virtual_ranking')
        .select(`
          *,
          usuario:usuarios!sala_virtual_ranking_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('local_id', localId)
        .eq('periodo', period)
        .order('puntos_actividad', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[Ranking] Error loading ranking:', error);
        return;
      }

      setRanking(data || []);
    } catch (error) {
      console.error('[Ranking] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0:
        return ['#FFD700', '#FFA500']; // Gold
      case 1:
        return ['#C0C0C0', '#A8A8A8']; // Silver
      case 2:
        return ['#CD7F32', '#B87333']; // Bronze
      default:
        return [colors.textSecondary, colors.textSecondary];
    }
  };

  const renderRankingItem = ({ item, index }: { item: RankingUser; index: number }) => {
    const isTopThree = index < 3;
    const medalColors = getMedalColor(index);

    return (
      <View style={[styles.rankingItem, isTopThree && styles.rankingItemTopThree]}>
        <View style={styles.rankingPosition}>
          {isTopThree ? (
            <LinearGradient
              colors={medalColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.medalCircle}
            >
              <Text style={styles.medalText}>{index + 1}</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.positionText}>{index + 1}</Text>
          )}
        </View>

        <View style={styles.rankingUserInfo}>
          {item.usuario.avatar ? (
            <Image source={{ uri: item.usuario.avatar }} style={styles.rankingAvatar} />
          ) : (
            <View style={styles.rankingAvatarPlaceholder}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={20}
                color={colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.rankingDetails}>
            <Text style={styles.rankingName} numberOfLines={1}>
              {item.usuario.nombre}
            </Text>
            {item.usuario.username && (
              <Text style={styles.rankingUsername} numberOfLines={1}>
                @{item.usuario.username}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rankingStats}>
          <View style={styles.rankingStat}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.rankingStatValue}>{item.puntos_actividad}</Text>
          </View>
          <Text style={styles.rankingStatLabel}>
            {item.interacciones_totales} interacciones
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ranking de Actividad</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.periodSelector}>
            {(['diario', 'semanal', 'mensual'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodButton,
                  period === p && styles.periodButtonActive,
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    period === p && styles.periodButtonTextActive,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={ranking}
              renderItem={renderRankingItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.rankingList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <IconSymbol
                    ios_icon_name="chart.bar"
                    android_material_icon_name="leaderboard"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.emptyText}>No hay datos de ranking</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
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
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  rankingList: {
    padding: 16,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  rankingItemTopThree: {
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  rankingPosition: {
    width: 40,
    alignItems: 'center',
  },
  medalCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  positionText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rankingUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  rankingAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingDetails: {
    flex: 1,
  },
  rankingName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  rankingUsername: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rankingStats: {
    alignItems: 'flex-end',
  },
  rankingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankingStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  rankingStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
