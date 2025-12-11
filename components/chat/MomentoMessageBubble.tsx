
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface MomentoMessageBubbleProps {
  momentoId: string;
  screenshotUrl: string | null;
  mensaje: string;
  onPress?: () => void;
}

export default function MomentoMessageBubble({
  momentoId,
  screenshotUrl,
  mensaje,
  onPress,
}: MomentoMessageBubbleProps) {
  const [isExpired, setIsExpired] = useState(!screenshotUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if momento still exists
    const checkMomentoStatus = async () => {
      if (!momentoId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('momentos')
          .select('id, expires_at')
          .eq('id', momentoId)
          .single();

        if (error || !data) {
          setIsExpired(true);
          return;
        }

        // Check if expired
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        
        if (now > expiresAt) {
          setIsExpired(true);
        }
      } catch (error) {
        console.error('[MomentoMessageBubble] Error checking momento status:', error);
        setIsExpired(true);
      } finally {
        setLoading(false);
      }
    };

    checkMomentoStatus();
  }, [momentoId]);

  if (isExpired || !screenshotUrl) {
    return (
      <View style={styles.expiredContainer}>
        <View style={styles.expiredIconContainer}>
          <IconSymbol
            ios_icon_name="clock.badge.xmark"
            android_material_icon_name="schedule"
            size={32}
            color={colors.textSecondary}
          />
        </View>
        <Text style={styles.expiredText}>Momento ya no disponible.</Text>
        <Text style={styles.expiredSubtext}>
          Este momento ha expirado después de 24 horas
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.screenshotContainer}>
        <Image
          source={{ uri: screenshotUrl }}
          style={styles.screenshot}
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          <View style={styles.momentoLabel}>
            <IconSymbol
              ios_icon_name="bolt.fill"
              android_material_icon_name="flash_on"
              size={16}
              color="#fff"
            />
            <Text style={styles.momentoLabelText}>Momento</Text>
          </View>
        </View>
      </View>
      {mensaje && mensaje !== 'Respondió a tu Momento' && (
        <Text style={styles.mensaje}>{mensaje}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  screenshotContainer: {
    width: 200,
    height: 300,
    position: 'relative',
  },
  screenshot: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 12,
  },
  momentoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  momentoLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'System',
  },
  mensaje: {
    fontSize: 14,
    color: colors.text,
    padding: 12,
    fontFamily: 'System',
  },
  expiredContainer: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    gap: 12,
    maxWidth: 250,
  },
  expiredIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'System',
  },
  expiredSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'System',
    lineHeight: 18,
  },
});
