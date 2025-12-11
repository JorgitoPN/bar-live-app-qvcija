
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
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { decode } from 'base64-arraybuffer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MomentoUploadProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MomentoUpload({ visible, onClose, onSuccess }: MomentoUploadProps) {
  const { user } = useAuth();
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
    if (!user || !selectedImage) return;

    try {
      setUploading(true);

      console.log('[MomentoUpload] Starting upload...', {
        userId: user.id,
        activeProfileType,
        activeProfileId,
      });

      // Verify ownership if uploading as local
      if (activeProfileType === 'local' && activeProfileId) {
        const { data: ownershipData, error: ownershipError } = await supabase
          .from('propietarios_locales')
          .select('id')
          .eq('propietario_id', user.id)
          .eq('local_id', activeProfileId)
          .single();

        if (ownershipError || !ownershipData) {
          console.error('[MomentoUpload] Ownership verification failed:', ownershipError);
          Alert.alert('Error', 'No tienes permisos para subir momentos como este local');
          setUploading(false);
          return;
        }

        console.log('[MomentoUpload] ✅ Ownership verified');
      }

      // Convert image to base64
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const base64String = base64data.split(',')[1];

          // Upload to Supabase Storage
          const fileName = `momento-${Date.now()}.jpg`;
          const filePath = `momentos/${user.id}/${fileName}`;

          console.log('[MomentoUpload] Uploading to storage:', filePath);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('momentos')
            .upload(filePath, decode(base64String), {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            console.error('[MomentoUpload] Storage upload error:', uploadError);
            throw uploadError;
          }

          console.log('[MomentoUpload] ✅ Storage upload successful');

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('momentos')
            .getPublicUrl(filePath);

          // Create momento record
          const momentoData: any = {
            autor_id: user.id,
            tipo: activeProfileType === 'local' ? 'local' : 'usuario',
            imagen_url: urlData.publicUrl,
            categoria: 'general',
          };

          if (activeProfileType === 'local' && activeProfileId) {
            momentoData.local_id = activeProfileId;
          }

          console.log('[MomentoUpload] Creating momento record:', momentoData);

          const { error: insertError } = await supabase
            .from('momentos')
            .insert(momentoData);

          if (insertError) {
            console.error('[MomentoUpload] Database insert error:', insertError);
            throw insertError;
          }

          console.log('[MomentoUpload] ✅ Momento created successfully');

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('¡Éxito!', 'Tu Momento se ha publicado');
          
          setSelectedImage(null);
          onSuccess();
          onClose();
        } catch (error) {
          console.error('[MomentoUpload] Error uploading:', error);
          Alert.alert('Error', 'No se pudo subir el Momento');
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('[MomentoUpload] Error preparing upload:', error);
      Alert.alert('Error', 'No se pudo preparar la imagen');
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
          {/* Header */}
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

          {/* Content */}
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
                      <>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={24}
                          color="#fff"
                        />
                        <Text style={styles.previewButtonText}>Publicar</Text>
                      </>
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
                    Los Momentos son visibles para tus seguidores durante 24 horas
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
