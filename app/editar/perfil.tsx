
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

export default function EditarPerfilScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatar, setAvatar] = useState('');
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
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
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'No se pudo cargar la información del perfil');
        return;
      }

      if (data) {
        setAvatar(data.avatar || '');
        setNombre(data.nombre || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setSitioWeb(data.sitio_web || '');
        setPerfilPrivado(data.perfil_privado || false);
        setPermitirEtiquetas(data.permitir_etiquetas !== false);
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
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

    setSaving(true);

    try {
      // Verificar que el username no esté en uso (si cambió)
      if (username) {
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

      if (avatar && avatar !== user.avatar) {
        // En producción, aquí subirías la imagen a Supabase Storage
        updateData.avatar = avatar;
      }

      const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'No se pudo guardar el perfil. Por favor, intenta nuevamente.');
        return;
      }

      // Refresh user data in context
      await refreshUser();

      Alert.alert('Éxito', 'Perfil actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error in handleSave:', error);
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
          disabled={saving}
        >
          {saving ? (
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
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <IconSymbol name="person.fill" size={48} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <IconSymbol name="camera.fill" size={24} color={colors.headerText} />
            </View>
          </TouchableOpacity>

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
    marginBottom: 30,
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
