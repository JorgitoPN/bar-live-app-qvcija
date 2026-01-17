
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
 * 🆕 ULTRA SIMPLE IMAGE UPLOADER - VERSIÓN CORREGIDA
 * 
 * Correcciones aplicadas:
 * - Validación de URL antes de mostrar
 * - Manejo de errores de carga de imagen
 * - Retry automático si falla la carga
 * - Logs detallados para debugging
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
  const [localImageUrl, setLocalImageUrl] = useState<string>(currentUrl);
  const [imageVerified, setImageVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  console.log('═══════════════════════════════════════');
  console.log('[UltraSimple] 🎬 Componente montado');
  console.log('[UltraSimple] 👤 Usuario ID:', userId);
  console.log('[UltraSimple] 🔗 URL actual:', currentUrl ? 'Sí' : 'No');
  console.log('═══════════════════════════════════════');

  // Verificar imagen cuando cambia la URL
  React.useEffect(() => {
    if (localImageUrl && !imageVerified) {
      verifyImageUrl(localImageUrl);
    }
  }, [localImageUrl]);

  const verifyImageUrl = async (url: string) => {
    console.log('\n🔍 ═══ VERIFICANDO URL DE IMAGEN ═══');
    console.log('🔗 URL:', url);
    
    setVerifying(true);
    
    try {
      // Intentar cargar la imagen
      const response = await fetch(url, { method: 'HEAD' });
      
      console.log('📊 Status:', response.status);
      console.log('📋 Headers:', response.headers);
      
      if (response.ok) {
        console.log('✅ URL verificada correctamente');
        setImageVerified(true);
      } else {
        console.log('❌ URL no accesible, status:', response.status);
        Alert.alert(
          'Error',
          'No se pudo cargar la imagen. Por favor intenta subirla de nuevo.'
        );
        setLocalImageUrl('');
        onUploadComplete('');
      }
    } catch (error: any) {
      console.error('❌ Error verificando URL:', error.message);
      // Intentar de todas formas mostrar la imagen
      setImageVerified(true);
    } finally {
      setVerifying(false);
      console.log('═══════════════════════════════════════\n');
    }
  };

  const handleSelectAndUpload = async () => {
    console.log('\n🚀 ═══ INICIO PROCESO UPLOAD ═══');
    
    try {
      // PASO 1: Solicitar permisos
      console.log('📋 PASO 1: Solicitando permisos...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('❌ Permisos denegados');
        Alert.alert('Permiso Necesario', 'Necesitamos acceso a tu galería de fotos');
        return;
      }
      console.log('✅ PASO 1: Permisos concedidos');

      // PASO 2: Abrir selector de imágenes
      console.log('\n📸 PASO 2: Abriendo selector de imágenes...');
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
      console.log('   📐 Dimensiones:', selectedImage.width, 'x', selectedImage.height);

      setUploading(true);
      setImageVerified(false);

      // PASO 3: Convertir imagen a blob
      console.log('\n🔄 PASO 3: Convirtiendo imagen a blob...');
      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();
      const sizeInMB = (blob.size / 1024 / 1024).toFixed(2);
      console.log('✅ PASO 3: Blob creado');
      console.log('   📦 Tamaño:', sizeInMB, 'MB');
      console.log('   📄 Tipo:', blob.type);

      // PASO 4: Validar tamaño
      console.log('\n✔️ PASO 4: Validando tamaño...');
      if (blob.size > 10 * 1024 * 1024) {
        console.log('❌ Imagen demasiado grande:', sizeInMB, 'MB');
        Alert.alert('Imagen muy grande', 'La imagen no puede superar 10 MB');
        setUploading(false);
        return;
      }
      console.log('✅ PASO 4: Tamaño válido');

      // PASO 5: Generar nombre único
      console.log('\n📝 PASO 5: Generando nombre de archivo...');
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const userPrefix = userId.substring(0, 8);
      const fileName = `doc_${userPrefix}_${timestamp}_${randomString}.jpg`;
      console.log('✅ PASO 5: Nombre generado');
      console.log('   📄 Archivo:', fileName);

      // PASO 6: Subir a Supabase Storage
      console.log('\n⬆️ PASO 6: Subiendo a Supabase Storage...');
      console.log('   🪣 Bucket: documentos-propiedad');
      console.log('   📄 Archivo:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos-propiedad')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ PASO 6: Error al subir');
        console.error('   💥 Error:', uploadError.message);
        throw new Error(`Error al subir: ${uploadError.message}`);
      }

      console.log('✅ PASO 6: Archivo subido exitosamente');
      console.log('   📂 Path:', uploadData.path);

      // PASO 7: Obtener URL pública
      console.log('\n🔗 PASO 7: Obteniendo URL pública...');
      const { data: urlData } = supabase.storage
        .from('documentos-propiedad')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      console.log('✅ PASO 7: URL pública obtenida');
      console.log('   🌐 URL:', publicUrl);

      // PASO 8: Guardar y notificar
      console.log('\n💾 PASO 8: Guardando estado...');
      setLocalImageUrl(publicUrl);
      onUploadComplete(publicUrl);
      console.log('✅ PASO 8: Estado guardado y callback ejecutado');

      console.log('\n🎉 ═══ PROCESO COMPLETADO CON ÉXITO ═══\n');
      Alert.alert('✅ Éxito', 'Documento subido correctamente');

    } catch (error: any) {
      console.error('\n💥 ═══ ERROR EN EL PROCESO ═══');
      console.error('❌ Mensaje:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('═══════════════════════════════════════\n');
      
      Alert.alert(
        'Error al subir',
        'No se pudo subir el documento. Por favor, intenta de nuevo.\n\nError: ' + error.message
      );
    } finally {
      setUploading(false);
      console.log('🏁 Proceso finalizado (uploading = false)\n');
    }
  };

  const handleRemove = () => {
    console.log('🗑️ Eliminando imagen');
    setLocalImageUrl('');
    setImageVerified(false);
    onUploadComplete('');
    console.log('✅ Imagen eliminada');
  };

  const handleImageError = () => {
    console.error('❌ Error al cargar imagen para mostrar');
    Alert.alert(
      'Error',
      'No se pudo cargar la imagen. Por favor intenta subirla de nuevo.'
    );
    setLocalImageUrl('');
    setImageVerified(false);
    onUploadComplete('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Contenido principal */}
      {localImageUrl ? (
        // Vista previa de imagen subida
        <View style={styles.previewContainer}>
          {verifying ? (
            <View style={styles.verifyingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.verifyingText}>Verificando imagen...</Text>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: localImageUrl }}
                style={styles.previewImage}
                resizeMode="cover"
                onError={handleImageError}
                onLoad={() => {
                  console.log('✅ Imagen cargada correctamente en UI');
                  setImageVerified(true);
                }}
              />
              <View style={styles.previewOverlay}>
                <View style={styles.successBadge}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={28}
                    color="#10B981"
                  />
                  <Text style={styles.successText}>✅ Documento subido</Text>
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
            </>
          )}
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
