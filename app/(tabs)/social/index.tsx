
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import PublicacionCard from '@/components/social/PublicacionCard';
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function SocialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push('/crear/publicacion')}>
            {/* ✅ FIX v103.0: Changed from invalid "plus" to valid "add" for Android */}
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name="add"
              size={scaleIconSize(28)}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/perfil/notificaciones')}>
            {/* ✅ FIX v103.0: Changed from invalid "bell" to valid "notifications" for Android */}
            <IconSymbol
              ios_icon_name="bell"
              android_material_icon_name="notifications"
              size={scaleIconSize(28)}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/perfil/chats')}>
            {/* ✅ FIX v103.0: Changed from invalid "message" to valid "chat" for Android */}
            <IconSymbol
              ios_icon_name="message"
              android_material_icon_name="chat"
              size={scaleIconSize(28)}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={posts}
        renderItem={({ item }) => <PublicacionCard post={item} onUpdate={loadPosts} />}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? <ActivityIndicator size="large" color={colors.primary} /> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: scaleFontSize(28),
    fontWeight: 'bold',
    color: '#fff',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
});
