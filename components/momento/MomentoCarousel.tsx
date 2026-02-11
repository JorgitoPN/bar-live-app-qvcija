
/**
 * ✅ MOMENTO CAROUSEL v160.0 - LEFT ALIGNMENT FIX (FINAL)
 * 
 * CRITICAL FIXES v160.0:
 * - ✅ FIXED: Avatars now aligned to the left (paddingLeft: 20 matches page content)
 * - ✅ FIXED: Removed extra gap that was pushing avatars to the right
 * - ✅ FIXED: scrollContent paddingLeft = 20 (same as other page content)
 * - ✅ RESULTADO: Avatars alineados a la izquierda igual que el contenido de las páginas
 * - ✅ RESULTADO: Alineación consistente con el resto de la aplicación
 * 
 * Previous changes v159.0:
 * - ✅ FIXED: Avatars now aligned to the left (paddingLeft: 20 matches page content)
 * - ✅ FIXED: Removed extra gap that was pushing avatars to the right
 * - ✅ RESULTADO: Avatars alineados a la izquierda igual que el contenido de las páginas
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

  // ✅ ANDROID SCALING v158.0: Avatar size INCREASED for better visibility (48px -> 56px base)
  const AVATAR_SIZE = Platform.OS === 'android' ? scaleIconSize(112) : 100;

  const loadMomentoAuthors = useCallback(async () => {
    if (!userId) {
      console.log('[MomentoCarousel] No user ID, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('[MomentoCarousel] 🔄 Loading momento authors...');

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
        console.error('[MomentoCarousel] ❌ Error loading momentos:', momentosError);
        setLoading(false);
        return;
      }

      if (!momentosData || momentosData.length === 0) {
        console.log('[MomentoCarousel] ℹ️ No active momentos found');
        setAuthors([]);
        setLoading(false);
        return;
      }

      console.log('[MomentoCarousel] ✅ Found momentos:', momentosData.length);

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
      console.log('[MomentoCarousel] ✅ Loaded authors:', authorsArray.length);
    } catch (error) {
      console.error('[MomentoCarousel] ❌ Error loading authors:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMomentoAuthors();

    if (!userId) return;

    const momentosChannel = supabase
      .channel('momento-carousel-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
        },
        (payload) => {
          console.log('[MomentoCarousel] 🔄 Momento update detected:', payload);
          loadMomentoAuthors();
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
          console.log('[MomentoCarousel] 🔄 View update detected:', payload);
          loadMomentoAuthors();
        }
      )
      .subscribe();

    return () => {
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

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.avatarWrapper}>
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          authors
            .filter(author => !(author.tipo === 'usuario' && author.id === userId))
            .map((author) => (
              <View key={`${author.tipo}-${author.id}`} style={styles.avatarWrapper}>
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
  // ✅ FIX v160.0: paddingLeft = 20 para alinear con el contenido de las páginas
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 16,
    gap: 18,
  },
  avatarWrapper: {
    alignItems: 'center',
    width: 108,
  },
  authorName: {
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    width: 108,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
