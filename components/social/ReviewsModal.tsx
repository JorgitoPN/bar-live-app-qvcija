
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ParsedText from '@/components/social/ParsedText';

interface Review {
  id: string;
  local_id: string;
  usuario_id: string;
  rating: number;
  texto?: string;
  created_at: string;
  usuario?: {
    nombre?: string;
    avatar?: string;
  };
}

interface ReviewsModalProps {
  visible: boolean;
  localId: string;
  onClose: () => void;
  onReviewAdded?: () => void;
}

/**
 * ✅ REVIEW SYSTEM v18.0 - COMPLETE REDESIGN
 * 
 * Key features:
 * - Dedicated modal for reviews (not comments)
 * - Simple text field for writing reviews
 * - Star rating system (1-5 stars)
 * - Proper session validation before submission
 * - Enhanced error handling with specific messages
 * - Optimistic UI updates
 * - Real-time review list
 */

export default function ReviewsModal({
  visible,
  localId,
  onClose,
  onReviewAdded,
}: ReviewsModalProps) {
  const { user, ensureValidSession } = useAuth();
  const textInputRef = useRef<TextInput>(null);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[ReviewsModal v18.0] ⌨️ Keyboard shown, height:', e.endCoordinates.height);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[ReviewsModal v18.0] ⌨️ Keyboard hidden');
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: reviewsData, error } = await supabase
        .from('reviews_barlive')
        .select(`
          *,
          usuario:usuario_id (
            nombre,
            avatar
          )
        `)
        .eq('local_id', localId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ReviewsModal v18.0] ❌ Error loading reviews:', error);
        throw error;
      }

      console.log('[ReviewsModal v18.0] ✅ Loaded', reviewsData?.length || 0, 'reviews');
      setReviews(reviewsData || []);
    } catch (error) {
      console.error('[ReviewsModal v18.0] ❌ Error:', error);
      Alert.alert('Error', 'No se pudieron cargar las reseñas');
    } finally {
      setLoading(false);
    }
  }, [localId]);

  useEffect(() => {
    if (visible) {
      loadReviews();
    }
  }, [visible, localId, loadReviews]);

  const handleSendReview = async () => {
    if (!user || !reviewText.trim() || rating === 0 || sending) {
      if (rating === 0) {
        Alert.alert('Error', 'Por favor selecciona una calificación');
      }
      return;
    }

    const text = reviewText.trim();
    setReviewText('');
    setRating(0);
    setSending(true);

    try {
      // ✅ CRITICAL FIX v18.0: Ensure valid session before sending review
      console.log('[ReviewsModal v18.0] 🔄 Step 1: Ensuring valid session...');
      const validSession = await ensureValidSession();
      
      if (!validSession || !validSession.user) {
        console.error('[ReviewsModal v18.0] ❌ No valid session available');
        Alert.alert(
          'Error de autenticación',
          'Tu sesión ha expirado. Por favor inicia sesión de nuevo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Iniciar sesión', 
              onPress: () => {
                onClose();
              }
            }
          ]
        );
        setReviewText(text);
        setRating(rating);
        setSending(false);
        return;
      }

      console.log('[ReviewsModal v18.0] ✅ Step 1 complete: Valid session confirmed, user ID:', validSession.user.id);

      // ✅ CRITICAL FIX v18.0: Check if user already has a review for this local
      console.log('[ReviewsModal v18.0] 🔍 Step 2: Checking for existing review...');
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews_barlive')
        .select('id')
        .eq('local_id', localId)
        .eq('usuario_id', validSession.user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[ReviewsModal v18.0] ❌ Error checking existing review:', checkError);
        throw checkError;
      }

      if (existingReview) {
        console.log('[ReviewsModal v18.0] ⚠️ User already has a review, updating instead');
        
        // Update existing review
        const { error: updateError } = await supabase
          .from('reviews_barlive')
          .update({
            texto: text,
            rating: rating,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReview.id);

        if (updateError) {
          console.error('[ReviewsModal v18.0] ❌ Error updating review:', updateError);
          throw updateError;
        }

        console.log('[ReviewsModal v18.0] ✅ Review updated successfully');
        Alert.alert('Éxito', 'Tu reseña ha sido actualizada');
      } else {
        console.log('[ReviewsModal v18.0] ✅ Step 2 complete: No existing review found');

        // ✅ CRITICAL FIX v18.0: Use validSession.user.id for insertion
        const reviewData = {
          local_id: localId,
          usuario_id: validSession.user.id,
          texto: text,
          rating: rating,
        };

        console.log('[ReviewsModal v18.0] 📝 Step 3: Inserting review with data:', reviewData);

        const { data: newReview, error: insertError } = await supabase
          .from('reviews_barlive')
          .insert(reviewData)
          .select(`
            *,
            usuario:usuario_id (
              nombre,
              avatar
            )
          `)
          .single();

        if (insertError) {
          console.error('[ReviewsModal v18.0] ❌ Error inserting review:', insertError);
          
          // ✅ CRITICAL FIX v18.0: Specific error messages
          if (insertError.code === '42501') {
            Alert.alert(
              'Error de autenticación',
              'No tienes permisos para enviar reseñas. Por favor inicia sesión de nuevo.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Iniciar sesión', 
                  onPress: () => {
                    onClose();
                  }
                }
              ]
            );
          } else if (insertError.code === '23505') {
            Alert.alert('Error', 'Ya has enviado una reseña para este local');
          } else {
            Alert.alert('Error', `No se pudo enviar la reseña: ${insertError.message}`);
          }
          
          throw insertError;
        }

        console.log('[ReviewsModal v18.0] ✅ Step 3 complete: Review inserted successfully:', newReview.id);

        // ✅ Optimistic UI update
        setReviews(prev => [newReview, ...prev]);
        
        Alert.alert('Éxito', 'Tu reseña ha sido publicada');
      }

      // Reload reviews to ensure sync
      await loadReviews();
      
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (error: any) {
      console.error('[ReviewsModal v18.0] ❌ Error sending review:', error);
      
      // Restore text and rating on error
      setReviewText(text);
      setRating(rating);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para eliminar reseñas');
      return;
    }

    Alert.alert(
      'Eliminar reseña',
      '¿Estás seguro de que quieres eliminar esta reseña?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // ✅ CRITICAL FIX v18.0: Ensure valid session before deletion
              console.log('[ReviewsModal v18.0] 🔄 Ensuring valid session for deletion...');
              const validSession = await ensureValidSession();
              
              if (!validSession || !validSession.user) {
                console.error('[ReviewsModal v18.0] ❌ No valid session available');
                Alert.alert('Error', 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
                return;
              }

              console.log('[ReviewsModal v18.0] ✅ Valid session confirmed, deleting review:', reviewId);
              
              const { error: deleteError } = await supabase
                .from('reviews_barlive')
                .delete()
                .eq('id', reviewId)
                .eq('usuario_id', validSession.user.id);

              if (deleteError) {
                console.error('[ReviewsModal v18.0] ❌ Error deleting review:', deleteError);
                Alert.alert('Error', `No se pudo eliminar la reseña: ${deleteError.message}`);
                return;
              }

              console.log('[ReviewsModal v18.0] ✅ Review deleted successfully');
              
              // ✅ Optimistic UI update
              setReviews(prev => prev.filter(r => r.id !== reviewId));
              
              Alert.alert('Éxito', 'Reseña eliminada correctamente');
              
              if (onReviewAdded) {
                onReviewAdded();
              }
            } catch (error) {
              console.error('[ReviewsModal v18.0] ❌ Unexpected error deleting review:', error);
              Alert.alert('Error', 'No se pudo eliminar la reseña');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}sem`;
  };

  const renderReview = ({ item }: { item: Review }) => {
    const isOwner = user && item.usuario_id === user.id;

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewAvatar}>
            {item.usuario?.avatar ? (
              <Image source={{ uri: item.usuario.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.usuario?.nombre?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewAuthor}>
              {isOwner ? 'Tu reseña' : item.usuario?.nombre || 'Usuario'}
            </Text>
            <View style={styles.reviewRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <IconSymbol
                  key={star}
                  ios_icon_name={star <= item.rating ? 'star.fill' : 'star'}
                  android_material_icon_name={star <= item.rating ? 'star' : 'star_border'}
                  size={14}
                  color="#FFD700"
                />
              ))}
            </View>
          </View>
          <Text style={styles.reviewTime}>{formatTimeAgo(item.created_at)}</Text>
          {isOwner && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteReview(item.id)}
            >
              <IconSymbol 
                ios_icon_name="trash" 
                android_material_icon_name="delete" 
                size={18} 
                color="#EF4444" 
              />
            </TouchableOpacity>
          )}
        </View>
        {item.texto && (
          <ParsedText text={item.texto} style={styles.reviewText} />
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol
        ios_icon_name="star"
        android_material_icon_name="star_border"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyText}>No hay reseñas aún</Text>
      <Text style={styles.emptySubtext}>Sé el primero en dejar una reseña</Text>
    </View>
  );

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
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reseñas</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={reviews}
            renderItem={renderReview}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {user && (
          <BlurView 
            intensity={80} 
            tint="light" 
            style={[styles.inputContainer, { bottom: keyboardHeight > 0 ? keyboardHeight : 0 }]}
          >
            <View style={styles.ratingSelector}>
              <Text style={styles.ratingLabel}>Calificación:</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <IconSymbol
                      ios_icon_name={star <= rating ? 'star.fill' : 'star'}
                      android_material_icon_name={star <= rating ? 'star' : 'star_border'}
                      size={32}
                      color={star <= rating ? '#FFD700' : 'rgba(0, 0, 0, 0.3)'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputRow}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.inputAvatar} />
              ) : (
                <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
                  <Text style={[styles.avatarText, { fontSize: 14 }]}>
                    {user.nombre?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <TextInput
                ref={textInputRef}
                style={styles.input}
                placeholder="Escribe tu reseña..."
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                maxLength={500}
                editable={!sending}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendReview}
                disabled={!reviewText.trim() || rating === 0 || sending}
                activeOpacity={0.7}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.sendButtonText, (!reviewText.trim() || rating === 0 || sending) && styles.sendButtonDisabled]}>
                    Publicar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
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
    fontSize: 18,
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
  listContent: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingBottom: 200,
  },
  reviewCard: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 4,
  },
  reviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 8,
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  ratingSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginRight: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#fff',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    maxHeight: 80,
    paddingVertical: 8,
  },
  sendButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
