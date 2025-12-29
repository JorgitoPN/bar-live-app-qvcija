
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

interface CheckInModalProps {
  visible: boolean;
  localId: string;
  localName: string;
  onClose: () => void;
  onCheckInComplete: () => void;
}

interface User {
  id: string;
  nombre: string;
  username: string | null;
  avatar: string | null;
}

/**
 * ✅ CHECK-IN MODAL v50.0 - LOGIN REQUIRED + CLIENT MODE ONLY
 * 
 * CRITICAL FIXES v50.0:
 * - ✅ Login required to access "Estoy en este local"
 * - ✅ Only available in client mode (not for local profiles or owner mode)
 * - ✅ Shows login prompt if user not authenticated
 * - ✅ Hides option for local profiles and owner mode
 */

export default function CheckInModal({ visible, localId, localName, onClose, onCheckInComplete }: CheckInModalProps) {
  const { user } = useAuth();
  const { currentMode, activeProfileType } = useMode();
  const [visibility, setVisibility] = useState<'followers' | 'all_users' | 'specific_users'>('followers');
  const [sendNotifications, setSendNotifications] = useState(false);
  const [specificUsers, setSpecificUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ CRITICAL FIX v50.0: Check if user is in client mode
  const isClientMode = currentMode === 'cliente' && activeProfileType === 'user';

  // ✅ CRITICAL FIX v50.0: Show error if not in client mode
  useEffect(() => {
    if (visible && !isClientMode) {
      Alert.alert(
        'No Disponible',
        'La función "Estoy en este local" solo está disponible en modo cliente.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  }, [visible, isClientMode, onClose]);

  // ✅ CRITICAL FIX v50.0: Show error if user not authenticated
  useEffect(() => {
    if (visible && !user) {
      Alert.alert(
        'Inicia Sesión',
        'Debes iniciar sesión para usar la función "Estoy en este local".',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  }, [visible, user, onClose]);

  const searchUsers = useCallback(async (query: string) => {
    if (!user) return;

    setSearching(true);
    try {
      const { data: followers, error } = await supabase
        .from('seguidores')
        .select(`
          seguido_id,
          usuarios!seguidores_seguido_id_fkey(id, nombre, username, avatar)
        `)
        .eq('seguidor_id', user.id)
        .ilike('usuarios.nombre', `%${query}%`)
        .limit(10);

      if (error) throw error;

      const users = followers
        ?.map((f: any) => f.usuarios)
        .filter((u: any) => u && !specificUsers.some(su => su.id === u.id)) || [];

      setSearchResults(users);
    } catch (error) {
      console.error('[CheckInModal v50.0] Error searching users:', error);
    } finally {
      setSearching(false);
    }
  }, [user, specificUsers]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchUsers]);

  const addSpecificUser = (user: User) => {
    if (!specificUsers.some(u => u.id === user.id)) {
      setSpecificUsers([...specificUsers, user]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeSpecificUser = (userId: string) => {
    setSpecificUsers(specificUsers.filter(u => u.id !== userId));
  };

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    if (!isClientMode) {
      Alert.alert('Error', 'Esta función solo está disponible en modo cliente');
      return;
    }

    if (visibility === 'specific_users' && specificUsers.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un usuario');
      return;
    }

    setSubmitting(true);

    try {
      console.log('[CheckInModal v50.0] Checking for existing check-in...');

      // Check if user is already checked in to another local
      const { data: existingCheckIn, error: checkError } = await supabase
        .from('check_ins')
        .select(`
          id,
          local_id,
          locales!check_ins_local_id_fkey(nombre)
        `)
        .eq('usuario_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // If user is checked in to a different local, show confirmation
      if (existingCheckIn && existingCheckIn.local_id !== localId) {
        const previousLocalName = existingCheckIn.locales?.nombre || 'otro local';
        
        setSubmitting(false);
        
        Alert.alert(
          'Cambio de Local',
          `Estás intentando registrarte en otro local. Para confirmar, aceptarás salir de "${previousLocalName}", ya que no es posible estar en dos locales a la vez.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Confirmar',
              onPress: async () => {
                setSubmitting(true);
                await performCheckIn();
              },
            },
          ]
        );
        return;
      }

      // No existing check-in or same local, proceed
      await performCheckIn();
    } catch (error) {
      console.error('[CheckInModal v50.0] Error creating check-in:', error);
      Alert.alert('Error', 'No se pudo realizar el check-in');
      setSubmitting(false);
    }
  };

  const performCheckIn = async () => {
    if (!user) return;

    try {
      console.log('[CheckInModal v50.0] Creating check-in...');

      // Delete any existing check-ins for this user
      const { error: deleteError } = await supabase
        .from('check_ins')
        .delete()
        .eq('usuario_id', user.id);

      if (deleteError) throw deleteError;

      // Create new check-in
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert({
          usuario_id: user.id,
          local_id: localId,
          visibility: visibility,
          send_notifications: sendNotifications,
          specific_user_ids: visibility === 'specific_users' ? specificUsers.map(u => u.id) : [],
        });

      if (insertError) throw insertError;

      console.log('[CheckInModal v50.0] ✅ Check-in created successfully');

      if (sendNotifications) {
        console.log('[CheckInModal v50.0] Sending notifications...');
        
        let recipientIds: string[] = [];

        if (visibility === 'all_users') {
          const { data: allUsers } = await supabase
            .from('usuarios')
            .select('id')
            .neq('id', user.id)
            .limit(1000);

          recipientIds = allUsers?.map(u => u.id) || [];
        } else if (visibility === 'followers') {
          const { data: followers } = await supabase
            .from('seguidores')
            .select('seguidor_id')
            .eq('seguido_id', user.id);

          recipientIds = followers?.map(f => f.seguidor_id) || [];
        } else if (visibility === 'specific_users') {
          recipientIds = specificUsers.map(u => u.id);
        }

        if (recipientIds.length > 0) {
          const notifications = recipientIds.map(recipientId => ({
            usuario_id: recipientId,
            tipo: 'sistema',
            titulo: `${user.nombre} está en ${localName}`,
            mensaje: `${user.nombre} está ahora en ${localName}`,
            usuario_origen_id: user.id,
          }));

          const { error: notifError } = await supabase
            .from('notificaciones')
            .insert(notifications);

          if (notifError) {
            console.error('[CheckInModal v50.0] Error sending notifications:', notifError);
          } else {
            console.log('[CheckInModal v50.0] ✅ Notifications sent to', recipientIds.length, 'users');
          }
        }
      }

      Alert.alert(
        '✅ Check-in Realizado',
        `Ahora estás en ${localName}`,
        [{ text: 'OK', onPress: () => {
          onCheckInComplete();
          onClose();
        }}]
      );
    } catch (error) {
      console.error('[CheckInModal v50.0] Error creating check-in:', error);
      Alert.alert('Error', 'No se pudo realizar el check-in');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ CRITICAL FIX v50.0: Don't render modal if not in client mode or not authenticated
  if (!user || !isClientMode) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Estoy en este local</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.localInfoCard}>
              <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={24} color={colors.primary} />
              <Text style={styles.localInfoText}>{localName}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Con quién compartir?</Text>
              <Text style={styles.sectionSubtitle}>Elige quién puede ver que estás en este local</Text>

              <TouchableOpacity
                style={[styles.visibilityOption, visibility === 'followers' && styles.visibilityOptionActive]}
                onPress={() => setVisibility('followers')}
              >
                <View style={styles.visibilityOptionLeft}>
                  <IconSymbol 
                    ios_icon_name="person.2.fill" 
                    android_material_icon_name="people" 
                    size={24} 
                    color={visibility === 'followers' ? colors.primary : colors.textSecondary} 
                  />
                  <View style={styles.visibilityOptionText}>
                    <Text style={[styles.visibilityOptionTitle, visibility === 'followers' && styles.visibilityOptionTitleActive]}>
                      Mis seguidores
                    </Text>
                    <Text style={styles.visibilityOptionSubtitle}>Solo tus seguidores verán que estás aquí</Text>
                  </View>
                </View>
                {visibility === 'followers' && (
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visibilityOption, visibility === 'all_users' && styles.visibilityOptionActive]}
                onPress={() => setVisibility('all_users')}
              >
                <View style={styles.visibilityOptionLeft}>
                  <IconSymbol 
                    ios_icon_name="globe" 
                    android_material_icon_name="public" 
                    size={24} 
                    color={visibility === 'all_users' ? colors.primary : colors.textSecondary} 
                  />
                  <View style={styles.visibilityOptionText}>
                    <Text style={[styles.visibilityOptionTitle, visibility === 'all_users' && styles.visibilityOptionTitleActive]}>
                      Todos los usuarios
                    </Text>
                    <Text style={styles.visibilityOptionSubtitle}>Cualquier usuario de BarLive podrá verlo</Text>
                  </View>
                </View>
                {visibility === 'all_users' && (
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visibilityOption, visibility === 'specific_users' && styles.visibilityOptionActive]}
                onPress={() => setVisibility('specific_users')}
              >
                <View style={styles.visibilityOptionLeft}>
                  <IconSymbol 
                    ios_icon_name="person.crop.circle.badge.checkmark" 
                    android_material_icon_name="person_add" 
                    size={24} 
                    color={visibility === 'specific_users' ? colors.primary : colors.textSecondary} 
                  />
                  <View style={styles.visibilityOptionText}>
                    <Text style={[styles.visibilityOptionTitle, visibility === 'specific_users' && styles.visibilityOptionTitleActive]}>
                      Usuarios específicos
                    </Text>
                    <Text style={styles.visibilityOptionSubtitle}>Selecciona usuarios concretos</Text>
                  </View>
                </View>
                {visibility === 'specific_users' && (
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {visibility === 'specific_users' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Seleccionar Usuarios</Text>
                
                <View style={styles.searchContainer}>
                  <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Buscar seguidores..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  {searching && <ActivityIndicator size="small" color={colors.primary} />}
                </View>

                {searchResults.length > 0 && (
                  <View style={styles.searchResultsContainer}>
                    {searchResults.map(searchUser => (
                      <TouchableOpacity
                        key={searchUser.id}
                        style={styles.userSearchResult}
                        onPress={() => addSpecificUser(searchUser)}
                      >
                        <View style={styles.userSearchResultLeft}>
                          <View style={styles.userAvatar}>
                            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={colors.headerText} />
                          </View>
                          <View>
                            <Text style={styles.userName}>{searchUser.nombre}</Text>
                            {searchUser.username && (
                              <Text style={styles.userUsername}>@{searchUser.username}</Text>
                            )}
                          </View>
                        </View>
                        <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {specificUsers.length > 0 && (
                  <View style={styles.selectedUsersContainer}>
                    <Text style={styles.selectedUsersTitle}>Usuarios seleccionados ({specificUsers.length})</Text>
                    {specificUsers.map(selectedUser => (
                      <View key={selectedUser.id} style={styles.selectedUserChip}>
                        <Text style={styles.selectedUserName}>{selectedUser.nombre}</Text>
                        <TouchableOpacity onPress={() => removeSpecificUser(selectedUser.id)}>
                          <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.notificationToggle}
                onPress={() => setSendNotifications(!sendNotifications)}
              >
                <View style={styles.notificationToggleLeft}>
                  <IconSymbol 
                    ios_icon_name="bell.fill" 
                    android_material_icon_name="notifications" 
                    size={24} 
                    color={sendNotifications ? colors.primary : colors.textSecondary} 
                  />
                  <View style={styles.notificationToggleText}>
                    <Text style={[styles.notificationToggleTitle, sendNotifications && styles.notificationToggleTitleActive]}>
                      Enviar notificaciones
                    </Text>
                    <Text style={styles.notificationToggleSubtitle}>
                      Notificar a los usuarios seleccionados
                    </Text>
                  </View>
                </View>
                <View style={[styles.toggle, sendNotifications && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, sendNotifications && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.privacyNote}>
              <IconSymbol ios_icon_name="lock.shield.fill" android_material_icon_name="security" size={20} color={colors.primary} />
              <Text style={styles.privacyNoteText}>
                No se comparte tu ubicación GPS. Solo se muestra el local que seleccionaste manualmente.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                  <Text style={styles.confirmButtonText}>Confirmar Check-in</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  localInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  localInfoText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  visibilityOptionActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  visibilityOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  visibilityOptionText: {
    flex: 1,
  },
  visibilityOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  visibilityOptionTitleActive: {
    color: colors.primary,
  },
  visibilityOptionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  searchResultsContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  userSearchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  userSearchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  userUsername: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectedUsersContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectedUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  selectedUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  notificationToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notificationToggleText: {
    flex: 1,
  },
  notificationToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  notificationToggleTitleActive: {
    color: colors.primary,
  },
  notificationToggleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardBorder,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
