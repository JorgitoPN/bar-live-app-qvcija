
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import TaggingModalV5, { TaggableUser } from '@/components/social/TaggingModalV5';

/**
 * ✅ GESTIONAR ETIQUETAS FULL SCREEN PAGE v317.0
 * 
 * NEW IMPLEMENTATION v317.0:
 * - ✅ Full-screen page instead of modal
 * - ✅ Uses Stack navigation with back button
 * - ✅ Proper header with gradient
 * - ✅ All functionality from tag management modal preserved
 * - ✅ Better UX with full-screen real estate
 * - ✅ Add and remove tags functionality
 */

export default function GestionarEtiquetasScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const postId = params.postId as string;

  const { user } = useAuth();
  
  const [existingTags, setExistingTags] = useState<TaggableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);

  const loadExistingTags = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[GestionarEtiquetas v317.0] 🔄 Loading tags for post:', postId);

      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('post_id', postId);

      if (error) throw error;

      const tags: TaggableUser[] = [];
      
      if (data) {
        data.forEach(tag => {
          if (tag.tipo === 'usuario' && tag.usuario) {
            tags.push({
              id: tag.usuario.id,
              nombre: tag.usuario.nombre,
              username: tag.usuario.username || tag.usuario.nombre,
              avatar: tag.usuario.avatar,
              tipo: 'usuario',
            });
          } else if (tag.tipo === 'local' && tag.local) {
            tags.push({
              id: tag.local.id,
              nombre: tag.local.nombre,
              username: tag.local.nombre,
              avatar: tag.local.imagen_url,
              tipo: 'local',
            });
          }
        });
      }

      console.log('[GestionarEtiquetas v317.0] ✅ Loaded', tags.length, 'tags');
      setExistingTags(tags);
    } catch (error) {
      console.error('[GestionarEtiquetas v317.0] Error loading tags:', error);
      Alert.alert('Error', 'No se pudieron cargar las etiquetas');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      loadExistingTags();
    }
  }, [postId, loadExistingTags]);

  const handleRemoveTag = useCallback(async (taggedUser: TaggableUser) => {
    if (!postId) return;

    Alert.alert(
      'Eliminar etiqueta',
      `¿Estás seguro de que quieres eliminar la etiqueta de ${taggedUser.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[GestionarEtiquetas v317.0] 🗑️ Removing tag:', taggedUser.id);

              const { error } = await supabase
                .from('post_tags')
                .delete()
                .eq('post_id', postId)
                .eq(taggedUser.tipo === 'usuario' ? 'usuario_id' : 'local_id', taggedUser.id);

              if (error) throw error;

              console.log('[GestionarEtiquetas v317.0] ✅ Tag removed successfully');
              setExistingTags(prev => prev.filter(t => !(t.id === taggedUser.id && t.tipo === taggedUser.tipo)));
            } catch (error) {
              console.error('[GestionarEtiquetas v317.0] Error removing tag:', error);
              Alert.alert('Error', 'No se pudo eliminar la etiqueta');
            }
          },
        },
      ]
    );
  }, [postId]);

  const handleAddNewTag = useCallback(async (selectedUser: TaggableUser) => {
    if (!user || !postId) return;

    try {
      console.log('[GestionarEtiquetas v317.0] ➕ Adding new tag:', selectedUser.id);

      const tagData: any = {
        post_id: postId,
        tipo: selectedUser.tipo,
        estado: 'pendiente',
        tagged_by_user_id: user.id,
        imagen_index: 0,
        position_x: 0.5,
        position_y: 0.5,
      };

      if (selectedUser.tipo === 'usuario') {
        tagData.usuario_id = selectedUser.id;
      } else {
        tagData.local_id = selectedUser.id;
      }

      const { error: tagError } = await supabase
        .from('post_tags')
        .insert(tagData);

      if (tagError) throw tagError;

      // Send notification
      const notificationData: any = {
        tipo: 'mencion',
        titulo: 'Te han etiquetado',
        mensaje: `${user.nombre} te ha etiquetado en una publicación`,
        usuario_origen_id: user.id,
        post_id: postId,
      };

      if (selectedUser.tipo === 'usuario') {
        notificationData.usuario_id = selectedUser.id;
        await supabase.from('notificaciones').insert(notificationData);
      } else {
        const { data: owners } = await supabase
          .from('propietarios_locales')
          .select('propietario_id')
          .eq('local_id', selectedUser.id)
          .eq('activo', true);

        if (owners && owners.length > 0) {
          const notifications = owners.map(owner => ({
            ...notificationData,
            usuario_id: owner.propietario_id,
            local_origen_id: selectedUser.id,
          }));

          await supabase.from('notificaciones').insert(notifications);
        }
      }

      console.log('[GestionarEtiquetas v317.0] ✅ Tag added successfully');
      loadExistingTags();
    } catch (error) {
      console.error('[GestionarEtiquetas v317.0] Error adding tag:', error);
      Alert.alert('Error', 'No se pudo añadir la etiqueta');
    }
  }, [user, postId, loadExistingTags]);

  const renderTag = useCallback(({ item }: { item: TaggableUser }) => (
    <View style={styles.tagItem}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.tagAvatar} />
      ) : (
        <View style={[styles.tagAvatar, styles.tagAvatarPlaceholder]}>
          <IconSymbol 
            ios_icon_name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
            android_material_icon_name={item.tipo === 'local' ? 'business' : 'person'}
            size={20} 
            color={colors.textSecondary} 
          />
        </View>
      )}
      <View style={styles.tagInfo}>
        <Text style={[styles.tagName, { fontSize: scaleFontSize(15) }]}>{item.nombre}</Text>
        <Text style={[styles.tagType, { fontSize: scaleFontSize(13) }]}>
          {item.tipo === 'local' ? 'Local' : `@${item.username}`}
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => handleRemoveTag(item)}
        style={styles.removeButton}
      >
        <IconSymbol 
          ios_icon_name="trash" 
          android_material_icon_name="delete" 
          size={20} 
          color="#EF4444" 
        />
      </TouchableOpacity>
    </View>
  ), [handleRemoveTag]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol 
        ios_icon_name="person.crop.circle.badge.plus" 
        android_material_icon_name="person_add" 
        size={Platform.OS === 'android' ? scaleIconSize(64) : 64} 
        color={colors.textSecondary} 
      />
      <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No hay etiquetas</Text>
      <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
        Añade etiquetas para mencionar usuarios o locales en esta publicación
      </Text>
    </View>
  );

  const backIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
        
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={backIconSize} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(18) }]}>Gestionar etiquetas</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <FlatList
              data={existingTags}
              renderItem={renderTag}
              keyExtractor={(item) => `${item.id}-${item.tipo}`}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmpty}
            />

            <View style={styles.addButtonContainer}>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowTagModal(true)}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.addButtonGradient}
                >
                  <IconSymbol 
                    ios_icon_name="plus.circle.fill" 
                    android_material_icon_name="add_circle" 
                    size={20} 
                    color={colors.white} 
                  />
                  <Text style={[styles.addButtonText, { fontSize: scaleFontSize(15) }]}>Añadir etiqueta</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TaggingModalV5
          visible={showTagModal}
          onClose={() => setShowTagModal(false)}
          onSelectUser={handleAddNewTag}
          alreadyTagged={existingTags}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
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
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flexGrow: 1,
    paddingVertical: 8,
    paddingBottom: 100,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tagAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  tagAvatarPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  tagType: {
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  addButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
});
