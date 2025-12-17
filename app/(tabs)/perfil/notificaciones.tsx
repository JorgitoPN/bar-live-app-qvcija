
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import NotificacionItem from '@/components/perfil/NotificacionItem';
import TagPendingNotification from '@/components/social/TagPendingNotification';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  imagen_url?: string;
  usuario_origen_id?: string;
  local_origen_id?: string;
  post_id?: string;
  comentario_id?: string;
  leida: boolean;
  created_at: string;
}

interface PendingTag {
  id: string;
  post_id: string;
  usuario_id?: string;
  local_id?: string;
  tipo: 'usuario' | 'local';
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  created_at: string;
  post?: {
    imagenes?: string[];
    imagen?: string;
    contenido?: string;
    autor?: {
      nombre: string;
      username?: string;
      avatar?: string;
    };
  };
}

/**
 * ✅ NOTIFICATIONS PAGE v2.0 - WITH TAG REQUESTS
 * 
 * Features:
 * - Shows regular notifications
 * - Shows pending tag requests at the top
 * - Accept/Reject tag functionality
 * - Real-time updates
 */

export default function NotificacionesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [pendingTags, setPendingTags] = useState<PendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarNotificaciones = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load regular notifications
      const { data: notifData, error: notifError } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifError) throw notifError;

      setNotificaciones(notifData || []);

      // ✅ NEW: Load pending tag requests
      const { data: tagsData, error: tagsError } = await supabase
        .from('post_tags')
        .select(`
          *,
          post:posts(
            imagenes,
            imagen,
            contenido,
            autor:usuarios!posts_autor_id_fkey(nombre, username, avatar)
          )
        `)
        .eq('usuario_id', user.id)
        .eq('tipo', 'usuario')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false });

      if (tagsError) {
        console.error('[Notificaciones] Error loading pending tags:', tagsError);
      } else {
        console.log('[Notificaciones] 🏷️ Loaded pending tags:', tagsData?.length || 0);
        setPendingTags(tagsData || []);
      }
    } catch (error) {
      console.error('[Notificaciones] Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      cargarNotificaciones();
    }
  }, [user, cargarNotificaciones]);

  // ✅ Real-time subscriptions for tag updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('tag-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_tags',
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          console.log('[Notificaciones] 🔄 Tag update detected, reloading...');
          cargarNotificaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, cargarNotificaciones]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarNotificaciones();
  };

  const marcarTodasComoLeidas = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      if (error) throw error;

      cargarNotificaciones();
    } catch (error) {
      console.error('[Notificaciones] Error marcando como leídas:', error);
    }
  };

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={commonStyles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Notificaciones</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Inicia sesión para ver tus notificaciones</Text>
        </View>
      </View>
    );
  }

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Notificaciones</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={marcarTodasComoLeidas} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Marcar todas</Text>
            </TouchableOpacity>
          )}
          {unreadCount === 0 && <View style={{ width: 40 }} />}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* ✅ NEW: Pending tag requests section */}
          {pendingTags.length > 0 && (
            <View style={styles.pendingTagsSection}>
              <View style={styles.sectionHeader}>
                <IconSymbol
                  ios_icon_name="person.crop.circle.badge.checkmark"
                  android_material_icon_name="person_add"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>Solicitudes de etiqueta</Text>
              </View>
              {pendingTags.map((tag) => (
                <TagPendingNotification
                  key={tag.id}
                  tag={tag}
                  onUpdate={cargarNotificaciones}
                />
              ))}
            </View>
          )}

          {/* Regular notifications */}
          {notificaciones.length > 0 ? (
            <View style={styles.notificacionesSection}>
              {pendingTags.length > 0 && (
                <View style={styles.sectionHeader}>
                  <IconSymbol
                    ios_icon_name="bell.fill"
                    android_material_icon_name="notifications"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Notificaciones</Text>
                </View>
              )}
              {notificaciones.map((notif) => (
                <NotificacionItem
                  key={notif.id}
                  notificacion={notif}
                  onPress={() => {
                    // Mark as read
                    supabase
                      .from('notificaciones')
                      .update({ leida: true, leida_at: new Date().toISOString() })
                      .eq('id', notif.id)
                      .then(() => cargarNotificaciones());

                    // Navigate based on type
                    if (notif.post_id) {
                      router.push({ pathname: '/social/post', params: { id: notif.post_id } });
                    } else if (notif.usuario_origen_id) {
                      router.push({ pathname: '/perfil/usuario', params: { userId: notif.usuario_origen_id } });
                    }
                  }}
                />
              ))}
            </View>
          ) : pendingTags.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol ios_icon_name="bell" android_material_icon_name="notifications_none" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No tienes notificaciones</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingTagsSection: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 8,
    borderBottomColor: colors.cardBorder,
  },
  notificacionesSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
