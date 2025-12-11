
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MiniAvatarWithMomentoProps {
  userId?: string;
  localId?: string;
  imageUrl?: string;
  size?: number;
  onPress?: () => void;
  showMomentoBorder?: boolean;
}

export default function MiniAvatarWithMomento({
  userId,
  localId,
  imageUrl,
  size = 40,
  onPress,
  showMomentoBorder = true,
}: MiniAvatarWithMomentoProps) {
  const { user } = useAuth();
  const [hasUnviewedMomentos, setHasUnviewedMomentos] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const BORDER_WIDTH = size * 0.075;
  const innerSize = size - BORDER_WIDTH * 2;

  const checkUnviewedMomentos = useCallback(async () => {
    if (!user) return;

    try {
      // Get momentos for this user/local
      const query = supabase
        .from('momentos')
        .select('id')
        .gt('expires_at', new Date().toISOString());

      if (userId) {
        query.eq('autor_id', userId).eq('tipo', 'usuario');
      } else if (localId) {
        query.eq('local_id', localId).eq('tipo', 'local');
      }

      const { data: momentosData } = await query;

      if (!momentosData || momentosData.length === 0) {
        setHasUnviewedMomentos(false);
        return;
      }

      // Check if user has viewed any of these momentos
      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', momentoIds);

      const viewedIds = new Set(viewsData?.map(v => v.momento_id) || []);
      const hasUnviewed = momentosData.some(m => !viewedIds.has(m.id));

      setHasUnviewedMomentos(hasUnviewed);
    } catch (error) {
      console.error('[MiniAvatarWithMomento] Error checking momentos:', error);
    }
  }, [user, userId, localId]);

  useEffect(() => {
    if (showMomentoBorder && (userId || localId)) {
      checkUnviewedMomentos();
    }
  }, [userId, localId, showMomentoBorder, checkUnviewedMomentos]);

  useEffect(() => {
    if (hasUnviewedMomentos) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [hasUnviewedMomentos, pulseAnim]);

  const renderAvatar = () => (
    <View
      style={[
        styles.avatarInner,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
        },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.avatarImage,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarPlaceholder,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <IconSymbol
            ios_icon_name={localId ? 'building.2.fill' : 'person.fill'}
            android_material_icon_name={localId ? 'store' : 'person'}
            size={innerSize * 0.6}
            color={colors.primary}
          />
        </View>
      )}
    </View>
  );

  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
        hasUnviewedMomentos && {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {hasUnviewedMomentos ? (
        <LinearGradient
          colors={['#00FF88', '#00CC6A', '#00FF88']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.border,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              padding: BORDER_WIDTH,
            },
          ]}
        >
          {renderAvatar()}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.border,
            styles.borderViewed,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              padding: BORDER_WIDTH,
            },
          ]}
        >
          {renderAvatar()}
        </View>
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  border: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderViewed: {
    backgroundColor: colors.cardBorder,
  },
  avatarInner: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    backgroundColor: colors.cardBackground,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
