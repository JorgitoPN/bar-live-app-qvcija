
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
} from 'react-native';
import { supabase } from '@/utils/supabase';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import UploadProgressModal from '@/components/common/UploadProgressModal';

const { height } = Dimensions.get('window');

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
  const [ubicacion, setUbicacion] = useState<{
    nombre: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);

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

  const obtenerUbicacion = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Necesitamos acceso a tu ubicación para añadirla a la historia'
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
          ubicacion: ubicacion?.nombre,
          ubicacion_lat: ubicacion?.lat,
          ubicacion_lng: ubicacion?.lng,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      console.log('[CrearHistoria] ✅ Story created successfully:', storyData.id);

      setUploadProgress(95);

      // FIXED: Force refresh global data to show new story immediately
      console.log('[CrearHistoria] 🔄 Refreshing global data...');
      await refreshData(false); // Use false to ensure a full refresh

      setUploadProgress(100);

      // Small delay to show 100% before closing
      setTimeout(() => {
        setShowUploadProgress(false);
        
        // FIXED: Navigate to the appropriate screen based on story type
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

        {imagen && (
          <View style={styles.optionsContainer}>
            {ubicacion && (
              <View style={styles.locationContainer}>
                <IconSymbol name="mappin.circle.fill" size={20} color={colors.primary} />
                <Text style={styles.locationText}>{ubicacion.nombre}</Text>
                <TouchableOpacity onPress={() => setUbicacion(null)} activeOpacity={0.7}>
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.additionalOptions}>
              <TouchableOpacity
                style={styles.additionalOptionButton}
                onPress={obtenerUbicacion}
                disabled={loadingLocation || publishing}
                activeOpacity={0.7}
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color={colors.badgeDestacado} />
                ) : (
                  <IconSymbol name="mappin.and.ellipse" size={24} color={colors.badgeDestacado} />
                )}
                <Text style={styles.additionalOptionText}>Añadir ubicación</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

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
    width: '100%',
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
  additionalOptions: {
    width: '100%',
    gap: 12,
  },
  additionalOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  additionalOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
