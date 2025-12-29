
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
 * ✅ MOMENTO CAROUSEL v47.0 - UNIFIED AVATAR DESIGN
 * 
 * Changes:
 * - ✅ Uses UnifiedMomentoAvatar for consistent design
 * - ✅ Same avatar and + button as profile pages
 * - ✅ Green border disappears after viewing
 * - ✅ Real-time synchronization
 * - ✅ Always visible section
 */

export default function MomentoCarousel() {
  const { user } = useAuth();
  const [authors, setAuthors] = useState<MomentoAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuthor, setSelectedAuthor] = useState<{ id: string; tipo: 'usuario' | 'local' } | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const loadMomentoAuthors = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[MomentoCarousel v47.0] Loading momento authors for user:', user.id);

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

      // Add current user to the list
      const allUserIds = [user.id, ...followedUserIds];

      // Get active momentos from followed users
      const { data: userMomentos } = await supabase
        .from('momentos')
        .select('id, autor_id, created_at')
        .eq('tipo', 'usuario')
        .in('autor_id', allUserIds)
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

      // Build authors list
      const authorsArray: MomentoAuthor[] = [];

      usersData?.forEach(u => {
        const stats = userAuthorsMap.get(u.id);
        if (stats) {
          authorsArray.push({
            id: u.id,
            nombre: u.nombre,
            avatar: u.avatar,
            tipo: 'usuario',
            has_unviewed: stats.hasUnviewed,
            momento_count: stats.count,
          });
        }
      });

      localsData?.forEach(l => {
        const stats = localAuthorsMap.get(l.id);
        if (stats) {
          authorsArray.push({
            id: l.id,
            nombre: l.nombre,
            avatar: l.imagen_url,
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
      console.log('[MomentoCarousel v47.0] ✅ Loaded', authorsArray.length, 'authors with momentos');
    } catch (error) {
      console.error('[MomentoCarousel v47.0] Error loading momento authors:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMomentoAuthors();

    if (user) {
      const channel = supabase
        .channel('momento-carousel-updates-v47')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'momentos',
          },
          () => {
            console.log('[MomentoCarousel v47.0] 🔔 Momentos updated');
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
            console.log('[MomentoCarousel v47.0] 🔔 Momento view added - refreshing borders');
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
    console.log('[MomentoCarousel v47.0] Opening momento viewer for:', author.nombre);
    setSelectedAuthor({ id: author.id, tipo: author.tipo });
    setShowViewer(true);
  };

  const handleCreateMomento = () => {
    console.log('[MomentoCarousel v47.0] Opening momento upload');
    setShowUpload(true);
  };

  const handleCloseViewer = () => {
    console.log('[MomentoCarousel v47.0] ✅ Closing viewer and reloading authors to update borders');
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

  // ✅ Always show the section
  return (
    <React.Fragment>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* ✅ Current user's momento avatar with + button */}
          <View style={styles.authorItem}>
            <UnifiedMomentoAvatar
              userId={user.id}
              imageUrl={user.avatar}
              size={70}
              showAddButton={true}
              isOwner={true}
              onPress={handleCreateMomento}
              onAddPress={handleCreateMomento}
            />
            <Text style={styles.authorName} numberOfLines={1}>
              Tu Momento
            </Text>
          </View>

          {/* Other authors */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : authors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay momentos disponibles</Text>
            </View>
          ) : (
            authors.map((author) => (
              <View key={`${author.tipo}-${author.id}`} style={styles.authorItem}>
                <UnifiedMomentoAvatar
                  userId={author.tipo === 'usuario' ? author.id : undefined}
                  localId={author.tipo === 'local' ? author.id : undefined}
                  imageUrl={author.avatar}
                  size={70}
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
    width: 80,
  },
  authorName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    maxWidth: 80,
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
