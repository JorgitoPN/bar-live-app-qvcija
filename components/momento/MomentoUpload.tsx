
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MomentoUploadProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * ✅ MOMENTO UPLOAD v2.0 - LOCAL PROFILE SUPPORT
 * 
 * Features:
 * - ✅ Supports uploading momentos as user or local profile
 * - ✅ Automatically detects active profile type
 * - ✅ Verifies ownership for local profiles
 * - ✅ Proper RLS compliance with user_id in storage path
 */

export default function MomentoUpload({ visible, onClose, onSuccess }: MomentoUploadProps) {
  const { user, ensureValidSession } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu galería para subir Momentos'
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
        setSelectedImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[MomentoUpload] Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
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
        setSelectedImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[MomentoUpload] Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const uploadMomento = async () => {
    if (!selectedImage) {
      console.error('[MomentoUpload] No image selected');
      Alert.alert('Error', 'Por favor selecciona una imagen');
      return;
    }

    try {
      setUploading(true);

      console.log('[MomentoUpload] 🚀 Iniciando subida de Momento...');
      console.log('[MomentoUpload] 📊 Estado inicial:', {
        hasUser: !!user,
        userId: user?.id,
        activeProfileType,
        activeProfileId,
      });

      const validSession = await ensureValidSession();
      
      if (!validSession) {
        console.error('[MomentoUpload] ❌ No se pudo obtener una sesión válida');
        Alert.alert(
          'Sesión expirada',
          'Tu sesión ha expirado. Por favor, cierra sesión y vuelve a iniciar sesión.'
        );
        setUploading(false);
        return;
      }

      console.log('[MomentoUpload] ✅ Sesión válida confirmada');

      const currentUserId = validSession.user.id;

      console.log('[MomentoUpload] 👤 Usuario confirmado:', currentUserId);

      let momentoData: any = {
        autor_id: currentUserId,
        tipo: 'usuario',
        categoria: 'general',
      };

      if (activeProfileType === 'local' && activeProfileId) {
        console.log('[MomentoUpload] 🏢 Verificando propiedad del local...');
        
        const { data: ownershipData, error: ownershipError } = await supabase
          .from('propietarios_locales')
          .select('id, local_id, propietario_id, activo')
          .eq('propietario_id', currentUserId)
          .eq('local_id', activeProfileId)
          .eq('activo', true)
          .single();

        if (ownershipError || !ownershipData) {
          console.error('[MomentoUpload] ❌ Verificación de propiedad falló:', ownershipError);
          Alert.alert(
            'Error de permisos',
            'No tienes permisos para subir momentos como este local. Verifica que seas propietario activo del local.'
          );
          setUploading(false);
          return;
        }

        console.log('[MomentoUpload] ✅ Propiedad verificada:', ownershipData);
        
        momentoData.tipo = 'local';
        momentoData.local_id = activeProfileId;
      }

      console.log('[MomentoUpload] 📝 Datos del momento preparados:', momentoData);

      console.log('[MomentoUpload] 📸 Convirtiendo imagen a base64...');
      const base64 = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[MomentoUpload] ✅ Imagen convertida, tamaño:', base64.length, 'caracteres');

      const fileName = `momento-${Date.now()}.jpg`;
      const filePath = `${currentUserId}/${fileName}`;

      console.log('[MomentoUpload] 📤 Subiendo a storage bucket "momentos"');
      console.log('[MomentoUpload] 📁 Ruta del archivo:', filePath);

      const arrayBuffer = decode(base64);

      console.log('[MomentoUpload] 📦 Tamaño del buffer:', arrayBuffer.byteLength, 'bytes');

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('momentos')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('[MomentoUpload] ❌ Error de subida al storage:', uploadError);
        
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
          Alert.alert(
            'Error de permisos',
            'No tienes permisos para subir archivos. Por favor, cierra sesión y vuelve a iniciar sesión.'
          );
        } else if (uploadError.message.includes('Duplicate')) {
          Alert.alert('Error', 'Ya existe un archivo con ese nombre. Intenta de nuevo.');
        } else {
          Alert.alert('Error', `No se pudo subir la imagen: ${uploadError.message}`);
        }
        setUploading(false);
        return;
      }

      console.log('[MomentoUpload] ✅ Subida al storage exitosa:', uploadData);

      const { data: urlData } = supabase.storage
        .from('momentos')
        .getPublicUrl(filePath);

      console.log('[MomentoUpload] 🔗 URL pública generada:', urlData.publicUrl);

      momentoData.imagen_url = urlData.publicUrl;

      console.log('[MomentoUpload] 💾 Creando registro en la base de datos...');

      const { data: insertData, error: insertError } = await supabase
        .from('momentos')
        .insert(momentoData)
        .select()
        .single();

      if (insertError) {
        console.error('[MomentoUpload] ❌ Error insertando en base de datos:', insertError);
        
        if (insertError.message.includes('row-level security') || insertError.message.includes('policy')) {
          Alert.alert(
            'Error de permisos',
            'No tienes permisos para crear este Momento. Verifica que estés autenticado correctamente.'
          );
        } else if (insertError.message.includes('propietarios_locales')) {
          Alert.alert(
            'Error de permisos',
            'No tienes permisos para crear Momentos como este local. Verifica que seas propietario activo del local.'
          );
        } else {
          Alert.alert('Error', `No se pudo crear el Momento: ${insertError.message}`);
        }
        setUploading(false);
        return;
      }

      console.log('[MomentoUpload] ✅ Momento creado exitosamente:', insertData);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('¡Éxito!', 'Tu Momento se ha publicado');
      
      setSelectedImage(null);
      
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('[MomentoUpload] ❌ Error inesperado:', error);
      Alert.alert('Error', 'No se pudo subir el Momento. Por favor, intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedImage(null);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={uploading}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nuevo Momento</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.content}>
            {selectedImage ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={() => setSelectedImage(null)}
                    disabled={uploading}
                  >
                    <IconSymbol
                      ios_icon_name="arrow.counterclockwise"
                      android_material_icon_name="refresh"
                      size={24}
                      color="#fff"
                    />
                    <Text style={styles.previewButtonText}>Cambiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.previewButton, styles.uploadButton]}
                    onPress={uploadMomento}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <React.Fragment>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={24}
                          color="#fff"
                        />
                        <Text style={styles.previewButtonText}>Publicar</Text>
                      </React.Fragment>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.optionsContainer}>
                <Text style={styles.title}>Comparte un Momento</Text>
                <Text style={styles.subtitle}>
                  Las fotos desaparecen después de 24 horas
                </Text>

                <View style={styles.options}>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={takePhoto}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.optionGradient}
                    >
                      <IconSymbol
                        ios_icon_name="camera.fill"
                        android_material_icon_name="camera_alt"
                        size={48}
                        color="#fff"
                      />
                      <Text style={styles.optionText}>Tomar Foto</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={pickImage}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.optionGradient}
                    >
                      <IconSymbol
                        ios_icon_name="photo.fill"
                        android_material_icon_name="photo_library"
                        size={48}
                        color="#fff"
                      />
                      <Text style={styles.optionText}>Galería</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                  <IconSymbol
                    ios_icon_name="info.circle.fill"
                    android_material_icon_name="info"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.infoText}>
                    {activeProfileType === 'local' 
                      ? 'Los Momentos de tu local son visibles para tus seguidores durante 24 horas'
                      : 'Los Momentos son visibles para tus seguidores durante 24 horas'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 40,
    fontFamily: 'System',
    textAlign: 'center',
  },
  options: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  optionButton: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  optionGradient: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: SCREEN_WIDTH - 40,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'System',
    lineHeight: 18,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: '80%',
    alignSelf: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 40,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  uploadButton: {
    backgroundColor: colors.primary,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
});
