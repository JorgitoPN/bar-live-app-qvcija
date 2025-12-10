
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ✅ DEFAULT AVATAR ICON - Simple user icon (non-realistic)
const DEFAULT_AVATAR_ICON = 'person.circle.fill';

// ✅ NEON GREEN COLOR - Phosphorescent green for story borders
const NEON_GREEN = '#39FF14';

interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  isViewed?: boolean;
  placeholderIcon?: string;
  placeholderText?: string;
  nombre?: string;
  style?: ViewStyle;
  userId?: string; // ✅ NEW: User ID to check for unviewed stories
}

/**
 * ✅ MINI FOOD PLATE AVATAR v5.0 - Instagram-style story borders with dynamic checking
 * Compact version of FoodPlateAvatar for use in posts, comments, etc.
 * Features:
 * - Smaller size optimized for inline use
 * - NEON GREEN border for unviewed stories (Instagram logic)
 * - Border DISAPPEARS when all stories are viewed (Instagram logic)
 * - Default avatar with user icon (non-realistic)
 * - ALWAYS shows an avatar (never empty)
 * - Dynamically checks for unviewed stories if userId provided
 */
export default function MiniFoodPlateAvatar({
  imageUrl,
  size = 40,
  hasStory = false,
  isViewed = false,
  placeholderIcon = 'person.fill',
  placeholderText,
  nombre,
  style,
  userId,
}: MiniFoodPlateAvatarProps) {
  const { user } = useAuth();
  const [hasUnviewedStories, setHasUnviewedStories] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);

  const plateSize = size;
  const imageSize = size * 0.85; // Image is 85% of plate size for mini version
  const rimWidth = size * 0.06; // Rim is 6% of plate size

  // ✅ NEW: Dynamically check for unviewed stories if userId is provided
  useEffect(() => {
    const checkUnviewedStories = async () => {
      if (!userId || !user || !hasStory) {
        setHasUnviewedStories(false);
        return;
      }

      // If viewing own stories, always show border (for stats access)
      if (userId === user.id) {
        setHasUnviewedStories(true);
        return;
      }

      setLoadingStories(true);

      try {
        // Get all stories from this user
        const { data: userStories, error: storiesError } = await supabase
          .from('historias')
          .select('id')
          .eq('autor_id', userId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (storiesError) {
          console.error('[MiniFoodPlateAvatar] Error fetching stories:', storiesError);
          setHasUnviewedStories(false);
          setLoadingStories(false);
          return;
        }

        if (!userStories || userStories.length === 0) {
          setHasUnviewedStories(false);
          setLoadingStories(false);
          return;
        }

        const storyIds = userStories.map(s => s.id);

        // Check which stories have been viewed by the current user
        const { data: viewedStories, error: viewsError } = await supabase
          .from('historia_views')
          .select('historia_id')
          .eq('usuario_id', user.id)
          .in('historia_id', storyIds);

        if (viewsError) {
          console.error('[MiniFoodPlateAvatar] Error checking viewed stories:', viewsError);
          setHasUnviewedStories(true);
          setLoadingStories(false);
          return;
        }

        const viewedStoryIds = new Set(viewedStories?.map(v => v.historia_id) || []);

        // ✅ INSTAGRAM LOGIC: Show neon green border ONLY if there are unviewed stories
        const hasUnviewed = userStories.some(s => !viewedStoryIds.has(s.id));

        console.log('[MiniFoodPlateAvatar] 👁️ Instagram-style border logic:', {
          userId,
          totalStories: userStories.length,
          viewedCount: viewedStoryIds.size,
          hasUnviewed,
          willShowBorder: hasUnviewed,
        });

        setHasUnviewedStories(hasUnviewed);
      } catch (error) {
        console.error('[MiniFoodPlateAvatar] Error:', error);
        setHasUnviewedStories(true);
      } finally {
        setLoadingStories(false);
      }
    };

    checkUnviewedStories();
  }, [userId, user, hasStory]);

  // ✅ FIXED: Determine what to show
  const shouldShowIcon = !imageUrl;

  // ✅ INSTAGRAM LOGIC: Show neon green ring ONLY if has story AND not viewed
  // If viewed, the ring disappears completely (Instagram behavior)
  const showStoryRing = hasStory && (userId ? hasUnviewedStories : !isViewed);

  return (
    <View style={[styles.container, { width: plateSize, height: plateSize }, style]}>
      {/* ✅ INSTAGRAM-STYLE: NEON GREEN Story Ring (only if unviewed) */}
      {showStoryRing && (
        <LinearGradient
          colors={[NEON_GREEN, NEON_GREEN]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.storyRing,
            {
              width: plateSize + 4,
              height: plateSize + 4,
              borderRadius: (plateSize + 4) / 2,
              top: -2,
              left: -2,
            },
          ]}
        />
      )}

      {/* Plate Base (outer circle) */}
      <View
        style={[
          styles.plateBase,
          {
            width: plateSize,
            height: plateSize,
            borderRadius: plateSize / 2,
            borderWidth: rimWidth,
          },
        ]}
      >
        {/* Food/Image Container (inner circle) */}
        <View
          style={[
            styles.foodContainer,
            {
              width: imageSize,
              height: imageSize,
              borderRadius: imageSize / 2,
            },
          ]}
        >
          {shouldShowIcon ? (
            <View
              style={[
                styles.foodPlaceholder,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                },
              ]}
            >
              <IconSymbol
                ios_icon_name={DEFAULT_AVATAR_ICON}
                android_material_icon_name="account_circle"
                size={imageSize * 0.9}
                color={colors.primary}
              />
            </View>
          ) : (
            <View
              style={[
                styles.foodPlaceholder,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                },
              ]}
            >
              <IconSymbol
                ios_icon_name={DEFAULT_AVATAR_ICON}
                android_material_icon_name="account_circle"
                size={imageSize * 0.9}
                color={colors.primary}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyRing: {
    position: 'absolute',
    zIndex: 0,
  },
  plateBase: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    // Plate shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodContainer: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    // Food shadow (inner)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  foodPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTextContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
  },
  placeholderText: {
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
});
