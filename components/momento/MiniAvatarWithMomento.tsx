
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

  // Use a fixed border width of 3px for mini avatars (thicker and brighter)
  const BORDER_WIDTH = 3;
  const innerSize = size - BORDER_WIDTH * 2;

  const checkUnviewedMomentos = useCallback(async () => {
    if (!user || !showMomentoBorder) {
      console.log('[MiniAvatarWithMomento] ℹ️ Skipping check:', { hasUser: !!user, showMomentoBorder });
      setLoading(false);
      setHasUnviewedMomentos(false);
      return;
    }

    if (!userId && !localId) {
      console.log('[MiniAvatarWithMomento] ℹ️ No userId or localId provided');
      setLoading(false);
      setHasUnviewedMomentos(false);
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

    // Subscribe to real-time updates for momentos and views
    const momentosChannel = supabase
      .channel(`momento-updates-${userId || localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
          filter: userId ? `autor_id=eq.${userId}` : `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[MiniAvatarWithMomento] 🔄 Momento update detected:', payload);
          checkUnviewedMomentos();
        }
      )
      .subscribe();

    // Subscribe to view updates for current user
    const viewsChannel = user ? supabase
      .channel(`momento-views-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'momento_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[MiniAvatarWithMomento] 🔄 View update detected:', payload);
          checkUnviewedMomentos();
        }
      )
      .subscribe() : null;

    return () => {
      supabase.removeChannel(momentosChannel);
      if (viewsChannel) {
        supabase.removeChannel(viewsChannel);
      }
    };
  }, [userId, localId, showMomentoBorder, checkUnviewedMomentos, user]);

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
          colors={['#00FF88', '#00FF88', '#00FF88']}
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
