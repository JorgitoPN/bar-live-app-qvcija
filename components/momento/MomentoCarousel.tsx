
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import MomentoViewer from './MomentoViewer';

interface MomentoAuthor {
  id: string;
  nombre: string;
  avatar: string | null;
  tipo: 'usuario' | 'local';
  has_unviewed: boolean;
  momento_count: number;
}

/**
 * ✅ MOMENTO CAROUSEL v38.1 - ANDROID-iOS PARITY
 * 
 * CRITICAL FIXES:
 * - ✅ All icons properly mapped for Android
 * - ✅ Proper avatar loading with error handling
 * - ✅ Filter out file:// URLs that cause ENOENT errors
 * - ✅ Consistent rendering across platforms
 * - ✅ Performance optimizations
 */

export default function MomentoCarousel() {
  const { user } = useAuth();
  const router = useRouter();
  const [authors, setAuthors] = useState<MomentoAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuthor, setSelectedAuthor] = useState<{ id: string; tipo: 'usuario' | 'local' } | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const loadMomentoAuthors = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[MomentoCarousel v38.1] Loading momento authors for user:', user.id);

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
          // ✅ ANDROID FIX v38.1: Filter out file:// URLs
          const avatarUrl = u.avatar && !u.avatar.startsWith('file://') ? u.avatar : null;
          
          authorsArray.push({
            id: u.id,
            nombre: u.nombre,
            avatar: avatarUrl,
            tipo: 'usuario',
            has_unviewed: stats.hasUnviewed,
            momento_count: stats.count,
          });
        }
      });

      localsData?.forEach(l => {
        const stats = localAuthorsMap.get(l.id);
        if (stats) {
          // ✅ ANDROID FIX v38.1: Filter out file:// URLs
          const avatarUrl = l.imagen_url && !l.imagen_url.startsWith('file://') ? l.imagen_url : null;
          
          authorsArray.push({
            id: l.id,
            nombre: l.nombre,
            avatar: avatarUrl,
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
      console.log('[MomentoCarousel v38.1] ✅ Loaded', authorsArray.length, 'authors with momentos');
    } catch (error) {
      console.error('[MomentoCarousel v38.1] Error loading momento authors:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMomentoAuthors();

    if (user) {
      const channel = supabase
        .channel('momento-carousel-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'momentos',
          },
          () => {
            console.log('[MomentoCarousel v38.1] 🔔 Momentos updated');
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
    console.log('[MomentoCarousel v38.1] Opening momento viewer for:', author.nombre);
    setSelectedAuthor({ id: author.id, tipo: author.tipo });
    setShowViewer(true);
  };

  const handleCreateMomento = () => {
    router.push('/crear/publicacion?tipo=momento');
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedAuthor(null);
    // Reload to update viewed status
    loadMomentoAuthors();
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (authors.length === 0) {
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
          {/* Add Momento Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateMomento}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addGradient}
            >
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={24}
                color={colors.white}
              />
            </LinearGradient>
            <Text style={styles.addLabel}>Tu Momento</Text>
          </TouchableOpacity>

          {/* Author Avatars */}
          {authors.map((author) => (
            <TouchableOpacity
              key={`${author.tipo}-${author.id}`}
              style={styles.authorButton}
              onPress={() => handleAuthorPress(author)}
              activeOpacity={0.8}
            >
              <View style={styles.avatarContainer}>
                {author.has_unviewed && (
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.unviewedRing}
                  />
                )}
                <View style={[styles.avatarInner, !author.has_unviewed && styles.avatarViewed]}>
                  {author.avatar ? (
                    <Image
                      source={{ uri: author.avatar }}
                      style={styles.avatar}
                      resizeMode="cover"
                      // ✅ ANDROID FIX v38.1: Force cache for better loading
                      {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
                      onError={(error) => {
                        console.error('[MomentoCarousel v38.1] ❌ Avatar failed to load:', author.avatar?.substring(0, 50), error.nativeEvent?.error);
                      }}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <IconSymbol
                        ios_icon_name={author.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                        android_material_icon_name={author.tipo === 'local' ? 'store' : 'person'}
                        size={28}
                        color={colors.primary}
                      />
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.authorName} numberOfLines={1}>
                {author.nombre}
              </Text>
            </TouchableOpacity>
          ))}
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
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 12,
  },
  loadingContainer: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  addButton: {
    alignItems: 'center',
    width: 70,
  },
  addGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  authorButton: {
    alignItems: 'center',
    width: 70,
  },
  avatarContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  unviewedRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    padding: 3,
  },
  avatarInner: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: colors.white,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  avatarViewed: {
    borderColor: colors.cardBorder,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    maxWidth: 70,
  },
});
