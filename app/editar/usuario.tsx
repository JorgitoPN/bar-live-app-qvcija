
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
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/utils/adminAccess';
import { trackUsernameChange, isUsernameReserved } from '@/utils/usernameGenerator';

const ROLES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'propietario', label: 'Propietario' },
  { value: 'admin', label: 'Administrador' },
];

// ✅ CRITICAL: Only this email can see and modify admin role
const ADMIN_EMAIL = 'jorgepereznoyagh@gmail.com';

export default function EditarUsuarioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const usuarioId = params.id as string;
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [avatar, setAvatar] = useState('');
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState(''); // Track original username
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [rolApp, setRolApp] = useState<'cliente' | 'propietario' | 'admin'>('cliente');
  const [activo, setActivo] = useState(true);
  const [perfilPrivado, setPerfilPrivado] = useState(false);
  const [permitirEtiquetas, setPermitirEtiquetas] = useState(true);

  // Modals
  const [showRolModal, setShowRolModal] = useState(false);

  // ✅ CRITICAL: Check if current user can modify admin role
  const canModifyAdminRole = currentUser?.email === ADMIN_EMAIL;

  // ✅ CRITICAL: Filter available roles based on current user permissions
  const availableRoles = canModifyAdminRole 
    ? ROLES 
    : ROLES.filter(r => r.value !== 'admin');

  const loadUsuarioData = useCallback(async () => {
    if (!usuarioId) {
      Alert.alert('Error', 'ID de usuario no válido');
      router.back();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', usuarioId)
        .single();

      if (error) {
        console.error('Error loading usuario data:', error);
        Alert.alert('Error', 'No se pudo cargar la información del usuario');
        router.back();
        return;
      }

      if (data) {
        setAvatar(data.avatar || '');
        setNombre(data.nombre || '');
        setUsername(data.username || '');
        setOriginalUsername(data.username || ''); // Store original username
        setEmail(data.email || '');
        setBio(data.bio || '');
        setSitioWeb(data.sitio_web || '');
        setRolApp(data.rol_app || 'cliente');
        setActivo(data.activo !== false);
        setPerfilPrivado(data.perfil_privado || false);
        setPermitirEtiquetas(data.permitir_etiquetas !== false);
      }
    } catch (error) {
      console.error('Error in loadUsuarioData:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar el usuario');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [usuarioId, router]);

  useEffect(() => {
    loadUsuarioData();
  }, [loadUsuarioData]);

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
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'El email no puede estar vacío');
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

    // ✅ CRITICAL: Prevent non-admin users from setting admin role
    if (rolApp === 'admin' && !canModifyAdminRole) {
      Alert.alert('Error', 'No tienes permisos para asignar el rol de administrador');
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
          .neq('id', usuarioId)
          .single();

        if (existingUser) {
          Alert.alert('Error', 'Este nombre de usuario ya está en uso');
          setSaving(false);
          return;
        }
      }

      // Verificar que el email no esté en uso (si cambió)
      const { data: existingEmail } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email.trim())
        .neq('id', usuarioId)
        .single();

      if (existingEmail) {
        Alert.alert('Error', 'Este email ya está en uso');
        setSaving(false);
        return;
      }

      const updateData: any = {
        nombre: nombre.trim(),
        email: email.trim(),
        bio: bio.trim() || null,
        sitio_web: sitioWeb.trim() || null,
        rol_app: rolApp,
        activo,
        perfil_privado: perfilPrivado,
        permitir_etiquetas: permitirEtiquetas,
        updated_at: new Date().toISOString(),
      };

      if (username) {
        updateData.username = username;
      }

      if (avatar && avatar !== '') {
        updateData.avatar = avatar;
      }

      const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', usuarioId);

      if (error) {
        console.error('Error updating usuario:', error);
        Alert.alert('Error', 'No se pudo guardar el usuario. Por favor, intenta nuevamente.');
        return;
      }

      // Track username change if it was modified
      if (username && username !== originalUsername) {
        console.log('[EditarUsuario] 📝 Username changed from', originalUsername, 'to', username);
        await trackUsernameChange(
          'user',
          usuarioId,
          originalUsername || null,
          username,
          currentUser?.id,
          'Usuario editó su perfil'
        );
      }

      Alert.alert('Éxito', 'Usuario actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'admin':
        return colors.badgeNuevo;
      case 'propietario':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando usuario...</Text>
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
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Usuario</Text>
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={48} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="photo_camera" size={24} color={colors.headerText} />
            </View>
          </TouchableOpacity>

          {/* Nombre */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor={colors.textSecondary}
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          {/* Username */}
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

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="email@ejemplo.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Rol - ✅ ONLY SHOW IF USER IS AUTHORIZED ADMIN */}
          {canModifyAdminRole && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rol de usuario *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowRolModal(true)}
              >
                <View style={styles.rolBadge}>
                  <View
                    style={[
                      styles.rolIndicator,
                      { backgroundColor: getRolColor(rolApp) },
                    ]}
                  />
                  <Text style={styles.selectButtonText}>
                    {ROLES.find((r) => r.value === rolApp)?.label || 'Cliente'}
                  </Text>
                </View>
                <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.helperText}>
                ⚠️ Solo {ADMIN_EMAIL} puede modificar roles de usuario
              </Text>
            </View>
          )}

          {/* Bio */}
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

          {/* Sitio Web */}
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

          {/* Estado */}
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Usuario activo</Text>
              <Text style={styles.switchDescription}>
                El usuario puede acceder a la aplicación
              </Text>
            </View>
            <Switch
              value={activo}
              onValueChange={setActivo}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>

          {/* Perfil Privado */}
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Perfil privado</Text>
              <Text style={styles.switchDescription}>
                Solo sus seguidores pueden ver sus publicaciones
              </Text>
            </View>
            <Switch
              value={perfilPrivado}
              onValueChange={setPerfilPrivado}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>

          {/* Permitir Etiquetas */}
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Permitir etiquetas</Text>
              <Text style={styles.switchDescription}>
                Otros usuarios pueden etiquetarlo en publicaciones
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

      {/* Modal Rol - ✅ ONLY SHOW IF USER IS AUTHORIZED ADMIN */}
      {canModifyAdminRole && (
        <Modal
          visible={showRolModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRolModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowRolModal(false)}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecciona el rol</Text>
                <TouchableOpacity onPress={() => setShowRolModal(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                {availableRoles.map((rol) => (
                  <TouchableOpacity
                    key={rol.value}
                    style={[
                      styles.modalOption,
                      rolApp === rol.value && styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      setRolApp(rol.value as 'cliente' | 'propietario' | 'admin');
                      setShowRolModal(false);
                    }}
                  >
                    <View style={styles.modalOptionContent}>
                      <View
                        style={[
                          styles.rolIndicator,
                          { backgroundColor: getRolColor(rol.value) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.modalOptionText,
                          rolApp === rol.value && styles.modalOptionTextActive,
                        ]}
                      >
                        {rol.label}
                      </Text>
                    </View>
                    {rolApp === rol.value && (
                      <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalFooter}>
                <Text style={styles.modalFooterText}>
                  ⚠️ Solo {ADMIN_EMAIL} puede asignar el rol de administrador
                </Text>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
  selectButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  rolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rolIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: `${colors.primary}10`,
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOptionTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  modalFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
