
import React, { useState, useCallback, useEffect } from 'react';
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
  RefreshControl,
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

interface Assignment {
  id: string;
  local_id: string;
  propietario_id: string;
  rol: string;
  activo: boolean;
  fecha_asignacion: string;
  locales: {
    id: string;
    nombre: string;
    direccion: string;
    tipo: string;
    imagen_url?: string;
  };
  propietario: {
    id: string;
    nombre: string;
    email: string;
    username?: string;
    avatar?: string;
  };
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

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssignments = useCallback(async () => {
    try {
      console.log('[AsignarLocal] Loading current assignments...');
      
      const { data, error } = await supabase
        .from('propietarios_locales')
        .select(`
          id,
          local_id,
          propietario_id,
          rol,
          activo,
          fecha_asignacion,
          locales!propietarios_locales_local_id_fkey(
            id,
            nombre,
            direccion,
            tipo,
            imagen_url
          ),
          propietario:usuarios!propietarios_locales_propietario_id_fkey(
            id,
            nombre,
            email,
            username,
            avatar
          )
        `)
        .eq('activo', true)
        .order('fecha_asignacion', { ascending: false });

      if (error) throw error;

      console.log('[AsignarLocal] ✅ Loaded assignments:', data?.length || 0);
      setAssignments(data || []);
    } catch (error) {
      console.error('[AsignarLocal] Error loading assignments:', error);
      Alert.alert('Error', 'No se pudieron cargar las asignaciones');
    } finally {
      setLoadingAssignments(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAssignments();
  }, [loadAssignments]);

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
              console.log('[AsignarLocal] 🔄 Starting assignment process...');
              console.log('[AsignarLocal] User:', selectedUser.id, selectedUser.nombre);
              console.log('[AsignarLocal] Local:', selectedLocal.id, selectedLocal.nombre);
              console.log('[AsignarLocal] Role:', selectedRole);

              // ✅ STEP 1: Check if assignment already exists in propietarios_locales
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
                console.log('[AsignarLocal] ♻️ Updating existing assignment in propietarios_locales');
                
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

                console.log('[AsignarLocal] ✅ Updated existing assignment in propietarios_locales');
              } else {
                console.log('[AsignarLocal] ➕ Creating new assignment in propietarios_locales');
                
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

                console.log('[AsignarLocal] ✅ Created new assignment in propietarios_locales');
              }

              // ✅ STEP 2: Update locales.propietario_id (CRITICAL FIX)
              console.log('[AsignarLocal] 🔧 Updating locales.propietario_id...');
              
              const { error: localUpdateError } = await supabase
                .from('locales')
                .update({ 
                  propietario_id: selectedUser.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', selectedLocal.id);

              if (localUpdateError) {
                console.error('[AsignarLocal] ❌ Error updating locales.propietario_id:', localUpdateError);
                throw localUpdateError;
              }

              console.log('[AsignarLocal] ✅ Updated locales.propietario_id successfully');

              // ✅ STEP 3: Update user role to propietario if not already
              if (selectedRole === 'propietario') {
                console.log('[AsignarLocal] 🔧 Updating user role to propietario...');
                
                const { error: roleError } = await supabase
                  .from('usuarios')
                  .update({ 
                    rol_app: 'propietario',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', selectedUser.id);

                if (roleError) {
                  console.error('[AsignarLocal] ⚠️ Error updating user role:', roleError);
                } else {
                  console.log('[AsignarLocal] ✅ Updated user role to propietario');
                }
              }

              // ✅ STEP 4: Subscription is now created automatically by database trigger
              // The trigger ensure_local_subscription_trigger will create a free subscription
              // with welcome credits when the assignment is created
              console.log('[AsignarLocal] ℹ️ Subscription will be created automatically by database trigger');

              // ✅ STEP 5: Send notification to user
              console.log('[AsignarLocal] 📧 Sending notification to user...');
              
              await supabase
                .from('notificaciones')
                .insert({
                  usuario_id: selectedUser.id,
                  tipo: 'sistema',
                  titulo: 'Local Asignado',
                  mensaje: `¡Felicidades! Se te ha asignado el local "${selectedLocal.nombre}" como ${selectedRole}. Ahora puedes gestionarlo desde tu panel. Te hemos regalado 1 Crédito de Evento y 1 Crédito de Destacado para que veas cómo suben tus visitas.`,
                });

              console.log('[AsignarLocal] ✅ Notification sent');

              Alert.alert(
                '✅ Asignación Exitosa',
                `El local "${selectedLocal.nombre}" ha sido asignado a ${selectedUser.nombre} como ${selectedRole}.\n\n✨ Se ha creado una suscripción gratuita con créditos de bienvenida.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Reset form
                      setSelectedUser(null);
                      setSelectedLocal(null);
                      setSelectedRole('propietario');
                      // Reload assignments
                      loadAssignments();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('[AsignarLocal] ❌ Error assigning local:', error);
              Alert.alert('Error', 'No se pudo asignar el local al usuario. Por favor, verifica los logs.');
            } finally {
              setAssigning(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveAssignment = useCallback(async (assignmentId: string, localName: string, userName: string) => {
    Alert.alert(
      'Quitar Asignación',
      `¿Estás seguro de que quieres quitar la asignación del local "${localName}" a ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[AsignarLocal] 🔄 Removing assignment:', assignmentId);

              // Get the assignment details before removing
              const { data: assignment, error: getError } = await supabase
                .from('propietarios_locales')
                .select('local_id, propietario_id')
                .eq('id', assignmentId)
                .single();

              if (getError) throw getError;

              // Deactivate the assignment
              const { error: deactivateError } = await supabase
                .from('propietarios_locales')
                .update({ activo: false })
                .eq('id', assignmentId);

              if (deactivateError) throw deactivateError;

              // ✅ CRITICAL: Also clear locales.propietario_id
              console.log('[AsignarLocal] 🔧 Clearing locales.propietario_id...');
              
              const { error: localClearError } = await supabase
                .from('locales')
                .update({ 
                  propietario_id: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', assignment.local_id);

              if (localClearError) {
                console.error('[AsignarLocal] ⚠️ Error clearing locales.propietario_id:', localClearError);
              } else {
                console.log('[AsignarLocal] ✅ Cleared locales.propietario_id');
              }

              // Deactivate subscription
              const { error: subError } = await supabase
                .from('suscripciones_locales')
                .update({ 
                  estado: 'cancelada',
                  updated_at: new Date().toISOString(),
                })
                .eq('local_id', assignment.local_id)
                .eq('propietario_id', assignment.propietario_id);

              if (subError) {
                console.error('[AsignarLocal] ⚠️ Error deactivating subscription:', subError);
              }

              Alert.alert('✅ Asignación Eliminada', 'El local ahora está libre');
              loadAssignments();
            } catch (error) {
              console.error('[AsignarLocal] ❌ Error removing assignment:', error);
              Alert.alert('Error', 'No se pudo quitar la asignación');
            }
          },
        },
      ]
    );
  }, [loadAssignments]);

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

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Assignments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol ios_icon_name="list.bullet.rectangle" android_material_icon_name="list" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Locales Asignados</Text>
          </View>

          {loadingAssignments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando asignaciones...</Text>
            </View>
          ) : assignments.length === 0 ? (
            <View style={styles.emptyAssignments}>
              <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyAssignmentsText}>No hay locales asignados</Text>
            </View>
          ) : (
            <View style={styles.assignmentsList}>
              {assignments.map((assignment) => (
                <View key={assignment.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeader}>
                    {assignment.locales.imagen_url ? (
                      <Image 
                        source={{ uri: assignment.locales.imagen_url }} 
                        style={styles.assignmentLocalImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.assignmentLocalImage, styles.assignmentLocalImagePlaceholder]}>
                        <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color={colors.white} />
                      </View>
                    )}
                    <View style={styles.assignmentInfo}>
                      <Text style={styles.assignmentLocalName} numberOfLines={1}>
                        {assignment.locales.nombre}
                      </Text>
                      <Text style={styles.assignmentLocalAddress} numberOfLines={1}>
                        {assignment.locales.direccion}
                      </Text>
                      <View style={styles.assignmentMeta}>
                        <View style={styles.assignmentTypeBadge}>
                          <Text style={styles.assignmentTypeText}>{assignment.locales.tipo}</Text>
                        </View>
                        <View style={styles.assignmentRoleBadge}>
                          <Text style={styles.assignmentRoleText}>{assignment.rol}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.assignmentUserSection}>
                    <View style={styles.assignmentUserHeader}>
                      <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={14} color={colors.textSecondary} />
                      <Text style={styles.assignmentUserLabel}>Asignado a:</Text>
                    </View>
                    <View style={styles.assignmentUserInfo}>
                      {assignment.propietario.avatar ? (
                        <Image 
                          source={{ uri: assignment.propietario.avatar }} 
                          style={styles.assignmentUserAvatar}
                        />
                      ) : (
                        <View style={[styles.assignmentUserAvatar, styles.assignmentUserAvatarPlaceholder]}>
                          <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={16} color={colors.white} />
                        </View>
                      )}
                      <View style={styles.assignmentUserDetails}>
                        <Text style={styles.assignmentUserName}>{assignment.propietario.nombre}</Text>
                        <Text style={styles.assignmentUserEmail}>{assignment.propietario.email}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.removeAssignmentButton}
                    onPress={() => handleRemoveAssignment(
                      assignment.id,
                      assignment.locales.nombre,
                      assignment.propietario.nombre
                    )}
                  >
                    <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={16} color="#EF4444" />
                    <Text style={styles.removeAssignmentButtonText}>Quitar Asignación</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

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
            El rol determina los permisos que tendrá sobre el local. Se creará automáticamente una suscripción 
            gratuita con créditos de bienvenida.
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyAssignments: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyAssignmentsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  assignmentsList: {
    gap: 12,
  },
  assignmentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  assignmentLocalImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  assignmentLocalImagePlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentLocalName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  assignmentLocalAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  assignmentMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  assignmentTypeBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  assignmentTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  assignmentRoleBadge: {
    backgroundColor: '#10B981' + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  assignmentRoleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  assignmentUserSection: {
    marginBottom: 12,
  },
  assignmentUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  assignmentUserLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  assignmentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assignmentUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  assignmentUserAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentUserDetails: {
    flex: 1,
  },
  assignmentUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  assignmentUserEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  removeAssignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 8,
  },
  removeAssignmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 24,
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
