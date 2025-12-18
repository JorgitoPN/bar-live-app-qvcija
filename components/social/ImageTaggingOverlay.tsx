
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import TaggingModalV5, { TaggableUser } from './TaggingModalV5';

interface ImageTaggingOverlayProps {
  postId: string;
  imageIndex: number;
  imageWidth: number;
  imageHeight: number;
  onTagAdded: () => void;
}

/**
 * ✅ IMAGE TAGGING OVERLAY v3.0 - DIRECT SEARCH MODAL
 * 
 * Features:
 * - ✅ NO NEED to tap specific point on image
 * - ✅ Opens search modal directly when entering tagging mode
 * - ✅ Dismissable info message
 * - ✅ Exit tagging mode button
 */

export default function ImageTaggingOverlay({
  postId,
  imageIndex,
  imageWidth,
  imageHeight,
  onTagAdded,
}: ImageTaggingOverlayProps) {
  const { user } = useAuth();
  const [showTagModal, setShowTagModal] = useState(true); // ✅ Open immediately
  const [alreadyTagged, setAlreadyTagged] = useState<TaggableUser[]>([]);
  const [showMessage, setShowMessage] = useState(true);

  const loadAlreadyTagged = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('post_id', postId)
        .eq('imagen_index', imageIndex || 0);

      if (error) {
        console.error('[ImageTaggingOverlay] Error loading tags:', error);
        return;
      }

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

      setAlreadyTagged(tags);
    } catch (error) {
      console.error('[ImageTaggingOverlay] Error:', error);
    }
  }, [postId, imageIndex]);

  useEffect(() => {
    loadAlreadyTagged();
  }, [loadAlreadyTagged]);

  const handleSelectUser = async (selectedUser: TaggableUser) => {
    if (!user) return;

    try {
      console.log('[ImageTaggingOverlay] Creating tag:', {
        postId,
        selectedUser,
        imageIndex,
      });

      const tagData: any = {
        post_id: postId,
        tipo: selectedUser.tipo,
        position_x: 0.5, // ✅ Default center position
        position_y: 0.5,
        imagen_index: imageIndex,
        estado: 'pendiente',
        tagged_by_user_id: user.id,
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

      console.log('[ImageTaggingOverlay] ✅ Tag created and notification sent');
      
      setShowTagModal(false);
      onTagAdded();
      
      Alert.alert(
        'Etiqueta creada',
        `Se ha enviado una notificación a ${selectedUser.nombre}. La etiqueta será visible cuando la acepte.`
      );
    } catch (error) {
      console.error('[ImageTaggingOverlay] Error creating tag:', error);
      Alert.alert('Error', 'No se pudo crear la etiqueta');
    }
  };

  return (
    <>
      <View style={styles.overlay}>
        {/* ✅ NEW: Dismissable info message */}
        {showMessage && (
          <View style={styles.messageContainer}>
            <View style={styles.messageBanner}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.messageText}>
                Busca y selecciona personas o locales para etiquetar
              </Text>
              <TouchableOpacity
                onPress={() => setShowMessage(false)}
                style={styles.dismissButton}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.headerText}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ✅ NEW: Exit tagging mode button */}
        <TouchableOpacity
          style={styles.exitButton}
          onPress={onTagAdded}
          activeOpacity={0.7}
        >
          <View style={styles.exitButtonContent}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={20}
              color={colors.headerText}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* ✅ UPDATED: Modal opens directly */}
      <TaggingModalV5
        visible={showTagModal}
        onClose={() => {
          setShowTagModal(false);
          onTagAdded(); // Exit tagging mode when modal closes
        }}
        onSelectUser={handleSelectUser}
        alreadyTagged={alreadyTagged}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  messageContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: colors.headerText,
    fontWeight: '600',
    lineHeight: 18,
  },
  dismissButton: {
    padding: 4,
  },
  // ✅ NEW: Exit tagging mode button
  exitButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  exitButtonContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
