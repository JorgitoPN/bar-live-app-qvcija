
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
 * 🆕 SISTEMA TOTALMENTE NUEVO v5.0 - FRESH START
 * 
 * Sistema construido desde CERO sin usar código anterior:
 * - Arquitectura completamente nueva
 * - Validación robusta en cada paso
 * - Manejo de errores mejorado
 * - Logs detallados para debugging
 * - Interfaz clara y simple
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
  const [progress, setProgress] = useState(0);

  console.log('[FreshUploader] 🎬 Componente montado');
  console.log('[FreshUploader] 👤 Usuario:', userId);
  console.log('[FreshUploader] 📄 URL inicial:', imageUrl ? 'Existe' : 'Vacío');

  const selectAndUploadImage = async () => {
    try {
      console.log('[FreshUploader] 🚀 Iniciando proceso de subida...');
      
      // PASO 1: Solicitar permisos
      console.log('[FreshUploader] 📱 Solicitando permisos...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('[FreshUploader] ❌ Permisos denegados');
        Alert.alert(
          'Permiso Necesario',
          'Necesitamos acceso a tu galería para seleccionar la imagen'
        );
        return;
      }

      console.log('[FreshUploader] ✅ Permisos concedidos');

      // PASO 2: Abrir galería
      console.log('[FreshUploader] 📸 Abriendo galería...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        console.log('[FreshUploader] ⚠️ Usuario canceló');
        return;
      }

      const asset = result.assets[0];
      console.log('[FreshUploader] ✅ Imagen seleccionada');
      console.log('[FreshUploader] 📐 Tamaño:', asset.width, 'x', asset.height);
      console.log('[FreshUploader] 📁 URI:', asset.uri.substring(0, 50) + '...');

      setUploading(true);
      setProgress(10);

      // PASO 3: Validar extensión
      const extension = asset.uri.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      if (!extension || !validExtensions.includes(extension)) {
        console.log('[FreshUploader] ❌ Extensión inválida:', extension);
        Alert.alert('Error', 'Solo se permiten imágenes JPG, PNG o WEBP');
        setUploading(false);
        return;
      }

      console.log('[FreshUploader] ✅ Extensión válida:', extension);
      setProgress(20);

      // PASO 4: Convertir a blob
      console.log('[FreshUploader] 🔄 Convirtiendo a blob...');
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      const sizeInMB = (blob.size / 1024 / 1024).toFixed(2);
      console.log('[FreshUploader] ✅ Blob creado');
      console.log('[FreshUploader] 📦 Tamaño:', sizeInMB, 'MB');
      
      if (blob.size > 10 * 1024 * 1024) {
        console.log('[FreshUploader] ❌ Archivo muy grande');
        Alert.alert('Error', 'La imagen no puede superar 10 MB');
        setUploading(false);
        return;
      }

      setProgress(40);

      // PASO 5: Generar nombre único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);
      const userPrefix = userId.substring(0, 8);
      const fileName = `fresh_${userPrefix}_${timestamp}_${random}.${extension}`;
      
      console.log('[FreshUploader] 📝 Nombre generado:', fileName);
      setProgress(50);

      // PASO 6: Subir a Supabase
      console.log('[FreshUploader] ⬆️ Subiendo a Supabase Storage...');
      console.log('[FreshUploader] 🪣 Bucket: documentos-propiedad');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos-propiedad')
        .upload(fileName, blob, {
          contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[FreshUploader] ❌ Error en upload:', uploadError);
        console.error('[FreshUploader] ❌ Código:', uploadError.message);
        throw new Error(`Error al subir: ${uploadError.message}`);
      }

      console.log('[FreshUploader] ✅ Archivo subido');
      console.log('[FreshUploader] 📁 Path:', uploadData.path);
      setProgress(80);

      // PASO 7: Obtener URL pública
      console.log('[FreshUploader] 🔗 Generando URL pública...');
      const { data: urlData } = supabase.storage
        .from('documentos-propiedad')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      
      console.log('[FreshUploader] ✅ URL generada');
      console.log('[FreshUploader] 🔗 URL completa:', publicUrl);

      // PASO 8: Validar URL
      if (!publicUrl || !publicUrl.startsWith('https://')) {
        console.error('[FreshUploader] ❌ URL inválida:', publicUrl);
        throw new Error('La URL generada no es válida');
      }

      if (!publicUrl.includes('supabase.co')) {
        console.error('[FreshUploader] ❌ URL no es de Supabase');
        throw new Error('La URL no pertenece a Supabase');
      }

      setProgress(100);

      // PASO 9: Guardar y notificar
      console.log('[FreshUploader] 💾 Guardando URL...');
      setImageUrl(publicUrl);
      onUploadComplete(publicUrl);

      console.log('[FreshUploader] 🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!');
      Alert.alert('✅ Éxito', 'Documento subido correctamente');

    } catch (error: any) {
      console.error('[FreshUploader] ❌ ERROR CRÍTICO:', error);
      console.error('[FreshUploader] ❌ Mensaje:', error.message);
      console.error('[FreshUploader] ❌ Stack:', error.stack);
      
      Alert.alert(
        'Error al Subir',
        error.message || 'No se pudo subir el documento. Por favor intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeImage = () => {
    console.log('[FreshUploader] 🗑️ Eliminando imagen');
    setImageUrl('');
    onUploadComplete('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Content */}
      {imageUrl ? (
        // Preview de imagen subida
        <View style={styles.preview}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.previewImage}
            resizeMode="cover"
            onLoadStart={() => console.log('[FreshUploader] 🔄 Cargando preview...')}
            onLoad={() => console.log('[FreshUploader] ✅ Preview cargado')}
            onError={(e) => {
              console.error('[FreshUploader] ❌ Error en preview:', e.nativeEvent.error);
            }}
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

            <TouchableOpacity
              style={styles.removeButton}
              onPress={removeImage}
              activeOpacity={0.8}
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
        // Botón de subida
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={selectAndUploadImage}
          disabled={uploading}
          activeOpacity={0.7}
        >
          {uploading ? (
            <View style={styles.uploadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.uploadingText}>Subiendo documento...</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          ) : (
            <View style={styles.uploadPrompt}>
              <View style={styles.iconCircle}>
                <IconSymbol
                  ios_icon_name="doc.badge.plus"
                  android_material_icon_name="add_photo_alternate"
                  size={64}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.uploadTitle}>Seleccionar Documento</Text>
              <Text style={styles.uploadSubtitle}>Toca para elegir una imagen</Text>
              <View style={styles.formatBadge}>
                <Text style={styles.formatText}>JPG • PNG • WEBP</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Info */}
      <View style={styles.infoSection}>
        <IconSymbol
          ios_icon_name="info.circle.fill"
          android_material_icon_name="info"
          size={16}
          color={colors.primary}
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
    minHeight: 220,
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
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
});
