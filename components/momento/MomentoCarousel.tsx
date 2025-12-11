
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = 84; // Increased from 72
const BORDER_WIDTH = 3;

interface MomentoAuthor {
  id: string;
  nombre: string;
  avatar: string | null;
  tipo: 'usuario' | 'local';
  local_id?: string;
  hasUnviewed: boolean;
  momentosCount: number;
  lastMomentoAt: string;
}

interface MomentoCarouselProps {
  onOpenViewer: (authorId: string, tipo: 'usuario' | 'local') => void;
  onUploadMomento: () => void;
}

export default function MomentoCarousel({ onOpenViewer, onUploadMomento }: MomentoCarouselProps) {
  const { user } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  const [authors, setAuthors] = useState<MomentoAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulsing animation for unviewed borders
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
  }, [pulseAnim]);

  const loadMomentos = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get all momentos that haven't expired (24h)
      const { data: momentosData, error: momentosError } = await supabase
        .from('momentos')
        .select(`
          id,
          autor_id,
          tipo,
          local_id,
          created_at,
          usuarios!momentos_autor_id_fkey (
            id,
            nombre,
            avatar
          ),
          locales!momentos_local_id_fkey (
            id,
            nombre,
            imagen_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (momentosError) throw momentosError;

      if (!momentosData || momentosData.length === 0) {
        setAuthors([]);
        setLoading(false);
        return;
      }

      // Get viewed momentos by current user
      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', momentoIds);

      const viewedMomentoIds = new Set(viewsData?.map(v => v.momento_id) || []);

      // Group momentos by author
      const authorsMap = new Map<string, MomentoAuthor>();

      momentosData.forEach((momento: any) => {
        const authorKey = momento.tipo === 'local' 
          ? `local-${momento.local_id}` 
          : `user-${momento.autor_id}`;

        if (!authorsMap.has(authorKey)) {
          const authorData = momento.tipo === 'local' 
            ? momento.locales 
            : momento.usuarios;

          authorsMap.set(authorKey, {
            id: momento.tipo === 'local' ? momento.local_id : momento.autor_id,
            nombre: authorData?.nombre || 'Usuario',
            avatar: momento.tipo === 'local' 
              ? authorData?.imagen_url 
              : authorData?.avatar,
            tipo: momento.tipo,
            local_id: momento.local_id,
            hasUnviewed: false,
            momentosCount: 0,
            lastMomentoAt: momento.created_at,
          });
        }

        const author = authorsMap.get(authorKey)!;
        author.momentosCount++;
        
        // Check if this momento is unviewed
        if (!viewedMomentoIds.has(momento.id)) {
          author.hasUnviewed = true;
        }

        // Update last momento timestamp
        if (new Date(momento.created_at) > new Date(author.lastMomentoAt)) {
          author.lastMomentoAt = momento.created_at;
        }
      });

      // Convert to array and sort by last momento time
      const authorsArray = Array.from(authorsMap.values()).sort((a, b) => {
        // Prioritize unviewed
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        // Then by recency
        return new Date(b.lastMomentoAt).getTime() - new Date(a.lastMomentoAt).getTime();
      });

      setAuthors(authorsArray);
    } catch (error) {
      console.error('[MomentoCarousel] Error loading momentos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMomentos();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('momentos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
        },
        () => {
          console.log('[MomentoCarousel] Real-time update detected');
          loadMomentos();
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
          console.log('[MomentoCarousel] View update detected');
          loadMomentos();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadMomentos]);

  const renderAvatar = (author: MomentoAuthor, index: number) => {
    const isCurrentUser = activeProfileType === 'usuario' && author.id === user?.id;
    const isCurrentLocal = activeProfileType === 'local' && author.id === activeProfileId;
    const isOwnProfile = isCurrentUser || isCurrentLocal;

    return (
      <TouchableOpacity
        key={`${author.tipo}-${author.id}`}
        style={styles.avatarContainer}
        onPress={() => onOpenViewer(author.id, author.tipo)}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.avatarBorderContainer,
            author.hasUnviewed && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {author.hasUnviewed ? (
            <LinearGradient
              colors={['#00FF88', '#00CC6A', '#00FF88']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.avatarBorder,
                {
                  width: AVATAR_SIZE + BORDER_WIDTH * 2,
                  height: AVATAR_SIZE + BORDER_WIDTH * 2,
                  borderRadius: (AVATAR_SIZE + BORDER_WIDTH * 2) / 2,
                },
              ]}
            >
              <View style={styles.avatarInner}>
                {author.avatar ? (
                  <Image
                    source={{ uri: author.avatar }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <IconSymbol
                      ios_icon_name={author.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                      android_material_icon_name={author.tipo === 'local' ? 'store' : 'person'}
                      size={AVATAR_SIZE * 0.5}
                      color={colors.primary}
                    />
                  </View>
                )}
              </View>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.avatarBorder,
                styles.avatarBorderViewed,
                {
                  width: AVATAR_SIZE + BORDER_WIDTH * 2,
                  height: AVATAR_SIZE + BORDER_WIDTH * 2,
                  borderRadius: (AVATAR_SIZE + BORDER_WIDTH * 2) / 2,
                },
              ]}
            >
              <View style={styles.avatarInner}>
                {author.avatar ? (
                  <Image
                    source={{ uri: author.avatar }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <IconSymbol
                      ios_icon_name={author.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                      android_material_icon_name={author.tipo === 'local' ? 'store' : 'person'}
                      size={AVATAR_SIZE * 0.5}
                      color={colors.primary}
                    />
                  </View>
                )}
              </View>
            </View>
          )}
        </Animated.View>

        <Text style={styles.avatarName} numberOfLines={1}>
          {author.nombre}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAddButton = () => {
    const currentUserAvatar = activeProfileType === 'local' 
      ? null // Get from local data
      : user?.avatar;

    return (
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={onUploadMomento}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.avatarBorder,
            styles.addButtonBorder,
            {
              width: AVATAR_SIZE + BORDER_WIDTH * 2,
              height: AVATAR_SIZE + BORDER_WIDTH * 2,
              borderRadius: (AVATAR_SIZE + BORDER_WIDTH * 2) / 2,
            },
          ]}
        >
          <View style={styles.avatarInner}>
            {currentUserAvatar ? (
              <Image
                source={{ uri: currentUserAvatar }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <IconSymbol
                  ios_icon_name={activeProfileType === 'local' ? 'building.2.fill' : 'person.fill'}
                  android_material_icon_name={activeProfileType === 'local' ? 'store' : 'person'}
                  size={AVATAR_SIZE * 0.5}
                  color={colors.primary}
                />
              </View>
            )}
            <View style={styles.addIconContainer}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addIconGradient}
              >
                <IconSymbol
                  ios_icon_name="plus"
                  android_material_icon_name="add"
                  size={18}
                  color="#fff"
                />
              </LinearGradient>
            </View>
          </View>
        </View>
        <Text style={styles.avatarName} numberOfLines={1}>
          Tu Momento
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando Momentos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderAddButton()}
        {authors.map((author, index) => renderAvatar(author, index))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  avatarContainer: {
    alignItems: 'center',
    width: AVATAR_SIZE + BORDER_WIDTH * 2,
  },
  avatarBorderContainer: {
    marginBottom: 6,
  },
  avatarBorder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: BORDER_WIDTH,
  },
  avatarBorderViewed: {
    backgroundColor: colors.cardBorder,
  },
  addButtonBorder: {
    backgroundColor: colors.cardBorder,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarName: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'System',
    textAlign: 'center',
    maxWidth: AVATAR_SIZE + BORDER_WIDTH * 2,
  },
  addIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    zIndex: 10,
  },
  addIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
