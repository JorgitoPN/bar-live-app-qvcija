
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Usuario {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
}

export default function NuevoChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);

  // Get shared post data from params
  const sharePostId = params.sharePostId as string | undefined;
  const sharePostImage = params.sharePostImage as string | undefined;
  const sharePostAuthor = params.sharePostAuthor as string | undefined;

  const buscarUsuarios = async (query: string) => {
    if (!user || query.trim().length < 2) {
      setUsuarios([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar')
        .or(`nombre.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('id', user.id)
        .eq('activo', true)
        .limit(50);

      if (error) throw error;

      setUsuarios(data || []);
    } catch (error) {
      console.error('[NuevoChat] Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (usuario: Usuario) => {
    // If sharing a post, pass the post data to the conversation
    if (sharePostId && sharePostImage) {
      router.push({
        pathname: `/chat/conversacion`,
        params: { 
          userId: usuario.id,
          sharePostId,
          sharePostImage,
          sharePostAuthor: sharePostAuthor || 'Usuario',
        }
      });
    } else {
      router.push(`/chat/conversacion?userId=${usuario.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {sharePostId ? 'Compartir publicación' : 'Nuevo Mensaje'}
        </Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {sharePostId && sharePostImage && (
        <View style={styles.sharePreviewContainer}>
          <Image source={{ uri: sharePostImage }} style={styles.sharePreviewImage} />
          <View style={styles.sharePreviewInfo}>
            <Text style={styles.sharePreviewTitle}>Publicación de {sharePostAuthor}</Text>
            <Text style={styles.sharePreviewSubtitle}>Selecciona un usuario para compartir</Text>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar usuario..."
          placeholderTextColor={colors.textSecondary}
          value={busqueda}
          onChangeText={(text) => {
            setBusqueda(text);
            buscarUsuarios(text);
          }}
          autoFocus
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.userCard} onPress={() => handleSelectUser(item)}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{item.nombre.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.nombre}</Text>
                {item.username && <Text style={styles.userUsername}>@{item.username}</Text>}
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {busqueda.trim().length < 2 ? (
                <>
                  <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>Busca un usuario para {sharePostId ? 'compartir' : 'iniciar un chat'}</Text>
                </>
              ) : (
                <>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No se encontraron usuarios</Text>
                </>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  sharePreviewContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  sharePreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
  },
  sharePreviewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  sharePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sharePreviewSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
