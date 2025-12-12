
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = 84;
const BORDER_WIDTH = 4; // Increased from 3 to 4 for thicker border

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
  const [userMomento, setUserMomento] = useState<MomentoAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMomentos = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[MomentoCarousel] 🔄 Loading momentos for user:', user.id);
      console.log('[MomentoCarousel] 🔄 Active profile:', { activeProfileType, activeProfileId });

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
        console.log('[MomentoCarousel] ℹ️ No momentos found');
        setAuthors([]);
        setUserMomento(null);
        setLoading(false);
        return;
      }

      console.log('[MomentoCarousel] ✅ Found momentos:', momentosData.length);

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
      let currentUserMomento: MomentoAuthor | null = null;

      momentosData.forEach((momento: any) => {
        const authorKey = momento.tipo === 'local' 
          ? `local-${momento.local_id}` 
          : `user-${momento.autor_id}`;

        // Check if this is the current user's or current local's momento
        const isCurrentUserMomento = activeProfileType === 'usuario' && momento.autor_id === user.id;
        const isCurrentLocalMomento = activeProfileType === 'local' && momento.local_id === activeProfileId;
        const isOwnMomento = isCurrentUserMomento || isCurrentLocalMomento;

        console.log('[MomentoCarousel] 🔍 Processing momento:', {
          momentoId: momento.id,
          tipo: momento.tipo,
          autorId: momento.autor_id,
          localId: momento.local_id,
          isCurrentUserMomento,
          isCurrentLocalMomento,
          isOwnMomento,
        });

        if (!authorsMap.has(authorKey)) {
          const authorData = momento.tipo === 'local' 
            ? momento.locales 
            : momento.usuarios;

          const authorInfo: MomentoAuthor = {
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
          };

          authorsMap.set(authorKey, authorInfo);

          // Store user's own momento separately
          if (isOwnMomento) {
            currentUserMomento = authorInfo;
            console.log('[MomentoCarousel] ✅ Found own momento:', authorInfo);
          }
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

        // Update user momento if it's the current user's
        if (isOwnMomento && currentUserMomento) {
          currentUserMomento.momentosCount = author.momentosCount;
          currentUserMomento.hasUnviewed = author.hasUnviewed;
          currentUserMomento.lastMomentoAt = author.lastMomentoAt;
        }
      });

      // Filter out current user/local from the main carousel
      // CRITICAL: This ensures the user's own momento ONLY appears in "Tu Momento"
      const filteredAuthors = Array.from(authorsMap.values()).filter(author => {
        if (activeProfileType === 'usuario') {
          // Exclude if this is the current user's momento
          const isCurrentUser = author.tipo === 'usuario' && author.id === user.id;
          console.log('[MomentoCarousel] 🔍 Filtering user momento:', {
            authorId: author.id,
            authorTipo: author.tipo,
            userId: user.id,
            isCurrentUser,
            excluded: isCurrentUser,
          });
          return !isCurrentUser;
        } else if (activeProfileType === 'local') {
          // Exclude if this is the current local's momento
          const isCurrentLocal = author.tipo === 'local' && author.id === activeProfileId;
          console.log('[MomentoCarousel] 🔍 Filtering local momento:', {
            authorId: author.id,
            authorTipo: author.tipo,
            localId: activeProfileId,
            isCurrentLocal,
            excluded: isCurrentLocal,
          });
          return !isCurrentLocal;
        }
        return true;
      });

      // Sort by unviewed first, then by recency
      const sortedAuthors = filteredAuthors.sort((a, b) => {
        // Prioritize unviewed
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        // Then by recency
        return new Date(b.lastMomentoAt).getTime() - new Date(a.lastMomentoAt).getTime();
      });

      setAuthors(sortedAuthors);
      setUserMomento(currentUserMomento);

      console.log('[MomentoCarousel] ✅ Loaded momentos:', {
        total: momentosData.length,
        others: sortedAuthors.length,
        userOwn: currentUserMomento ? 1 : 0,
        userOwnDetails: currentUserMomento,
      });
    } catch (error) {
      console.error('[MomentoCarousel] ❌ Error loading momentos:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeProfileType, activeProfileId]);

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
          console.log('[MomentoCarousel] 🔄 Real-time update detected');
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
          console.log('[MomentoCarousel] 🔄 View update detected');
          loadMomentos();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadMomentos]);

  const renderAvatar = (author: MomentoAuthor, index: number) => {
    return (
      <TouchableOpacity
        key={`${author.tipo}-${author.id}`}
        style={styles.avatarContainer}
        onPress={() => onOpenViewer(author.id, author.tipo)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarBorderContainer}>
          {author.hasUnviewed ? (
            <LinearGradient
              colors={['#00FF88', '#00FF88', '#00FF88']}
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
        </View>

        <Text style={styles.avatarName} numberOfLines={1}>
          {author.nombre}
        </Text>
      </TouchableOpacity>
    );
  };

  // Combined "Tu Momento" avatar - shows momento if exists, otherwise shows add button
  const renderTuMomento = () => {
    // Get current user/local avatar
    const currentAvatar = activeProfileType === 'local' 
      ? null // TODO: Get from local data if needed
      : user?.avatar;

    // If user has a momento, show it with the momento viewer functionality
    if (userMomento) {
      return (
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => onOpenViewer(userMomento.id, userMomento.tipo)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarBorderContainer}>
            {userMomento.hasUnviewed ? (
              <LinearGradient
                colors={['#00FF88', '#00FF88', '#00FF88']}
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
                  {userMomento.avatar ? (
                    <Image
                      source={{ uri: userMomento.avatar }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <IconSymbol
                        ios_icon_name={userMomento.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                        android_material_icon_name={userMomento.tipo === 'local' ? 'store' : 'person'}
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
                  {userMomento.avatar ? (
                    <Image
                      source={{ uri: userMomento.avatar }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <IconSymbol
                        ios_icon_name={userMomento.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                        android_material_icon_name={userMomento.tipo === 'local' ? 'store' : 'person'}
                        size={AVATAR_SIZE * 0.5}
                        color={colors.primary}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          <Text style={styles.avatarName} numberOfLines={1}>
            Tu Momento
          </Text>
        </TouchableOpacity>
      );
    }

    // If no momento, show add button with user's avatar
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
            {currentAvatar ? (
              <Image
                source={{ uri: currentAvatar }}
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
            {/* Plus icon with higher z-index to appear above the border */}
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
        {/* Always show "Tu Momento" first - either with momento or as add button */}
        {renderTuMomento()}
        
        {/* Show other users' momentos in the carousel */}
        {authors.map((author, index) => renderAvatar(author, index))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 16,
    alignItems: 'center',
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
    overflow: 'visible',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: AVATAR_SIZE / 2,
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
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: colors.background,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
