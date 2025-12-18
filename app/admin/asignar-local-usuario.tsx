
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  nombre: string;
  email: string;
  username?: string;
  avatar?: string;
}

interface Local {
  id: string;
  nombre: string;
  direccion: string;
  tipo: string;
  imagen_url?: string;
}

export default function AsignarLocalUsuarioScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchingUser, setSearchingUser] = useState(false);
  const [searchingLocal, setSearchingLocal] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [localQuery, setLocalQuery] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [localResults, setLocalResults] = useState<Local[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedRole, setSelectedRole] = useState<'propietario' | 'administrador' | 'editor'>('propietario');
  const [assigning, setAssigning] = useState(false);

  // Search users with debounce
  const searchUsers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setUserResults([]);
      return;
    }

    setSearchingUser(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, username, avatar')
        .or(`nombre.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      setUserResults(data || []);
      console.log('[AsignarLocal] Found users:', data?.length || 0);
    } catch (error) {
      console.error('[AsignarLocal] Error searching users:', error);
      Alert.alert('Error', 'No se pudieron buscar usuarios');
    } finally {
      setSearchingUser(false);
    }
  }, []);

  // Search locals with debounce
  const searchLocals = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setLocalResults([]);
      return;
    }

    setSearchingLocal(true);
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, tipo, imagen_url')
        .or(`nombre.ilike.%${query}%,direccion.ilike.%${query}%`)
        .eq('activo', true)
        .limit(10);

      if (error) throw error;

      setLocalResults(data || []);
      console.log('[AsignarLocal] Found locals:', data?.length || 0);
    } catch (error) {
      console.error('[AsignarLocal] Error searching locals:', error);
      Alert.alert('Error', 'No se pudieron buscar locales');
    } finally {
      setSearchingLocal(false);
    }
  }, []);

  // Handle user query change with debounce
  const handleUserQueryChange = useCallback((text: string) => {
    setUserQuery(text);
    
    if (text.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchUsers(text);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setUserResults([]);
    }
  }, [searchUsers]);

  // Handle local query change with debounce
  const handleLocalQueryChange = useCallback((text: string) => {
    setLocalQuery(text);
    
    if (text.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchLocals(text);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setLocalResults([]);
    }
  }, [searchLocals]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setUserQuery('');
    setUserResults([]);
  };

  const handleSelectLocal = (local: Local) => {
    setSelectedLocal(local);
    setLocalQuery('');
    setLocalResults([]);
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedLocal) {
      Alert.alert('Error', 'Debes seleccionar un usuario y un local');
      return;
    }

    Alert.alert(
      'Confirmar Asignación',
      `¿Asignar el local "${selectedLocal.nombre}" a ${selectedUser.nombre} como ${selectedRole}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAssigning(true);
            try {
              // 1. Check if assignment already exists
              const { data: existing, error: checkError } = await supabase
                .from('propietarios_locales')
                .select('id, rol, activo')
                .eq('propietario_id', selectedUser.id)
                .eq('local_id', selectedLocal.id)
                .single();

              if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
              }

              if (existing) {
                // Update existing assignment
                const { error: updateError } = await supabase
                  .from('propietarios_locales')
                  .update({
                    rol: selectedRole,
                    activo: true,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id);

                if (updateError) throw updateError;

                console.log('[AsignarLocal] ✅ Updated existing assignment');
              } else {
                // Create new assignment
                const { error: insertError } = await supabase
                  .from('propietarios_locales')
                  .insert({
                    propietario_id: selectedUser.id,
                    local_id: selectedLocal.id,
                    rol: selectedRole,
                    activo: true,
                  });

                if (insertError) throw insertError;

                console.log('[AsignarLocal] ✅ Created new assignment');
              }

              // 2. Update user role to propietario if not already
              if (selectedRole === 'propietario') {
                const { error: roleError } = await supabase
                  .from('usuarios')
                  .update({ rol_app: 'propietario' })
                  .eq('id', selectedUser.id);

                if (roleError) {
                  console.error('[AsignarLocal] Error updating user role:', roleError);
                }
              }

              // 3. Send notification to user
              await supabase
                .from('notificaciones')
                .insert({
                  usuario_id: selectedUser.id,
                  tipo: 'sistema',
                  titulo: 'Local Asignado',
                  mensaje: `Se te ha asignado el local "${selectedLocal.nombre}" como ${selectedRole}. Ahora puedes gestionarlo desde tu panel.`,
                });

              Alert.alert(
                '✅ Asignación Exitosa',
                `El local "${selectedLocal.nombre}" ha sido asignado a ${selectedUser.nombre} como ${selectedRole}.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Reset form
                      setSelectedUser(null);
                      setSelectedLocal(null);
                      setSelectedRole('propietario');
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('[AsignarLocal] Error assigning local:', error);
              Alert.alert('Error', 'No se pudo asignar el local al usuario');
            } finally {
              setAssigning(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Asignar Local a Usuario</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Step 1: Search and Select User */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Buscar Usuario</Text>
          </View>

          {selectedUser ? (
            <View style={styles.selectedCard}>
              <View style={styles.selectedCardContent}>
                {selectedUser.avatar ? (
                  <Image source={{ uri: selectedUser.avatar }} style={styles.selectedAvatar} />
                ) : (
                  <View style={[styles.selectedAvatar, styles.selectedAvatarPlaceholder]}>
                    <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.white} />
                  </View>
                )}
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedUser.nombre}</Text>
                  <Text style={styles.selectedEmail}>{selectedUser.email}</Text>
                  {selectedUser.username && (
                    <Text style={styles.selectedUsername}>@{selectedUser.username}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <React.Fragment>
              <View style={styles.searchContainer}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={userQuery}
                  onChangeText={handleUserQueryChange}
                  placeholder="Buscar por nombre, email o username..."
                  placeholderTextColor={colors.textSecondary}
                />
                {searchingUser && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {userResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  {userResults.map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.resultItem}
                      onPress={() => handleSelectUser(user)}
                    >
                      {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.resultAvatar} />
                      ) : (
                        <View style={[styles.resultAvatar, styles.resultAvatarPlaceholder]}>
                          <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={colors.white} />
                        </View>
                      )}
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName}>{user.nombre}</Text>
                        <Text style={styles.resultEmail}>{user.email}</Text>
                        {user.username && (
                          <Text style={styles.resultUsername}>@{user.username}</Text>
                        )}
                      </View>
                      <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </React.Fragment>
          )}
        </View>

        {/* Step 2: Search and Select Local */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Buscar Local</Text>
          </View>

          {selectedLocal ? (
            <View style={styles.selectedCard}>
              <View style={styles.selectedCardContent}>
                {selectedLocal.imagen_url ? (
                  <Image source={{ uri: selectedLocal.imagen_url }} style={styles.selectedLocalImage} />
                ) : (
                  <View style={[styles.selectedLocalImage, styles.selectedLocalImagePlaceholder]}>
                    <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color={colors.white} />
                  </View>
                )}
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedLocal.nombre}</Text>
                  <Text style={styles.selectedEmail}>{selectedLocal.direccion}</Text>
                  <View style={styles.selectedLocalType}>
                    <Text style={styles.selectedLocalTypeText}>{selectedLocal.tipo}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedLocal(null)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <React.Fragment>
              <View style={styles.searchContainer}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={localQuery}
                  onChangeText={handleLocalQueryChange}
                  placeholder="Buscar por nombre o dirección..."
                  placeholderTextColor={colors.textSecondary}
                />
                {searchingLocal && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {localResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  {localResults.map(local => (
                    <TouchableOpacity
                      key={local.id}
                      style={styles.resultItem}
                      onPress={() => handleSelectLocal(local)}
                    >
                      {local.imagen_url ? (
                        <Image source={{ uri: local.imagen_url }} style={styles.resultLocalImage} />
                      ) : (
                        <View style={[styles.resultLocalImage, styles.resultLocalImagePlaceholder]}>
                          <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={20} color={colors.white} />
                        </View>
                      )}
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName}>{local.nombre}</Text>
                        <Text style={styles.resultEmail}>{local.direccion}</Text>
                        <View style={styles.resultLocalType}>
                          <Text style={styles.resultLocalTypeText}>{local.tipo}</Text>
                        </View>
                      </View>
                      <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </React.Fragment>
          )}
        </View>

        {/* Step 3: Select Role */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>Seleccionar Rol</Text>
          </View>

          <View style={styles.roleOptions}>
            <TouchableOpacity
              style={[styles.roleOption, selectedRole === 'propietario' && styles.roleOptionActive]}
              onPress={() => setSelectedRole('propietario')}
            >
              <View style={styles.roleOptionLeft}>
                <IconSymbol 
                  ios_icon_name="person.badge.key.fill" 
                  android_material_icon_name="admin_panel_settings" 
                  size={24} 
                  color={selectedRole === 'propietario' ? colors.primary : colors.textSecondary} 
                />
                <View style={styles.roleOptionText}>
                  <Text style={[styles.roleOptionTitle, selectedRole === 'propietario' && styles.roleOptionTitleActive]}>
                    Propietario
                  </Text>
                  <Text style={styles.roleOptionSubtitle}>Control total del local</Text>
                </View>
              </View>
              {selectedRole === 'propietario' && (
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, selectedRole === 'administrador' && styles.roleOptionActive]}
              onPress={() => setSelectedRole('administrador')}
            >
              <View style={styles.roleOptionLeft}>
                <IconSymbol 
                  ios_icon_name="person.badge.shield.checkmark.fill" 
                  android_material_icon_name="verified_user" 
                  size={24} 
                  color={selectedRole === 'administrador' ? colors.primary : colors.textSecondary} 
                />
                <View style={styles.roleOptionText}>
                  <Text style={[styles.roleOptionTitle, selectedRole === 'administrador' && styles.roleOptionTitleActive]}>
                    Administrador
                  </Text>
                  <Text style={styles.roleOptionSubtitle}>Gestión y moderación</Text>
                </View>
              </View>
              {selectedRole === 'administrador' && (
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, selectedRole === 'editor' && styles.roleOptionActive]}
              onPress={() => setSelectedRole('editor')}
            >
              <View style={styles.roleOptionLeft}>
                <IconSymbol 
                  ios_icon_name="pencil.circle.fill" 
                  android_material_icon_name="edit" 
                  size={24} 
                  color={selectedRole === 'editor' ? colors.primary : colors.textSecondary} 
                />
                <View style={styles.roleOptionText}>
                  <Text style={[styles.roleOptionTitle, selectedRole === 'editor' && styles.roleOptionTitleActive]}>
                    Editor
                  </Text>
                  <Text style={styles.roleOptionSubtitle}>Edición de contenido</Text>
                </View>
              </View>
              {selectedRole === 'editor' && (
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary and Confirm */}
        {selectedUser && selectedLocal && (
          <View style={styles.summarySection}>
            <View style={styles.summaryHeader}>
              <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={24} color={colors.primary} />
              <Text style={styles.summaryTitle}>Resumen de Asignación</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Usuario:</Text>
                <Text style={styles.summaryValue}>{selectedUser.nombre}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Local:</Text>
                <Text style={styles.summaryValue}>{selectedLocal.nombre}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rol:</Text>
                <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700' }]}>
                  {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleAssign}
              disabled={assigning}
            >
              {assigning ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <React.Fragment>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                  <Text style={styles.confirmButtonText}>Confirmar Asignación</Text>
                </React.Fragment>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Al asignar un local a un usuario, este podrá gestionar el local desde su panel de gestión. 
            El rol determina los permisos que tendrá sobre el local.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
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
    fontWeight: '800',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  resultsContainer: {
    marginTop: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  resultAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultLocalImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  resultLocalImagePlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  resultEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  resultUsername: {
    fontSize: 12,
    color: colors.primary,
  },
  resultLocalType: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  resultLocalTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selectedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  selectedAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLocalImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  selectedLocalImagePlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  selectedEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  selectedUsername: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  selectedLocalType: {
    backgroundColor: colors.primary + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  selectedLocalTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  roleOptionActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  roleOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  roleOptionText: {
    flex: 1,
  },
  roleOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  roleOptionTitleActive: {
    color: colors.primary,
  },
  roleOptionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summarySection: {
    marginTop: 8,
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    ...commonStyles.shadow,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
});
