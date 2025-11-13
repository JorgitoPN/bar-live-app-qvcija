
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

interface UserSuggestion {
  id: string;
  nombre: string;
  username: string;
  avatar?: string;
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
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const MAX_IMAGES = 10; // Instagram allows up to 10 images

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

  const buscarUsuarios = async (texto: string) => {
    if (texto.length < 2) {
      setUserSuggestions([]);
      setShowUserSuggestions(false);
      return;
    }

    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar, perfil_privado, permitir_etiquetas')
        .or(`nombre.ilike.%${texto}%,username.ilike.%${texto}%`)
        .eq('activo', true)
        .limit(10);

      if (!error && data) {
        const filteredUsers = data.filter(
          (u) => u.permitir_etiquetas && !usuariosEtiquetados.find((ue) => ue.id === u.id)
        );
        setUserSuggestions(filteredUsers);
        setShowUserSuggestions(filteredUsers.length > 0);
      }
    } catch (error) {
      console.error('Error buscando usuarios:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleContenidoChange = (text: string) => {
    setContenido(text);

    const words = text.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord && lastWord.length >= 2 && !lastWord.startsWith('@')) {
      const beforeLastWord = text.substring(0, text.lastIndexOf(lastWord));
      if (beforeLastWord.length === 0 || beforeLastWord.endsWith(' ')) {
        buscarUsuarios(lastWord);
      }
    } else {
      setShowUserSuggestions(false);
    }
  };

  const seleccionarUsuario = (usuario: UserSuggestion) => {
    setUsuariosEtiquetados([...usuariosEtiquetados, usuario]);

    const words = contenido.split(/\s+/);
    words[words.length - 1] = `@${usuario.username || usuario.nombre}`;
    setContenido(words.join(' ') + ' ');

    setShowUserSuggestions(false);
    setUserSuggestions([]);
  };

  const eliminarEtiqueta = (usuarioId: string) => {
    setUsuariosEtiquetados(usuariosEtiquetados.filter((u) => u.id !== usuarioId));
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

      setUploadProgress(85);

      if (usuariosEtiquetados.length > 0 && postData2) {
        const tags = usuariosEtiquetados.map((u) => ({
          post_id: postData2.id,
          usuario_id: u.id,
        }));

        const { error: tagsError } = await supabase
          .from('post_tags')
          .insert(tags);

        if (tagsError) console.error('Error adding tags:', tagsError);

        const notifications = usuariosEtiquetados.map((u) => ({
          usuario_id: u.id,
          tipo: 'mencion',
          titulo: 'Te han etiquetado',
          mensaje: `${user.nombre} te ha etiquetado en una publicación`,
          usuario_origen_id: user.id,
          post_id: postData2.id,
        }));

        await supabase.from('notificaciones').insert(notifications);
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="¿Qué estás pensando? Escribe un nombre para etiquetar..."
          placeholderTextColor={colors.textSecondary}
          value={contenido}
          onChangeText={handleContenidoChange}
          multiline
          maxLength={500}
          editable={!publishing}
        />

        {showUserSuggestions && (
          <View style={styles.suggestionsContainer}>
            {searchingUsers ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <FlatList
                data={userSuggestions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => seleccionarUsuario(item)}
                    activeOpacity={0.7}
                  >
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.suggestionAvatar} />
                    ) : (
                      <View style={[styles.suggestionAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                          {item.nombre.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName}>{item.nombre}</Text>
                      {item.username && (
                        <Text style={styles.suggestionUsername}>@{item.username}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {usuariosEtiquetados.length > 0 && (
          <View style={styles.taggedUsersContainer}>
            <Text style={styles.taggedUsersTitle}>Etiquetados:</Text>
            <View style={styles.taggedUsersList}>
              {usuariosEtiquetados.map((usuario) => (
                <View key={usuario.id} style={styles.taggedUserChip}>
                  <Text style={styles.taggedUserName}>
                    @{usuario.username || usuario.nombre}
                  </Text>
                  <TouchableOpacity onPress={() => eliminarEtiqueta(usuario.id)} activeOpacity={0.7}>
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
        </View>
      </ScrollView>

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
  suggestionsContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
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
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  suggestionUsername: {
    fontSize: 12,
    color: colors.textSecondary,
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
    gap: 12,
    marginTop: 20,
  },
  optionButton: {
    flex: 1,
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
});
