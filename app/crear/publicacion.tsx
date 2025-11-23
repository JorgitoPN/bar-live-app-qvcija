
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
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Dimensions,
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
import MentionAutocomplete, { MentionSuggestion } from '@/components/social/MentionAutocomplete';
import HashtagAutocomplete from '@/components/social/HashtagAutocomplete';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [cursorPosition, setCursorPosition] = useState(0);
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const MAX_IMAGES = 10;

  const buscarUsuariosYLocales = useCallback(async (texto: string) => {
    const cleanTexto = texto.replace('@', '').trim();
    
    if (cleanTexto.length < 1) {
      setTagSuggestions([]);
      return;
    }

    setSearchingTags(true);
    try {
      console.log('[CrearPublicacion] 🔍 Searching for users and locals with query:', cleanTexto);
      
      const fuzzyPattern = cleanTexto.split('').join('%');
      
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

      console.log('[CrearPublicacion] 🏢 Searching locals with active subscriptions...');
      
      // IMPROVED: Use a single query with proper JOINs
      const { data: localsWithPlans, error: localsError } = await supabase
        .from('locales')
        .select(`
          id,
          nombre,
          imagen_url,
          suscripciones_locales!inner(
            estado,
            plan_id,
            planes_suscripcion!inner(
              nombre
            )
          )
        `)
        .eq('activo', true)
        .eq('suscripciones_locales.estado', 'activa')
        .in('suscripciones_locales.planes_suscripcion.nombre', ['estandar', 'premium'])
        .or(`nombre.ilike.%${cleanTexto}%,nombre.ilike.%${fuzzyPattern}%`)
        .limit(20);

      if (localsError) {
        console.error('[CrearPublicacion] ❌ Error searching locals:', localsError);
      }

      let filteredLocalsData: any[] = [];
      if (localsWithPlans && localsWithPlans.length > 0) {
        console.log('[CrearPublicacion] ✅ Found locals with active plans:', localsWithPlans.length);
        
        // Transform the data structure
        filteredLocalsData = localsWithPlans.map(local => ({
          id: local.id,
          nombre: local.nombre,
          imagen_url: local.imagen_url,
        }));
      }

      const suggestions: UserSuggestion[] = [];

      if (!usersError && usersData) {
        const filteredUsers = usersData.filter(
          (u) => u.permitir_etiquetas && !usuariosEtiquetados.find((ue) => ue.id === u.id && ue.tipo === 'usuario')
        );
        
        const scoredUsers = filteredUsers.map(u => {
          const nombre = u.nombre.toLowerCase();
          const username = (u.username || '').toLowerCase();
          const search = cleanTexto.toLowerCase();
          
          let score = 0;
          
          if (nombre === search || username === search) score += 100;
          else if (nombre.startsWith(search) || username.startsWith(search)) score += 50;
          else if (nombre.includes(search) || username.includes(search)) score += 25;
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

      if (filteredLocalsData.length > 0) {
        const filteredLocals = filteredLocalsData.filter(
          (l) => !usuariosEtiquetados.find((ue) => ue.id === l.id && ue.tipo === 'local')
        );
        
        const scoredLocals = filteredLocals.map(l => {
          const nombre = l.nombre.toLowerCase();
          const search = cleanTexto.toLowerCase();
          
          let score = 0;
          
          if (nombre === search) score += 100;
          else if (nombre.startsWith(search)) score += 50;
          else if (nombre.includes(search)) score += 25;
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

  useEffect(() => {
    if (showTagModal && tagSearchQuery.length > 0) {
      buscarUsuariosYLocales(tagSearchQuery);
    } else {
      setTagSuggestions([]);
    }
  }, [tagSearchQuery, showTagModal, buscarUsuariosYLocales]);

  const handleSelectInlineMention = (mention: MentionSuggestion, mentionText: string) => {
    console.log('[CrearPublicacion] ✅ Selected inline mention:', mention);
    
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
    console.log('[CrearPublicacion] Selected inline hashtag:', hashtag);
    
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

      if (postData2 && contenido) {
        console.log('[CrearPublicacion] 🏷️ Processing hashtags and mentions...');
        await Promise.all([
          processPostHashtags(postData2.id, contenido),
          processPostMentions(postData2.id, contenido),
        ]);
        console.log('[CrearPublicacion] ✅ Hashtags and mentions processed');
      }

      setUploadProgress(85);

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

      console.log('[CrearPublicacion] 🔄 Refreshing global data...');
      await refreshData(true);

      setUploadProgress(100);

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
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva Publicación</Text>
          <TouchableOpacity 
            onPress={publicar} 
            style={[styles.publishButton, (!contenido.trim() && imagenes.length === 0) && styles.publishButtonDisabled]}
            disabled={publishing || (!contenido.trim() && imagenes.length === 0)}
            activeOpacity={0.7}
          >
            {publishing ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={[styles.publishButtonText, (!contenido.trim() && imagenes.length === 0) && styles.publishButtonTextDisabled]}>
                Publicar
              </Text>
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
          showsVerticalScrollIndicator={false}
        >
          {/* Text Input Section */}
          <View style={styles.textInputSection}>
            <TextInput
              style={styles.textInput}
              placeholder="¿Qué estás pensando?"
              placeholderTextColor={colors.textSecondary}
              value={contenido}
              onChangeText={(text) => {
                console.log('[CrearPublicacion] 📝 Text changed:', text);
                setContenido(text);
              }}
              onSelectionChange={(event) => {
                const newPosition = event.nativeEvent.selection.start;
                console.log('[CrearPublicacion] 📍 Cursor position changed to:', newPosition);
                setCursorPosition(newPosition);
              }}
              multiline
              maxLength={2200}
              editable={!publishing}
            />
            <Text style={styles.charCount}>{contenido.length}/2200</Text>
            <View style={styles.helperContainer}>
              <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={14} color={colors.primary} />
              <Text style={styles.helperText}>
                Escribe @ para mencionar usuarios o locales, # para hashtags
              </Text>
            </View>
          </View>

          {/* Images Preview */}
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

          {/* Tagged Users */}
          {usuariosEtiquetados.length > 0 && (
            <View style={styles.taggedSection}>
              <Text style={styles.sectionLabel}>Personas etiquetadas</Text>
              <View style={styles.taggedList}>
                {usuariosEtiquetados.map((item) => (
                  <View key={`${item.id}-${item.tipo}`} style={styles.taggedChip}>
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
            </View>
          )}

          {/* Location */}
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

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <Text style={styles.actionsSectionTitle}>Añadir a tu publicación</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={[styles.actionButton, imagenes.length >= MAX_IMAGES && styles.actionButtonDisabled]} 
                onPress={seleccionarImagenes}
                disabled={publishing || imagenes.length >= MAX_IMAGES}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <IconSymbol ios_icon_name="photo" android_material_icon_name="photo_library" size={24} color={imagenes.length >= MAX_IMAGES ? colors.textSecondary : colors.primary} />
                </View>
                <Text style={[styles.actionButtonText, imagenes.length >= MAX_IMAGES && styles.actionButtonTextDisabled]}>
                  Fotos/Videos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, imagenes.length >= MAX_IMAGES && styles.actionButtonDisabled]} 
                onPress={tomarFoto}
                disabled={publishing || imagenes.length >= MAX_IMAGES}
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
                disabled={publishing}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#8B5CF6' + '15' }]}>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.plus" android_material_icon_name="person_add" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.actionButtonText}>
                  Etiquetar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={obtenerUbicacion}
                disabled={loadingLocation || publishing}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#EF4444' + '15' }]}>
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <IconSymbol ios_icon_name="mappin.and.ellipse" android_material_icon_name="location_on" size={24} color="#EF4444" />
                  )}
                </View>
                <Text style={styles.actionButtonText}>
                  Ubicación
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Autocomplete Components - Positioned above keyboard */}
        <MentionAutocomplete
          text={contenido}
          cursorPosition={cursorPosition}
          onSelectMention={handleSelectInlineMention}
        />

        <HashtagAutocomplete
          text={contenido}
          cursorPosition={cursorPosition}
          onSelectHashtag={handleSelectInlineHashtag}
        />
      </KeyboardAvoidingView>

      {/* Tag Modal */}
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
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.tagModalKeyboardView}
          >
            <View style={styles.tagModal}>
              <View style={styles.tagModalHeader}>
                <Text style={styles.tagModalTitle}>Etiquetar personas</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowTagModal(false);
                    setTagSearchQuery('');
                    setTagSuggestions([]);
                  }} 
                  activeOpacity={0.7}
                >
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.tagSearchContainer}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.tagSearchInput}
                  placeholder="Buscar..."
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
                    <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

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
                              ios_icon_name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                              android_material_icon_name={item.tipo === 'local' ? 'business' : 'person'}
                              size={20} 
                              color={colors.textSecondary} 
                            />
                          </View>
                        )}
                        <View style={styles.tagSuggestionInfo}>
                          <Text style={styles.tagSuggestionName}>{item.nombre}</Text>
                          <Text style={styles.tagSuggestionType}>
                            {item.tipo === 'local' ? '🏢 Local' : `@${item.username}`}
                          </Text>
                        </View>
                        <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </React.Fragment>
                ) : tagSearchQuery.length >= 1 ? (
                  <View style={styles.tagEmptyState}>
                    <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={48} color={colors.textSecondary} />
                    <Text style={styles.tagEmptyText}>No se encontraron resultados</Text>
                    <Text style={styles.tagEmptySubtext}>
                      Intenta con otro nombre
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tagEmptyState}>
                    <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={48} color={colors.textSecondary} />
                    <Text style={styles.tagEmptyText}>Busca personas o locales</Text>
                    <Text style={styles.tagEmptySubtext}>
                      Escribe para ver resultados
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
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
    maxWidth: SCREEN_WIDTH - 64,
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
  removeTagButton: {
    padding: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  tagModalKeyboardView: {
    width: '100%',
  },
  tagModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '70%',
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
    fontWeight: '700',
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
    paddingBottom: 40,
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
