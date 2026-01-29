
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
 * 🆕 NUEVO SISTEMA DE SUBIDA DE DOCUMENTOS v3.0
 * 
 * Sistema completamente nuevo desde cero:
 * - Sin dependencias del código anterior
 * - Subida directa a Supabase Storage
 * - Validación robusta de imágenes
 * - Logs detallados para debugging
 * - Interfaz simple y clara
 */

interface NewDocumentUploaderProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  userId: string;
  label?: string;
  description?: string;
}

export default function NewDocumentUploader({
  onUploadComplete,
  currentUrl,
  userId,
  label = 'Documento de Propiedad',
  description = 'Sube una foto clara del documento que acredite tu propiedad',
}: NewDocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(currentUrl || '');
  const [uploadProgress, setUploadProgress] = useState(0);

  console.log('[NewDocumentUploader] 🎬 Inicializado');
  console.log('[NewDocumentUploader] 👤 Usuario ID:', userId);
  console.log('[NewDocumentUploader] 📄 URL actual:', uploadedUrl ? 'Sí' : 'No');

  const pickAndUploadImage = async () => {
    try {
      console.log('[NewDocumentUploader] 📸 Iniciando selección de imagen...');

      // Paso 1: Solicitar permisos
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.log('[NewDocumentUploader] ❌ Permisos denegados');
        Alert.alert(
          'Permiso Requerido',
          'Necesitamos acceso a tu galería para seleccionar el documento'
        );
        return;
      }

      console.log('[NewDocumentUploader] ✅ Permisos concedidos');

      // Paso 2: Abrir selector de imágenes
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (pickerResult.canceled) {
        console.log('[NewDocumentUploader] ⚠️ Usuario canceló la selección');
        return;
      }

      const selectedImage = pickerResult.assets[0];
      console.log('[NewDocumentUploader] ✅ Imagen seleccionada');
      console.log('[NewDocumentUploader] 📐 Dimensiones:', selectedImage.width, 'x', selectedImage.height);

      setIsUploading(true);
      setUploadProgress(10);

      // Paso 3: Validar tipo de archivo
      const fileExtension = selectedImage.uri.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      if (!fileExtension || !validExtensions.includes(fileExtension)) {
        console.log('[NewDocumentUploader] ❌ Extensión no válida:', fileExtension);
        Alert.alert('Error', 'Por favor selecciona una imagen JPG, PNG o WEBP');
        setIsUploading(false);
        return;
      }

      console.log('[NewDocumentUploader] ✅ Extensión válida:', fileExtension);
      setUploadProgress(20);

      // Paso 4: Convertir imagen a blob
      console.log('[NewDocumentUploader] 🔄 Convirtiendo imagen a blob...');
      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();
      
      console.log('[NewDocumentUploader] ✅ Blob creado');
      console.log('[NewDocumentUploader] 📦 Tamaño:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
      setUploadProgress(40);

      // Paso 5: Generar nombre único para el archivo
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileName = `doc_${userId.substring(0, 8)}_${timestamp}_${randomString}.${fileExtension}`;
      
      console.log('[NewDocumentUploader] 📁 Nombre de archivo:', fileName);
      setUploadProgress(50);

      // Paso 6: Subir a Supabase Storage
      console.log('[NewDocumentUploader] ⬆️ Subiendo a Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos-propiedad')
        .upload(fileName, blob, {
          contentType: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[NewDocumentUploader] ❌ Error en subida:', uploadError);
        throw new Error(`Error al subir: ${uploadError.message}`);
      }

      console.log('[NewDocumentUploader] ✅ Archivo subido exitosamente');
      console.log('[NewDocumentUploader] 📁 Path:', uploadData.path);
      setUploadProgress(80);

      // Paso 7: Obtener URL pública
      console.log('[NewDocumentUploader] 🔗 Generando URL pública...');
      const { data: urlData } = supabase.storage
        .from('documentos-propiedad')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      
      console.log('[NewDocumentUploader] ✅ URL pública generada');
      console.log('[NewDocumentUploader] 🔗 URL:', publicUrl);

      // Paso 8: Validar URL
      if (!publicUrl || !publicUrl.startsWith('https://')) {
        console.error('[NewDocumentUploader] ❌ URL inválida');
        throw new Error('La URL generada no es válida');
      }

      setUploadProgress(100);

      // Paso 9: Guardar y notificar
      setUploadedUrl(publicUrl);
      onUploadComplete(publicUrl);

      console.log('[NewDocumentUploader] 🎉 Proceso completado exitosamente');
      Alert.alert('✅ Éxito', 'Documento subido correctamente');

    } catch (error: any) {
      console.error('[NewDocumentUploader] ❌ Error en el proceso:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo subir el documento. Por favor intenta de nuevo.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = () => {
    console.log('[NewDocumentUploader] 🗑️ Eliminando imagen');
    setUploadedUrl('');
    onUploadComplete('');
  };

  return (
    <View style={styles.container}>
      {/* Etiqueta y descripción */}
      <View style={styles.headerSection}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Área de subida o preview */}
      {uploadedUrl ? (
        // Mostrar imagen subida
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: uploadedUrl }}
            style={styles.previewImage}
            resizeMode="cover"
            onLoadStart={() => console.log('[NewDocumentUploader] 🔄 Cargando preview...')}
            onLoad={() => console.log('[NewDocumentUploader] ✅ Preview cargado')}
            onError={(e) => {
              console.error('[NewDocumentUploader] ❌ Error cargando preview:', e.nativeEvent.error);
            }}
          />
          
          {/* Overlay con información */}
          <View style={styles.previewOverlay}>
            <View style={styles.successBadge}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color="#10B981"
              />
              <Text style={styles.successText}>Documento subido</Text>
            </View>

            {/* Botón de eliminar */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={removeImage}
              activeOpacity={0.8}
            >
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={16}
                color="#fff"
              />
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Mostrar botón de subida
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={pickAndUploadImage}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          {isUploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.uploadingText}>Subiendo documento...</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          ) : (
            <View style={styles.uploadPrompt}>
              <View style={styles.uploadIconContainer}>
                <IconSymbol
                  ios_icon_name="doc.badge.plus"
                  android_material_icon_name="add_photo_alternate"
                  size={56}
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

      {/* Información adicional */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerSection: {
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
  uploadArea: {
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
  uploadingContainer: {
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
  uploadIconContainer: {
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
  previewContainer: {
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  infoSection: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  infoRow: {
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
