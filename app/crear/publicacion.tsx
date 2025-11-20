
import React, { useState, useEffect } from 'react';
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
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import UploadProgressModal from '@/components/common/UploadProgressModal';
import { processPostHashtags, processPostMentions } from '@/utils/postHelpers';

interface UserSuggestion {
  id: string;
  nombre: string;
  username: string;
  avatar?: string;
  tipo?: 'usuario' | 'local';
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

export default function CrearPublicacionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  const { refreshData } = useGlobalData();
  const params = useLocalSearchParams();
  const localId = params.localId as string | undefined;
  
  const [contenido, setContenido] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [ubicacion, setUbicacion] = useState<{
    nombre: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [usuariosEtiquetados, setUsuariosEtiquetados] = useState<UserSuggestion[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<UserSuggestion[]>([]);
  const [searchingTags, setSearchingTags] = useState(false);

  const MAX_IMAGES = 10; // Instagram allows up to 10 images

  const buscarUsuariosYLocales = useCallback(async (texto: string) => {
    // ENHANCED: Allow search with just 1 character and remove @ if present
    const cleanTexto = texto.replace('@', '').trim();
    
    if (cleanTexto.length < 1) {
      setTagSuggestions([]);
      return;
    }

    setSearchingTags(true);
    try {
      console.log('[CrearPublicacion] 🔍 Searching for users and locals with query:', cleanTexto);
      
      // ENHANCED: Fuzzy search with multiple strategies
      // 1. Exact match (highest priority)
      // 2. Starts with (high priority)
      // 3. Contains (medium priority)
      // 4. Fuzzy match with typos (lower priority)
      
      // Create fuzzy search patterns
      // Allow for 1 character difference per 4 characters
      const fuzzyPattern = cleanTexto.split('').join('%');
      
      // Search users with enhanced fuzzy matching
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar, perfil_privado, permitir_etiquetas')
        .or(`nombre.ilike.%${cleanTexto}%,username.ilike.%${cleanTexto}%,nombre.ilike.%${fuzzyPattern}%,username.ilike.%${fuzzyPattern}%`)
        .eq('activo', true)
        .limit(10);

      if (usersError) {
        console.error('[CrearPublicacion] ❌ Error searching users:', usersError);
      } else {
        console.log('[CrearPublicacion] ✅ Found users:', usersData?.length || 0);
      }

      // FIXED: Search locals with enhanced fuzzy matching AND filter by active subscription
      // Only show locals with active 'estandar' or 'premium' plans
      console.log('[CrearPublicacion] 🏢 Searching locals with active subscriptions...');
      
      const { data: localsData, error: localsError } = await supabase
        .from('locales')
        .select(`
          id, 
          nombre, 
          imagen_url,
          suscripciones_locales!inner(
            estado,
            planes_suscripcion!inner(nombre)
          )
        `)
        .or(`nombre.ilike.%${cleanTexto}%,nombre.ilike.%${fuzzyPattern}%`)
        .eq('activo', true)
        .eq('suscripciones_locales.estado', 'activa')
        .in('suscripciones_locales.planes_suscripcion.nombre', ['estandar', 'premium'])
        .limit(10);

      if (localsError) {
        console.error('[CrearPublicacion] ❌ Error searching locals:', localsError);
      } else {
        console.log('[CrearPublicacion] ✅ Found locals with active subscriptions:', localsData?.length || 0);
        if (localsData && localsData.length > 0) {
          console.log('[CrearPublicacion] 📋 Locals found:', localsData.map(l => ({
            nombre: l.nombre,
            plan: l.suscripciones_locales?.[0]?.planes_suscripcion?.nombre,
            estado: l.suscripciones_locales?.[0]?.estado
          })));
        }
      }

      const suggestions: UserSuggestion[] = [];

      // Add users with relevance scoring
      if (!usersError && usersData) {
        const filteredUsers = usersData.filter(
          (u) => u.permitir_etiquetas && !usuariosEtiquetados.find((ue) => ue.id === u.id && ue.tipo === 'usuario')
        );
        
        // Sort by relevance
        const scoredUsers = filteredUsers.map(u => {
          const nombre = u.nombre.toLowerCase();
          const username = (u.username || '').toLowerCase();
          const search = cleanTexto.toLowerCase();
          
          let score = 0;
          
          // Exact match (highest score)
          if (nombre === search || username === search) score += 100;
          // Starts with (high score)
          else if (nombre.startsWith(search) || username.startsWith(search)) score += 50;
          // Contains (medium score)
          else if (nombre.includes(search) || username.includes(search)) score += 25;
          // Fuzzy match (lower score)
          else score += 10;
          
          return { ...u, score };
        });
        
        scoredUsers.sort((a, b) => b.score - a.score);
        
        suggestions.push(...scoredUsers.slice(0, 5).map(u => ({
          id: u.id,
          nombre: u.nombre,
          username: u.username || u.nombre,
          avatar: u.avatar,
          tipo: 'usuario' as const,
        })));
      }

      // Add locals with relevance scoring (only those with active estandar or premium plans)
      if (!localsError && localsData) {
        const filteredLocals = localsData.filter(
          (l) => !usuariosEtiquetados.find((ue) => ue.id === l.id && ue.tipo === 'local')
        );
        
        // Sort by relevance
        const scoredLocals = filteredLocals.map(l => {
          const nombre = l.nombre.toLowerCase();
          const search = cleanTexto.toLowerCase();
          
          let score = 0;
          
          // Exact match (highest score)
          if (nombre === search) score += 100;
          // Starts with (high score)
          else if (nombre.startsWith(search)) score += 50;
          // Contains (medium score)
          else if (nombre.includes(search)) score += 25;
          // Fuzzy match (lower score)
          else score += 10;
          
          return { ...l, score };
        });
        
        scoredLocals.sort((a, b) => b.score - a.score);
        
        suggestions.push(...scoredLocals.slice(0, 5).map(l => ({
          id: l.id,
          nombre: l.nombre,
          username: l.nombre,
          avatar: l.imagen_url,
          tipo: 'local' as const,
        })));
      }

      console.log('[CrearPublicacion] 📊 Total suggestions:', suggestions.length, '(Users:', suggestions.filter(s => s.tipo === 'usuario').length, ', Locals:', suggestions.filter(s => s.tipo === 'local').length, ')');
      setTagSuggestions(suggestions);
    } catch (error) {
      console.error('[CrearPublicacion] ❌ Error buscando usuarios y locales:', error);
    } finally {
      setSearchingTags(false);
    }
  }, [usuariosEtiquetados]);

  // ENHANCED: Real-time predictive search as user types
  useEffect(() => {
    if (showTagModal && tagSearchQuery.length > 0) {
      buscarUsuariosYLocales(tagSearchQuery);
    } else {
      setTagSuggestions([]);
    }
  }, [tagSearchQuery, showTagModal, buscarUsuariosYLocales]);

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

  const seleccionarEtiqueta = (item: UserSuggestion) => {
    setUsuariosEtiquetados([...usuariosEtiquetados, item]);
    setTagSearchQuery('');
    setTagSuggestions([]);
    setShowTagModal(false);
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
        console.error('[CrearPublicacion] Error uploading image:', error);
        return null;
      }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[CrearPublicacion] Error in uploadImage:', error);
      return null;
    }
  };

  const publicar = async () => {
    if (!contenido.trim() && imagenes.length === 0) {
      Alert.alert('Error', 'Debes agregar contenido o al menos una imagen');
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
      console.log('[CrearPublicacion] Starting publication...');
      console.log('[CrearPublicacion] Active profile type:', activeProfileType);
      console.log('[CrearPublicacion] Active profile ID:', activeProfileId);
      console.log('[CrearPublicacion] LocalId param:', localId);
      console.log('[CrearPublicacion] User ID:', user.id);
      console.log('[CrearPublicacion] Number of images:', imagenes.length);
      
      let imagenesUrls: string[] = [];
      if (imagenes.length > 0) {
        console.log('[CrearPublicacion] Uploading', imagenes.length, 'images...');
        
        // Upload images with progress tracking
        for (let i = 0; i < imagenes.length; i++) {
          const progressStart = 10 + (i * 60 / imagenes.length);
          setUploadProgress(progressStart);
          
          const imageUrl = await uploadImage(imagenes[i]);
          if (!imageUrl) {
            Alert.alert('Error', `No se pudo subir la imagen ${i + 1}`);
            setPublishing(false);
            setShowUploadProgress(false);
            return;
          }
          imagenesUrls.push(imageUrl);
          
          const progressEnd = 10 + ((i + 1) * 60 / imagenes.length);
          setUploadProgress(progressEnd);
        }
        
        console.log('[CrearPublicacion] All images uploaded successfully');
      } else {
        setUploadProgress(70);
      }

      // Determine the correct author based on active profile
      let effectiveLocalId: string | null = null;
      let postTipo: 'usuario' | 'local' = 'usuario';

      if (localId) {
        effectiveLocalId = localId;
        postTipo = 'local';
        console.log('[CrearPublicacion] ✅ Using localId from params:', localId);
      } else if (activeProfileType === 'local' && activeProfileId) {
        effectiveLocalId = activeProfileId;
        postTipo = 'local';
        console.log('[CrearPublicacion] ✅ Using active local profile:', activeProfileId);
      } else {
        postTipo = 'usuario';
        console.log('[CrearPublicacion] ✅ Publishing as user (cliente)');
      }

      console.log('[CrearPublicacion] ✅ Final effective local ID:', effectiveLocalId);
      console.log('[CrearPublicacion] ✅ Final post tipo:', postTipo);

      setUploadProgress(75);

      // Create post with correct author context
      // Keep backward compatibility: if only one image, also set 'imagen' field
      const postData: any = {
        autor_id: user.id,
        tipo: postTipo,
        local_id: effectiveLocalId,
        contenido: contenido,
        imagenes: imagenesUrls,
        ubicacion: ubicacion?.nombre,
        ubicacion_lat: ubicacion?.lat,
        ubicacion_lng: ubicacion?.lng,
      };

      // Backward compatibility: set imagen field if only one image
      if (imagenesUrls.length === 1) {
        postData.imagen = imagenesUrls[0];
      }

      const { data: postData2, error: postError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      if (postError) {
        console.error('[CrearPublicacion] Error publicando:', postError);
        throw postError;
      }

      console.log('[CrearPublicacion] ✅ Post created successfully:', postData2);

      setUploadProgress(80);

      // Process hashtags and mentions in the content
      if (postData2 && contenido) {
        console.log('[CrearPublicacion] 🏷️ Processing hashtags and mentions...');
        await Promise.all([
          processPostHashtags(postData2.id, contenido),
          processPostMentions(postData2.id, contenido),
        ]);
        console.log('[CrearPublicacion] ✅ Hashtags and mentions processed');
      }

      setUploadProgress(85);

      // Handle tags - only for users (not locals)
      if (usuariosEtiquetados.length > 0 && postData2) {
        const userTags = usuariosEtiquetados.filter(u => u.tipo === 'usuario');
        
        if (userTags.length > 0) {
          const tags = userTags.map((u) => ({
            post_id: postData2.id,
            usuario_id: u.id,
            estado: 'pendiente',
          }));

          const { error: tagsError } = await supabase
            .from('post_tags')
            .insert(tags);

          if (tagsError) console.error('Error adding tags:', tagsError);

          // Send notifications to tagged users
          const notifications = userTags.map((u) => ({
            usuario_id: u.id,
            tipo: 'mencion',
            titulo: 'Te han etiquetado',
            mensaje: `${user.nombre} te ha etiquetado en una publicación`,
            usuario_origen_id: user.id,
            post_id: postData2.id,
          }));

          await supabase.from('notificaciones').insert(notifications);
        }
      }

      setUploadProgress(90);

      // Refresh global data to show new post immediately
      console.log('[CrearPublicacion] 🔄 Refreshing global data...');
      await refreshData(true);

      setUploadProgress(100);

      // Small delay to show 100% before closing
      setTimeout(() => {
        setShowUploadProgress(false);
        Alert.alert('Éxito', 'Publicación creada correctamente', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }, 500);
    } catch (error) {
      console.error('[CrearPublicacion] Error publicando:', error);
      setShowUploadProgress(false);
      Alert.alert('Error', 'No se pudo crear la publicación');
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
          <Text style={styles.headerTitle}>Nueva Publicación</Text>
          <TouchableOpacity 
            onPress={publicar} 
            style={styles.publishButton}
            disabled={publishing}
            activeOpacity={0.7}
          >
            {publishing ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={styles.publishButtonText}>Publicar</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={styles.textInput}
            placeholder="¿Qué estás pensando?"
            placeholderTextColor={colors.textSecondary}
            value={contenido}
            onChangeText={setContenido}
            multiline
            maxLength={500}
            editable={!publishing}
          />

          {usuariosEtiquetados.length > 0 && (
            <View style={styles.taggedUsersContainer}>
              <Text style={styles.taggedUsersTitle}>Etiquetados:</Text>
              <View style={styles.taggedUsersList}>
                {usuariosEtiquetados.map((item) => (
                  <View key={`${item.id}-${item.tipo}`} style={styles.taggedUserChip}>
                    <IconSymbol 
                      name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'} 
                      size={12} 
                      color={colors.text} 
                    />
                    <Text style={styles.taggedUserName}>
                      {item.username || item.nombre}
                    </Text>
                    <TouchableOpacity onPress={() => eliminarEtiqueta(item.id, item.tipo!)} activeOpacity={0.7}>
                      <IconSymbol name="xmark.circle.fill" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {ubicacion && (
            <View style={styles.locationContainer}>
              <IconSymbol name="mappin.circle.fill" size={20} color={colors.primary} />
              <Text style={styles.locationText}>{ubicacion.nombre}</Text>
              <TouchableOpacity onPress={() => setUbicacion(null)} activeOpacity={0.7}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {imagenes.length > 0 && (
            <View style={styles.imagesContainer}>
              <View style={styles.imagesHeader}>
                <Text style={styles.imagesCount}>
                  {imagenes.length} {imagenes.length === 1 ? 'imagen' : 'imágenes'}
                </Text>
                {imagenes.length < MAX_IMAGES && (
                  <Text style={styles.imagesLimit}>
                    (máximo {MAX_IMAGES})
                  </Text>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                {imagenes.map((uri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => eliminarImagen(index)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="xmark.circle.fill" size={28} color={colors.badgeNuevo} />
                    </TouchableOpacity>
                    <View style={styles.imageIndexBadge}>
                      <Text style={styles.imageIndexText}>{index + 1}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.options}>
            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={seleccionarImagenes}
              disabled={publishing || imagenes.length >= MAX_IMAGES}
              activeOpacity={0.7}
            >
              <IconSymbol name="photo" size={28} color={imagenes.length >= MAX_IMAGES ? colors.textSecondary : colors.primary} />
              <Text style={[styles.optionText, imagenes.length >= MAX_IMAGES && styles.optionTextDisabled]}>
                Galería
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={tomarFoto}
              disabled={publishing || imagenes.length >= MAX_IMAGES}
              activeOpacity={0.7}
            >
              <IconSymbol name="camera" size={28} color={imagenes.length >= MAX_IMAGES ? colors.textSecondary : colors.secondary} />
              <Text style={[styles.optionText, imagenes.length >= MAX_IMAGES && styles.optionTextDisabled]}>
                Cámara
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={obtenerUbicacion}
              disabled={loadingLocation || publishing}
              activeOpacity={0.7}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color={colors.badgeDestacado} />
              ) : (
                <IconSymbol name="mappin.and.ellipse" size={28} color={colors.badgeDestacado} />
              )}
              <Text style={styles.optionText}>Ubicación</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setShowTagModal(true)}
              disabled={publishing}
              activeOpacity={0.7}
            >
              <IconSymbol name="person.crop.circle.badge.plus" size={28} color={colors.badgeNuevo} />
              <Text style={styles.optionText}>Etiquetar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ENHANCED Tag Modal - Fixed layout with search at top and results below */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowTagModal(false);
          setTagSearchQuery('');
          setTagSuggestions([]);
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => {
            setShowTagModal(false);
            setTagSearchQuery('');
            setTagSuggestions([]);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.tagModalKeyboardView}
          >
            <Pressable style={styles.tagModal} onPress={(e) => e.stopPropagation()}>
              {/* Fixed Header */}
              <View style={styles.tagModalHeader}>
                <Text style={styles.tagModalTitle}>Etiquetar Usuarios y Locales</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowTagModal(false);
                    setTagSearchQuery('');
                    setTagSuggestions([]);
                  }} 
                  activeOpacity={0.7}
                >
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Fixed Search Bar at Top */}
              <View style={styles.tagSearchContainer}>
                <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.tagSearchInput}
                  placeholder="Buscar usuarios o locales..."
                  placeholderTextColor={colors.textSecondary}
                  value={tagSearchQuery}
                  onChangeText={setTagSearchQuery}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {tagSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => {
                      setTagSearchQuery('');
                      setTagSuggestions([]);
                    }} 
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Scrollable Results Below */}
              <ScrollView 
                style={styles.tagSuggestionsContainer}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.tagSuggestionsContent}
              >
                {searchingTags ? (
                  <View style={styles.tagLoadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.tagLoadingText}>Buscando...</Text>
                  </View>
                ) : tagSuggestions.length > 0 ? (
                  <React.Fragment>
                    <Text style={styles.tagResultsHeader}>
                      {tagSuggestions.length} {tagSuggestions.length === 1 ? 'resultado' : 'resultados'}
                    </Text>
                    {tagSuggestions.map((item) => (
                      <TouchableOpacity
                        key={`${item.id}-${item.tipo}`}
                        style={styles.tagSuggestionItem}
                        onPress={() => seleccionarEtiqueta(item)}
                        activeOpacity={0.7}
                      >
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.tagSuggestionAvatar} />
                        ) : (
                          <View style={[styles.tagSuggestionAvatar, styles.avatarPlaceholder]}>
                            <IconSymbol 
                              name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'} 
                              size={20} 
                              color={colors.textSecondary} 
                            />
                          </View>
                        )}
                        <View style={styles.tagSuggestionInfo}>
                          <Text style={styles.tagSuggestionName}>{item.nombre}</Text>
                          <Text style={styles.tagSuggestionType}>
                            {item.tipo === 'local' ? '🏢 Local' : `👤 @${item.username}`}
                          </Text>
                        </View>
                        <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </React.Fragment>
                ) : tagSearchQuery.length >= 1 ? (
                  <View style={styles.tagEmptyState}>
                    <IconSymbol name="magnifyingglass" size={48} color={colors.textSecondary} />
                    <Text style={styles.tagEmptyText}>No se encontraron resultados</Text>
                    <Text style={styles.tagEmptySubtext}>
                      Intenta con otro nombre o verifica la ortografía
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tagEmptyState}>
                    <IconSymbol name="person.2.fill" size={48} color={colors.textSecondary} />
                    <Text style={styles.tagEmptyText}>Busca usuarios o locales</Text>
                    <Text style={styles.tagEmptySubtext}>
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
        message={imagenes.length > 1 ? `Subiendo ${imagenes.length} imágenes...` : "Publicando contenido..."}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  textInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  taggedUsersContainer: {
    marginBottom: 16,
  },
  taggedUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  taggedUsersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taggedUserChip: {
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
  taggedUserName: {
    fontSize: 14,
    color: colors.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  imagesContainer: {
    marginBottom: 20,
  },
  imagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  imagesCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  imagesLimit: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  selectedImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionTextDisabled: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  tagModalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tagModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
  },
  tagModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tagModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  tagSearchContainer: {
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
  tagSearchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  tagSuggestionsContainer: {
    flex: 1,
  },
  tagSuggestionsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tagLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  tagLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tagResultsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tagSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tagSuggestionAvatar: {
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
  tagSuggestionInfo: {
    flex: 1,
  },
  tagSuggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  tagSuggestionType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tagEmptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  tagEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  tagEmptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
