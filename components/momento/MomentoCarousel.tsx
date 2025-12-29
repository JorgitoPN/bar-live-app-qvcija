
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import MomentoViewer from './MomentoViewer';
import MomentoUpload from './MomentoUpload';
import UnifiedMomentoAvatar from '@/components/common/UnifiedMomentoAvatar';

interface MomentoAuthor {
  id: string;
  nombre: string;
  avatar: string | null;
  tipo: 'usuario' | 'local';
  has_unviewed: boolean;
  momento_count: number;
}

/**
 * ✅ MOMENTO CAROUSEL v48.0 - FIXED USER MOMENTO PLACEMENT
 * 
 * CRITICAL FIXES v48.0:
 * - ✅ User's own momento appears in the SAME avatar (not adjacent)
 * - ✅ Clicking on user's avatar opens viewer if momentos exist, otherwise opens upload
 * - ✅ + button only appears when user has NO momentos
 * - ✅ Adjacent avatars are ONLY for other users' momentos
 * - ✅ Green neon border synchronization across all pages
 * - ✅ Instagram stories size (88px)
 * - ✅ NO WHITE BORDER - image fills entire circular area
 */

export default function MomentoCarousel() {
  const { user } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  const [authors, setAuthors] = useState<MomentoAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuthor, setSelectedAuthor] = useState<{ id: string; tipo: 'usuario' | 'local' } | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [userHasMomentos, setUserHasMomentos] = useState(false);

  const loadMomentoAuthors = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[MomentoCarousel v48.0] Loading momento authors for user:', user.id);

      // Get followed users
      const { data: followedUsers } = await supabase
        .from('seguidores')
        .select('seguido_id')
        .eq('seguidor_id', user.id)
        .not('seguido_id', 'is', null);

      // Get followed locals
      const { data: followedLocals } = await supabase
        .from('seguidores')
        .select('local_id')
        .eq('seguidor_id', user.id)
        .not('local_id', 'is', null);

      const followedUserIds = followedUsers?.map(f => f.seguido_id) || [];
      const followedLocalIds = followedLocals?.map(f => f.local_id) || [];

      // ✅ CRITICAL FIX v48.0: Check if current user has momentos
      const { data: currentUserMomentos } = await supabase
        .from('momentos')
        .select('id')
        .eq('tipo', 'usuario')
        .eq('autor_id', user.id)
        .gt('expires_at', new Date().toISOString());

      const hasUserMomentos = (currentUserMomentos?.length || 0) > 0;
      setUserHasMomentos(hasUserMomentos);
      console.log('[MomentoCarousel v48.0] ✅ User has momentos:', hasUserMomentos);

      // Get active momentos from followed users (NOT including current user)
      const { data: userMomentos } = await supabase
        .from('momentos')
        .select('id, autor_id, created_at')
        .eq('tipo', 'usuario')
        .in('autor_id', followedUserIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Get active momentos from followed locals
      const { data: localMomentos } = await supabase
        .from('momentos')
        .select('id, local_id, created_at')
        .eq('tipo', 'local')
        .in('local_id', followedLocalIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Get viewed momentos
      const allMomentoIds = [
        ...(userMomentos?.map(m => m.id) || []),
        ...(localMomentos?.map(m => m.id) || []),
      ];

      const { data: viewedMomentos } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', allMomentoIds);

      const viewedIds = new Set(viewedMomentos?.map(v => v.momento_id) || []);

      // Group momentos by author
      const userAuthorsMap = new Map<string, { count: number; hasUnviewed: boolean }>();
      userMomentos?.forEach(m => {
        const existing = userAuthorsMap.get(m.autor_id) || { count: 0, hasUnviewed: false };
        userAuthorsMap.set(m.autor_id, {
          count: existing.count + 1,
          hasUnviewed: existing.hasUnviewed || !viewedIds.has(m.id),
        });
      });

      const localAuthorsMap = new Map<string, { count: number; hasUnviewed: boolean }>();
      localMomentos?.forEach(m => {
        if (!m.local_id) return;
        const existing = localAuthorsMap.get(m.local_id) || { count: 0, hasUnviewed: false };
        localAuthorsMap.set(m.local_id, {
          count: existing.count + 1,
          hasUnviewed: existing.hasUnviewed || !viewedIds.has(m.id),
        });
      });

      // Fetch user details
      const userIds = Array.from(userAuthorsMap.keys());
      const { data: usersData } = await supabase
        .from('usuarios')
        .select('id, nombre, avatar')
        .in('id', userIds);

      // Fetch local details
      const localIds = Array.from(localAuthorsMap.keys());
      const { data: localsData } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url')
        .in('id', localIds);

      // Build authors list (EXCLUDING current user - they have their own avatar)
      const authorsArray: MomentoAuthor[] = [];

      usersData?.forEach(u => {
        const stats = userAuthorsMap.get(u.id);
        if (stats) {
          const safeAvatar = u.avatar && !u.avatar.startsWith('file://') ? u.avatar : null;
          authorsArray.push({
            id: u.id,
            nombre: u.nombre,
            avatar: safeAvatar,
            tipo: 'usuario',
            has_unviewed: stats.hasUnviewed,
            momento_count: stats.count,
          });
        }
      });

      localsData?.forEach(l => {
        const stats = localAuthorsMap.get(l.id);
        if (stats) {
          const safeAvatar = l.imagen_url && !l.imagen_url.startsWith('file://') ? l.imagen_url : null;
          authorsArray.push({
            id: l.id,
            nombre: l.nombre,
            avatar: safeAvatar,
            tipo: 'local',
            has_unviewed: stats.hasUnviewed,
            momento_count: stats.count,
          });
        }
      });

      // Sort: unviewed first, then by most recent
      authorsArray.sort((a, b) => {
        if (a.has_unviewed && !b.has_unviewed) return -1;
        if (!a.has_unviewed && b.has_unviewed) return 1;
        return b.momento_count - a.momento_count;
      });

      setAuthors(authorsArray);
      console.log('[MomentoCarousel v48.0] ✅ Loaded', authorsArray.length, 'authors with momentos (excluding current user)');
    } catch (error) {
      console.error('[MomentoCarousel v48.0] Error loading momento authors:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMomentoAuthors();

    if (user) {
      const channel = supabase
        .channel('momento-carousel-updates-v48')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'momentos',
          },
          () => {
            console.log('[MomentoCarousel v48.0] 🔔 Momentos updated');
            loadMomentoAuthors();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'momento_views',
            filter: `usuario_id=eq.${user.id}`,
          },
          () => {
            console.log('[MomentoCarousel v48.0] 🔔 Momento view added - refreshing borders');
            loadMomentoAuthors();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadMomentoAuthors]);

  const handleAuthorPress = (author: MomentoAuthor) => {
    console.log('[MomentoCarousel v48.0] Opening momento viewer for:', author.nombre);
    setSelectedAuthor({ id: author.id, tipo: author.tipo });
    setShowViewer(true);
  };

  // ✅ CRITICAL FIX v48.0: User avatar click behavior
  const handleUserAvatarPress = () => {
    if (userHasMomentos) {
      // User has momentos - open viewer
      console.log('[MomentoCarousel v48.0] User has momentos, opening viewer');
      setSelectedAuthor({ id: user!.id, tipo: 'usuario' });
      setShowViewer(true);
    } else {
      // User has no momentos - open upload
      console.log('[MomentoCarousel v48.0] User has no momentos, opening upload');
      setShowUpload(true);
    }
  };

  const handleCreateMomento = () => {
    console.log('[MomentoCarousel v48.0] Opening momento upload from + button');
    setShowUpload(true);
  };

  const handleCloseViewer = () => {
    console.log('[MomentoCarousel v48.0] ✅ Closing viewer and reloading authors to update borders');
    setShowViewer(false);
    setSelectedAuthor(null);
    // ✅ CRITICAL: Reload to update viewed status and remove green border
    loadMomentoAuthors();
  };

  const handleCloseUpload = () => {
    setShowUpload(false);
    // Reload to show new momento
    loadMomentoAuthors();
  };

  if (!user) {
    return null;
  }

  return (
    <React.Fragment>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* ✅ CRITICAL FIX v48.0: User's own avatar - shows momento if exists, otherwise shows + button */}
          <View style={styles.authorItem}>
            <UnifiedMomentoAvatar
              userId={user.id}
              imageUrl={user.avatar}
              size={88}
              showAddButton={!userHasMomentos}
              isOwner={true}
              onPress={handleUserAvatarPress}
              onAddPress={handleCreateMomento}
            />
            <Text style={styles.authorName} numberOfLines={1}>
              {userHasMomentos ? 'Tu Momento' : 'Crear Momento'}
            </Text>
          </View>

          {/* ✅ CRITICAL FIX v48.0: Other users' momentos (adjacent avatars) */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : authors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay momentos de tus amigos</Text>
            </View>
          ) : (
            authors.map((author) => (
              <View key={`${author.tipo}-${author.id}`} style={styles.authorItem}>
                <UnifiedMomentoAvatar
                  userId={author.tipo === 'usuario' ? author.id : undefined}
                  localId={author.tipo === 'local' ? author.id : undefined}
                  imageUrl={author.avatar || undefined}
                  size={88}
                  onPress={() => handleAuthorPress(author)}
                />
                <Text style={styles.authorName} numberOfLines={1}>
                  {author.nombre}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Momento Viewer Modal */}
      {selectedAuthor && (
        <MomentoViewer
          visible={showViewer}
          authorId={selectedAuthor.id}
          authorType={selectedAuthor.tipo}
          onClose={handleCloseViewer}
        />
      )}

      {/* Momento Upload Modal */}
      <MomentoUpload
        visible={showUpload}
        onClose={handleCloseUpload}
        onSuccess={handleCloseUpload}
      />
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 16,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  authorItem: {
    alignItems: 'center',
    width: 96,
  },
  authorName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    maxWidth: 96,
  },
  loadingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
