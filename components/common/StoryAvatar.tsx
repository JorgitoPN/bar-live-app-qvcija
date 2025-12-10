
import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ✅ DEFAULT AVATAR URL - Barlive branded default avatar
const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop';

// ✅ NEON GREEN COLOR - Phosphorescent green for story borders
const NEON_GREEN = '#39FF14';

interface StoryAvatarProps {
  userId: string;
  userStories: any[];
  avatarUrl?: string;
  userName: string;
  size?: number;
  onPress: () => void;
  showLabel?: boolean;
  labelText?: string;
}

const StoryAvatar = memo(function StoryAvatar({
  userId,
  userStories,
  avatarUrl,
  userName,
  size = 92,
  onPress,
  showLabel = false,
  labelText,
}: StoryAvatarProps) {
  const { user } = useAuth();
  const [hasUnviewedStories, setHasUnviewedStories] = useState(false);

  useEffect(() => {
    const checkUnviewedStories = async () => {
      if (!user || userStories.length === 0) {
        setHasUnviewedStories(false);
        return;
      }

      // If viewing own stories, always show gradient outline (for stats access)
      if (userId === user.id) {
        setHasUnviewedStories(true);
        return;
      }

      try {
        const storyIds = userStories.map(s => s.id);
        
        // Check which stories have been viewed by the current user
        const { data: viewedStories, error } = await supabase
          .from('historia_views')
          .select('historia_id')
          .eq('usuario_id', user.id)
          .in('historia_id', storyIds);

        if (error) {
          console.error('[StoryAvatar] Error checking viewed stories:', error);
          setHasUnviewedStories(true);
          return;
        }

        const viewedStoryIds = new Set(viewedStories?.map(v => v.historia_id) || []);
        
        // Show gradient outline if ANY story is unviewed
        const hasUnviewed = userStories.some(s => !viewedStoryIds.has(s.id));
        
        console.log('[StoryAvatar] 👁️ Unviewed check:', {
          userId,
          totalStories: userStories.length,
          viewedCount: viewedStoryIds.size,
          hasUnviewed,
        });
        
        setHasUnviewedStories(hasUnviewed);
      } catch (error) {
        console.error('[StoryAvatar] Error:', error);
        setHasUnviewedStories(true);
      }
    };

    checkUnviewedStories();

    // Subscribe to real-time updates for story views
    if (user && userStories.length > 0) {
      const storyIds = userStories.map(s => s.id);
      
      const channel = supabase
        .channel(`story-views-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'historia_views',
            filter: `usuario_id=eq.${user.id}`,
          },
          (payload) => {
            // If a story from this user was viewed, recheck
            if (storyIds.includes(payload.new.historia_id)) {
              console.log('[StoryAvatar] ⚡ Story viewed, rechecking outline');
              checkUnviewedStories();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userStories, userId]);

  const ringSize = size + 8;
  const avatarSize = size - 4;

  // ✅ FIXED: Use default avatar if no avatar URL provided
  const displayAvatarUrl = avatarUrl || DEFAULT_AVATAR_URL;

  return (
    <TouchableOpacity 
      style={[styles.container, { width: size }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarWrapper, { width: ringSize, height: ringSize }]}>
        {hasUnviewedStories ? (
          // ✅ NEON GREEN GRADIENT for unviewed stories
          <LinearGradient
            colors={[NEON_GREEN, NEON_GREEN]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
          >
            <View style={[styles.innerRing, { width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2 }]}>
              <Image
                source={{ uri: displayAvatarUrl }}
                style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              />
            </View>
          </LinearGradient>
        ) : (
          // ✅ Show simple border for viewed stories (no gradient)
          <View style={[styles.viewedRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
            <View style={[styles.innerRing, { width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2 }]}>
              <Image
                source={{ uri: displayAvatarUrl }}
                style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              />
            </View>
          </View>
        )}
      </View>
      {showLabel && (
        <Text style={styles.label} numberOfLines={1}>
          {labelText || userName}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewedRing: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  innerRing: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.cardBackground,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    maxWidth: '100%',
  },
});

export default StoryAvatar;
