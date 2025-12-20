
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
  Alert,
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
  leida_at?: string;
  usuario_origen?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

interface PendingTag {
  id: string;
  post_id: string;
  usuario_id?: string;
  local_id?: string;
  tipo: 'usuario' | 'local';
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  created_at: string;
  tagged_by_user_id?: string;
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

      const { data: notifData, error: notifError } = await supabase
        .from('notificaciones')
        .select(`
          *,
          usuario_origen:usuarios!notificaciones_usuario_origen_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifError) throw notifError;

      console.log('[Notificaciones] ✅ Loaded', notifData?.length || 0, 'notifications');
      setNotificaciones(notifData || []);

      const { data: tagsData, error: tagsError } = await supabase
        .from('post_tags')
        .select(`
          *,
          post:posts(
            imagenes,
            imagen,
            contenido,
            autor_id
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
        
        if (tagsData && tagsData.length > 0) {
          const enrichedTags = await Promise.all(
            tagsData.map(async (tag) => {
              if (tag.tagged_by_user_id) {
                const { data: authorData } = await supabase
                  .from('usuarios')
                  .select('nombre, username, avatar')
                  .eq('id', tag.tagged_by_user_id)
                  .single();

                return {
                  ...tag,
                  post: {
                    ...tag.post,
                    autor: authorData || undefined,
                  },
                };
              }
              return tag;
            })
          );

          setPendingTags(enrichedTags);
        } else {
          setPendingTags([]);
        }
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

  // ✅ FIXED: Real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          console.log('[Notificaciones] 🔄 Notification update detected, reloading...');
          cargarNotificaciones();
        }
      )
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

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return;

    Alert.alert(
      'Eliminar notificación',
      '¿Estás seguro de que quieres eliminar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notificaciones')
                .delete()
                .eq('id', notificationId)
                .eq('usuario_id', user.id);

              if (error) throw error;

              setNotificaciones(prev => prev.filter(n => n.id !== notificationId));
            } catch (error) {
              console.error('[Notificaciones] Error deleting notification:', error);
              Alert.alert('Error', 'No se pudo eliminar la notificación');
            }
          },
        },
      ]
    );
  };

  // ✅ FIXED: Proper notification redirection with all content types
  const handleNotificationPress = async (notif: Notificacion) => {
    try {
      // ✅ FIXED: Mark as read with leida_at timestamp (persistent)
      await supabase
        .from('notificaciones')
        .update({ leida: true, leida_at: new Date().toISOString() })
        .eq('id', notif.id);

      // Update local state immediately
      setNotificaciones(prev => 
        prev.map(n => 
          n.id === notif.id 
            ? { ...n, leida: true, leida_at: new Date().toISOString() }
            : n
        )
      );

      // ✅ FIXED: Comprehensive redirection logic
      console.log('[Notificaciones] 🔍 Processing notification:', {
        tipo: notif.tipo,
        post_id: notif.post_id,
        comentario_id: notif.comentario_id,
        local_origen_id: notif.local_origen_id,
        usuario_origen_id: notif.usuario_origen_id,
      });

      // Priority 1: Post-related notifications
      if (notif.post_id) {
        console.log('[Notificaciones] ✅ Redirecting to post:', notif.post_id);
        router.push({ pathname: '/social/post', params: { id: notif.post_id } });
        return;
      }

      // Priority 2: Comment-related notifications
      if (notif.comentario_id) {
        console.log('[Notificaciones] ✅ Redirecting to comment in post');
        const { data: comentario } = await supabase
          .from('comentarios')
          .select('post_id')
          .eq('id', notif.comentario_id)
          .single();
        
        if (comentario?.post_id) {
          router.push({ pathname: '/social/post', params: { id: comentario.post_id } });
          return;
        }
      }

      // Priority 3: Message notifications
      if (notif.tipo === 'mensaje_privado') {
        console.log('[Notificaciones] ✅ Redirecting to messages');
        
        // If there's a local_origen_id, it's a local-specific chat
        if (notif.local_origen_id) {
          router.push({ 
            pathname: '/chat/conversacion', 
            params: { localId: notif.local_origen_id } 
          });
        } else if (notif.usuario_origen_id) {
          router.push({ 
            pathname: '/chat/conversacion', 
            params: { userId: notif.usuario_origen_id } 
          });
        } else {
          // Fallback to chats list
          router.push('/(tabs)/perfil/chats');
        }
        return;
      }

      // Priority 4: Local-related notifications
      if (notif.local_origen_id) {
        console.log('[Notificaciones] ✅ Redirecting to local:', notif.local_origen_id);
        router.push({ pathname: '/perfil/local', params: { localId: notif.local_origen_id } });
        return;
      }

      // Priority 5: User profile notifications
      if (notif.usuario_origen_id) {
        console.log('[Notificaciones] ✅ Redirecting to user profile:', notif.usuario_origen_id);
        if (notif.usuario_origen_id === user.id) {
          router.push('/(tabs)/perfil');
        } else {
          router.push({ pathname: '/perfil/usuario', params: { userId: notif.usuario_origen_id } });
        }
        return;
      }

      // Fallback: Stay on notifications page
      console.log('[Notificaciones] ⚠️ No specific redirect target, staying on notifications');
    } catch (error) {
      console.error('[Notificaciones] Error handling notification press:', error);
      Alert.alert('Error', 'No se pudo abrir la notificación');
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
                  onPress={() => handleNotificationPress(notif)}
                  onDelete={() => handleDeleteNotification(notif.id)}
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
