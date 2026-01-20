
import React, { useState, useEffect } from 'react';
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
 * 🆕 SISTEMA ULTRA SIMPLE v6.0 - REBUILD TOTAL
 * 
 * Sistema reconstruido desde CERO:
 * - Código minimalista y directo
 * - Sin complejidad innecesaria
 * - Validación simple pero efectiva
 * - Manejo de errores claro
 * - Logs informativos
 */

interface FreshDocumentUploaderProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  userId: string;
  label?: string;
  description?: string;
}

export default function FreshDocumentUploader({
  onUploadComplete,
  currentUrl,
  userId,
  label = 'Documento de Propiedad',
  description = 'Sube una foto clara del documento',
}: FreshDocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(currentUrl || '');

  console.log('[UltraSimpleUploader] 🎬 Iniciado');
  console.log('[UltraSimpleUploader] 👤 Usuario:', userId);

  // ✅ LINT FIX v225.0: Added imageUrl to dependencies
  useEffect(() => {
    if (currentUrl && currentUrl !== imageUrl) {
      console.log('[UltraSimpleUploader] 🔄 Actualizando URL desde prop');
      setImageUrl(currentUrl);
    }
  }, [currentUrl, imageUrl]);

  const uploadImage = async () => {
    try {
      console.log('[UltraSimpleUploader] 🚀 INICIO DEL PROCESO');
      
      // 1. Pedir permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Necesario', 'Necesitamos acceso a tu galería');
        return;
      }
      console.log('[UltraSimpleUploader] ✅ Permisos OK');

      // 2. Seleccionar imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) {
        console.log('[UltraSimpleUploader] ⚠️ Cancelado por usuario');
        return;
      }

      const asset = result.assets[0];
      console.log('[UltraSimpleUploader] ✅ Imagen seleccionada');
      console.log('[UltraSimpleUploader] 📁 URI:', asset.uri);

      setUploading(true);

      // 3. Convertir a blob
      console.log('[UltraSimpleUploader] 🔄 Convirtiendo a blob...');
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      console.log('[UltraSimpleUploader] ✅ Blob creado:', (blob.size / 1024 / 1024).toFixed(2), 'MB');

      // 4. Validar tamaño
      if (blob.size > 10 * 1024 * 1024) {
        Alert.alert('Error', 'La imagen no puede superar 10 MB');
        setUploading(false);
        return;
      }

      // 5. Generar nombre único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `doc_${userId.substring(0, 8)}_${timestamp}_${random}.jpg`;
      console.log('[UltraSimpleUploader] 📝 Nombre:', fileName);

      // 6. Subir a Supabase
      console.log('[UltraSimpleUploader] ⬆️ Subiendo a Supabase...');
      const { data, error } = await supabase.storage
        .from('documentos-propiedad')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (error) {
        console.error('[UltraSimpleUploader] ❌ Error upload:', error.message);
        throw new Error(error.message);
      }

      console.log('[UltraSimpleUploader] ✅ Subido:', data.path);

      // 7. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documentos-propiedad')
        .getPublicUrl(data.path);

      const url = urlData.publicUrl;
      console.log('[UltraSimpleUploader] 🔗 URL:', url);

      // 8. Guardar
      setImageUrl(url);
      onUploadComplete(url);

      console.log('[UltraSimpleUploader] 🎉 ¡ÉXITO TOTAL!');
      Alert.alert('✅ Éxito', 'Documento subido correctamente');

    } catch (error: any) {
      console.error('[UltraSimpleUploader] ❌ ERROR:', error.message);
      Alert.alert('Error', 'No se pudo subir el documento. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    console.log('[UltraSimpleUploader] 🗑️ Eliminando');
    setImageUrl('');
    onUploadComplete('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {imageUrl ? (
        <View style={styles.preview}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          <View style={styles.previewOverlay}>
            <View style={styles.successBadge}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={24}
                color="#10B981"
              />
              <Text style={styles.successText}>Documento subido</Text>
            </View>
            <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
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
          onPress={uploadImage}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.uploadingText}>Subiendo...</Text>
            </View>
          ) : (
            <View style={styles.uploadPrompt}>
              <View style={styles.iconCircle}>
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="add_photo_alternate"
                  size={48}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.uploadTitle}>Seleccionar Imagen</Text>
              <Text style={styles.uploadSubtitle}>Toca para elegir una foto</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.infoSection}>
        <IconSymbol
          ios_icon_name="info.circle"
          android_material_icon_name="info"
          size={14}
          color={colors.textSecondary}
        />
        <Text style={styles.infoText}>
          La imagen debe ser clara y legible
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  uploadButton: {
    backgroundColor: colors.primary + '08',
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minHeight: 240,
    justifyContent: 'center',
  },
  uploadingState: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  uploadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  uploadPrompt: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  formatBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  formatText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  preview: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.cardBackground,
  },
  previewImage: {
    width: '100%',
    height: 280,
    backgroundColor: colors.cardBorder,
  },
  previewOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 16,
    gap: 12,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  infoSection: {
    marginTop: 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
});
