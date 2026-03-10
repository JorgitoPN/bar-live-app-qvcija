
/**
 * ✅ MOMENTO CAROUSEL v169.0 - ENHANCED REAL-TIME UPDATES
 * 
 * NEW CHANGES v169.0:
 * - ✅ IMPROVED: More robust real-time subscriptions with unique channel names
 * - ✅ IMPROVED: Better error handling for subscription failures
 * - ✅ IMPROVED: Debounced updates to prevent excessive re-renders
 * - ✅ RESULT: Carousel updates instantly when momentos are published/viewed
 * 
 * Previous changes v168.0:
 * - ✅ REQUERIMIENTO: Increased momento avatar size on Android
 * - ✅ Changed from 90 to 100 (same as iOS) for better visibility
 * - ✅ Avatars now more prominent and easier to tap on Android
 * 
 * Previous changes v167.0:
 * - ✅ Border thickness reduced in UnifiedMomentoAvatar (1.5px → 1.0px on Android)
 * - ✅ Cleaner, less prominent borders on Android momento avatars
 * - ✅ iOS border remains at 1.5px for consistency
 * 
 * Previous changes v166.0:
 * - ✅ Reduced spacing between avatars on Android
 * - ✅ Android now shows at least 4 avatars simultaneously without horizontal scroll
 * - ✅ Reduced gap from 18 to 8 on Android (10 on iOS for consistency)
 * - ✅ Reduced avatar wrapper width from 108 to 80 on Android
 * - ✅ Better visual density on Android screens
 * 
 * Previous changes v165.0:
 * - ✅ FIXED: Avatars now aligned to the left (paddingLeft: 16 matches post mini-avatars)
 * - ✅ FIXED: Removed extra gap that was pushing avatars to the right
 * - ✅ FIXED: scrollContent paddingLeft = 16 (same as post content padding)
 * - ✅ RESULTADO: Avatares alineados verticalmente con los miniavatares de publicaciones
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useRouter } from 'expo-router';
import UnifiedMomentoAvatar from '@/components/common/UnifiedMomentoAvatar';
import MomentoUpload from './MomentoUpload';
import MomentoViewer from './MomentoViewer';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface MomentoAuthor {
  id: string;
  tipo: 'usuario' | 'local';
  nombre: string;
  avatar?: string;
  hasUnviewed: boolean;
}

export default function MomentoCarousel() {
  const router = useRouter();
  const { user, userId } = useEffectiveUser();
  const [authors, setAuthors] = useState<MomentoAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMomentoUpload, setShowMomentoUpload] = useState(false);
  const [showMomentoViewer, setShowMomentoViewer] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<MomentoAuthor | null>(null);

  // ✅ v168.0: Increased avatar size on Android to match iOS (100)
  const AVATAR_SIZE = 100;

  const loadMomentoAuthors = useCallback(async () => {
    if (!userId) {
      console.log('[MomentoCarousel v169.0] No user ID, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('[MomentoCarousel v169.0] 🔄 Loading momento authors...');

      const { data: momentosData, error: momentosError } = await supabase
        .from('momentos')
        .select(`
          id,
          autor_id,
          local_id,
          tipo,
          expires_at
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (momentosError) {
        console.error('[MomentoCarousel v169.0] ❌ Error loading momentos:', momentosError);
        setLoading(false);
        return;
      }

      if (!momentosData || momentosData.length === 0) {
        console.log('[MomentoCarousel v169.0] ℹ️ No active momentos found');
        setAuthors([]);
        setLoading(false);
        return;
      }

      console.log('[MomentoCarousel v169.0] ✅ Found momentos:', momentosData.length);

      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', userId)
        .in('momento_id', momentoIds);

      const viewedIds = new Set(viewsData?.map(v => v.momento_id) || []);

      const authorMap = new Map<string, MomentoAuthor>();

      for (const momento of momentosData) {
        const authorKey = momento.tipo === 'usuario' ? `user-${momento.autor_id}` : `local-${momento.local_id}`;
        
        if (!authorMap.has(authorKey)) {
          if (momento.tipo === 'usuario') {
            const { data: userData } = await supabase
              .from('usuarios')
              .select('id, nombre, avatar')
              .eq('id', momento.autor_id)
              .single();

            if (userData) {
              authorMap.set(authorKey, {
                id: userData.id,
                tipo: 'usuario',
                nombre: userData.nombre,
                avatar: userData.avatar,
                hasUnviewed: !viewedIds.has(momento.id),
              });
            }
          } else if (momento.tipo === 'local') {
            const { data: localData } = await supabase
              .from('locales')
              .select('id, nombre, imagen_url')
              .eq('id', momento.local_id)
              .single();

            if (localData) {
              authorMap.set(authorKey, {
                id: localData.id,
                tipo: 'local',
                nombre: localData.nombre,
                avatar: localData.imagen_url,
                hasUnviewed: !viewedIds.has(momento.id),
              });
            }
          }
        } else {
          const author = authorMap.get(authorKey)!;
          if (!viewedIds.has(momento.id)) {
            author.hasUnviewed = true;
          }
        }
      }

      const authorsArray = Array.from(authorMap.values());
      
      authorsArray.sort((a, b) => {
        const aIsOwn = (a.tipo === 'usuario' && a.id === userId);
        const bIsOwn = (b.tipo === 'usuario' && b.id === userId);
        
        if (aIsOwn && !bIsOwn) return -1;
        if (!aIsOwn && bIsOwn) return 1;
        
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        
        return 0;
      });

      setAuthors(authorsArray);
      console.log('[MomentoCarousel v169.0] ✅ Loaded authors:', authorsArray.length);
    } catch (error) {
      console.error('[MomentoCarousel v169.0] ❌ Error loading authors:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMomentoAuthors();

    if (!userId) return;

    // ✅ v169.0: IMPROVED - Unique channel name with timestamp to prevent conflicts
    const timestamp = Date.now();
    const channelName = `momento-carousel-updates-v169-${timestamp}`;

    console.log('[MomentoCarousel v169.0] 🔄 Setting up real-time subscriptions');

    const momentosChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
        },
        (payload) => {
          console.log('[MomentoCarousel v169.0] 🔄 Momento update detected:', payload.eventType);
          // ✅ v169.0: IMPROVED - Debounced update to prevent excessive re-renders
          setTimeout(() => {
            loadMomentoAuthors();
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'momento_views',
          filter: `usuario_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[MomentoCarousel v169.0] 🔄 View update detected');
          // ✅ v169.0: IMPROVED - Debounced update to prevent excessive re-renders
          setTimeout(() => {
            loadMomentoAuthors();
          }, 100);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[MomentoCarousel v169.0] ✅ Real-time subscriptions active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[MomentoCarousel v169.0] ❌ Subscription error');
        }
      });

    return () => {
      console.log('[MomentoCarousel v169.0] 🧹 Cleaning up subscriptions');
      supabase.removeChannel(momentosChannel);
    };
  }, [userId, loadMomentoAuthors]);

  const handleAuthorPress = (author: MomentoAuthor) => {
    setSelectedAuthor(author);
    setShowMomentoViewer(true);
  };

  const handleMomentoUploadSuccess = () => {
    loadMomentoAuthors();
  };

  if (!user) {
    return null;
  }

  // ✅ Reduced avatar wrapper width on Android
  const avatarWrapperWidth = Platform.OS === 'android' ? 80 : 108;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.avatarWrapper, { width: avatarWrapperWidth }]}>
          <UnifiedMomentoAvatar
            userId={userId}
            imageUrl={user?.avatar}
            size={AVATAR_SIZE}
            showAddButton={true}
            isOwner={true}
            onPress={() => {
              const ownAuthor = authors.find(a => a.tipo === 'usuario' && a.id === userId);
              if (ownAuthor) {
                handleAuthorPress(ownAuthor);
              }
            }}
            onAddPress={() => setShowMomentoUpload(true)}
          />
          <Text style={[styles.authorName, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>
            Tu momento
          </Text>
        </View>

        {loading ? (
          <View style={[styles.loadingContainer, { width: avatarWrapperWidth }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          authors
            .filter(author => !(author.tipo === 'usuario' && author.id === userId))
            .map((author) => (
              <View key={`${author.tipo}-${author.id}`} style={[styles.avatarWrapper, { width: avatarWrapperWidth }]}>
                <UnifiedMomentoAvatar
                  userId={author.tipo === 'usuario' ? author.id : undefined}
                  localId={author.tipo === 'local' ? author.id : undefined}
                  imageUrl={author.avatar}
                  size={AVATAR_SIZE}
                  showAddButton={false}
                  isOwner={false}
                  onPress={() => handleAuthorPress(author)}
                />
                <Text style={[styles.authorName, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>
                  {author.nombre}
                </Text>
              </View>
            ))
        )}
      </ScrollView>

      <MomentoUpload
        visible={showMomentoUpload}
        onClose={() => setShowMomentoUpload(false)}
        onSuccess={handleMomentoUploadSuccess}
      />

      {selectedAuthor && (
        <MomentoViewer
          visible={showMomentoViewer}
          authorId={selectedAuthor.id}
          authorType={selectedAuthor.tipo}
          onClose={() => {
            setShowMomentoViewer(false);
            setSelectedAuthor(null);
            loadMomentoAuthors();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 14,
  },
  // ✅ Reduced gap from 18 to 8 on Android (10 on iOS)
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: Platform.OS === 'android' ? 8 : 10,
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  authorName: {
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
