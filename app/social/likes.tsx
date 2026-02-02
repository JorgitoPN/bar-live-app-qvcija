
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

interface LikeUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

/**
 * ✅ LIKES FULL SCREEN PAGE v316.0
 * 
 * NEW IMPLEMENTATION v316.0:
 * - ✅ Full-screen page instead of modal
 * - ✅ Uses Stack navigation with back button
 * - ✅ Proper header with gradient
 * - ✅ All functionality from PostLikesAvatars modal preserved
 * - ✅ Better UX with full-screen real estate
 */

export default function LikesScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const postId = params.postId as string;

  const { user } = useAuth();
  
  const [allLikes, setAllLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllLikes = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[LikesScreen v316.0] 🔄 Loading all likes for post:', postId);

      const { data, error } = await supabase
        .from('likes')
        .select(`
          usuario_id,
          usuarios!likes_usuario_id_fkey(id, nombre, username, avatar)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const users = data
          .filter(like => like.usuarios)
          .map((like: any) => ({
            id: like.usuarios.id,
            nombre: like.usuarios.nombre,
            username: like.usuarios.username,
            avatar: like.usuarios.avatar,
            tipo: 'usuario' as const,
          }));
        
        console.log('[LikesScreen v316.0] ✅ Loaded', users.length, 'likes');
        setAllLikes(users);
      }
    } catch (error) {
      console.error('[LikesScreen v316.0] Error loading all likes:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      loadAllLikes();
    }
  }, [postId, loadAllLikes]);

  const handleUserPress = useCallback((userId: string, tipo: 'usuario' | 'local') => {
    if (tipo === 'usuario' && user && userId === user.id) {
      router.push('/(tabs)/perfil');
    } else if (tipo === 'local') {
      router.push({
        pathname: '/perfil/local',
        params: { localId: userId },
      });
    } else {
      router.push({
        pathname: '/perfil/usuario',
        params: { userId },
      });
    }
  }, [user, router]);

  const renderLikeUser = useCallback(({ item }: { item: LikeUser }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item.id, item.tipo)}
      activeOpacity={0.7}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={[styles.avatarText, { fontSize: scaleFontSize(16) }]}>
            {item.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { fontSize: scaleFontSize(15) }]}>{item.nombre}</Text>
        {item.username && (
          <Text style={[styles.username, { fontSize: scaleFontSize(13) }]}>@{item.username}</Text>
        )}
      </View>
      {user && item.id === user.id && (
        <View style={styles.youBadge}>
          <Text style={[styles.youBadgeText, { fontSize: scaleFontSize(12) }]}>Tú</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [user, handleUserPress]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol
        ios_icon_name="heart"
        android_material_icon_name="favorite_border"
        size={Platform.OS === 'android' ? scaleIconSize(64) : 64}
        color={colors.textSecondary}
      />
      <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No hay me gusta aún</Text>
      <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>Sé el primero en dar me gusta</Text>
    </View>
  );

  const backIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
        
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={backIconSize} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(18) }]}>Me gusta</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={allLikes}
            renderItem={renderLikeUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    color: colors.text,
  },
  username: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  youBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  youBadgeText: {
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
