
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
 * ✅ SISTEMA SIMPLE DE SUBIDA DE IMÁGENES v2.1 - RLS POLICY FIX
 * 
 * Correcciones aplicadas:
 * - ✅ Estructura de carpetas con userId para cumplir con RLS policy
 * - ✅ URL de Supabase Storage correctamente formateada
 * - ✅ Validación de URL antes de guardar
 * - ✅ Logs detallados para debugging
 * - ✅ Manejo robusto de errores
 * 
 * IMPORTANTE: La política RLS del bucket 'documentos-propiedad' requiere
 * que los archivos estén en una carpeta con el ID del usuario: {userId}/filename.jpg
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
  const [imageLoadError, setImageLoadError] = useState(false);

  console.log('[SimpleImageUploader v2] 🎬 Componente inicializado');
  console.log('[SimpleImageUploader v2] 📸 Imagen actual:', imageUrl ? 'Sí' : 'No');
  console.log('[SimpleImageUploader v2] 🪣 Bucket:', bucketName);

  const handleSelectImage = async () => {
    try {
      console.log('[SimpleImageUploader v2] 📸 Usuario presionó seleccionar imagen');

      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('[SimpleImageUploader v2] ❌ Permisos denegados');
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar imágenes');
        return;
      }

      console.log('[SimpleImageUploader v2] ✅ Permisos concedidos, abriendo galería...');

      // Abrir galería - SOLO imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
        allowsMultipleSelection: false,
      });

      console.log('[SimpleImageUploader v2] 📸 Resultado:', {
        canceled: result.canceled,
        hasAssets: result.assets?.length > 0,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[SimpleImageUploader v2] ⚠️ Usuario canceló la selección');
        return;
      }

      const selectedImage = result.assets[0];
      console.log('[SimpleImageUploader v2] ✅ Imagen seleccionada:', {
        uri: selectedImage.uri,
        width: selectedImage.width,
        height: selectedImage.height,
      });

      // Validar extensión
      const extension = selectedImage.uri.split('.').pop()?.toLowerCase();
      if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
        console.log('[SimpleImageUploader v2] ❌ Extensión no válida:', extension);
        Alert.alert('Error', 'Por favor selecciona una imagen válida (JPG, PNG o WEBP)');
        return;
      }

      console.log('[SimpleImageUploader v2] ✅ Extensión válida:', extension);
      setUploading(true);

      // Convertir a blob
      console.log('[SimpleImageUploader v2] 🔄 Convirtiendo a blob...');
      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();
      
      console.log('[SimpleImageUploader v2] ✅ Blob creado:', {
        size: blob.size,
        type: blob.type,
      });

      // ✅ FIXED: Generar nombre de archivo CON carpeta de usuario
      // La política RLS requiere que el archivo esté en una carpeta con el userId
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `${userId}/${timestamp}-${randomId}.${extension}`;
      
      console.log('[SimpleImageUploader v2] ⬆️ Subiendo a bucket:', bucketName);
      console.log('[SimpleImageUploader v2] 📁 Path completo:', fileName);
      console.log('[SimpleImageUploader v2] 👤 User ID:', userId);

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[SimpleImageUploader v2] ❌ Error en subida:', uploadError);
        throw uploadError;
      }

      console.log('[SimpleImageUploader v2] ✅ Subida exitosa');
      console.log('[SimpleImageUploader v2] 📁 Path:', uploadData.path);

      // ✅ FIXED: Obtener URL pública correctamente
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadData.path);

      let publicUrl = urlData.publicUrl;
      
      console.log('[SimpleImageUploader v2] 🔗 URL pública generada:', publicUrl);
      console.log('[SimpleImageUploader v2] 📁 Path usado:', uploadData.path);

      // ✅ FIXED: Validación estricta de URL
      if (!publicUrl || !publicUrl.startsWith('https://')) {
        console.error('[SimpleImageUploader v2] ❌ URL inválida:', publicUrl);
        throw new Error('URL pública inválida');
      }

      // ✅ FIXED: Verificar que la URL contiene el bucket correcto
      if (!publicUrl.includes(`/storage/v1/object/public/${bucketName}/`)) {
        console.error('[SimpleImageUploader v2] ❌ URL no contiene el bucket correcto');
        console.error('[SimpleImageUploader v2] ❌ Esperado:', `/storage/v1/object/public/${bucketName}/`);
        console.error('[SimpleImageUploader v2] ❌ Recibido:', publicUrl);
        throw new Error('Estructura de URL incorrecta');
      }

      // ✅ NUEVO: Verificar que el archivo existe antes de continuar
      console.log('[SimpleImageUploader v2] 🔍 Verificando que el archivo existe...');
      const { data: fileData, error: fileError } = await supabase.storage
        .from(bucketName)
        .list(userId, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (fileError) {
        console.error('[SimpleImageUploader v2] ❌ Error verificando archivo:', fileError);
      } else {
        console.log('[SimpleImageUploader v2] ✅ Archivos en carpeta:', fileData?.length || 0);
        const uploadedFile = fileData?.find(f => uploadData.path.includes(f.name));
        if (uploadedFile) {
          console.log('[SimpleImageUploader v2] ✅ Archivo encontrado:', uploadedFile.name);
        } else {
          console.warn('[SimpleImageUploader v2] ⚠️ Archivo no encontrado en listado');
        }
      }

      // ✅ NUEVO: Agregar timestamp para evitar cache
      // Esto ayuda a que React Native Image cargue la imagen correctamente
      publicUrl = `${publicUrl}?t=${Date.now()}`;
      
      console.log('[SimpleImageUploader v2] ✅ URL validada correctamente');
      console.log('[SimpleImageUploader v2] 🔗 URL final con timestamp:', publicUrl);

      // Guardar y notificar
      setImageUrl(publicUrl);
      setImageLoadError(false); // Reset error state
      onImageUploaded(publicUrl);
      
      console.log('[SimpleImageUploader v2] ✅ Proceso completado exitosamente');
      console.log('[SimpleImageUploader v2] 🎉 URL final:', publicUrl);
      
      Alert.alert('✅ Éxito', 'Imagen subida correctamente');
    } catch (error: any) {
      console.error('[SimpleImageUploader v2] ❌ Error completo:', error);
      console.error('[SimpleImageUploader v2] ❌ Mensaje:', error?.message);
      console.error('[SimpleImageUploader v2] ❌ Stack:', error?.stack);
      
      Alert.alert(
        'Error al subir imagen',
        error?.message || 'No se pudo subir la imagen. Por favor intenta de nuevo.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    console.log('[SimpleImageUploader v2] 🗑️ Usuario eliminó la imagen');
    setImageUrl(null);
    onImageUploaded('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.helperText}>{helperText}</Text>

      {imageUrl ? (
        <View style={styles.imagePreviewContainer}>
          {imageLoadError ? (
            <View style={styles.imageErrorContainer}>
              <IconSymbol 
                ios_icon_name="exclamationmark.triangle.fill" 
                android_material_icon_name="warning" 
                size={48} 
                color="#F59E0B" 
              />
              <Text style={styles.imageErrorText}>
                Error al cargar la vista previa
              </Text>
              <Text style={styles.imageErrorSubtext}>
                La imagen se subió correctamente pero no se puede mostrar
              </Text>
            </View>
          ) : (
            <Image 
              source={{ 
                uri: imageUrl,
                cache: 'reload', // Forzar recarga para evitar cache corrupto
              }} 
              style={styles.imagePreview}
              resizeMode="cover"
              onLoadStart={() => {
                console.log('[SimpleImageUploader v2] 🔄 Cargando preview...');
                console.log('[SimpleImageUploader v2] 🔗 URL:', imageUrl);
                setImageLoadError(false);
              }}
              onLoad={() => {
                console.log('[SimpleImageUploader v2] ✅ Preview cargado exitosamente');
                setImageLoadError(false);
              }}
              onError={(error) => {
                console.error('[SimpleImageUploader v2] ❌ Error cargando preview');
                console.error('[SimpleImageUploader v2] ❌ URL:', imageUrl);
                console.error('[SimpleImageUploader v2] ❌ Error:', error.nativeEvent?.error || 'Unknown error');
                setImageLoadError(true);
              }}
            />
          )}
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
  imageErrorContainer: {
    width: '100%',
    height: 250,
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  imageErrorText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  imageErrorSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
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
