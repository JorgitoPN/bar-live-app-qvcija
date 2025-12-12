
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
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
  const [loading, setLoading] = useState(true);

  // Use a fixed border width of 2px to match social feed momentos (thinner border)
  const BORDER_WIDTH = 2;
  const innerSize = size - BORDER_WIDTH * 2;

  const checkUnviewedMomentos = useCallback(async () => {
    if (!user || !showMomentoBorder) {
      setLoading(false);
      return;
    }

    if (!userId && !localId) {
      setLoading(false);
      return;
    }

    try {
      console.log('[MiniAvatarWithMomento] 🔍 Checking momentos for:', { userId, localId });

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

      const { data: momentosData, error: momentosError } = await query;

      if (momentosError) {
        console.error('[MiniAvatarWithMomento] ❌ Error fetching momentos:', momentosError);
        setHasUnviewedMomentos(false);
        setLoading(false);
        return;
      }

      if (!momentosData || momentosData.length === 0) {
        console.log('[MiniAvatarWithMomento] ℹ️ No momentos found');
        setHasUnviewedMomentos(false);
        setLoading(false);
        return;
      }

      console.log('[MiniAvatarWithMomento] ✅ Found momentos:', momentosData.length);

      // Check if user has viewed any of these momentos
      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData, error: viewsError } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', momentoIds);

      if (viewsError) {
        console.error('[MiniAvatarWithMomento] ❌ Error fetching views:', viewsError);
      }

      const viewedIds = new Set(viewsData?.map(v => v.momento_id) || []);
      const hasUnviewed = momentosData.some(m => !viewedIds.has(m.id));

      console.log('[MiniAvatarWithMomento] 🎯 Result:', {
        totalMomentos: momentosData.length,
        viewedCount: viewedIds.size,
        hasUnviewed,
      });

      setHasUnviewedMomentos(hasUnviewed);
    } catch (error) {
      console.error('[MiniAvatarWithMomento] ❌ Error checking momentos:', error);
      setHasUnviewedMomentos(false);
    } finally {
      setLoading(false);
    }
  }, [user, userId, localId, showMomentoBorder]);

  useEffect(() => {
    checkUnviewedMomentos();

    if (!showMomentoBorder || (!userId && !localId)) {
      return;
    }

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`momento-updates-${userId || localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
        },
        () => {
          console.log('[MiniAvatarWithMomento] 🔄 Momento update detected');
          checkUnviewedMomentos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momento_views',
        },
        () => {
          console.log('[MiniAvatarWithMomento] 🔄 View update detected');
          checkUnviewedMomentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, localId, showMomentoBorder, checkUnviewedMomentos]);

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
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
    >
      {hasUnviewedMomentos && !loading ? (
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
    </View>
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
