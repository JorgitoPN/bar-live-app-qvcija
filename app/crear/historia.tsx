
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import UploadProgressModal from '@/components/common/UploadProgressModal';
import { processStoryMentions } from '@/utils/storyHelpers';

const { height } = Dimensions.get('window');

interface MentionSuggestion {
  id: string;
  nombre: string;
  username: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

const convertImageToJPG = (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const processImage = async () => {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        if (blob.type === 'image/jpeg' || blob.type === 'image/jpg') {
          resolve(blob);
          return;
        }

        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((convertedBlob) => {
            if (convertedBlob) {
              resolve(convertedBlob);
            } else {
              reject(new Error('Failed to convert image'));
            }
          }, 'image/jpeg', 0.9);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(blob);
      } catch (error) {
        reject(error);
      }
    };
    
    processImage();
  });
};

export default function CrearHistoriaScreen() {
  const { user } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  const { refreshData } = useGlobalData();
  const router = useRouter();
  const params = useLocalSearchParams();
  const localId = params.localId as string | undefined;
  
  const [imagen, setImagen] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<MentionSuggestion[]>([]);
  const [searchingMentions, setSearchingMentions] = useState(false);

  const searchMentions = async (query: string) => {
    const cleanQuery = query.replace('@', '').trim();
    
    if (cleanQuery.length < 1) {
      setMentionSuggestions([]);
      return;
    }

    setSearchingMentions(true);
    try {
      const fuzzyPattern = cleanQuery.split('').join('%');
      
      // Search users
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar')
        .or(`nombre.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%,nombre.ilike.%${fuzzyPattern}%,username.ilike.%${fuzzyPattern}%`)
        .eq('activo', true)
        .limit(10);

      if (usersError) {
        console.error('[CrearHistoria] Error searching users:', usersError);
      }

      // Search locals with active subscriptions
      const { data: localsData, error: localsError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url')
        .or(`nombre.ilike.%${cleanQuery}%,nombre.ilike.%${fuzzyPattern}%`)
        .eq('activo', true)
        .limit(10);

      if (localsError) {
        console.error('[CrearHistoria] Error searching locals:', localsError);
      }

      let filteredLocals: any[] = [];
      if (localsData && localsData.length > 0) {
        const localIds = localsData.map(l => l.id);
        
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from('suscripciones_locales')
          .select(`
            local_id,
            estado,
            plan_id,
            planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre)
          `)
          .in('local_id', localIds)
          .eq('estado', 'activa');

        if (subscriptionsError) {
          console.error('[CrearHistoria] Error fetching subscriptions:', subscriptionsError);
        } else if (subscriptionsData) {
          const validLocalIds = subscriptionsData
            .filter(sub => {
              const planName = (sub.planes_suscripcion as any)?.nombre;
              return planName === 'estandar' || planName === 'premium';
            })
            .map(sub => sub.local_id);

          filteredLocals = localsData.filter(local => validLocalIds.includes(local.id));
        }
      }

      const results: MentionSuggestion[] = [];

      // Add users
      if (!usersError && usersData) {
        const filteredUsers = usersData.filter(
          (u) => !selectedMentions.find((m) => m.id === u.id && m.tipo === 'usuario')
        );
        
        results.push(...filteredUsers.map(u => ({
          id: u.id,
          nombre: u.nombre,
          username: u.username || u.nombre,
          avatar: u.avatar,
          tipo: 'usuario' as const,
        })));
      }

      // Add locals
      if (filteredLocals.length > 0) {
        const filteredLocalsList = filteredLocals.filter(
          (l) => !selectedMentions.find((m) => m.id === l.id && m.tipo === 'local')
        );
        
        results.push(...filteredLocalsList.map(l => ({
          id: l.id,
          nombre: l.nombre,
          username: l.nombre,
          avatar: l.imagen_url,
          tipo: 'local' as const,
        })));
      }

      setMentionSuggestions(results);
    } catch (error) {
      console.error('[CrearHistoria] Error searching mentions:', error);
    } finally {
      setSearchingMentions(false);
    }
  };

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permiso necesario',
        'Necesitamos acceso a tu galería para seleccionar fotos'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImagen(result.assets[0].uri);
    }
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permiso necesario',
        'Necesitamos acceso a tu cámara para tomar fotos'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImagen(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      console.log('[CrearHistoria] Starting image upload...');
      setUploadProgress(10);
      
      let blob: Blob;
      if (Platform.OS === 'web') {
        blob = await convertImageToJPG(uri);
      } else {
        const response = await fetch(uri);
        blob = await response.blob();
      }

      setUploadProgress(30);

      const fileName = `${user!.id}/${Date.now()}.jpg`;
      console.log('[CrearHistoria] Uploading file:', fileName);

      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      setUploadProgress(50);

      const { data, error } = await supabase.storage
        .from('stories')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('[CrearHistoria] Error uploading image:', error);
        return null;
      }

      setUploadProgress(70);
      console.log('[CrearHistoria] Image uploaded successfully');

      const { data: urlData } = supabase.storage.from('stories').getPublicUrl(fileName);

      setUploadProgress(80);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[CrearHistoria] Error in uploadImage:', error);
      return null;
    }
  };

  const publicarHistoria = async () => {
    if (!imagen) {
      Alert.alert('Error', 'Debes seleccionar una imagen');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para publicar');
      return;
    }

    setPublishing(true);
    setShowUploadProgress(true);
    setUploadProgress(0);

    try {
      console.log('[CrearHistoria] Starting publication...');
      console.log('[CrearHistoria] Active profile type:', activeProfileType);
      console.log('[CrearHistoria] Active profile ID:', activeProfileId);
      console.log('[CrearHistoria] LocalId param:', localId);
      console.log('[CrearHistoria] User ID:', user.id);
      console.log('[CrearHistoria] Selected mentions:', selectedMentions.length);
      
      const imagenUrl = await uploadImage(imagen);
      if (!imagenUrl) {
        Alert.alert('Error', 'No se pudo subir la imagen');
        setPublishing(false);
        setShowUploadProgress(false);
        return;
      }

      // Determine the correct author based on active profile
      let effectiveLocalId: string | null = null;
      let storyTipo: 'usuario' | 'local' = 'usuario';

      if (localId) {
        effectiveLocalId = localId;
        storyTipo = 'local';
        console.log('[CrearHistoria] ✅ Using localId from params:', localId);
      } else if (activeProfileType === 'local' && activeProfileId) {
        effectiveLocalId = activeProfileId;
        storyTipo = 'local';
        console.log('[CrearHistoria] ✅ Using active local profile:', activeProfileId);
      } else {
        storyTipo = 'usuario';
        console.log('[CrearHistoria] ✅ Publishing as user (cliente)');
      }

      console.log('[CrearHistoria] ✅ Final effective local ID:', effectiveLocalId);
      console.log('[CrearHistoria] ✅ Final story tipo:', storyTipo);

      setUploadProgress(85);

      const { data: storyData, error: storyError } = await supabase
        .from('historias')
        .insert({
          autor_id: user.id,
          tipo: storyTipo,
          local_id: effectiveLocalId,
          imagen: imagenUrl,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      console.log('[CrearHistoria] ✅ Story created successfully:', storyData.id);

      // Process mentions
      if (selectedMentions.length > 0) {
        console.log('[CrearHistoria] 🏷️ Processing story mentions...');
        const userIds = selectedMentions.filter(m => m.tipo === 'usuario').map(m => m.id);
        const localIds = selectedMentions.filter(m => m.tipo === 'local').map(m => m.id);
        await processStoryMentions(storyData.id, userIds, localIds);
        console.log('[CrearHistoria] ✅ Story mentions processed');
      }

      setUploadProgress(95);

      // Force refresh global data to show new story immediately
      console.log('[CrearHistoria] 🔄 Refreshing global data...');
      await refreshData(false);

      setUploadProgress(100);

      // Small delay to show 100% before closing
      setTimeout(() => {
        setShowUploadProgress(false);
        
        // Navigate to the appropriate screen based on story type
        if (storyTipo === 'local' && effectiveLocalId) {
          Alert.alert('Éxito', 'Historia publicada correctamente', [
            { 
              text: 'Ver perfil del local', 
              onPress: () => {
                router.replace(`/perfil/local?localId=${effectiveLocalId}`);
              }
            },
            {
              text: 'Ir a Social',
              onPress: () => {
                router.replace('/(tabs)/social');
              }
            }
          ]);
        } else {
          Alert.alert('Éxito', 'Historia publicada correctamente', [
            { 
              text: 'Ver mi perfil', 
              onPress: () => {
                router.replace('/(tabs)/perfil');
              }
            },
            {
              text: 'Ir a Social',
              onPress: () => {
                router.replace('/(tabs)/social');
              }
            }
          ]);
        }
      }, 500);
    } catch (error) {
      console.error('[CrearHistoria] Error publicando:', error);
      setShowUploadProgress(false);
      Alert.alert('Error', 'No se pudo publicar la historia');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <IconSymbol name="xmark" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva Historia</Text>
          <TouchableOpacity 
            onPress={publicarHistoria} 
            style={styles.publishButton}
            disabled={publishing || !imagen}
            activeOpacity={0.7}
          >
            {publishing ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={[styles.publishButtonText, !imagen && styles.publishButtonTextDisabled]}>
                Publicar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        {imagen ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imagen }} style={styles.imagePreview} resizeMode="contain" />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImagen(null)}
              activeOpacity={0.7}
            >
              <IconSymbol name="xmark.circle.fill" size={32} color={colors.badgeNuevo} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <IconSymbol name="photo.on.rectangle" size={80} color={colors.textSecondary} />
            <Text style={styles.placeholderText}>Selecciona una imagen para tu historia</Text>
            
            <View style={styles.placeholderButtons}>
              <TouchableOpacity 
                style={styles.placeholderButton} 
                onPress={seleccionarImagen}
                disabled={publishing}
                activeOpacity={0.7}
              >
                <IconSymbol name="photo" size={32} color={colors.primary} />
                <Text style={styles.placeholderButtonText}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.placeholderButton} 
                onPress={tomarFoto}
                disabled={publishing}
                activeOpacity={0.7}
              >
                <IconSymbol name="camera" size={32} color={colors.secondary} />
                <Text style={styles.placeholderButtonText}>Cámara</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Mention button */}
        {imagen && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setShowMentionModal(true)}
              disabled={publishing}
              activeOpacity={0.7}
            >
              <IconSymbol name="at" size={24} color={colors.primary} />
              <Text style={styles.optionButtonText}>
                Mencionar {selectedMentions.length > 0 && `(${selectedMentions.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selected mentions */}
        {selectedMentions.length > 0 && (
          <View style={styles.selectedMentionsContainer}>
            <Text style={styles.selectedMentionsTitle}>Mencionados:</Text>
            <View style={styles.selectedMentionsList}>
              {selectedMentions.map((mention) => (
                <View key={`${mention.id}-${mention.tipo}`} style={styles.selectedMentionChip}>
                  <IconSymbol 
                    name={mention.tipo === 'local' ? 'building.2.fill' : 'person.fill'} 
                    size={12} 
                    color={colors.text} 
                  />
                  <Text style={styles.selectedMentionName}>
                    {mention.username || mention.nombre}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setSelectedMentions(selectedMentions.filter(m => !(m.id === mention.id && m.tipo === mention.tipo)))} 
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark.circle.fill" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Mention Modal */}
      <Modal
        visible={showMentionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowMentionModal(false);
          setMentionSearchQuery('');
          setMentionSuggestions([]);
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => {
            setShowMentionModal(false);
            setMentionSearchQuery('');
            setMentionSuggestions([]);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.mentionModalKeyboardView}
          >
            <Pressable style={styles.mentionModal} onPress={(e) => e.stopPropagation()}>
              <View style={styles.mentionModalHeader}>
                <Text style={styles.mentionModalTitle}>Mencionar Usuarios y Locales</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowMentionModal(false);
                    setMentionSearchQuery('');
                    setMentionSuggestions([]);
                  }} 
                  activeOpacity={0.7}
                >
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.mentionSearchContainer}>
                <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.mentionSearchInput}
                  placeholder="Buscar usuarios o locales..."
                  placeholderTextColor={colors.textSecondary}
                  value={mentionSearchQuery}
                  onChangeText={(text) => {
                    setMentionSearchQuery(text);
                    searchMentions(text);
                  }}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {mentionSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => {
                      setMentionSearchQuery('');
                      setMentionSuggestions([]);
                    }} 
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView 
                style={styles.mentionSuggestionsContainer}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.mentionSuggestionsContent}
              >
                {searchingMentions ? (
                  <View style={styles.mentionLoadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.mentionLoadingText}>Buscando...</Text>
                  </View>
                ) : mentionSuggestions.length > 0 ? (
                  <React.Fragment>
                    <Text style={styles.mentionResultsHeader}>
                      {mentionSuggestions.length} {mentionSuggestions.length === 1 ? 'resultado' : 'resultados'}
                    </Text>
                    {mentionSuggestions.map((item) => (
                      <TouchableOpacity
                        key={`${item.id}-${item.tipo}`}
                        style={styles.mentionSuggestionItem}
                        onPress={() => {
                          setSelectedMentions([...selectedMentions, item]);
                          setMentionSearchQuery('');
                          setMentionSuggestions([]);
                        }}
                        activeOpacity={0.7}
                      >
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.mentionSuggestionAvatar} />
                        ) : (
                          <View style={[styles.mentionSuggestionAvatar, styles.avatarPlaceholder]}>
                            <IconSymbol 
                              name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'} 
                              size={20} 
                              color={colors.textSecondary} 
                            />
                          </View>
                        )}
                        <View style={styles.mentionSuggestionInfo}>
                          <Text style={styles.mentionSuggestionName}>{item.nombre}</Text>
                          <Text style={styles.mentionSuggestionType}>
                            {item.tipo === 'local' ? '🏢 Local' : `👤 @${item.username}`}
                          </Text>
                        </View>
                        <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </React.Fragment>
                ) : mentionSearchQuery.length >= 1 ? (
                  <View style={styles.mentionEmptyState}>
                    <IconSymbol name="magnifyingglass" size={48} color={colors.textSecondary} />
                    <Text style={styles.mentionEmptyText}>No se encontraron resultados</Text>
                    <Text style={styles.mentionEmptySubtext}>
                      Intenta con otro nombre o verifica la ortografía
                    </Text>
                  </View>
                ) : (
                  <View style={styles.mentionEmptyState}>
                    <IconSymbol name="person.2.fill" size={48} color={colors.textSecondary} />
                    <Text style={styles.mentionEmptyText}>Busca usuarios o locales</Text>
                    <Text style={styles.mentionEmptySubtext}>
                      Escribe el nombre para ver resultados en tiempo real
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <UploadProgressModal
        visible={showUploadProgress}
        progress={uploadProgress}
        message="Publicando historia..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  publishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  publishButtonTextDisabled: {
    opacity: 0.5,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: height * 0.5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  placeholderContainer: {
    width: '100%',
    height: height * 0.5,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 20,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  placeholderButtons: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  placeholderButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
    borderRadius: 16,
    minWidth: 120,
    gap: 8,
  },
  placeholderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionsContainer: {
    marginTop: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  selectedMentionsContainer: {
    marginTop: 16,
  },
  selectedMentionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  selectedMentionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedMentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectedMentionName: {
    fontSize: 14,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mentionModalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mentionModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
  },
  mentionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  mentionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  mentionSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  mentionSearchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  mentionSuggestionsContainer: {
    flex: 1,
  },
  mentionSuggestionsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  mentionLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  mentionLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mentionResultsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  mentionSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  mentionSuggestionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  mentionSuggestionInfo: {
    flex: 1,
  },
  mentionSuggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  mentionSuggestionType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mentionEmptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  mentionEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  mentionEmptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
