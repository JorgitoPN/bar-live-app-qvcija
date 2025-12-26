
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
import { useRouter } from 'expo-router';
import MomentoViewer from '@/components/momento/MomentoViewer';
import MomentoUpload from '@/components/momento/MomentoUpload';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = 84;
const BORDER_WIDTH = 4;

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

export default function MomentoCarousel() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  const [authors, setAuthors] = useState<MomentoAuthor[]>([]);
  const [userMomento, setUserMomento] = useState<MomentoAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ NEW: State for viewer and upload modals
  const [viewerVisible, setViewerVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [selectedAuthorType, setSelectedAuthorType] = useState<'usuario' | 'local'>('usuario');

  const handleOpenViewer = useCallback((authorId: string, tipo: 'usuario' | 'local') => {
    console.log('[MomentoCarousel] ✅ Opening viewer for:', { authorId, tipo });
    setSelectedAuthorId(authorId);
    setSelectedAuthorType(tipo);
    setViewerVisible(true);
  }, []);

  const handleUploadMomento = useCallback(() => {
    console.log('[MomentoCarousel] ✅ Opening momento upload');
    setUploadVisible(true);
  }, []);

  const loadMomentos = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[MomentoCarousel] 🔄 Loading momentos for user:', user.id);
      console.log('[MomentoCarousel] 🔄 Active profile:', { activeProfileType, activeProfileId });

      // ✅ CRITICAL FIX: Get list of followed users and locals
      const { data: followedData, error: followedError } = await supabase
        .from('seguidores')
        .select('seguido_id, local_id')
        .eq('seguidor_id', user.id);

      if (followedError) {
        console.error('[MomentoCarousel] ❌ Error fetching followed users:', followedError);
      }

      const followedUserIds = new Set(
        followedData
          ?.filter(f => f.seguido_id)
          .map(f => f.seguido_id) || []
      );
      
      const followedLocalIds = new Set(
        followedData
          ?.filter(f => f.local_id)
          .map(f => f.local_id) || []
      );

      console.log('[MomentoCarousel] 👥 Following users:', followedUserIds.size);
      console.log('[MomentoCarousel] 🏢 Following locals:', followedLocalIds.size);

      // ✅ CRITICAL FIX: Only fetch momentos from followed users/locals OR own momentos
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

      console.log('[MomentoCarousel] ✅ Found momentos (before filtering):', momentosData.length);

      // ✅ CRITICAL FIX: Filter momentos to only show from followed users/locals
      const filteredMomentos = momentosData.filter((momento: any) => {
        // Always show own momentos
        const isInteractingAsUser = activeProfileType === 'usuario' || activeProfileType === 'cliente';
        const isOwnUserMomento = isInteractingAsUser && 
                                 momento.tipo === 'usuario' && 
                                 momento.autor_id === user.id;
        const isOwnLocalMomento = activeProfileType === 'local' && 
                                  momento.tipo === 'local' && 
                                  momento.local_id === activeProfileId;
        
        if (isOwnUserMomento || isOwnLocalMomento) {
          return true;
        }

        // Show momentos from followed users
        if (momento.tipo === 'usuario' && followedUserIds.has(momento.autor_id)) {
          return true;
        }

        // Show momentos from followed locals
        if (momento.tipo === 'local' && momento.local_id && followedLocalIds.has(momento.local_id)) {
          return true;
        }

        return false;
      });

      console.log('[MomentoCarousel] ✅ Filtered momentos (after following filter):', filteredMomentos.length);

      const momentoIds = filteredMomentos.map(m => m.id);
      const { data: viewsData } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', momentoIds);

      const viewedMomentoIds = new Set(viewsData?.map(v => v.momento_id) || []);

      const authorsMap = new Map<string, MomentoAuthor>();
      let currentUserMomento: MomentoAuthor | null = null;

      filteredMomentos.forEach((momento: any) => {
        const authorKey = momento.tipo === 'local' 
          ? `local-${momento.local_id}` 
          : `user-${momento.autor_id}`;

        const isInteractingAsUser = activeProfileType === 'usuario' || activeProfileType === 'cliente';
        const isCurrentUserMomento = isInteractingAsUser && 
                                     momento.tipo === 'usuario' && 
                                     momento.autor_id === user.id;
        const isCurrentLocalMomento = activeProfileType === 'local' && 
                                      momento.tipo === 'local' && 
                                      momento.local_id === activeProfileId;
        const isOwnMomento = isCurrentUserMomento || isCurrentLocalMomento;

        console.log('[MomentoCarousel] 🔍 Processing momento:', {
          momentoId: momento.id,
          tipo: momento.tipo,
          autorId: momento.autor_id,
          localId: momento.local_id,
          currentUserId: user.id,
          activeProfileType,
          activeProfileId,
          isInteractingAsUser,
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

          if (isOwnMomento) {
            currentUserMomento = authorInfo;
            console.log('[MomentoCarousel] ✅ Found own momento:', {
              id: authorInfo.id,
              nombre: authorInfo.nombre,
              tipo: authorInfo.tipo,
            });
          }
        }

        const author = authorsMap.get(authorKey)!;
        author.momentosCount++;
        
        if (!viewedMomentoIds.has(momento.id)) {
          author.hasUnviewed = true;
        }

        if (new Date(momento.created_at) > new Date(author.lastMomentoAt)) {
          author.lastMomentoAt = momento.created_at;
        }

        if (isOwnMomento && currentUserMomento) {
          currentUserMomento.momentosCount = author.momentosCount;
          currentUserMomento.hasUnviewed = author.hasUnviewed;
          currentUserMomento.lastMomentoAt = author.lastMomentoAt;
        }
      });

      const filteredAuthors = Array.from(authorsMap.values()).filter(author => {
        const isInteractingAsUser = activeProfileType === 'usuario' || activeProfileType === 'cliente';
        
        if (isInteractingAsUser) {
          const isCurrentUser = author.tipo === 'usuario' && author.id === user.id;
          
          console.log('[MomentoCarousel] 🔍 Filtering user momento:', {
            authorId: author.id,
            authorNombre: author.nombre,
            authorTipo: author.tipo,
            userId: user.id,
            activeProfileType,
            isInteractingAsUser,
            isCurrentUser,
            willExclude: isCurrentUser,
          });
          
          return !isCurrentUser;
        } else if (activeProfileType === 'local') {
          const isCurrentLocal = author.tipo === 'local' && author.id === activeProfileId;
          
          console.log('[MomentoCarousel] 🔍 Filtering local momento:', {
            authorId: author.id,
            authorNombre: author.nombre,
            authorTipo: author.tipo,
            localId: activeProfileId,
            isCurrentLocal,
            willExclude: isCurrentLocal,
          });
          
          return !isCurrentLocal;
        }
        return true;
      });

      const sortedAuthors = filteredAuthors.sort((a, b) => {
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        return new Date(b.lastMomentoAt).getTime() - new Date(a.lastMomentoAt).getTime();
      });

      setAuthors(sortedAuthors);
      setUserMomento(currentUserMomento);

      console.log('[MomentoCarousel] ✅ Final carousel state:', {
        totalMomentos: momentosData.length,
        othersInCarousel: sortedAuthors.length,
        userOwnMomento: currentUserMomento ? 1 : 0,
        userOwnDetails: currentUserMomento ? {
          id: currentUserMomento.id,
          nombre: currentUserMomento.nombre,
          tipo: currentUserMomento.tipo,
        } : null,
        carouselAuthors: sortedAuthors.map(a => ({
          id: a.id,
          nombre: a.nombre,
          tipo: a.tipo,
        })),
      });
    } catch (error) {
      console.error('[MomentoCarousel] ❌ Error loading momentos:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeProfileType, activeProfileId]);

  useEffect(() => {
    loadMomentos();

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
        onPress={() => handleOpenViewer(author.id, author.tipo)}
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

  const renderTuMomento = () => {
    const currentAvatar = activeProfileType === 'local' 
      ? null
      : user?.avatar;

    if (userMomento) {
      return (
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => handleOpenViewer(userMomento.id, userMomento.tipo)}
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
            {/* ✅ CRITICAL FIX: Plus icon positioned ABOVE the momento with higher z-index */}
            <TouchableOpacity 
              style={styles.addIconContainer}
              onPress={(e) => {
                e.stopPropagation();
                handleUploadMomento();
              }}
              activeOpacity={0.7}
            >
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
            </TouchableOpacity>
          </View>

          <Text style={styles.avatarName} numberOfLines={1}>
            Tu Momento
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={handleUploadMomento}
        activeOpacity={0.7}
      >
        <View style={styles.avatarBorderContainer}>
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
            </View>
          </View>
          {/* ✅ CRITICAL FIX: Plus icon positioned ABOVE the avatar with higher z-index */}
          <TouchableOpacity 
            style={styles.addIconContainer}
            onPress={(e) => {
              e.stopPropagation();
              handleUploadMomento();
            }}
            activeOpacity={0.7}
          >
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
          </TouchableOpacity>
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
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderTuMomento()}
          
          {authors.map((author, index) => renderAvatar(author, index))}
        </ScrollView>
      </View>

      {/* ✅ NEW: Momento Viewer Modal */}
      {selectedAuthorId && (
        <MomentoViewer
          visible={viewerVisible}
          authorId={selectedAuthorId}
          authorType={selectedAuthorType}
          onClose={() => {
            setViewerVisible(false);
            setSelectedAuthorId(null);
            loadMomentos(); // Reload to update viewed status
          }}
        />
      )}

      {/* ✅ NEW: Momento Upload Modal */}
      <MomentoUpload
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onSuccess={() => {
          loadMomentos(); // Reload to show new momento
        }}
      />
    </>
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
    position: 'relative',
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
  // ✅ CRITICAL FIX: Improved positioning for plus icon to be ABOVE the momento
  addIconContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.background,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  addIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
