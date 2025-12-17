
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import UploadProgressModal from '@/components/common/UploadProgressModal';
import { processPostHashtags, processPostMentions } from '@/utils/postHelpers';
import MentionAutocomplete, { MentionSuggestion } from '@/components/social/MentionAutocomplete';
import HashtagAutocomplete from '@/components/social/HashtagAutocomplete';
import TaggingModalV5, { TaggableUser } from '@/components/social/TaggingModalV5';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

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

/**
 * ✅ EDIT PUBLICATION v1.0 - WITH IMAGE EDITOR
 * 
 * Features:
 * - Edit post description
 * - Add/remove images with image editor
 * - Manage tags
 * - Update location
 * - Same image editing system as momentos
 */

export default function EditarPublicacionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  const { refreshData } = useGlobalData();
  const params = useLocalSearchParams();
  const postId = params.postId as string;
  
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  
  const [contenido, setContenido] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [ubicacion, setUbicacion] = useState<{
    nombre: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [usuariosEtiquetados, setUsuariosEtiquetados] = useState<TaggableUser[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingImageUri, setEditingImageUri] = useState<string | null>(null);

  const MAX_IMAGES = 10;

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadPost = async () => {
    try {
      setLoading(true);

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      setContenido(postData.contenido || '');
      setImagenes(postData.imagenes || []);
      
      if (postData.ubicacion && postData.ubicacion_lat && postData.ubicacion_lng) {
        setUbicacion({
          nombre: postData.ubicacion,
          lat: postData.ubicacion_lat,
          lng: postData.ubicacion_lng,
        });
      }

      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('post_id', postId);

      if (!tagsError && tagsData) {
        const tags: TaggableUser[] = [];
        
        tagsData.forEach(tag => {
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

        setUsuariosEtiquetados(tags);
      }
    } catch (error) {
      console.error('[EditarPublicacion] Error loading post:', error);
      Alert.alert('Error', 'No se pudo cargar la publicación');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInlineMention = (mention: MentionSuggestion, mentionText: string) => {
    const textBeforeCursor = contenido.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;

    const mentionUsername = mention.tipo === 'local' ? mention.nombre : mention.username;
    const newText = 
      contenido.substring(0, lastAtIndex) + 
      `@${mentionUsername} ` + 
      contenido.substring(cursorPosition);
    
    setContenido(newText);
    
    const newCursorPosition = lastAtIndex + mentionUsername.length + 2;
    setCursorPosition(newCursorPosition);
  };

  const handleSelectInlineHashtag = (hashtag: string, hashtagText: string) => {
    const textBeforeCursor = contenido.substring(0, cursorPosition);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    
    if (lastHashIndex === -1) return;

    const newText = 
      contenido.substring(0, lastHashIndex) + 
      `#${hashtag} ` + 
      contenido.substring(cursorPosition);
    
    setContenido(newText);
    
    const newCursorPosition = lastHashIndex + hashtag.length + 2;
    setCursorPosition(newCursorPosition);
  };

  const handleEditImage = (index: number) => {
    setEditingImageIndex(index);
    setEditingImageUri(imagenes[index]);
    setShowImageEditor(true);
  };

  const handleApplyImageEdit = async (editedUri: string) => {
    if (editingImageIndex !== null) {
      const newImagenes = [...imagenes];
      newImagenes[editingImageIndex] = editedUri;
      setImagenes(newImagenes);
    }
    setShowImageEditor(false);
    setEditingImageIndex(null);
    setEditingImageUri(null);
  };

  const ImageEditorModal = () => {
    const [processing, setProcessing] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [rotation, setRotation] = useState(0);
    
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    useEffect(() => {
      if (editingImageUri) {
        Image.getSize(editingImageUri, (width, height) => {
          setImageDimensions({ width, height });
          
          const imageRatio = width / height;
          const screenRatio = 1;
          
          if (imageRatio > screenRatio) {
            scale.value = SCREEN_WIDTH / width;
          } else {
            scale.value = SCREEN_WIDTH / height;
          }
          savedScale.value = scale.value;
        }, (error) => {
          console.error('[ImageEditor] Error getting image size:', error);
        });
      }
    }, [editingImageUri]);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { scale: scale.value },
          { rotate: `${rotation}deg` },
        ],
      };
    });

    const resetTransform = () => {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setRotation(0);
    };

    const applyEdits = async () => {
      if (!editingImageUri) return;

      setProcessing(true);
      try {
        const actions: any[] = [];

        if (rotation !== 0) {
          actions.push({ rotate: rotation });
        }

        if (imageDimensions.width !== imageDimensions.height) {
          const size = Math.min(imageDimensions.width, imageDimensions.height);
          const originX = (imageDimensions.width - size) / 2;
          const originY = (imageDimensions.height - size) / 2;
          actions.push({
            crop: {
              originX,
              originY,
              width: size,
              height: size,
            },
          });
        }

        const result = await ImageManipulator.manipulateAsync(
          editingImageUri,
          actions,
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        handleApplyImageEdit(result.uri);
      } catch (error) {
        console.error('[EditarPublicacion] Error editing image:', error);
        Alert.alert('Error', 'No se pudo editar la imagen');
      } finally {
        setProcessing(false);
      }
    };

    return (
      <Modal
        visible={showImageEditor}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowImageEditor(false)}
      >
        <GestureHandlerRootView style={styles.editorContainer}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.editorHeader}
          >
            <TouchableOpacity onPress={() => setShowImageEditor(false)} style={styles.editorCloseButton}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.editorHeaderTitle}>Editar Imagen</Text>
            <TouchableOpacity 
              onPress={applyEdits} 
              style={styles.editorApplyButton}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color={colors.headerText} />
              ) : (
                <Text style={styles.editorApplyText}>Listo</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.editorContent}>
            <View style={styles.editorImageFrame}>
              {editingImageUri ? (
                <PanGestureHandler
                  onGestureEvent={(event) => {
                    'worklet';
                    translateX.value = savedTranslateX.value + event.translationX;
                    translateY.value = savedTranslateY.value + event.translationY;
                  }}
                  onEnded={() => {
                    'worklet';
                    savedTranslateX.value = translateX.value;
                    savedTranslateY.value = translateY.value;
                  }}
                >
                  <Animated.View style={{ flex: 1 }}>
                    <PinchGestureHandler
                      onGestureEvent={(event) => {
                        'worklet';
                        scale.value = Math.max(0.5, Math.min(savedScale.value * event.scale, 5));
                      }}
                      onEnded={() => {
                        'worklet';
                        savedScale.value = scale.value;
                      }}
                    >
                      <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Animated.Image 
                          source={{ uri: editingImageUri }} 
                          style={[
                            {
                              width: SCREEN_WIDTH,
                              height: SCREEN_WIDTH,
                            },
                            animatedStyle
                          ]}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    </PinchGestureHandler>
                  </Animated.View>
                </PanGestureHandler>
              ) : (
                <View style={styles.editorPlaceholder}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.editorPlaceholderText}>Cargando imagen...</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.editorFooter}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.editorControls}
            >
              <TouchableOpacity 
                style={styles.editorControlButton}
                onPress={() => setRotation((rotation - 90) % 360)}
              >
                <IconSymbol 
                  ios_icon_name="rotate.left" 
                  android_material_icon_name="rotate_left" 
                  size={24} 
                  color={colors.headerText} 
                />
                <Text style={styles.editorControlText}>Rotar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.editorControlButton}
                onPress={resetTransform}
              >
                <IconSymbol 
                  ios_icon_name="arrow.counterclockwise" 
                  android_material_icon_name="refresh" 
                  size={24} 
                  color={colors.headerText} 
                />
                <Text style={styles.editorControlText}>Restablecer</Text>
              </TouchableOpacity>
            </ScrollView>
            <Text style={styles.editorFooterText}>
              Pellizca para acercar/alejar • Arrastra para centrar • Toca para rotar
            </Text>
          </View>
        </GestureHandlerRootView>
      </Modal>
    );
  };

  const seleccionarImagenes = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permiso necesario',
        'Necesitamos acceso a tu galería para seleccionar fotos'
      );
      return;
    }

    const remainingSlots = MAX_IMAGES - imagenes.length;
    if (remainingSlots <= 0) {
      Alert.alert('Límite alcanzado', `Solo puedes subir hasta ${MAX_IMAGES} imágenes por publicación`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map(asset => asset.uri);
      setImagenes([...imagenes, ...newImages]);
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

    if (imagenes.length >= MAX_IMAGES) {
      Alert.alert('Límite alcanzado', `Solo puedes subir hasta ${MAX_IMAGES} imágenes por publicación`);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImagenes([...imagenes, result.assets[0].uri]);
    }
  };

  const eliminarImagen = (index: number) => {
    const newImagenes = [...imagenes];
    newImagenes.splice(index, 1);
    setImagenes(newImagenes);
    if (currentImageIndex >= newImagenes.length && newImagenes.length > 0) {
      setCurrentImageIndex(newImagenes.length - 1);
    }
  };

  const obtenerUbicacion = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Necesitamos acceso a tu ubicación para añadirla a la publicación'
        );
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const nombreUbicacion = [
          place.name,
          place.street,
          place.city,
          place.region,
        ]
          .filter(Boolean)
          .join(', ');

        setUbicacion({
          nombre: nombreUbicacion || 'Ubicación actual',
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSelectTag = (selectedUser: TaggableUser) => {
    setUsuariosEtiquetados([...usuariosEtiquetados, selectedUser]);
  };

  const eliminarEtiqueta = (itemId: string, tipo: 'usuario' | 'local') => {
    setUsuariosEtiquetados(usuariosEtiquetados.filter((u) => !(u.id === itemId && u.tipo === tipo)));
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      let blob: Blob;
      if (Platform.OS === 'web') {
        blob = await convertImageToJPG(uri);
      } else {
        const response = await fetch(uri);
        blob = await response.blob();
      }

      const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const { data, error } = await supabase.storage
        .from('posts')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('[EditarPublicacion] Error uploading image:', error);
        return null;
      }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[EditarPublicacion] Error in uploadImage:', error);
      return null;
    }
  };

  const guardarCambios = async () => {
    if (!contenido.trim() && imagenes.length === 0) {
      Alert.alert('Error', 'Debes agregar contenido o al menos una imagen');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para editar');
      return;
    }

    setSaving(true);
    setShowUploadProgress(true);
    setUploadProgress(0);

    try {
      // Upload new images
      let imagenesUrls: string[] = [];
      const newImages = imagenes.filter(uri => uri.startsWith('file://') || uri.startsWith('blob:'));
      const existingImages = imagenes.filter(uri => !uri.startsWith('file://') && !uri.startsWith('blob:'));

      imagenesUrls = [...existingImages];

      if (newImages.length > 0) {
        for (let i = 0; i < newImages.length; i++) {
          const progressStart = 10 + (i * 60 / newImages.length);
          setUploadProgress(progressStart);
          
          const imageUrl = await uploadImage(newImages[i]);
          if (!imageUrl) {
            Alert.alert('Error', `No se pudo subir la imagen ${i + 1}`);
            setSaving(false);
            setShowUploadProgress(false);
            return;
          }
          imagenesUrls.push(imageUrl);
          
          const progressEnd = 10 + ((i + 1) * 60 / newImages.length);
          setUploadProgress(progressEnd);
        }
      } else {
        setUploadProgress(70);
      }

      setUploadProgress(75);

      const postData: any = {
        contenido: contenido,
        imagenes: imagenesUrls,
        ubicacion: ubicacion?.nombre,
        ubicacion_lat: ubicacion?.lat,
        ubicacion_lng: ubicacion?.lng,
        editado_at: new Date().toISOString(),
      };

      if (imagenesUrls.length === 1) {
        postData.imagen = imagenesUrls[0];
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update(postData)
        .eq('id', postId);

      if (updateError) {
        console.error('[EditarPublicacion] Error updating post:', updateError);
        throw updateError;
      }

      setUploadProgress(80);

      // Update hashtags and mentions
      if (contenido) {
        await Promise.all([
          processPostHashtags(postId, contenido),
          processPostMentions(postId, contenido),
        ]);
      }

      setUploadProgress(85);

      // Update tags
      await supabase
        .from('post_tags')
        .delete()
        .eq('post_id', postId);

      if (usuariosEtiquetados.length > 0) {
        const tags = usuariosEtiquetados.map((item) => {
          const tagData: any = {
            post_id: postId,
            tipo: item.tipo,
            estado: 'pendiente',
            tagged_by_user_id: user.id,
            position_x: 0.5,
            position_y: 0.5,
            imagen_index: 0,
          };

          if (item.tipo === 'usuario') {
            tagData.usuario_id = item.id;
            tagData.local_id = null;
          } else {
            tagData.local_id = item.id;
            tagData.usuario_id = null;
          }

          return tagData;
        });

        await supabase.from('post_tags').insert(tags);

        for (const item of usuariosEtiquetados) {
          if (item.tipo === 'usuario') {
            await supabase.from('notificaciones').insert({
              usuario_id: item.id,
              tipo: 'mencion',
              titulo: 'Te han etiquetado',
              mensaje: `${user.nombre} te ha etiquetado en una publicación`,
              usuario_origen_id: user.id,
              post_id: postId,
            });
          } else {
            const { data: owners } = await supabase
              .from('propietarios_locales')
              .select('propietario_id')
              .eq('local_id', item.id)
              .eq('activo', true);

            if (owners && owners.length > 0) {
              const notifications = owners.map(owner => ({
                usuario_id: owner.propietario_id,
                tipo: 'mencion',
                titulo: 'Han etiquetado tu local',
                mensaje: `${user.nombre} ha etiquetado a ${item.nombre} en una publicación`,
                usuario_origen_id: user.id,
                local_origen_id: item.id,
                post_id: postId,
              }));

              await supabase.from('notificaciones').insert(notifications);
            }
          }
        }
      }

      setUploadProgress(90);

      await refreshData(true);

      setUploadProgress(100);

      setTimeout(() => {
        setShowUploadProgress(false);
        Alert.alert('Éxito', 'Publicación actualizada correctamente', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }, 500);
    } catch (error) {
      console.error('[EditarPublicacion] Error guardando cambios:', error);
      setShowUploadProgress(false);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando publicación...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Publicación</Text>
          <TouchableOpacity 
            onPress={guardarCambios} 
            style={[styles.publishButton, (!contenido.trim() && imagenes.length === 0) && styles.publishButtonDisabled]}
            disabled={saving || (!contenido.trim() && imagenes.length === 0)}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={[styles.publishButtonText, (!contenido.trim() && imagenes.length === 0) && styles.publishButtonTextDisabled]}>
                Guardar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.textInputSection}>
            <TextInput
              style={styles.textInput}
              placeholder="¿Qué estás pensando?"
              placeholderTextColor={colors.textSecondary}
              value={contenido}
              onChangeText={(text) => {
                setContenido(text);
              }}
              onSelectionChange={(event) => {
                const newPosition = event.nativeEvent.selection.start;
                setCursorPosition(newPosition);
              }}
              multiline
              maxLength={2200}
              editable={!saving}
            />
            <Text style={styles.charCount}>{contenido.length}/2200</Text>
            <View style={styles.helperContainer}>
              <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={14} color={colors.primary} />
              <Text style={styles.helperText}>
                Escribe @ para mencionar usuarios o locales
              </Text>
            </View>
          </View>

          {imagenes.length > 0 && (
            <View style={styles.imagesPreviewSection}>
              <View style={styles.imagesSectionHeader}>
                <Text style={styles.imagesSectionTitle}>
                  {imagenes.length} {imagenes.length === 1 ? 'imagen' : 'imágenes'}
                </Text>
                {imagenes.length < MAX_IMAGES && (
                  <TouchableOpacity onPress={seleccionarImagenes} activeOpacity={0.7}>
                    <Text style={styles.addMoreText}>+ Añadir más</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.imagesScroll}
                contentContainerStyle={styles.imagesScrollContent}
              >
                {imagenes.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.editImageButton}
                      onPress={() => handleEditImage(index)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="slider.horizontal.3" android_material_icon_name="tune" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => eliminarImagen(index)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.imageIndexBadge}>
                      <Text style={styles.imageIndexText}>{index + 1}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {usuariosEtiquetados.length > 0 && (
            <View style={styles.taggedSection}>
              <Text style={styles.sectionLabel}>Perfiles etiquetados</Text>
              <View style={styles.taggedList}>
                {usuariosEtiquetados.map((item) => (
                  <View key={`${item.id}-${item.tipo}`} style={[
                    styles.taggedChip,
                    item.tipo === 'local' && styles.taggedChipLocal,
                  ]}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.taggedAvatar} />
                    ) : (
                      <View style={[styles.taggedAvatar, styles.taggedAvatarPlaceholder]}>
                        <IconSymbol 
                          ios_icon_name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                          android_material_icon_name={item.tipo === 'local' ? 'business' : 'person'}
                          size={14} 
                          color={colors.textSecondary} 
                        />
                      </View>
                    )}
                    <Text style={styles.taggedName} numberOfLines={1}>
                      {item.username || item.nombre}
                    </Text>
                    {item.tipo === 'local' && (
                      <View style={styles.localBadgeSmall}>
                        <IconSymbol 
                          ios_icon_name="building.2.fill" 
                          android_material_icon_name="business" 
                          size={10} 
                          color="#F59E0B" 
                        />
                      </View>
                    )}
                    <TouchableOpacity 
                      onPress={() => eliminarEtiqueta(item.id, item.tipo!)} 
                      activeOpacity={0.7}
                      style={styles.removeTagButton}
                    >
                      <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.tagInfoBox}>
                <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={14} color={colors.primary} />
                <Text style={styles.tagInfoText}>
                  Los perfiles etiquetados recibirán una notificación y podrán aceptar o rechazar la etiqueta
                </Text>
              </View>
            </View>
          )}

          {ubicacion && (
            <View style={styles.locationSection}>
              <View style={styles.locationContent}>
                <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={20} color={colors.primary} />
                <Text style={styles.locationText} numberOfLines={1}>{ubicacion.nombre}</Text>
              </View>
              <TouchableOpacity onPress={() => setUbicacion(null)} activeOpacity={0.7}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionsSection}>
            <Text style={styles.actionsSectionTitle}>Añadir a tu publicación</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={[styles.actionButton, imagenes.length >= MAX_IMAGES && styles.actionButtonDisabled]} 
                onPress={seleccionarImagenes}
                disabled={saving || imagenes.length >= MAX_IMAGES}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={24} color={imagenes.length >= MAX_IMAGES ? colors.textSecondary : colors.primary} />
                </View>
                <Text style={[styles.actionButtonText, imagenes.length >= MAX_IMAGES && styles.actionButtonTextDisabled]}>
                  Fotos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, imagenes.length >= MAX_IMAGES && styles.actionButtonDisabled]} 
                onPress={tomarFoto}
                disabled={saving || imagenes.length >= MAX_IMAGES}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: colors.secondary + '15' }]}>
                  <IconSymbol ios_icon_name="camera" android_material_icon_name="camera_alt" size={24} color={imagenes.length >= MAX_IMAGES ? colors.textSecondary : colors.secondary} />
                </View>
                <Text style={[styles.actionButtonText, imagenes.length >= MAX_IMAGES && styles.actionButtonTextDisabled]}>
                  Cámara
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowTagModal(true)}
                disabled={saving}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#8B5CF6' + '15' }]}>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.plus" android_material_icon_name="person_add" size={24} color='#8B5CF6' />
                </View>
                <Text style={styles.actionButtonText}>
                  Etiquetar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={obtenerUbicacion}
                disabled={loadingLocation || saving}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#EF4444' + '15' }]}>
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <IconSymbol ios_icon_name="mappin.and.ellipse" android_material_icon_name="location_on" size={24} color='#EF4444' />
                  )}
                </View>
                <Text style={styles.actionButtonText}>
                  Ubicación
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <MentionAutocomplete
          text={contenido}
          cursorPosition={cursorPosition}
          onSelectMention={handleSelectInlineMention}
          keyboardHeight={keyboardHeight}
        />

        <HashtagAutocomplete
          text={contenido}
          cursorPosition={cursorPosition}
          onSelectHashtag={handleSelectInlineHashtag}
          keyboardHeight={keyboardHeight}
        />
      </View>

      <ImageEditorModal />

      <TaggingModalV5
        visible={showTagModal}
        onClose={() => setShowTagModal(false)}
        onSelectUser={handleSelectTag}
        alreadyTagged={usuariosEtiquetados}
      />

      <UploadProgressModal
        visible={showUploadProgress}
        progress={uploadProgress}
        message={imagenes.length > 1 ? `Guardando ${imagenes.length} imágenes...` : "Guardando cambios..."}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
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
  publishButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.headerText,
  },
  publishButtonTextDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  textInputSection: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  textInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  imagesPreviewSection: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  imagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imagesSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  imagesScroll: {
    paddingLeft: 16,
  },
  imagesScrollContent: {
    paddingRight: 16,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
  },
  editImageButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 14,
    padding: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 14,
  },
  imageIndexBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageIndexText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editorHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  editorApplyButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  editorApplyText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.headerText,
  },
  editorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  editorImageFrame: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  editorPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  editorPlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  editorFooter: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  editorControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  editorControlButton: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
  },
  editorControlText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  editorFooterText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  taggedSection: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taggedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  taggedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  taggedChipLocal: {
    borderColor: '#F59E0B',
    backgroundColor: '#F59E0B' + '10',
  },
  taggedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  taggedAvatarPlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taggedName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  localBadgeSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B' + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTagButton: {
    padding: 2,
  },
  tagInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tagInfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.primary,
    lineHeight: 16,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  actionsSection: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  actionsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  actionButtonTextDisabled: {
    color: colors.textSecondary,
  },
});
