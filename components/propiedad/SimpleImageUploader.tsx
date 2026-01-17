
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

/**
 * ✅ NUEVO SISTEMA SIMPLE DE SUBIDA DE IMÁGENES v1.0
 * 
 * Sistema completamente nuevo y funcional:
 * - Selección simple de imagen desde galería
 * - Subida directa a Supabase Storage
 * - Preview inmediato de la imagen
 * - Validación de tipos de archivo
 * - Manejo de errores claro
 * - Sin dependencias del código anterior
 */

interface SimpleImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImageUrl?: string | null;
  userId: string;
  bucketName?: string;
  label?: string;
  helperText?: string;
}

export default function SimpleImageUploader({
  onImageUploaded,
  currentImageUrl,
  userId,
  bucketName = 'documentos-propiedad',
  label = 'Imagen del Documento',
  helperText = 'Sube una foto del documento (JPG, PNG, WEBP)',
}: SimpleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null);

  console.log('[SimpleImageUploader] 🎬 Componente inicializado');
  console.log('[SimpleImageUploader] 📸 Imagen actual:', imageUrl ? 'Sí' : 'No');

  const handleSelectImage = async () => {
    try {
      console.log('[SimpleImageUploader] 📸 Usuario presionó seleccionar imagen');

      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('[SimpleImageUploader] ❌ Permisos denegados');
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar imágenes');
        return;
      }

      console.log('[SimpleImageUploader] ✅ Permisos concedidos, abriendo galería...');

      // Abrir galería - SOLO imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
        allowsMultipleSelection: false,
      });

      console.log('[SimpleImageUploader] 📸 Resultado:', {
        canceled: result.canceled,
        hasAssets: result.assets?.length > 0,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[SimpleImageUploader] ⚠️ Usuario canceló la selección');
        return;
      }

      const selectedImage = result.assets[0];
      console.log('[SimpleImageUploader] ✅ Imagen seleccionada:', {
        uri: selectedImage.uri,
        width: selectedImage.width,
        height: selectedImage.height,
      });

      // Validar extensión
      const extension = selectedImage.uri.split('.').pop()?.toLowerCase();
      if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
        console.log('[SimpleImageUploader] ❌ Extensión no válida:', extension);
        Alert.alert('Error', 'Por favor selecciona una imagen válida (JPG, PNG o WEBP)');
        return;
      }

      console.log('[SimpleImageUploader] ✅ Extensión válida:', extension);
      setUploading(true);

      // Convertir a blob
      console.log('[SimpleImageUploader] 🔄 Convirtiendo a blob...');
      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();
      
      console.log('[SimpleImageUploader] ✅ Blob creado:', {
        size: blob.size,
        type: blob.type,
      });

      // Generar nombre único
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const fileName = `${userId}/${timestamp}-${randomId}.${extension}`;
      
      console.log('[SimpleImageUploader] ⬆️ Subiendo a bucket:', bucketName);
      console.log('[SimpleImageUploader] 📁 Nombre de archivo:', fileName);

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: `image/${extension}`,
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[SimpleImageUploader] ❌ Error en subida:', uploadError);
        throw uploadError;
      }

      console.log('[SimpleImageUploader] ✅ Subida exitosa, path:', uploadData.path);

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      
      console.log('[SimpleImageUploader] ✅ URL pública generada:', publicUrl);

      // Validar URL
      if (!publicUrl || !publicUrl.startsWith('http')) {
        console.error('[SimpleImageUploader] ❌ URL inválida:', publicUrl);
        throw new Error('URL pública inválida');
      }

      // Guardar y notificar
      setImageUrl(publicUrl);
      onImageUploaded(publicUrl);
      
      console.log('[SimpleImageUploader] ✅ Proceso completado exitosamente');
      Alert.alert('✅ Éxito', 'Imagen subida correctamente');
    } catch (error) {
      console.error('[SimpleImageUploader] ❌ Error completo:', error);
      Alert.alert('Error', 'No se pudo subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    console.log('[SimpleImageUploader] 🗑️ Usuario eliminó la imagen');
    setImageUrl(null);
    onImageUploaded('');
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
            onLoadStart={() => console.log('[SimpleImageUploader] 🔄 Cargando preview...')}
            onLoad={() => console.log('[SimpleImageUploader] ✅ Preview cargado')}
            onError={(error) => {
              console.error('[SimpleImageUploader] ❌ Error cargando preview:', error.nativeEvent.error);
            }}
          />
          <View style={styles.imageOverlay}>
            <View style={styles.imageSuccessIndicator}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle" 
                size={24} 
                color="#10B981" 
              />
              <Text style={styles.imageSuccessText}>Imagen subida</Text>
            </View>
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
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={handleSelectImage}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.uploadingText}>Subiendo imagen...</Text>
            </>
          ) : (
            <>
              <IconSymbol 
                ios_icon_name="photo.badge.plus" 
                android_material_icon_name="add_photo_alternate" 
                size={48} 
                color={colors.primary} 
              />
              <Text style={styles.uploadButtonText}>Seleccionar Imagen</Text>
              <Text style={styles.uploadButtonSubtext}>JPG, PNG, WEBP</Text>
            </>
          )}
        </TouchableOpacity>
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
  },
  uploadButton: {
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  uploadButtonSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  imagePreview: {
    width: '100%',
    height: 250,
    backgroundColor: colors.cardBorder,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 12,
    gap: 10,
  },
  imageSuccessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageSuccessText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  removeButton: {
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
    fontWeight: '600',
    color: '#fff',
  },
});
