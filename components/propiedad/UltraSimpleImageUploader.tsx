
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
 * 🆕 NUEVO SISTEMA DE SUBIDA DE IMÁGENES v7.0
 * 
 * Sistema completamente reconstruido desde cero:
 * - Código minimalista y robusto
 * - Manejo de errores mejorado
 * - Validación en cada paso
 * - Logs detallados para debugging
 * - Sin complejidad innecesaria
 */

interface UltraSimpleImageUploaderProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  userId: string;
  label?: string;
  description?: string;
}

export default function UltraSimpleImageUploader({
  onUploadComplete,
  currentUrl = '',
  userId,
  label = 'Documento de Propiedad',
  description = 'Sube una foto clara del documento',
}: UltraSimpleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(currentUrl);
  const [imageLoading, setImageLoading] = useState(false);

  console.log('═══════════════════════════════════════');
  console.log('[NewUploader] 🎬 Componente inicializado');
  console.log('[NewUploader] 👤 Usuario:', userId);
  console.log('[NewUploader] 🔗 URL inicial:', currentUrl || 'ninguna');
  console.log('═══════════════════════════════════════');

  const handleSelectAndUpload = async () => {
    console.log('\n🚀 ═══ INICIO SUBIDA DE IMAGEN ═══');
    
    try {
      // PASO 1: Solicitar permisos
      console.log('📋 PASO 1: Solicitando permisos...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('❌ Permisos denegados');
        Alert.alert('Permiso Necesario', 'Necesitamos acceso a tu galería de fotos para subir imágenes');
        return;
      }
      console.log('✅ PASO 1: Permisos concedidos');

      // PASO 2: Abrir selector de imágenes
      console.log('\n📸 PASO 2: Abriendo selector...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        console.log('⚠️ Usuario canceló la selección');
        return;
      }

      const selectedImage = result.assets[0];
      console.log('✅ PASO 2: Imagen seleccionada');
      console.log('   📁 URI:', selectedImage.uri);
      console.log('   📐 Tamaño:', selectedImage.width, 'x', selectedImage.height);

      setUploading(true);

      // PASO 3: Leer imagen como ArrayBuffer
      console.log('\n🔄 PASO 3: Leyendo imagen...');
      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      
      const sizeInMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
      console.log('✅ PASO 3: Imagen leída');
      console.log('   📦 Tamaño:', sizeInMB, 'MB');

      // PASO 4: Validar tamaño
      console.log('\n✔️ PASO 4: Validando tamaño...');
      if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
        console.log('❌ Imagen demasiado grande:', sizeInMB, 'MB');
        Alert.alert('Imagen muy grande', 'La imagen no puede superar 10 MB. Por favor, elige una imagen más pequeña.');
        setUploading(false);
        return;
      }
      console.log('✅ PASO 4: Tamaño válido');

      // PASO 5: Generar nombre único
      console.log('\n📝 PASO 5: Generando nombre...');
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const userPrefix = userId.substring(0, 8);
      const fileName = `propiedad_${userPrefix}_${timestamp}_${randomString}.jpg`;
      console.log('✅ PASO 5: Nombre generado');
      console.log('   📄 Archivo:', fileName);

      // PASO 6: Subir a Supabase Storage
      console.log('\n⬆️ PASO 6: Subiendo a Supabase...');
      console.log('   🪣 Bucket: documentos-propiedad');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos-propiedad')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ PASO 6: Error al subir');
        console.error('   💥 Error:', uploadError.message);
        throw new Error(`Error al subir: ${uploadError.message}`);
      }

      console.log('✅ PASO 6: Archivo subido');
      console.log('   📂 Path:', uploadData.path);

      // PASO 7: Obtener URL pública
      console.log('\n🔗 PASO 7: Obteniendo URL pública...');
      const { data: urlData } = supabase.storage
        .from('documentos-propiedad')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      console.log('✅ PASO 7: URL obtenida');
      console.log('   🌐 URL:', publicUrl);

      // PASO 8: Guardar y notificar
      console.log('\n💾 PASO 8: Guardando...');
      setImageUrl(publicUrl);
      onUploadComplete(publicUrl);
      console.log('✅ PASO 8: Guardado exitoso');

      console.log('\n🎉 ═══ SUBIDA COMPLETADA ═══\n');
      Alert.alert('✅ Éxito', 'Imagen subida correctamente');

    } catch (error: any) {
      console.error('\n💥 ═══ ERROR ═══');
      console.error('❌ Mensaje:', error.message);
      console.error('═══════════════════════════════════════\n');
      
      Alert.alert(
        'Error al subir',
        'No se pudo subir la imagen. Por favor, intenta de nuevo.\n\nError: ' + error.message
      );
    } finally {
      setUploading(false);
      console.log('🏁 Proceso finalizado\n');
    }
  };

  const handleRemove = () => {
    console.log('🗑️ Eliminando imagen');
    setImageUrl('');
    onUploadComplete('');
    console.log('✅ Imagen eliminada');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Contenido principal */}
      {imageUrl ? (
        // Vista previa de imagen subida
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.previewImage}
            resizeMode="cover"
            onLoadStart={() => {
              console.log('🔄 Cargando imagen...');
              setImageLoading(true);
            }}
            onLoad={() => {
              console.log('✅ Imagen cargada');
              setImageLoading(false);
            }}
            onError={(error) => {
              console.error('❌ Error al cargar imagen:', error.nativeEvent);
              setImageLoading(false);
              Alert.alert(
                'Error',
                'No se pudo cargar la imagen. Por favor, intenta subirla de nuevo.'
              );
            }}
          />
          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.imageLoadingText}>Cargando imagen...</Text>
            </View>
          )}
          <View style={styles.previewOverlay}>
            <View style={styles.successBadge}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={28}
                color="#10B981"
              />
              <Text style={styles.successText}>✅ Imagen subida</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemove}
            >
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={20}
                color="#fff"
              />
              <Text style={styles.removeButtonText}>Eliminar y subir otra</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Botón de subida
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleSelectAndUpload}
          disabled={uploading}
          activeOpacity={0.7}
        >
          {uploading ? (
            <View style={styles.uploadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.uploadingText}>Subiendo imagen...</Text>
              <Text style={styles.uploadingSubtext}>Por favor espera</Text>
            </View>
          ) : (
            <View style={styles.uploadPrompt}>
              <View style={styles.iconCircle}>
                <IconSymbol
                  ios_icon_name="photo"
                  android_material_icon_name="add_photo_alternate"
                  size={56}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.uploadTitle}>Seleccionar Imagen</Text>
              <Text style={styles.uploadSubtitle}>Toca aquí para elegir una foto de tu galería</Text>
              <View style={styles.formatBadge}>
                <Text style={styles.formatText}>JPG, PNG, WEBP • Máx 10 MB</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Info adicional */}
      <View style={styles.infoSection}>
        <IconSymbol
          ios_icon_name="info.circle"
          android_material_icon_name="info"
          size={16}
          color={colors.textSecondary}
        />
        <Text style={styles.infoText}>
          Asegúrate de que la imagen sea clara y legible. El documento debe mostrar tu nombre y la dirección del local.
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
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: colors.primary + '08',
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
  },
  uploadingState: {
    alignItems: 'center',
    gap: 16,
  },
  uploadingText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  uploadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  uploadPrompt: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  uploadSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  formatBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8,
  },
  formatText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.cardBackground,
    minHeight: 300,
  },
  verifyingContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.cardBackground,
  },
  verifyingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  previewImage: {
    width: '100%',
    height: 300,
    backgroundColor: colors.cardBorder,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  imageLoadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  previewOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    padding: 20,
    gap: 16,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  removeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  infoSection: {
    marginTop: 16,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
    lineHeight: 19,
  },
});
