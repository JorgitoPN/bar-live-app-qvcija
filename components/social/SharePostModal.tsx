
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import MiniFoodPlateAvatar from '@/components/common/MiniFoodPlateAvatar';
import ViewShot from 'react-native-view-shot';
import { useRouter } from 'expo-router';

interface User {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
}

interface Local {
  id: string;
  nombre: string;
  imagen_url?: string;
  plan?: string;
}

interface SharePostModalProps {
  visible: boolean;
  postId: string;
  postContent?: string;
  postImage?: string;
  postAuthorName?: string;
  postAuthorAvatar?: string;
  onClose: () => void;
}

/**
 * ✅ SHARE POST MODAL v3.3 - FIXED POST_COMPARTIDO_ID
 * 
 * Changes:
 * - ✅ CRITICAL FIX: Changed 'post_id' to 'post_compartido_id' to match MessageBubble expectations
 * - ✅ Fixed: Now uploads to 'posts' bucket instead of non-existent 'post-previews'
 * - ✅ Fixed: Uses ArrayBuffer instead of Blob for React Native compatibility
 * - ✅ Includes post preview card with image
 * - ✅ Captures screenshot of post preview
 * - ✅ Sends image with message
 * - ✅ Image is clickable in chat to navigate to post
 */

export default function SharePostModal({
  visible,
  postId,
  postContent,
  postImage,
  postAuthorName,
  postAuthorAvatar,
  onClose,
}: SharePostModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allLocals, setAllLocals] = useState<Local[]>([]);
  const [filteredResults, setFilteredResults] = useState<(User | Local)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [postPreviewUri, setPostPreviewUri] = useState<string | null>(null);

  const loadRecipients = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[SharePostModal] 📥 Loading recipients for user:', user.id);

      const [followersResult, followingResult] = await Promise.all([
        supabase
          .from('seguidores')
          .select('seguidor_id, seguidor:usuarios!seguidores_seguidor_id_fkey(id, nombre, username, avatar)')
          .eq('seguido_id', user.id)
          .is('local_id', null),
        supabase
          .from('seguidores')
          .select('seguido_id, seguido:usuarios!seguidores_seguido_id_fkey(id, nombre, username, avatar)')
          .eq('seguidor_id', user.id)
          .is('local_id', null),
      ]);

      const followersUsers = followersResult.data?.map(f => f.seguidor).filter(Boolean) || [];
      const followingUsers = followingResult.data?.map(f => f.seguido).filter(Boolean) || [];
      
      const allUsersData = [...followersUsers, ...followingUsers];
      const uniqueUsers = Array.from(
        new Map(allUsersData.map(u => [u.id, u])).values()
      );

      setAllUsers(uniqueUsers as User[]);

      const { data: localsWithPlans } = await supabase
        .from('suscripciones_locales')
        .select(`
          local_id,
          estado,
          plan:planes_suscripcion(nombre),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('estado', 'activa')
        .in('plan.nombre', ['standard', 'premium']);

      const activeLocals = localsWithPlans
        ?.filter(sl => sl.local)
        .map(sl => ({
          id: sl.local.id,
          nombre: sl.local.nombre,
          imagen_url: sl.local.imagen_url,
          plan: sl.plan?.nombre,
        })) || [];

      setAllLocals(activeLocals as Local[]);
      
      setFilteredResults([...uniqueUsers, ...activeLocals] as (User | Local)[]);
      
      console.log('[SharePostModal] ✅ Loaded recipients:', {
        users: uniqueUsers.length,
        locals: activeLocals.length,
      });
    } catch (error) {
      console.error('[SharePostModal] ❌ Error loading recipients:', error);
      Alert.alert('Error', 'No se pudieron cargar los destinatarios');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Capture post preview as image
  useEffect(() => {
    if (visible && viewShotRef.current) {
      setTimeout(async () => {
        try {
          const uri = await viewShotRef.current?.capture?.();
          if (uri) {
            setPostPreviewUri(uri);
            console.log('[SharePostModal] ✅ Captured post preview:', uri);
          }
        } catch (error) {
          console.error('[SharePostModal] Error capturing post preview:', error);
        }
      }, 500);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedRecipients(new Set());
      setPostPreviewUri(null);
      loadRecipients();
    }
  }, [visible, loadRecipients]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults([...allUsers, ...allLocals]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    const filteredUsers = allUsers.filter(u =>
      u.nombre.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query)
    );

    const filteredLocals = allLocals.filter(l =>
      l.nombre.toLowerCase().includes(query)
    );

    setFilteredResults([...filteredUsers, ...filteredLocals]);
  }, [searchQuery, allUsers, allLocals]);

  const handleShare = async () => {
    if (!user || selectedRecipients.size === 0 || sending) {
      return;
    }

    setSending(true);

    try {
      let imageUrl: string | null = null;
      
      // ✅ FIX: Upload post preview image to 'posts' bucket (which exists)
      if (postPreviewUri) {
        try {
          const response = await fetch(postPreviewUri);
          const arrayBuffer = await response.arrayBuffer();
          const fileName = `shared/post-preview-${postId}-${Date.now()}.jpg`;
          
          console.log('[SharePostModal] 📤 Uploading to posts bucket:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, arrayBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('[SharePostModal] ❌ Upload error:', uploadError);
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(uploadData.path);

          imageUrl = publicUrl;
          console.log('[SharePostModal] ✅ Uploaded post preview:', imageUrl);
        } catch (error) {
          console.error('[SharePostModal] ❌ Error uploading preview:', error);
          // Continue without image if upload fails
        }
      }

      const shareMessage = `📤 Publicación compartida`;
      let successCount = 0;
      let failCount = 0;

      for (const recipientId of selectedRecipients) {
        const isLocal = allLocals.some(l => l.id === recipientId);
        
        let chatId: string;
        
        if (isLocal) {
          const { data: existingChat } = await supabase
            .from('chats')
            .select('id')
            .eq('usuario1_id', user.id)
            .eq('usuario2_id', user.id)
            .eq('local_id', recipientId)
            .maybeSingle();

          if (existingChat) {
            chatId = existingChat.id;
          } else {
            const { data: newChat, error } = await supabase
              .from('chats')
              .insert({
                usuario1_id: user.id,
                usuario2_id: user.id,
                local_id: recipientId,
                ultimo_mensaje: shareMessage,
                ultimo_mensaje_fecha: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) {
              console.error('[SharePostModal] Error creating local chat:', error);
              failCount++;
              continue;
            }
            chatId = newChat.id;
          }
        } else {
          const userId1 = user.id < recipientId ? user.id : recipientId;
          const userId2 = user.id < recipientId ? recipientId : user.id;

          const { data: existingChat } = await supabase
            .from('chats')
            .select('id')
            .eq('usuario1_id', userId1)
            .eq('usuario2_id', userId2)
            .is('local_id', null)
            .maybeSingle();

          if (existingChat) {
            chatId = existingChat.id;
          } else {
            const { data: newChat, error } = await supabase
              .from('chats')
              .insert({
                usuario1_id: userId1,
                usuario2_id: userId2,
                local_id: null,
                ultimo_mensaje: shareMessage,
                ultimo_mensaje_fecha: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) {
              console.error('[SharePostModal] Error creating user chat:', error);
              failCount++;
              continue;
            }
            chatId = newChat.id;
          }
        }

        // ✅ CRITICAL FIX: Use 'post_compartido_id' instead of 'post_id' to match MessageBubble expectations
        const messageData: any = {
          chat_id: chatId,
          remitente_id: user.id,
          contenido: shareMessage,
          post_compartido_id: postId, // ✅ FIXED: Changed from post_id to post_compartido_id
          tipo_mensaje: 'post_compartido',
        };

        if (imageUrl) {
          messageData.post_imagen = imageUrl;
        }

        console.log('[SharePostModal] 📤 Sending message with data:', messageData);

        const { error: messageError } = await supabase.from('mensajes').insert(messageData);

        if (messageError) {
          console.error('[SharePostModal] ❌ Error sending message:', messageError);
          failCount++;
          continue;
        }

        await supabase
          .from('chats')
          .update({
            ultimo_mensaje: shareMessage,
            ultimo_mensaje_fecha: new Date().toISOString(),
          })
          .eq('id', chatId);

        successCount++;
      }

      if (successCount > 0) {
        Alert.alert(
          'Éxito', 
          failCount > 0 
            ? `Publicación compartida con ${successCount} destinatario(s). ${failCount} fallaron.`
            : 'Publicación compartida correctamente'
        );
        setSelectedRecipients(new Set());
        setSearchQuery('');
        onClose();
      } else {
        Alert.alert('Error', 'No se pudo compartir la publicación con ningún destinatario');
      }
    } catch (error) {
      console.error('[SharePostModal] ❌ Error sharing post:', error);
      Alert.alert('Error', 'No se pudo compartir la publicación');
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderItem = ({ item }: { item: User | Local }) => {
    const isUser = 'username' in item;
    const isSelected = selectedRecipients.has(item.id);

    return (
      <TouchableOpacity
        style={styles.recipientItem}
        onPress={() => toggleRecipient(item.id)}
        activeOpacity={0.7}
      >
        <MiniFoodPlateAvatar
          imageUrl={isUser ? (item as User).avatar : (item as Local).imagen_url}
          size={48}
          nombre={item.nombre}
          userId={item.id}
        />
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientName}>{item.nombre}</Text>
          {isUser && (item as User).username && (
            <Text style={styles.recipientUsername}>@{(item as User).username}</Text>
          )}
          {!isUser && (
            <View style={styles.localBadge}>
              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="business" size={12} color="#F59E0B" />
              <Text style={styles.localBadgeText}>Local</Text>
            </View>
          )}
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <IconSymbol
              ios_icon_name="checkmark"
              android_material_icon_name="check"
              size={16}
              color={colors.headerText}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compartir publicación</Text>
          <TouchableOpacity
            style={[styles.sendButton, selectedRecipients.size === 0 && styles.sendButtonDisabled]}
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={selectedRecipients.size === 0 || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={[styles.sendButtonText, selectedRecipients.size === 0 && styles.sendButtonTextDisabled]}>
                Enviar
              </Text>
            )}
          </TouchableOpacity>
        </LinearGradient>

        {/* Post Preview Card (Hidden, used for screenshot) */}
        <View style={styles.previewContainer}>
          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
            <View style={styles.postPreviewCard}>
              <View style={styles.postPreviewHeader}>
                {postAuthorAvatar ? (
                  <Image source={{ uri: postAuthorAvatar }} style={styles.postPreviewAvatar} />
                ) : (
                  <View style={[styles.postPreviewAvatar, styles.postPreviewAvatarPlaceholder]}>
                    <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={16} color={colors.white} />
                  </View>
                )}
                <Text style={styles.postPreviewAuthor}>{postAuthorName || 'Usuario'}</Text>
              </View>
              
              {postImage && (
                <Image source={{ uri: postImage }} style={styles.postPreviewImage} resizeMode="cover" />
              )}
              
              {postContent && (
                <View style={styles.postPreviewContent}>
                  <Text style={styles.postPreviewText} numberOfLines={3}>
                    {postContent}
                  </Text>
                </View>
              )}
              
              <View style={styles.postPreviewFooter}>
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={14} color={colors.primary} />
                <Text style={styles.postPreviewFooterText}>Toca para ver la publicación completa</Text>
              </View>
            </View>
          </ViewShot>
        </View>

        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios o locales..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {selectedRecipients.size > 0 && (
          <View style={styles.selectedCountContainer}>
            <LinearGradient
              colors={[colors.primary + '20', colors.secondary + '20']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.selectedCountGradient}
            >
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.selectedCountText}>
                {selectedRecipients.size} {selectedRecipients.size === 1 ? 'destinatario seleccionado' : 'destinatarios seleccionados'}
              </Text>
            </LinearGradient>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando contactos...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredResults}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="person.2.slash"
                  android_material_icon_name="people_outline"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>
                  {searchQuery.trim() 
                    ? 'No se encontraron resultados' 
                    : 'No hay destinatarios disponibles'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery.trim()
                    ? 'Intenta con otro término de búsqueda'
                    : 'Sigue a usuarios o locales para compartir publicaciones'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headerText,
  },
  sendButtonTextDisabled: {
    opacity: 0.6,
  },
  previewContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  postPreviewCard: {
    width: 300,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  postPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  postPreviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postPreviewAvatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postPreviewAuthor: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  postPreviewImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.background,
  },
  postPreviewContent: {
    padding: 16,
  },
  postPreviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  postPreviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  postPreviewFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  selectedCountContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedCountGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  recipientUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B' + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  localBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
