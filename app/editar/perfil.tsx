
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { trackUsernameChange, isUsernameReserved } from '@/utils/usernameGenerator';
import { UsernameSuggestions } from '@/components/auth/UsernameSuggestions';
import { decode } from 'base64-arraybuffer';

export default function EditarPerfilScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [avatar, setAvatar] = useState('');
  const [avatarLocalUri, setAvatarLocalUri] = useState(''); // Local URI for preview
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [bio, setBio] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [perfilPrivado, setPerfilPrivado] = useState(false);
  const [permitirEtiquetas, setPermitirEtiquetas] = useState(true);

  const loadUserData = useCallback(async () => {
    if (!user) {
      router.back();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[EditarPerfil v48.0] Error loading user data:', error);
        Alert.alert('Error', 'No se pudo cargar la información del perfil');
        return;
      }

      if (data) {
        // Filter out file:// URLs
        const safeAvatar = data.avatar && !data.avatar.startsWith('file://') ? data.avatar : '';
        setAvatar(safeAvatar);
        setAvatarLocalUri(safeAvatar);
        setNombre(data.nombre || '');
        setUsername(data.username || '');
        setOriginalUsername(data.username || '');
        setBio(data.bio || '');
        setSitioWeb(data.sitio_web || '');
        setPerfilPrivado(data.perfil_privado || false);
        setPermitirEtiquetas(data.permitir_etiquetas !== false);
      }
    } catch (error) {
      console.error('[EditarPerfil v48.0] Error in loadUserData:', error);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[EditarPerfil v48.0] 📸 Image selected:', result.assets[0].uri);
        setAvatarLocalUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[EditarPerfil v48.0] Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const uploadAvatarToStorage = async (uri: string): Promise<string | null> => {
    try {
      console.log('[EditarPerfil v48.0] 📤 Uploading avatar to Supabase Storage...');
      setUploadingImage(true);

      // Read the file as base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Generate unique filename
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user!.id}/${fileName}`;

      console.log('[EditarPerfil v48.0] 📁 Uploading to path:', filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('[EditarPerfil v48.0] ❌ Upload error:', uploadError);
        throw uploadError;
      }

      console.log('[EditarPerfil v48.0] ✅ Upload successful:', uploadData.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('[EditarPerfil v48.0] 🔗 Public URL:', urlData.publicUrl);

      return urlData.publicUrl;
    } catch (error) {
      console.error('[EditarPerfil v48.0] ❌ Error uploading avatar:', error);
      Alert.alert('Error', 'No se pudo subir la imagen. Por favor, intenta nuevamente.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const validarUsername = (text: string) => {
    const regex = /^[a-zA-Z0-9._]+$/;
    return regex.test(text);
  };

  const handleUsernameChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9._]/g, '');
    setUsername(cleaned);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    if (username && username.length < 3) {
      Alert.alert('Error', 'El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (username && !validarUsername(username)) {
      Alert.alert('Error', 'El nombre de usuario solo puede contener letras, números, puntos y guiones bajos');
      return;
    }

    // Check if username is reserved
    if (username && isUsernameReserved(username)) {
      Alert.alert('Error', 'Este nombre de usuario está reservado y no puede ser utilizado');
      return;
    }

    setSaving(true);

    try {
      // Verificar que el username no esté en uso (si cambió)
      if (username && username !== originalUsername) {
        const { data: existingUser } = await supabase
          .from('usuarios')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .single();

        if (existingUser) {
          Alert.alert('Error', 'Este nombre de usuario ya está en uso');
          setSaving(false);
          return;
        }
      }

      // ✅ CRITICAL FIX v48.0: Upload avatar to Supabase Storage if changed
      let finalAvatarUrl = avatar;
      
      if (avatarLocalUri && avatarLocalUri !== avatar) {
        console.log('[EditarPerfil v48.0] 🔄 Avatar changed, uploading to storage...');
        
        // Delete old avatar if exists
        if (avatar && avatar.includes('supabase')) {
          try {
            const oldPath = avatar.split('/avatars/')[1];
            if (oldPath) {
              await supabase.storage.from('avatars').remove([oldPath]);
              console.log('[EditarPerfil v48.0] 🗑️ Deleted old avatar');
            }
          } catch (error) {
            console.error('[EditarPerfil v48.0] Error deleting old avatar:', error);
          }
        }

        // Upload new avatar
        const uploadedUrl = await uploadAvatarToStorage(avatarLocalUri);
        
        if (!uploadedUrl) {
          Alert.alert('Error', 'No se pudo subir la imagen de perfil');
          setSaving(false);
          return;
        }

        finalAvatarUrl = uploadedUrl;
        console.log('[EditarPerfil v48.0] ✅ Avatar uploaded successfully:', finalAvatarUrl);
      }

      // Actualizar perfil
      const updateData: any = {
        nombre: nombre.trim(),
        bio: bio.trim() || null,
        sitio_web: sitioWeb.trim() || null,
        perfil_privado: perfilPrivado,
        permitir_etiquetas: permitirEtiquetas,
        updated_at: new Date().toISOString(),
      };

      if (username) {
        updateData.username = username;
      }

      // ✅ CRITICAL FIX v48.0: Update avatar and avatar_updated_at
      if (finalAvatarUrl !== avatar) {
        updateData.avatar = finalAvatarUrl;
        updateData.avatar_updated_at = new Date().toISOString();
        console.log('[EditarPerfil v48.0] 🔄 Updating avatar_updated_at for cache-busting');
      }

      console.log('[EditarPerfil v48.0] 💾 Saving profile data:', updateData);

      const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('[EditarPerfil v48.0] ❌ Error updating profile:', error);
        Alert.alert('Error', 'No se pudo guardar el perfil. Por favor, intenta nuevamente.');
        return;
      }

      console.log('[EditarPerfil v48.0] ✅ Profile updated successfully');

      // Track username change if it was modified
      if (username && username !== originalUsername) {
        console.log('[EditarPerfil v48.0] 📝 Username changed from', originalUsername, 'to', username);
        await trackUsernameChange(
          'user',
          user.id,
          originalUsername || null,
          username,
          user.id,
          'Usuario editó su perfil'
        );
      }

      // Refresh user data in context
      await refreshUser();

      Alert.alert('Éxito', 'Perfil actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[EditarPerfil v48.0] ❌ Error in handleSave:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={saving || uploadingImage}
        >
          {saving || uploadingImage ? (
            <ActivityIndicator color={colors.headerText} />
          ) : (
            <Text style={styles.saveText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <TouchableOpacity 
              style={styles.avatarContainer} 
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {avatarLocalUri ? (
                <Image 
                  source={{ uri: avatarLocalUri }} 
                  style={styles.avatar}
                  key={avatarLocalUri} // Force re-render on change
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <IconSymbol name="person.fill" size={48} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.avatarOverlay}>
                {uploadingImage ? (
                  <ActivityIndicator color={colors.headerText} size="small" />
                ) : (
                  <IconSymbol name="camera.fill" size={24} color={colors.headerText} />
                )}
              </View>
            </TouchableOpacity>

            {uploadingImage && (
              <Text style={styles.uploadingText}>Subiendo imagen...</Text>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textSecondary}
                value={nombre}
                onChangeText={setNombre}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre de usuario</Text>
              <View style={styles.usernameInputContainer}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={[styles.input, styles.usernameInput]}
                  placeholder="usuario"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.helperText}>
                Solo letras, números, puntos y guiones bajos
              </Text>
              
              {/* Username suggestions */}
              {nombre && (
                <UsernameSuggestions
                  name={nombre}
                  currentUsername={username}
                  onSelectUsername={setUsername}
                />
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Biografía</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Cuéntanos sobre ti..."
                placeholderTextColor={colors.textSecondary}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                maxLength={150}
              />
              <Text style={styles.helperText}>{bio.length}/150 caracteres</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sitio web</Text>
              <TextInput
                style={styles.input}
                placeholder="https://tusitio.com"
                placeholderTextColor={colors.textSecondary}
                value={sitioWeb}
                onChangeText={setSitioWeb}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.privacyContainer}>
              <View style={styles.privacyInfo}>
                <Text style={styles.privacyTitle}>Perfil privado</Text>
                <Text style={styles.privacyDescription}>
                  Solo tus seguidores podrán ver tus publicaciones
                </Text>
              </View>
              <Switch
                value={perfilPrivado}
                onValueChange={setPerfilPrivado}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor={colors.headerText}
              />
            </View>

            <View style={styles.privacyContainer}>
              <View style={styles.privacyInfo}>
                <Text style={styles.privacyTitle}>Permitir etiquetas</Text>
                <Text style={styles.privacyDescription}>
                  Otros usuarios pueden etiquetarte en publicaciones
                </Text>
              </View>
              <Switch
                value={permitirEtiquetas}
                onValueChange={setPermitirEtiquetas}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor={colors.headerText}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  saveButton: {
    padding: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  uploadingText: {
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingLeft: 16,
  },
  usernamePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  privacyInfo: {
    flex: 1,
    marginRight: 16,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
