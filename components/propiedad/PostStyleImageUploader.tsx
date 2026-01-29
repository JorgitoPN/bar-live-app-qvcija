
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

/**
 * ✅ POST-STYLE IMAGE UPLOADER v1.0
 * 
 * Uses the EXACT SAME system as post creation:
 * - ✅ Uses 'posts' bucket (same as publications)
 * - ✅ Same upload logic as crear/publicacion.tsx
 * - ✅ Same URL generation
 * - ✅ Gallery AND camera options
 * - ✅ Proven to work reliably
 */

interface PostStyleImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImageUrl?: string | null;
  userId: string;
  label?: string;
  helperText?: string;
}

export default function PostStyleImageUploader({
  onImageUploaded,
  currentImageUrl,
  userId,
  label = 'Imagen de Verificación',
  helperText = 'Sube una foto de un documento para verificar tu identidad',
}: PostStyleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null);

  console.log('[PostStyleImageUploader] 🎬 Component initialized');
  console.log('[PostStyleImageUploader] 📸 Current image:', imageUrl ? 'Yes' : 'No');
  console.log('[PostStyleImageUploader] 👤 User ID:', userId);

  const uploadImageToStorage = async (uri: string): Promise<string | null> => {
    try {
      console.log('[PostStyleImageUploader] 📤 Starting upload...');
      console.log('[PostStyleImageUploader] 📁 URI:', uri);

      // Convert to blob (same as posts)
      const response = await fetch(uri);
      const blob = await response.blob();
      
      console.log('[PostStyleImageUploader] ✅ Blob created:', {
        size: blob.size,
        type: blob.type,
      });

      // Generate filename (same pattern as posts)
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      console.log('[PostStyleImageUploader] 📁 Filename:', fileName);
      console.log('[PostStyleImageUploader] 🪣 Bucket: posts (same as publications)');

      // Convert blob to ArrayBuffer (same as posts)
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      console.log('[PostStyleImageUploader] ✅ ArrayBuffer created');

      // Upload to 'posts' bucket (same as publications)
      const { data, error } = await supabase.storage
        .from('posts')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('[PostStyleImageUploader] ❌ Upload error:', error);
        throw error;
      }

      console.log('[PostStyleImageUploader] ✅ Upload successful');
      console.log('[PostStyleImageUploader] 📁 Path:', data.path);

      // Get public URL (same as posts)
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
      
      console.log('[PostStyleImageUploader] 🔗 Public URL generated:', urlData.publicUrl);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('[PostStyleImageUploader] ❌ Error in uploadImageToStorage:', error);
      return null;
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      console.log('[PostStyleImageUploader] 📸 User tapped select from gallery');

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('[PostStyleImageUploader] ❌ Permissions denied');
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar imágenes');
        return;
      }

      console.log('[PostStyleImageUploader] ✅ Permissions granted, opening gallery...');

      // Open gallery (same as posts)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      console.log('[PostStyleImageUploader] 📸 Gallery result:', {
        canceled: result.canceled,
        hasAssets: result.assets?.length > 0,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[PostStyleImageUploader] ⚠️ User canceled selection');
        return;
      }

      const selectedImage = result.assets[0];
      console.log('[PostStyleImageUploader] ✅ Image selected:', {
        uri: selectedImage.uri,
        width: selectedImage.width,
        height: selectedImage.height,
      });

      setUploading(true);

      // Upload using the same system as posts
      const uploadedUrl = await uploadImageToStorage(selectedImage.uri);

      if (!uploadedUrl) {
        throw new Error('Failed to upload image');
      }

      console.log('[PostStyleImageUploader] ✅ Upload completed successfully');
      console.log('[PostStyleImageUploader] 🔗 Final URL:', uploadedUrl);

      // Save and notify
      setImageUrl(uploadedUrl);
      onImageUploaded(uploadedUrl);
      
      Alert.alert('✅ Éxito', 'Imagen subida correctamente');
    } catch (error: any) {
      console.error('[PostStyleImageUploader] ❌ Complete error:', error);
      console.error('[PostStyleImageUploader] ❌ Message:', error?.message);
      
      Alert.alert(
        'Error al subir imagen',
        error?.message || 'No se pudo subir la imagen. Por favor intenta de nuevo.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      console.log('[PostStyleImageUploader] 📷 User tapped take photo');

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('[PostStyleImageUploader] ❌ Camera permissions denied');
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara para tomar fotos');
        return;
      }

      console.log('[PostStyleImageUploader] ✅ Camera permissions granted, opening camera...');

      // Open camera (same as posts)
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('[PostStyleImageUploader] 📷 Camera result:', {
        canceled: result.canceled,
        hasAssets: result.assets?.length > 0,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[PostStyleImageUploader] ⚠️ User canceled photo');
        return;
      }

      const photo = result.assets[0];
      console.log('[PostStyleImageUploader] ✅ Photo taken:', {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      });

      setUploading(true);

      // Upload using the same system as posts
      const uploadedUrl = await uploadImageToStorage(photo.uri);

      if (!uploadedUrl) {
        throw new Error('Failed to upload photo');
      }

      console.log('[PostStyleImageUploader] ✅ Photo uploaded successfully');
      console.log('[PostStyleImageUploader] 🔗 Final URL:', uploadedUrl);

      // Save and notify
      setImageUrl(uploadedUrl);
      onImageUploaded(uploadedUrl);
      
      Alert.alert('✅ Éxito', 'Foto subida correctamente');
    } catch (error: any) {
      console.error('[PostStyleImageUploader] ❌ Complete error:', error);
      console.error('[PostStyleImageUploader] ❌ Message:', error?.message);
      
      Alert.alert(
        'Error al subir foto',
        error?.message || 'No se pudo subir la foto. Por favor intenta de nuevo.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    console.log('[PostStyleImageUploader] 🗑️ User removed image');
    setImageUrl(null);
    onImageUploaded('');
  };

  const showImageOptions = () => {
    Alert.alert(
      'Seleccionar imagen',
      'Elige una opción',
      [
        {
          text: 'Tomar foto',
          onPress: handleTakePhoto,
        },
        {
          text: 'Elegir de galería',
          onPress: handleSelectFromGallery,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.helperText}>{helperText}</Text>

      {imageUrl ? (
        <View style={styles.imagePreviewContainer}>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <View style={styles.successBadge}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle" 
                size={32} 
                color="#10B981" 
              />
              <Text style={styles.successText}>Imagen subida</Text>
            </View>
          </View>
          <View style={styles.imageActions}>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={showImageOptions}
            >
              <IconSymbol 
                ios_icon_name="arrow.triangle.2.circlepath" 
                android_material_icon_name="sync" 
                size={18} 
                color="#fff" 
              />
              <Text style={styles.changeButtonText}>Cambiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemoveImage}
            >
              <IconSymbol 
                ios_icon_name="trash.fill" 
                android_material_icon_name="delete" 
                size={18} 
                color="#fff" 
              />
              <Text style={styles.removeButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.uploadContainer}>
          {uploading ? (
            <View style={styles.uploadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.uploadingText}>Subiendo imagen...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={handleTakePhoto}
              >
                <View style={styles.uploadIconContainer}>
                  <IconSymbol 
                    ios_icon_name="camera.fill" 
                    android_material_icon_name="camera_alt" 
                    size={32} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={styles.uploadButtonText}>Tomar Foto</Text>
                <Text style={styles.uploadButtonSubtext}>Usa tu cámara</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={handleSelectFromGallery}
              >
                <View style={styles.uploadIconContainer}>
                  <IconSymbol 
                    ios_icon_name="photo.fill" 
                    android_material_icon_name="photo" 
                    size={32} 
                    color={colors.secondary} 
                  />
                </View>
                <Text style={styles.uploadButtonText}>Elegir de Galería</Text>
                <Text style={styles.uploadButtonSubtext}>Selecciona una foto existente</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  uploadContainer: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  uploadButton: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  uploadButtonSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  uploadingState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  imagePreview: {
    width: '100%',
    height: 240,
    backgroundColor: colors.cardBorder,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBadge: {
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  changeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
