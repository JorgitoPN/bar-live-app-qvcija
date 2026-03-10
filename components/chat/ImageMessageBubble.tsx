
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

type ShareMode = 'view_once' | 'allow_replay' | 'normal';

interface ImageMessageBubbleProps {
  messageId: string;
  imageUrl: string;
  shareMode: ShareMode;
  viewed: boolean;
  viewedAt?: string;
  isOwnMessage: boolean;
  onView: () => void;
  onDelete?: () => void;
}

export default function ImageMessageBubble({
  messageId,
  imageUrl,
  shareMode,
  viewed,
  viewedAt,
  isOwnMessage,
  onView,
  onDelete,
}: ImageMessageBubbleProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ✅ ATOMIC JSX: Calculate display text outside JSX
  const getModeText = () => {
    if (shareMode === 'view_once') return 'Ver una vez';
    if (shareMode === 'allow_replay') return 'Volver a ver';
    return '';
  };

  const getModeIcon = () => {
    if (shareMode === 'view_once') return 'visibility_off';
    if (shareMode === 'allow_replay') return 'replay';
    return 'image';
  };

  const handleView = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Mark as viewed in database
      if (!viewed && !isOwnMessage) {
        const { error } = await supabase
          .from('mensajes')
          .update({
            viewed: true,
            viewed_at: new Date().toISOString(),
          })
          .eq('id', messageId);

        if (error) {
          console.error('[ImageMessageBubble] Error marking as viewed:', error);
        }
      }

      onView();
    } catch (error) {
      console.error('[ImageMessageBubble] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (shareMode !== 'normal') {
      Alert.alert('No disponible', 'Esta imagen no se puede descargar');
      return;
    }

    try {
      setDownloading(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas dar permiso para guardar imágenes');
        return;
      }

      // Download image
      const filename = `barlive_${Date.now()}.jpg`;
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Download failed');
      }

      // Save to media library
      await MediaLibrary.createAssetAsync(downloadResult.uri);

      Alert.alert('Éxito', 'Imagen guardada en tu galería');
    } catch (error) {
      console.error('[ImageMessageBubble] Error downloading:', error);
      Alert.alert('Error', 'No se pudo descargar la imagen');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    if (shareMode !== 'normal') {
      Alert.alert('No disponible', 'Esta imagen no se puede compartir');
      return;
    }

    // TODO: Implement share to feed/momentos
    Alert.alert('Próximamente', 'Función de compartir en desarrollo');
  };

  // ✅ ATOMIC JSX: Calculate if image should be blurred
  const shouldBlur = !isOwnMessage && !viewed && (shareMode === 'view_once' || shareMode === 'allow_replay');

  // ✅ ATOMIC JSX: Calculate mode text
  const modeText = getModeText();
  const modeIcon = getModeIcon();

  return (
    <View style={[styles.container, isOwnMessage && styles.containerOwn]}>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={handleView}
        onLongPress={onDelete}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        {/* Image or Placeholder */}
        {shouldBlur ? (
          <View style={styles.blurredContainer}>
            <IconSymbol
              ios_icon_name={modeIcon}
              android_material_icon_name={modeIcon}
              size={scaleIconSize(48)}
              color={colors.headerText}
            />
            <Text style={[styles.blurredText, { fontSize: scaleFontSize(14) }]}>
              {modeText}
            </Text>
            <Text style={[styles.blurredSubtext, { fontSize: scaleFontSize(12) }]}>
              Toca para ver
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {/* Mode Badge */}
        {shareMode !== 'normal' && (
          <View style={[styles.modeBadge, isOwnMessage && styles.modeBadgeOwn]}>
            <IconSymbol
              ios_icon_name={modeIcon}
              android_material_icon_name={modeIcon}
              size={scaleIconSize(12)}
              color={colors.headerText}
            />
            <Text style={[styles.modeBadgeText, { fontSize: scaleFontSize(10) }]}>
              {modeText}
            </Text>
          </View>
        )}

        {/* Viewed Indicator */}
        {viewed && !isOwnMessage && shareMode === 'view_once' && (
          <View style={styles.viewedBadge}>
            <IconSymbol
              ios_icon_name="eye.fill"
              android_material_icon_name="visibility"
              size={scaleIconSize(12)}
              color={colors.headerText}
            />
            <Text style={[styles.viewedText, { fontSize: scaleFontSize(10) }]}>
              Vista
            </Text>
          </View>
        )}

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.headerText} />
          </View>
        )}
      </TouchableOpacity>

      {/* Action Buttons (only for normal mode) */}
      {shareMode === 'normal' && !isOwnMessage && viewed && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="arrow.down.circle"
                  android_material_icon_name="download"
                  size={scaleIconSize(16)}
                  color={colors.primary}
                />
                <Text style={[styles.actionText, { fontSize: scaleFontSize(12) }]}>
                  Descargar
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <IconSymbol
              ios_icon_name="square.and.arrow.up"
              android_material_icon_name="share"
              size={scaleIconSize(16)}
              color={colors.primary}
            />
            <Text style={[styles.actionText, { fontSize: scaleFontSize(12) }]}>
              Compartir
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  containerOwn: {
    alignSelf: 'flex-end',
  },
  imageContainer: {
    width: 250,
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  blurredContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  blurredText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  blurredSubtext: {
    color: colors.headerText,
    opacity: 0.8,
  },
  modeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  modeBadgeOwn: {
    left: 'auto',
    right: 8,
  },
  modeBadgeText: {
    color: colors.headerText,
    fontWeight: '600',
  },
  viewedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  viewedText: {
    color: colors.headerText,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
  },
  actionText: {
    color: colors.primary,
    fontWeight: '500',
  },
});
