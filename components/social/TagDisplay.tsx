
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Tag {
  id: string;
  usuario_id?: string;
  local_id?: string;
  tipo: 'usuario' | 'local';
  position_x: number;
  position_y: number;
  imagen_index: number;
  usuario?: {
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    nombre: string;
    imagen_url?: string;
  };
}

interface TagDisplayProps {
  postId: string;
  imageIndex: number;
  imageWidth: number;
  imageHeight: number;
  visible: boolean;
}

/**
 * ✅ TAG DISPLAY COMPONENT v1.0
 * 
 * Features:
 * - Shows accepted tags on post images
 * - Animated appearance
 * - Tap to navigate to tagged profile
 * - Visual differentiation between users and locals
 * - Only shows tags for current image index
 */

export default function TagDisplay({
  postId,
  imageIndex,
  imageWidth,
  imageHeight,
  visible,
}: TagDisplayProps) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadTags();
  }, [postId]);

  useEffect(() => {
    if (visible) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(nombre, username, avatar),
          local:locales(nombre, imagen_url)
        `)
        .eq('post_id', postId)
        .eq('estado', 'aceptado');

      if (error) {
        console.error('[TagDisplay] Error loading tags:', error);
        return;
      }

      console.log('[TagDisplay] Loaded tags:', data?.length || 0);
      setTags(data || []);
    } catch (error) {
      console.error('[TagDisplay] Error:', error);
    }
  };

  const handleTagPress = (tag: Tag) => {
    if (tag.tipo === 'usuario' && tag.usuario_id) {
      router.push({
        pathname: '/perfil/usuario',
        params: { userId: tag.usuario_id },
      });
    } else if (tag.tipo === 'local' && tag.local_id) {
      router.push({
        pathname: '/perfil/local',
        params: { localId: tag.local_id },
      });
    }
  };

  const currentImageTags = tags.filter(tag => tag.imagen_index === imageIndex);

  if (!visible || currentImageTags.length === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{
            scale: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            }),
          }],
        },
      ]}
      pointerEvents="box-none"
    >
      {currentImageTags.map((tag) => {
        const displayName = tag.tipo === 'local' && tag.local
          ? tag.local.nombre
          : tag.usuario?.username || tag.usuario?.nombre || 'Usuario';

        const displayAvatar = tag.tipo === 'local' && tag.local
          ? tag.local.imagen_url
          : tag.usuario?.avatar;

        // Calculate position (0-1 range to pixels)
        const left = tag.position_x * imageWidth;
        const top = tag.position_y * imageHeight;

        return (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.tag,
              {
                left: left - 60, // Center the tag
                top: top - 20,
              },
            ]}
            onPress={() => handleTagPress(tag)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.tagContent,
              tag.tipo === 'local' && styles.tagContentLocal,
            ]}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.tagAvatar} />
              ) : (
                <View style={[styles.tagAvatar, styles.avatarPlaceholder]}>
                  <IconSymbol
                    ios_icon_name={tag.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                    android_material_icon_name={tag.tipo === 'local' ? 'business' : 'person'}
                    size={12}
                    color={colors.headerText}
                  />
                </View>
              )}
              <Text style={styles.tagName} numberOfLines={1}>
                {displayName}
              </Text>
              {tag.tipo === 'local' && (
                <View style={styles.localBadge}>
                  <IconSymbol
                    ios_icon_name="building.2.fill"
                    android_material_icon_name="business"
                    size={10}
                    color="#F59E0B"
                  />
                </View>
              )}
            </View>
            {/* Pointer */}
            <View style={[
              styles.tagPointer,
              tag.tipo === 'local' && styles.tagPointerLocal,
            ]} />
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  tag: {
    position: 'absolute',
    alignItems: 'center',
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    maxWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tagContentLocal: {
    backgroundColor: 'rgba(245, 158, 11, 0.95)', // Orange for locals
  },
  tagAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
  },
  localBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.85)',
    marginTop: -1,
  },
  tagPointerLocal: {
    borderTopColor: 'rgba(245, 158, 11, 0.95)',
  },
});
