
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';

interface Tag {
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

interface TagPendingNotificationProps {
  tag: Tag;
  onUpdate: () => void;
}

/**
 * ✅ TAG PENDING NOTIFICATION COMPONENT v1.0
 * 
 * Features:
 * - Shows pending tag notification
 * - Accept/Reject buttons
 * - Shows post preview
 * - Updates tag status in database
 */

export default function TagPendingNotification({
  tag,
  onUpdate,
}: TagPendingNotificationProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('post_tags')
        .update({ 
          estado: 'aceptado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tag.id);

      if (error) throw error;

      Alert.alert('Éxito', 'Has aceptado la etiqueta');
      onUpdate();
    } catch (error) {
      console.error('[TagPendingNotification] Error accepting tag:', error);
      Alert.alert('Error', 'No se pudo aceptar la etiqueta');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('post_tags')
        .update({ 
          estado: 'rechazado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tag.id);

      if (error) throw error;

      Alert.alert('Rechazado', 'Has rechazado la etiqueta');
      onUpdate();
    } catch (error) {
      console.error('[TagPendingNotification] Error rejecting tag:', error);
      Alert.alert('Error', 'No se pudo rechazar la etiqueta');
    } finally {
      setProcessing(false);
    }
  };

  const postImage = tag.post?.imagenes?.[0] || tag.post?.imagen;
  const authorName = tag.post?.autor?.username || tag.post?.autor?.nombre || 'Usuario';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {tag.post?.autor?.avatar ? (
            <Image source={{ uri: tag.post.autor.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={16}
                color={colors.headerText}
              />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.tagText}>te ha etiquetado en una publicación</Text>
          </View>
        </View>
        {postImage && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/social/post', params: { id: tag.post_id } })}
            activeOpacity={0.8}
          >
            <Image source={{ uri: postImage }} style={styles.postThumbnail} />
          </TouchableOpacity>
        )}
      </View>

      {processing ? (
        <View style={styles.actionsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check_circle"
              size={18}
              color={colors.headerText}
            />
            <Text style={styles.acceptButtonText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={18}
              color={colors.text}
            />
            <Text style={styles.rejectButtonText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  postThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionsLoading: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headerText,
  },
  rejectButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});
