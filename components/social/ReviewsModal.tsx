
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

interface GoogleReview {
  author_name: string;
  author_url?: string;
  language?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description?: string;
  text?: string;
  time: number;
}

interface ReviewsModalProps {
  visible: boolean;
  localId: string;
  onClose: () => void;
  onReviewAdded?: () => void;
}

export default function ReviewsModal({
  visible,
  localId,
  onClose,
  onReviewAdded,
}: ReviewsModalProps) {
  const { user, ensureValidSession } = useAuth();
  const textInputRef = useRef<TextInput>(null);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const [userExistingReview, setUserExistingReview] = useState<Review | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // ✅ NEW: Pagination state - show 5 by default
  const [displayedReviewsCount, setDisplayedReviewsCount] = useState(5);
  const [totalReviewsCount, setTotalReviewsCount] = useState(0);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[ReviewsModal] ⌨️ Keyboard shown, height:', e.endCoordinates.height);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[ReviewsModal] ⌨️ Keyboard hidden');
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
      
      // ✅ FIXED: Load only Barlive reviews (not Google reviews)
      const { data: reviewsData, error, count } = await supabase
        .from('reviews_barlive')
        .select(`
          *,
          usuario:usuario_id (
            nombre,
            avatar
          )
        `, { count: 'exact' })
        .eq('local_id', localId)
        .order('created_at', { ascending: false })
        .limit(displayedReviewsCount);

      if (error) {
        console.error('[ReviewsModal] ❌ Error loading reviews:', error);
        throw error;
      }

      console.log('[ReviewsModal] ✅ Loaded', reviewsData?.length || 0, 'reviews of', count || 0, 'total');
      setReviews(reviewsData || []);
      setTotalReviewsCount(count || 0);
      
      if (user && reviewsData) {
        const existingReview = reviewsData.find(r => r.usuario_id === user.id);
        if (existingReview) {
          console.log('[ReviewsModal] ✅ User has existing review:', existingReview.id);
          setUserExistingReview(existingReview);
          setIsEditMode(false);
        } else {
          console.log('[ReviewsModal] ℹ️ User has no existing review');
          setUserExistingReview(null);
          setIsEditMode(false);
        }
      }

      // ✅ FIXED: Load Google reviews separately
      const { data: localData } = await supabase
        .from('locales')
        .select('reviews_google')
        .eq('id', localId)
        .single();

      if (localData?.reviews_google && Array.isArray(localData.reviews_google)) {
        console.log('[ReviewsModal] ✅ Loaded', localData.reviews_google.length, 'Google reviews');
        setGoogleReviews(localData.reviews_google);
      }

      // ✅ FIXED: Update local rating based on ALL Barlive reviews
      const { data: allReviewsData, error: allReviewsError } = await supabase
        .from('reviews_barlive')
        .select('rating')
        .eq('local_id', localId);

      if (!allReviewsError && allReviewsData && allReviewsData.length > 0) {
        const avgRating = allReviewsData.reduce((sum, r) => sum + r.rating, 0) / allReviewsData.length;
        
        console.log('[ReviewsModal] 📊 Updating local rating based on', allReviewsData.length, 'reviews:', avgRating.toFixed(2));
        
        await supabase
          .from('locales')
          .update({ rating: avgRating })
          .eq('id', localId);
      }
    } catch (error) {
      console.error('[ReviewsModal] ❌ Error:', error);
      Alert.alert('Error', 'No se pudieron cargar las reseñas');
    } finally {
      setLoading(false);
    }
  }, [localId, user, displayedReviewsCount]);

  useEffect(() => {
    if (visible) {
      loadReviews();
    }
  }, [visible, localId, loadReviews]);

  // ✅ FIXED: Real-time subscription for review updates
  useEffect(() => {
    if (!visible || !localId) return;

    console.log('[ReviewsModal] 🔄 Setting up real-time subscription for reviews');

    const subscription = supabase
      .channel(`reviews-${localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews_barlive',
          filter: `local_id=eq.${localId}`,
        },
        () => {
          console.log('[ReviewsModal] 🔄 Review update detected, reloading...');
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      console.log('[ReviewsModal] 🔄 Cleaning up subscription');
      supabase.removeChannel(subscription);
    };
  }, [visible, localId, loadReviews]);

  // ✅ NEW: Load more reviews
  const handleLoadMore = () => {
    console.log('[ReviewsModal] 📄 Loading more reviews...');
    setDisplayedReviewsCount(prev => prev + 10);
  };

  const handleEditReview = () => {
    if (!userExistingReview) return;
    
    console.log('[ReviewsModal] 📝 Editing existing review');
    setReviewText(userExistingReview.texto || '');
    setRating(userExistingReview.rating);
    setIsEditMode(true);
    
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

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
      console.log('[ReviewsModal] 🔄 Step 1: Ensuring valid session...');
      const validSession = await ensureValidSession();
      
      if (!validSession || !validSession.user) {
        console.error('[ReviewsModal] ❌ No valid session available');
        Alert.alert(
          'Error de autenticación',
          'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
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

      console.log('[ReviewsModal] ✅ Step 1 complete: Valid session confirmed, user ID:', validSession.user.id);

      console.log('[ReviewsModal] 🔍 Step 2: Checking for existing review...');
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews_barlive')
        .select('id')
        .eq('local_id', localId)
        .eq('usuario_id', validSession.user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[ReviewsModal] ❌ Error checking existing review:', checkError);
        throw checkError;
      }

      if (existingReview) {
        console.log('[ReviewsModal] ⚠️ User already has a review, updating instead');
        
        const { error: updateError } = await supabase
          .from('reviews_barlive')
          .update({
            texto: text,
            rating: rating,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReview.id);

        if (updateError) {
          console.error('[ReviewsModal] ❌ Error updating review:', updateError);
          throw updateError;
        }

        console.log('[ReviewsModal] ✅ Review updated successfully');
        Alert.alert('Éxito', 'Tu reseña ha sido actualizada');
        setIsEditMode(false);
      } else {
        console.log('[ReviewsModal] ✅ Step 2 complete: No existing review found');

        const reviewData = {
          local_id: localId,
          usuario_id: validSession.user.id,
          texto: text,
          rating: rating,
        };

        console.log('[ReviewsModal] 📝 Step 3: Inserting review with data:', reviewData);

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
          console.error('[ReviewsModal] ❌ Error inserting review:', insertError);
          
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

        console.log('[ReviewsModal] ✅ Step 3 complete: Review inserted successfully:', newReview.id);

        setReviews(prev => [newReview, ...prev]);
        
        Alert.alert('Éxito', 'Tu reseña ha sido publicada');
      }

      await loadReviews();
      
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (error: any) {
      console.error('[ReviewsModal] ❌ Error sending review:', error);
      
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
              console.log('[ReviewsModal] 🔄 Ensuring valid session for deletion...');
              const validSession = await ensureValidSession();
              
              if (!validSession || !validSession.user) {
                console.error('[ReviewsModal] ❌ No valid session available');
                Alert.alert('Error', 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
                return;
              }

              console.log('[ReviewsModal] ✅ Valid session confirmed, deleting review:', reviewId);
              
              const { error: deleteError } = await supabase
                .from('reviews_barlive')
                .delete()
                .eq('id', reviewId)
                .eq('usuario_id', validSession.user.id);

              if (deleteError) {
                console.error('[ReviewsModal] ❌ Error deleting review:', deleteError);
                Alert.alert('Error', `No se pudo eliminar la reseña: ${deleteError.message}`);
                return;
              }

              console.log('[ReviewsModal] ✅ Review deleted successfully');
              
              setReviews(prev => prev.filter(r => r.id !== reviewId));
              setUserExistingReview(null);
              setIsEditMode(false);
              
              Alert.alert('Éxito', 'Reseña eliminada correctamente');
              
              // ✅ FIXED: Recalculate local rating after deletion
              await loadReviews();
              
              if (onReviewAdded) {
                onReviewAdded();
              }
            } catch (error) {
              console.error('[ReviewsModal] ❌ Unexpected error deleting review:', error);
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

  // ✅ NEW: Render Google review with anonymized name
  const renderGoogleReview = ({ item, index }: { item: GoogleReview; index: number }) => {
    return (
      <View style={styles.googleReviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewAvatar}>
            {item.profile_photo_url ? (
              <Image source={{ uri: item.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={18} color={colors.headerText} />
              </View>
            )}
          </View>
          <View style={styles.reviewInfo}>
            {/* ✅ FIXED: Anonymize Google review names */}
            <Text style={styles.reviewAuthor}>Cliente del local</Text>
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
          <Text style={styles.reviewTime}>{item.relative_time_description || 'Hace tiempo'}</Text>
        </View>
        {item.text && (
          <ParsedText text={item.text} style={styles.reviewText} />
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

  // ✅ NEW: Render "Ver más" button
  const renderFooter = () => {
    if (totalReviewsCount <= displayedReviewsCount && googleReviews.length === 0) {
      return null;
    }

    return (
      <TouchableOpacity 
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
      >
        <Text style={styles.loadMoreText}>Ver más</Text>
        <IconSymbol
          ios_icon_name="chevron.down"
          android_material_icon_name="expand_more"
          size={16}
          color={colors.primary}
        />
      </TouchableOpacity>
    );
  };

  const buttonText = userExistingReview && !isEditMode ? 'Editar reseña' : 'Añadir Reseña';
  const buttonAction = userExistingReview && !isEditMode ? handleEditReview : undefined;

  // ✅ FIXED: Combine Barlive and Google reviews in the same section
  const allReviews = [
    ...reviews.map(r => ({ type: 'barlive' as const, data: r })),
    ...googleReviews.map((g, i) => ({ type: 'google' as const, data: g, index: i })),
  ];

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
          <Text style={styles.headerSubtitle}>
            {totalReviewsCount + googleReviews.length} {totalReviewsCount + googleReviews.length === 1 ? 'reseña' : 'reseñas'}
          </Text>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={allReviews}
            renderItem={({ item }) => {
              if (item.type === 'barlive') {
                return renderReview({ item: item.data as Review });
              } else {
                return renderGoogleReview({ item: item.data as GoogleReview, index: item.index || 0 });
              }
            }}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
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
            {isEditMode && (
              <View style={styles.editModeBanner}>
                <Text style={styles.editModeText}>Editando tu reseña</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditMode(false);
                    setReviewText('');
                    setRating(0);
                  }}
                >
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={20}
                    color="rgba(0, 0, 0, 0.5)"
                  />
                </TouchableOpacity>
              </View>
            )}

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
              {buttonAction ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={buttonAction}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sendButtonText}>{buttonText}</Text>
                </TouchableOpacity>
              ) : (
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
                      {buttonText}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
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
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
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
  googleReviewCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50' + '30',
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
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  editModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary + '15',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
  },
  editModeText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
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
