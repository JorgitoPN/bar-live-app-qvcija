
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';

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
  const router = useRouter();
  const [isExpired, setIsExpired] = useState(!screenshotUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

  // ✅ NEW: Real-time subscription to detect when momento expires
  useEffect(() => {
    if (!momentoId) return;

    const subscription = supabase
      .channel(`momento-expiration-${momentoId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'momentos',
          filter: `id=eq.${momentoId}`,
        },
        () => {
          console.log('[MomentoMessageBubble] 🔄 Momento deleted, marking as expired');
          setIsExpired(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [momentoId]);

  const handlePress = () => {
    if (isExpired || !screenshotUrl) {
      return;
    }

    if (onPress) {
      onPress();
    } else {
      // ✅ FIXED: Open momento viewer when clicking on screenshot
      router.push({
        pathname: '/social/post',
        params: { momentoId },
      });
    }
  };

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
        <Text style={styles.expiredText}>El momento ya no está disponible.</Text>
        <Text style={styles.expiredSubtext}>
          Este momento ha expirado después de 24 horas
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
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
          <View style={styles.tapToViewBadge}>
            <IconSymbol
              ios_icon_name="hand.tap.fill"
              android_material_icon_name="touch_app"
              size={14}
              color="#fff"
            />
            <Text style={styles.tapToViewText}>Toca para ver</Text>
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
    justifyContent: 'space-between',
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
  tapToViewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
  },
  tapToViewText: {
    fontSize: 12,
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
