
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
  Platform,
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
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MomentoUploadProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * ✅ MOMENTO UPLOAD v326.0 - ANDROID SPECIFIC - CAMERA CRASH FIX
 * 
 * NEW CHANGES v326.0:
 * - ✅ PROBLEMA 1 RESUELTO: Camera crash fixed with proper error handling
 * - ✅ Added comprehensive logging for camera lifecycle
 * - ✅ Added exif: false, base64: false to prevent memory issues
 * - ✅ Improved error messages for user guidance
 * - ✅ Added stack trace logging for debugging
 * 
 * PREVIOUS CHANGES v325.0:
 * - ✅ FIXED: JSX closing tag error resolved
 * - ✅ FIXED: Opens as fullScreen modal (not transparent modal)
 * - ✅ FIXED: Uses Barlive gradient colors (headerGradientStart, headerGradientEnd)
 * - ✅ IMPROVED: Consistent with Barlive design system
 * 
 * CRITICAL CHANGES v157.0 (ANDROID ONLY):
 * - ✅ REMOVED: Image editor completely removed for Android
 * - ✅ After selecting/capturing image, publish directly
 * - ✅ Simplified workflow: Select/Capture → Publish immediately
 * - ✅ No intermediate editing step
 */

export default function MomentoUpload({ visible, onClose, onSuccess }: MomentoUploadProps) {
  const { user, ensureValidSession } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const closeIconSize = scaleIconSize(28);
  const cameraIconSize = scaleIconSize(48);
  const photoIconSize = scaleIconSize(48);
  const infoIconSize = scaleIconSize(20);
  const refreshIconSize = scaleIconSize(24);
  const checkIconSize = scaleIconSize(24);

  // ✅ ANDROID v157.0: Direct image selection without editor
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

      console.log('[MomentoUpload Android v157.0] 📸 Selecting image directly (no editor)');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // ✅ ANDROID: No editing, direct selection
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[MomentoUpload Android v157.0] ✅ Image selected, uploading directly...');
        setSelectedImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // ✅ ANDROID: Upload immediately after selection
        await uploadMomentoDirectly(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[MomentoUpload Android v157.0] Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // ✅ ANDROID v157.0: Direct photo capture without editor
  const takePhoto = async () => {
    try {
      console.log('[MomentoUpload Android v158.0] 📸 Requesting camera permissions...');
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      console.log('[MomentoUpload Android v158.0] 📸 Camera permission status:', status);
      
      if (status !== 'granted') {
        console.log('[MomentoUpload Android v158.0] ❌ Camera permission denied');
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu cámara para tomar fotos'
        );
        return;
      }

      console.log('[MomentoUpload Android v158.0] ✅ Camera permission granted, launching camera...');

      // ✅ FIX: Add error handling and lifecycle management
      const result = await ImagePicker.launchCameraAsync({
        // ✅ ANDROID: No editing, direct capture
        allowsEditing: false,
        quality: 0.8,
        // ✅ FIX: Ensure proper camera lifecycle
        exif: false,
        base64: false,
      });

      console.log('[MomentoUpload Android v158.0] 📸 Camera result:', result.canceled ? 'canceled' : 'success');

      if (!result.canceled && result.assets[0]) {
        console.log('[MomentoUpload Android v158.0] ✅ Photo captured, uploading directly...');
        setSelectedImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // ✅ ANDROID: Upload immediately after capture
        await uploadMomentoDirectly(result.assets[0].uri);
      } else {
        console.log('[MomentoUpload Android v158.0] ℹ️ User canceled camera');
      }
    } catch (error) {
      console.error('[MomentoUpload Android v158.0] ❌ CRITICAL ERROR taking photo:', error);
      console.error('[MomentoUpload Android v158.0] ❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // ✅ FIX: Provide user-friendly error message
      Alert.alert(
        'Error de cámara',
        'No se pudo abrir la cámara. Por favor, verifica que la aplicación tenga permisos de cámara en la configuración de tu dispositivo.'
      );
    }
  };

  // ✅ ANDROID v157.0: Upload momento directly without editing
  const uploadMomentoDirectly = async (imageUri: string) => {
    if (!imageUri) {
      console.error('[MomentoUpload Android v157.0] No image URI provided');
      return;
    }

    try {
      setUploading(true);

      console.log('[MomentoUpload Android v157.0] 🚀 Iniciando subida directa de Momento...');
      console.log('[MomentoUpload Android v157.0] 📊 Estado inicial:', {
        hasUser: !!user,
        userId: user?.id,
        activeProfileType,
        activeProfileId,
      });

      const validSession = await ensureValidSession();
      
      if (!validSession) {
        console.error('[MomentoUpload Android v157.0] ❌ No se pudo obtener una sesión válida');
        Alert.alert(
          'Sesión expirada',
          'Tu sesión ha expirado. Por favor, cierra sesión y vuelve a iniciar sesión.'
        );
        setUploading(false);
        return;
      }

      console.log('[MomentoUpload Android v157.0] ✅ Sesión válida confirmada');

      const currentUserId = validSession.user.id;

      console.log('[MomentoUpload Android v157.0] 👤 Usuario confirmado:', currentUserId);

      let momentoData: any = {
        autor_id: currentUserId,
        tipo: 'usuario',
        categoria: 'general',
      };

      if (activeProfileType === 'local' && activeProfileId) {
        console.log('[MomentoUpload Android v157.0] 🏢 Verificando propiedad del local...');
        
        const { data: ownershipData, error: ownershipError } = await supabase
          .from('propietarios_locales')
          .select('id, local_id, propietario_id, activo')
          .eq('propietario_id', currentUserId)
          .eq('local_id', activeProfileId)
          .eq('activo', true)
          .single();

        if (ownershipError || !ownershipData) {
          console.error('[MomentoUpload Android v157.0] ❌ Verificación de propiedad falló:', ownershipError);
          Alert.alert(
            'Error de permisos',
            'No tienes permisos para subir momentos como este local. Verifica que seas propietario activo del local.'
          );
          setUploading(false);
          return;
        }

        console.log('[MomentoUpload Android v157.0] ✅ Propiedad verificada:', ownershipData);
        
        momentoData.tipo = 'local';
        momentoData.local_id = activeProfileId;
      }

      console.log('[MomentoUpload Android v157.0] 📝 Datos del momento preparados:', momentoData);

      console.log('[MomentoUpload Android v157.0] 📸 Convirtiendo imagen a base64...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[MomentoUpload Android v157.0] ✅ Imagen convertida, tamaño:', base64.length, 'caracteres');

      const fileName = `momento-${Date.now()}.jpg`;
      const filePath = `${currentUserId}/${fileName}`;

      console.log('[MomentoUpload Android v157.0] 📤 Subiendo a storage bucket "momentos"');
      console.log('[MomentoUpload Android v157.0] 📁 Ruta del archivo:', filePath);

      const arrayBuffer = decode(base64);

      console.log('[MomentoUpload Android v157.0] 📦 Tamaño del buffer:', arrayBuffer.byteLength, 'bytes');

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('momentos')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('[MomentoUpload Android v157.0] ❌ Error de subida al storage:', uploadError);
        
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

      console.log('[MomentoUpload Android v157.0] ✅ Subida al storage exitosa:', uploadData);

      const { data: urlData } = supabase.storage
        .from('momentos')
        .getPublicUrl(filePath);

      console.log('[MomentoUpload Android v157.0] 🔗 URL pública generada:', urlData.publicUrl);

      momentoData.imagen_url = urlData.publicUrl;

      console.log('[MomentoUpload Android v157.0] 💾 Creando registro en la base de datos...');

      const { data: insertData, error: insertError } = await supabase
        .from('momentos')
        .insert(momentoData)
        .select()
        .single();

      if (insertError) {
        console.error('[MomentoUpload Android v157.0] ❌ Error insertando en base de datos:', insertError);
        
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

      console.log('[MomentoUpload Android v157.0] ✅ Momento creado exitosamente:', insertData);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('¡Éxito!', 'Tu Momento se ha publicado');
      
      setSelectedImage(null);
      
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('[MomentoUpload Android v157.0] ❌ Error inesperado:', error);
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
    <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleClose} disabled={uploading}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={closeIconSize}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(18) }]}>Nuevo Momento</Text>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <View style={styles.content}>
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.uploadingText, { fontSize: scaleFontSize(16) }]}>
                Publicando Momento...
              </Text>
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              <Text style={[styles.title, { fontSize: scaleFontSize(28) }]}>Comparte un Momento</Text>
              <Text style={[styles.subtitle, { fontSize: scaleFontSize(16) }]}>
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
                      size={cameraIconSize}
                      color={colors.headerText}
                    />
                    <Text style={[styles.optionText, { fontSize: scaleFontSize(16) }]}>Tomar Foto</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.optionGradient}
                  >
                    <IconSymbol
                      ios_icon_name="photo.fill"
                      android_material_icon_name="photo_library"
                      size={photoIconSize}
                      color={colors.headerText}
                    />
                    <Text style={[styles.optionText, { fontSize: scaleFontSize(16) }]}>Galería</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={infoIconSize}
                  color={colors.primary}
                />
                <Text style={[styles.infoText, { fontSize: scaleFontSize(13) }]}>
                  {activeProfileType === 'local' 
                    ? 'Los Momentos de tu local son visibles para tus seguidores durante 24 horas'
                    : 'Los Momentos son visibles para tus seguidores durante 24 horas'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  uploadingText: {
    color: colors.text,
    fontWeight: '600',
    fontFamily: 'System',
  },
  optionsContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
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
    fontWeight: '700',
    color: colors.headerText,
    fontFamily: 'System',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: SCREEN_WIDTH - 40,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoText: {
    flex: 1,
    color: colors.text,
    fontFamily: 'System',
    lineHeight: 18,
  },
});
