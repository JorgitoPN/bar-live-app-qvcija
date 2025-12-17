
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import TaggingModalV5, { TaggableUser } from './TaggingModalV5';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageTaggingOverlayProps {
  postId: string;
  imageIndex: number;
  imageWidth: number;
  imageHeight: number;
  onTagAdded: () => void;
}

/**
 * ✅ IMAGE TAGGING OVERLAY v1.0
 * 
 * Features:
 * - Tap on image to add tag at that position
 * - Opens user/local search modal
 * - Saves tag with position coordinates
 * - Sends notification to tagged profile
 */

export default function ImageTaggingOverlay({
  postId,
  imageIndex,
  imageWidth,
  imageHeight,
  onTagAdded,
}: ImageTaggingOverlayProps) {
  const { user } = useAuth();
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagPosition, setTagPosition] = useState<{ x: number; y: number } | null>(null);
  const [alreadyTagged, setAlreadyTagged] = useState<TaggableUser[]>([]);
  const [pulseAnim] = useState(new Animated.Value(1));

  const handleImagePress = (event: any) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para etiquetar');
      return;
    }

    const { locationX, locationY } = event.nativeEvent;
    
    // Convert to 0-1 range
    const normalizedX = locationX / imageWidth;
    const normalizedY = locationY / imageHeight;

    console.log('[ImageTaggingOverlay] Tag position:', { 
      x: normalizedX, 
      y: normalizedY,
      pixelX: locationX,
      pixelY: locationY,
    });

    setTagPosition({ x: normalizedX, y: normalizedY });
    loadAlreadyTagged();
    setShowTagModal(true);

    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadAlreadyTagged = async () => {
    try {
      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('post_id', postId)
        .eq('imagen_index', imageIndex);

      if (error) {
        console.error('[ImageTaggingOverlay] Error loading tags:', error);
        return;
      }

      const tagged: TaggableUser[] = [];
      
      data?.forEach(tag => {
        if (tag.tipo === 'usuario' && tag.usuario) {
          tagged.push({
            id: tag.usuario.id,
            nombre: tag.usuario.nombre,
            username: tag.usuario.username || tag.usuario.nombre,
            avatar: tag.usuario.avatar,
            tipo: 'usuario',
          });
        } else if (tag.tipo === 'local' && tag.local) {
          tagged.push({
            id: tag.local.id,
            nombre: tag.local.nombre,
            username: tag.local.nombre,
            avatar: tag.local.imagen_url,
            tipo: 'local',
          });
        }
      });

      setAlreadyTagged(tagged);
    } catch (error) {
      console.error('[ImageTaggingOverlay] Error:', error);
    }
  };

  const handleSelectUser = async (selectedUser: TaggableUser) => {
    if (!tagPosition || !user) return;

    try {
      console.log('[ImageTaggingOverlay] Creating tag:', {
        postId,
        selectedUser,
        position: tagPosition,
        imageIndex,
      });

      const tagData: any = {
        post_id: postId,
        tipo: selectedUser.tipo,
        position_x: tagPosition.x,
        position_y: tagPosition.y,
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
      } else {
        // For locals, send notification to all owners
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

      if (selectedUser.tipo === 'usuario') {
        await supabase.from('notificaciones').insert(notificationData);
      }

      console.log('[ImageTaggingOverlay] ✅ Tag created and notification sent');
      
      setShowTagModal(false);
      setTagPosition(null);
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
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleImagePress}
      >
        <View style={styles.hintContainer} pointerEvents="none">
          <IconSymbol
            ios_icon_name="person.crop.circle.badge.plus"
            android_material_icon_name="person_add"
            size={24}
            color="rgba(255, 255, 255, 0.8)"
          />
        </View>
      </TouchableOpacity>

      <TaggingModalV5
        visible={showTagModal}
        onClose={() => {
          setShowTagModal(false);
          setTagPosition(null);
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
  hintContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
});
