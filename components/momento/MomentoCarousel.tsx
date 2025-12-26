
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import MiniAvatarWithMomento from './MiniAvatarWithMomento';

interface Momento {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  imagen_url: string;
  categoria?: string;
  created_at: string;
  expires_at: string;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
  };
  has_viewed?: boolean;
}

interface GroupedMomentos {
  [key: string]: {
    autor: {
      id: string;
      nombre: string;
      username?: string;
      avatar?: string;
      tipo: 'usuario' | 'local';
    };
    momentos: Momento[];
    has_unviewed: boolean;
  };
}

/**
 * ✅ MOMENTO CAROUSEL v33.0 - FIXED FOLLOWING FILTER
 * 
 * Changes:
 * - ✅ Only shows momentos from users that the current user follows
 * - ✅ Filters out momentos from non-followed users
 * - ✅ Includes user's own momentos
 */

export default function MomentoCarousel() {
  const router = useRouter();
  const { userId, user } = useEffectiveUser();
  const [groupedMomentos, setGroupedMomentos] = useState<GroupedMomentos>({});
  const [loading, setLoading] = useState(true);

  const loadMomentos = useCallback(async () => {
    if (!userId) {
      console.log('[MomentoCarousel v33.0] No user ID, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('[MomentoCarousel v33.0] 📥 Loading momentos for user:', userId);

      // ✅ FIX 2: Get list of followed users
      const { data: followingData, error: followingError } = await supabase
        .from('seguidores')
        .select('seguido_id, local_id')
        .eq('seguidor_id', userId);

      if (followingError) {
        console.error('[MomentoCarousel v33.0] Error loading following:', followingError);
        throw followingError;
      }

      const followedUserIds = followingData
        ?.filter(f => f.seguido_id)
        .map(f => f.seguido_id) || [];
      
      const followedLocalIds = followingData
        ?.filter(f => f.local_id)
        .map(f => f.local_id) || [];

      // Include user's own ID to see their own momentos
      const authorIds = [...followedUserIds, userId];

      console.log('[MomentoCarousel v33.0] 👥 Following:', {
        users: followedUserIds.length,
        locals: followedLocalIds.length,
        total: authorIds.length + followedLocalIds.length,
      });

      // ✅ FIX 2: Only load momentos from followed users/locals
      let query = supabase
        .from('momentos')
        .select(`
          *,
          autor:usuarios!momentos_autor_id_fkey(id, nombre, username, avatar),
          local:locales!momentos_local_id_fkey(id, nombre, imagen_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Filter by followed users and locals
      if (authorIds.length > 0 || followedLocalIds.length > 0) {
        const conditions = [];
        if (authorIds.length > 0) {
          conditions.push(`autor_id.in.(${authorIds.join(',')})`);
        }
        if (followedLocalIds.length > 0) {
          conditions.push(`local_id.in.(${followedLocalIds.join(',')})`);
        }
        query = query.or(conditions.join(','));
      } else {
        // If not following anyone, only show own momentos
        query = query.eq('autor_id', userId);
      }

      const { data: momentosData, error: momentosError } = await query;

      if (momentosError) throw momentosError;

      console.log('[MomentoCarousel v33.0] ✅ Loaded momentos:', momentosData?.length || 0);

      if (!momentosData || momentosData.length === 0) {
        setGroupedMomentos({});
        setLoading(false);
        return;
      }

      // Get viewed status for all momentos
      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', userId)
        .in('momento_id', momentoIds);

      const viewedMomentoIds = new Set(viewsData?.map(v => v.momento_id) || []);

      // Group momentos by author
      const grouped: GroupedMomentos = {};
      
      momentosData.forEach(momento => {
        const authorKey = momento.tipo === 'local' && momento.local_id 
          ? `local_${momento.local_id}`
          : `user_${momento.autor_id}`;

        if (!grouped[authorKey]) {
          grouped[authorKey] = {
            autor: {
              id: momento.tipo === 'local' && momento.local ? momento.local.id : momento.autor?.id || '',
              nombre: momento.tipo === 'local' && momento.local ? momento.local.nombre : momento.autor?.nombre || '',
              username: momento.tipo === 'local' ? undefined : momento.autor?.username,
              avatar: momento.tipo === 'local' && momento.local ? momento.local.imagen_url : momento.autor?.avatar,
              tipo: momento.tipo,
            },
            momentos: [],
            has_unviewed: false,
          };
        }

        const hasViewed = viewedMomentoIds.has(momento.id);
        grouped[authorKey].momentos.push({
          ...momento,
          has_viewed: hasViewed,
        });

        if (!hasViewed) {
          grouped[authorKey].has_unviewed = true;
        }
      });

      // Sort groups: unviewed first, then by most recent momento
      const sortedGroups = Object.entries(grouped).sort((a, b) => {
        if (a[1].has_unviewed && !b[1].has_unviewed) return -1;
        if (!a[1].has_unviewed && b[1].has_unviewed) return 1;
        
        const aLatest = new Date(a[1].momentos[0].created_at).getTime();
        const bLatest = new Date(b[1].momentos[0].created_at).getTime();
        return bLatest - aLatest;
      });

      const sortedGrouped: GroupedMomentos = {};
      sortedGroups.forEach(([key, value]) => {
        sortedGrouped[key] = value;
      });

      setGroupedMomentos(sortedGrouped);
    } catch (error) {
      console.error('[MomentoCarousel v33.0] Error loading momentos:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadMomentos();
    }
  }, [userId, loadMomentos]);

  const handleViewMomentos = (authorId: string, tipo: 'usuario' | 'local') => {
    const authorKey = tipo === 'local' ? `local_${authorId}` : `user_${authorId}`;
    const group = groupedMomentos[authorKey];
    
    if (!group) return;

    const momentoIds = group.momentos.map(m => m.id);
    const startIndex = 0;

    router.push({
      pathname: '/social/momento-viewer',
      params: {
        momentoIds: JSON.stringify(momentoIds),
        startIndex: startIndex.toString(),
      },
    });
  };

  const handleCreateMomento = () => {
    router.push('/crear/momento');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const hasAnyMomentos = Object.keys(groupedMomentos).length > 0;

  if (!hasAnyMomentos) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {userId && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateMomento}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.createGradient}
            >
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={24}
                color={colors.white}
              />
            </LinearGradient>
            <Text style={styles.createText}>Tu momento</Text>
          </TouchableOpacity>
        )}

        {Object.entries(groupedMomentos).map(([key, group]) => (
          <MiniAvatarWithMomento
            key={key}
            nombre={group.autor.nombre}
            username={group.autor.username}
            avatar={group.autor.avatar}
            hasUnviewed={group.has_unviewed}
            onPress={() => handleViewMomentos(group.autor.id, group.autor.tipo)}
          />
        ))}
      </ScrollView>
    </View>
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
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  createButton: {
    alignItems: 'center',
    marginRight: 4,
  },
  createGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  createText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
});
