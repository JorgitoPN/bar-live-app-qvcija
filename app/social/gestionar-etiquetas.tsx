
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
  Alert,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

/**
 * ✅ GESTIONAR ETIQUETAS PAGE v328.0 - MODAL STACK GROUP FIX
 * 
 * NEW CHANGES v328.0:
 * - ✅ FIXED: Page is part of Stack.Group with post viewer
 * - ✅ FIXED: Opens as fullScreenModal ON TOP of post viewer
 * - ✅ FIXED: Post viewer stays mounted and visible in background
 * - ✅ IMPROVED: router.back() returns to post viewer which auto-refreshes
 * 
 * TECHNICAL EXPLANATION:
 * - This page is registered in Stack.Group in _layout.tsx
 * - When opened via router.push(), it stacks on top of PostViewerModal
 * - PostViewerModal remains mounted and uses useFocusEffect to refresh
 * - When this page closes, PostViewerModal regains focus and updates tags
 * 
 * Previous changes v327.0:
 * - ✅ FIXED: Page now opens as fullScreenModal, not covered by post viewer
 * - ✅ FIXED: Proper z-index - page is always on top
 * - ✅ IMPROVED: No visual glitches when opening from profile grid posts
 */

export interface TaggableUser {
  id: string;
  nombre: string;
  username: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

export default function GestionarEtiquetasScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const postId = params.postId as string;

  const { user } = useAuth();
  
  const [existingTags, setExistingTags] = useState<TaggableUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ v320.0: Integrated search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TaggableUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadExistingTags = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[GestionarEtiquetas v328.0] 🔄 Loading tags for post:', postId);

      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('post_id', postId);

      if (error) throw error;

      const tags: TaggableUser[] = [];
      
      if (data) {
        data.forEach(tag => {
          if (tag.tipo === 'usuario' && tag.usuario) {
            tags.push({
              id: tag.usuario.id,
              nombre: tag.usuario.nombre,
              username: tag.usuario.username || tag.usuario.nombre,
              avatar: tag.usuario.avatar,
              tipo: 'usuario',
            });
          } else if (tag.tipo === 'local' && tag.local) {
            tags.push({
              id: tag.local.id,
              nombre: tag.local.nombre,
              username: tag.local.nombre,
              avatar: tag.local.imagen_url,
              tipo: 'local',
            });
          }
        });
      }

      console.log('[GestionarEtiquetas v328.0] ✅ Loaded', tags.length, 'tags');
      setExistingTags(tags);
    } catch (error) {
      console.error('[GestionarEtiquetas v328.0] Error loading tags:', error);
      Alert.alert('Error', 'No se pudieron cargar las etiquetas');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      loadExistingTags();
    }
  }, [postId, loadExistingTags]);

  // ✅ v320.0: Integrated search functionality
  const searchUsersAndLocals = useCallback(async (query: string) => {
    const cleanQuery = query.trim();
    
    if (cleanQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log('[GestionarEtiquetas v326.0] 🔍 Searching for users and locals with query:', cleanQuery);
      
      const results: TaggableUser[] = [];

      // Search users
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .or(`username.ilike.%${cleanQuery}%,nombre.ilike.%${cleanQuery}%`)
          .eq('activo', true)
          .eq('permitir_etiquetas', true)
          .limit(10);

        if (!usersError && usersData) {
          const filteredUsers = usersData.filter(
            (u) => !existingTags.find((t) => t.id === u.id && t.tipo === 'usuario')
          );

          results.push(...filteredUsers.map(u => ({
            id: u.id,
            nombre: u.nombre,
            username: u.username || u.nombre,
            avatar: u.avatar,
            tipo: 'usuario' as const,
          })));
        }
      } catch (error) {
        console.error('[GestionarEtiquetas v328.0] Error searching users:', error);
      }

      // Search locals with active subscriptions
      try {
        const { data: localsData, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .ilike('nombre', `%${cleanQuery}%`)
          .eq('activo', true)
          .limit(20);

        if (!localsError && localsData && localsData.length > 0) {
          const localIds = localsData.map(l => l.id);
          
          const { data: subscriptionsData } = await supabase
            .from('suscripciones_locales')
            .select(`
              local_id,
              estado,
              plan_id,
              planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre)
            `)
            .in('local_id', localIds)
            .eq('estado', 'activa');

          if (subscriptionsData) {
            const validLocalIds = subscriptionsData
              .filter(sub => {
                const planName = (sub.planes_suscripcion as any)?.nombre;
                return planName === 'estandar' || planName === 'premium';
              })
              .map(sub => sub.local_id);

            const filteredLocalsData = localsData
              .filter(local => validLocalIds.includes(local.id))
              .filter(l => !existingTags.find((t) => t.id === l.id && t.tipo === 'local'));

            results.push(...filteredLocalsData.map(l => ({
              id: l.id,
              nombre: l.nombre,
              username: l.nombre,
              avatar: l.imagen_url,
              tipo: 'local' as const,
            })));
          }
        }
      } catch (error) {
        console.error('[GestionarEtiquetas v328.0] Error searching locals:', error);
      }

      console.log('[GestionarEtiquetas v328.0] ✅ Found', results.length, 'results');
      setSearchResults(results);
    } catch (error) {
      console.error('[GestionarEtiquetas v328.0] Error in searchUsersAndLocals:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [existingTags]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const timeoutId = setTimeout(() => {
        searchUsersAndLocals(searchQuery);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchUsersAndLocals]);

  const handleRemoveTag = useCallback(async (taggedUser: TaggableUser) => {
    if (!postId) return;

    Alert.alert(
      'Eliminar etiqueta',
      `¿Estás seguro de que quieres eliminar la etiqueta de ${taggedUser.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[GestionarEtiquetas v328.0] 🗑️ Removing tag:', taggedUser.id);

              const { error } = await supabase
                .from('post_tags')
                .delete()
                .eq('post_id', postId)
                .eq(taggedUser.tipo === 'usuario' ? 'usuario_id' : 'local_id', taggedUser.id);

              if (error) throw error;

              console.log('[GestionarEtiquetas v328.0] ✅ Tag removed successfully');
              setExistingTags(prev => prev.filter(t => !(t.id === taggedUser.id && t.tipo === taggedUser.tipo)));
            } catch (error) {
              console.error('[GestionarEtiquetas v328.0] Error removing tag:', error);
              Alert.alert('Error', 'No se pudo eliminar la etiqueta');
            }
          },
        },
      ]
    );
  }, [postId]);

  const handleAddNewTag = useCallback(async (selectedUser: TaggableUser) => {
    if (!user || !postId) return;

    try {
      console.log('[GestionarEtiquetas v328.0] ➕ Adding new tag:', selectedUser.id);

      const tagData: any = {
        post_id: postId,
        tipo: selectedUser.tipo,
        estado: 'pendiente',
        tagged_by_user_id: user.id,
        imagen_index: 0,
        position_x: 0.5,
        position_y: 0.5,
      };

      if (selectedUser.tipo === 'usuario') {
        tagData.usuario_id = selectedUser.id;
      } else {
        tagData.local_id = selectedUser.id;
      }

      const { error: tagError } = await supabase
        .from('post_tags')
        .insert(tagData);

      if (tagError) throw tagError;

      // Send notification
      const notificationData: any = {
        tipo: 'mencion',
        titulo: 'Te han etiquetado',
        mensaje: `${user.nombre} te ha etiquetado en una publicación`,
        usuario_origen_id: user.id,
        post_id: postId,
      };

      if (selectedUser.tipo === 'usuario') {
        notificationData.usuario_id = selectedUser.id;
        await supabase.from('notificaciones').insert(notificationData);
      } else {
        const { data: owners } = await supabase
          .from('propietarios_locales')
          .select('propietario_id')
          .eq('local_id', selectedUser.id)
          .eq('activo', true);

        if (owners && owners.length > 0) {
          const notifications = owners.map(owner => ({
            ...notificationData,
            usuario_id: owner.propietario_id,
            local_origen_id: selectedUser.id,
          }));

          await supabase.from('notificaciones').insert(notifications);
        }
      }

      console.log('[GestionarEtiquetas v328.0] ✅ Tag added successfully');
      
      // Clear search and reload tags
      setSearchQuery('');
      setSearchResults([]);
      Keyboard.dismiss();
      loadExistingTags();
    } catch (error) {
      console.error('[GestionarEtiquetas v328.0] Error adding tag:', error);
      Alert.alert('Error', 'No se pudo añadir la etiqueta');
    }
  }, [user, postId, loadExistingTags]);

  const renderExistingTag = useCallback(({ item }: { item: TaggableUser }) => (
    <View style={styles.tagItem}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.tagAvatar} />
      ) : (
        <View style={[styles.tagAvatar, styles.tagAvatarPlaceholder]}>
          <IconSymbol 
            ios_icon_name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
            android_material_icon_name={item.tipo === 'local' ? 'business' : 'person'}
            size={20} 
            color={colors.textSecondary} 
          />
        </View>
      )}
      <View style={styles.tagInfo}>
        <Text style={[styles.tagName, { fontSize: scaleFontSize(15) }]}>{item.nombre}</Text>
        <Text style={[styles.tagType, { fontSize: scaleFontSize(13) }]}>
          {item.tipo === 'local' ? 'Local' : `@${item.username}`}
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => handleRemoveTag(item)}
        style={styles.removeButton}
      >
        <IconSymbol 
          ios_icon_name="trash" 
          android_material_icon_name="delete" 
          size={20} 
          color="#EF4444" 
        />
      </TouchableOpacity>
    </View>
  ), [handleRemoveTag]);

  const renderSearchResult = useCallback(({ item }: { item: TaggableUser }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleAddNewTag(item)}
      activeOpacity={0.7}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.searchResultAvatar} />
      ) : (
        <View style={[styles.searchResultAvatar, styles.avatarPlaceholder]}>
          <IconSymbol 
            ios_icon_name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
            android_material_icon_name={item.tipo === 'local' ? 'business' : 'person'}
            size={scaleIconSize(20)} 
            color={colors.textSecondary} 
          />
        </View>
      )}
      <View style={styles.searchResultInfo}>
        <Text style={[styles.searchResultName, { fontSize: scaleFontSize(16) }]}>{item.nombre}</Text>
        <View style={styles.searchResultTypeContainer}>
          {item.tipo === 'local' ? (
            <>
              <IconSymbol 
                ios_icon_name="building.2.fill" 
                android_material_icon_name="business" 
                size={scaleIconSize(14)} 
                color="#F59E0B" 
              />
              <Text style={[styles.searchResultType, { fontSize: scaleFontSize(14), color: '#F59E0B' }]}>Local</Text>
            </>
          ) : (
            <Text style={[styles.searchResultType, { fontSize: scaleFontSize(14) }]}>@{item.username}</Text>
          )}
        </View>
      </View>
      <IconSymbol 
        ios_icon_name="plus.circle.fill" 
        android_material_icon_name="add_circle" 
        size={scaleIconSize(24)} 
        color={item.tipo === 'local' ? '#F59E0B' : colors.primary} 
      />
    </TouchableOpacity>
  ), [handleAddNewTag]);

  const renderEmptyExistingTags = () => (
    <View style={styles.emptyState}>
      <IconSymbol 
        ios_icon_name="person.crop.circle.badge.plus" 
        android_material_icon_name="person_add" 
        size={Platform.OS === 'android' ? scaleIconSize(48) : 48} 
        color={colors.textSecondary} 
      />
      <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>No hay etiquetas</Text>
      <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
        Busca personas o locales abajo para añadir etiquetas
      </Text>
    </View>
  );

  const renderEmptySearchResults = () => {
    if (searchQuery.length === 0) {
      return (
        <View style={styles.emptySearchState}>
          <IconSymbol 
            ios_icon_name="magnifyingglass" 
            android_material_icon_name="search" 
            size={scaleIconSize(48)} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.emptySearchText, { fontSize: scaleFontSize(16) }]}>Busca personas o locales</Text>
          <Text style={[styles.emptySearchSubtext, { fontSize: scaleFontSize(14) }]}>
            Escribe para ver resultados
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptySearchState}>
        <IconSymbol 
          ios_icon_name="magnifyingglass" 
          android_material_icon_name="search" 
          size={scaleIconSize(48)} 
          color={colors.textSecondary} 
        />
        <Text style={[styles.emptySearchText, { fontSize: scaleFontSize(16) }]}>No se encontraron resultados</Text>
        <Text style={[styles.emptySearchSubtext, { fontSize: scaleFontSize(14) }]}>
          Intenta con otro nombre
        </Text>
      </View>
    );
  };

  const backIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
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
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(18) }]}>Gestionar etiquetas</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {/* ✅ v320.0: Section 1 - Existing Tags */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol 
                  ios_icon_name="tag.fill" 
                  android_material_icon_name="label" 
                  size={scaleIconSize(18)} 
                  color={colors.primary} 
                />
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Etiquetas actuales</Text>
              </View>
              
              {existingTags.length > 0 ? (
                <FlatList
                  data={existingTags}
                  renderItem={renderExistingTag}
                  keyExtractor={(item) => `${item.id}-${item.tipo}`}
                  contentContainerStyle={styles.tagsList}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                renderEmptyExistingTags()
              )}
            </View>

            {/* ✅ v320.0: Section 2 - Search (Integrated directly, no modal) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol 
                  ios_icon_name="magnifyingglass" 
                  android_material_icon_name="search" 
                  size={scaleIconSize(18)} 
                  color={colors.primary} 
                />
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Buscar personas o locales</Text>
              </View>

              {/* Search Input */}
              <View style={styles.searchContainer}>
                <IconSymbol 
                  ios_icon_name="magnifyingglass" 
                  android_material_icon_name="search" 
                  size={scaleIconSize(20)} 
                  color={colors.textSecondary} 
                />
                <TextInput
                  style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
                  placeholder="Escribe para buscar..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }} 
                    activeOpacity={0.7}
                  >
                    <IconSymbol 
                      ios_icon_name="xmark.circle.fill" 
                      android_material_icon_name="cancel" 
                      size={scaleIconSize(20)} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results */}
              {searchLoading ? (
                <View style={styles.searchLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.searchLoadingText, { fontSize: scaleFontSize(14) }]}>Buscando...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResult}
                  keyExtractor={(item) => `${item.id}-${item.tipo}`}
                  contentContainerStyle={styles.searchResultsList}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                renderEmptySearchResults()
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
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
  contentContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.cardBackground,
    marginBottom: 8,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  tagsList: {
    paddingBottom: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tagAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  tagAvatarPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  tagType: {
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  searchLoadingText: {
    color: colors.textSecondary,
  },
  searchResultsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchResultType: {
    color: colors.textSecondary,
  },
  emptySearchState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptySearchText: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySearchSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
