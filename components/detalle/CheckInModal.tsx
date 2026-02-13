
/**
 * ✅ CHECK-IN MODAL v59.0 - ANDROID BUTTON POSITIONING FIX + HOOKS FIX
 * 
 * CRITICAL CHANGES v59.0:
 * - ✅ HOOKS FIX: Moved useMemo calls before early returns
 * - ✅ MINIMAL FOOTER PADDING: Buttons positioned just above navigation buttons
 * - ✅ REDUCED SPACING: Removed excessive bottom padding on Android
 * - ✅ PROPER POSITIONING: Buttons are now accessible and well-positioned
 * - ✅ SAFE AREAS: Respects system UI with minimal padding (8px + insets)
 * - ✅ RESULT: Buttons sit comfortably above phone's tactile navigation buttons
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function CheckInModal({ visible, localId, localName, onClose, onCheckInComplete }: CheckInModalProps) {
  const { user } = useAuth();
  const { currentMode, setCurrentMode, activeProfileType, activeLocalData } = useMode();
  const insets = useSafeAreaInsets();
  
  const [visibility, setVisibility] = useState<'followers' | 'all_users' | 'specific_users'>('followers');
  const [sendNotifications, setSendNotifications] = useState(false);
  const [specificUsers, setSpecificUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isClientMode = currentMode === 'cliente' && activeProfileType === 'cliente';

  // ✅ CRITICAL FIX v59.0: Move useMemo calls BEFORE early returns
  const headerPaddingTop = useMemo(() => {
    return Platform.OS === 'android' 
      ? Math.max(insets.top + 20, 60)
      : Math.max(insets.top + 10, 60);
  }, [insets.top]);
  
  const footerPaddingBottom = useMemo(() => {
    return Platform.OS === 'android' 
      ? Math.max(insets.bottom + 8, 16) // ✅ MINIMAL: Just 8px + safe area
      : Math.max(insets.bottom + 20, 20);
  }, [insets.bottom]);
  
  const scrollContentPaddingBottom = useMemo(() => {
    return Platform.OS === 'android' 
      ? 160 + Math.max(insets.bottom, 8) // ✅ REDUCED: Less padding
      : 140;
  }, [insets.bottom]);

  console.log('[CheckInModal v59.0] 🎭 Mode check:', {
    currentMode,
    activeProfileType,
    isClientMode,
    visible,
    insets,
  });

  console.log('[CheckInModal v59.0] 📐 Layout calculations:', {
    platform: Platform.OS,
    insets,
    headerPaddingTop,
    footerPaddingBottom,
    scrollContentPaddingBottom,
  });

  useEffect(() => {
    if (visible && !isClientMode) {
      console.log('[CheckInModal v59.0] ❌ Not in client mode, showing error');
      Alert.alert(
        'No Disponible',
        'La función "Estoy en este local" solo está disponible en modo cliente.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  }, [visible, isClientMode, onClose]);

  useEffect(() => {
    if (visible && !user) {
      console.log('[CheckInModal v59.0] ❌ User not authenticated, showing error');
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
      console.error('[CheckInModal v59.0] Error searching users:', error);
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
      console.log('[CheckInModal v59.0] Checking for existing check-in...');

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

      await performCheckIn();
    } catch (error) {
      console.error('[CheckInModal v59.0] Error creating check-in:', error);
      Alert.alert('Error', 'No se pudo realizar el check-in');
      setSubmitting(false);
    }
  };

  const performCheckIn = async () => {
    if (!user) return;

    try {
      console.log('[CheckInModal v59.0] Creating check-in...');

      const { error: deleteError } = await supabase
        .from('check_ins')
        .delete()
        .eq('usuario_id', user.id);

      if (deleteError) throw deleteError;

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

      console.log('[CheckInModal v59.0] ✅ Check-in created successfully');

      if (sendNotifications) {
        console.log('[CheckInModal v59.0] Sending notifications...');
        
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
            console.error('[CheckInModal v59.0] Error sending notifications:', notifError);
          } else {
            console.log('[CheckInModal v59.0] ✅ Notifications sent to', recipientIds.length, 'users');
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
      console.error('[CheckInModal v59.0] Error creating check-in:', error);
      Alert.alert('Error', 'No se pudo realizar el check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !isClientMode) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={[styles.fullScreenContainer, Platform.OS === 'android' && { paddingTop: 0 }]}>
        <View style={styles.modalHeader}>
          <View style={[styles.headerContent, { paddingTop: headerPaddingTop }]}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <IconSymbol 
                ios_icon_name="chevron.left" 
                android_material_icon_name="arrow_back" 
                size={scaleIconSize(24)} 
                color={colors.text} 
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Estoy en este local</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView 
          style={styles.modalBody} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollContentPaddingBottom }]}
        >
          <View style={styles.localInfoCard}>
            <IconSymbol 
              ios_icon_name="mappin.circle.fill" 
              android_material_icon_name="location_on" 
              size={scaleIconSize(24)} 
              color={colors.primary} 
            />
            <Text style={[styles.localInfoText, { fontSize: scaleFontSize(16) }]}>{localName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>¿Con quién compartir?</Text>
            <Text style={[styles.sectionSubtitle, { fontSize: scaleFontSize(13) }]}>Elige quién puede ver que estás en este local</Text>

            <TouchableOpacity
              style={[styles.visibilityOption, visibility === 'followers' && styles.visibilityOptionActive]}
              onPress={() => setVisibility('followers')}
            >
              <View style={styles.visibilityOptionLeft}>
                <IconSymbol 
                  ios_icon_name="person.2.fill" 
                  android_material_icon_name="people" 
                  size={scaleIconSize(24)} 
                  color={visibility === 'followers' ? colors.primary : colors.textSecondary} 
                />
                <View style={styles.visibilityOptionText}>
                  <Text style={[
                    styles.visibilityOptionTitle, 
                    { fontSize: scaleFontSize(15) },
                    visibility === 'followers' && styles.visibilityOptionTitleActive
                  ]}>
                    Mis seguidores
                  </Text>
                  <Text style={[styles.visibilityOptionSubtitle, { fontSize: scaleFontSize(12) }]}>
                    Solo tus seguidores verán que estás aquí
                  </Text>
                </View>
              </View>
              {visibility === 'followers' && (
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check_circle" 
                  size={scaleIconSize(24)} 
                  color={colors.primary} 
                />
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
                  size={scaleIconSize(24)} 
                  color={visibility === 'all_users' ? colors.primary : colors.textSecondary} 
                />
                <View style={styles.visibilityOptionText}>
                  <Text style={[
                    styles.visibilityOptionTitle,
                    { fontSize: scaleFontSize(15) },
                    visibility === 'all_users' && styles.visibilityOptionTitleActive
                  ]}>
                    Todos los usuarios
                  </Text>
                  <Text style={[styles.visibilityOptionSubtitle, { fontSize: scaleFontSize(12) }]}>
                    Cualquier usuario de BarLive podrá verlo
                  </Text>
                </View>
              </View>
              {visibility === 'all_users' && (
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check_circle" 
                  size={scaleIconSize(24)} 
                  color={colors.primary} 
                />
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
                  size={scaleIconSize(24)} 
                  color={visibility === 'specific_users' ? colors.primary : colors.textSecondary} 
                />
                <View style={styles.visibilityOptionText}>
                  <Text style={[
                    styles.visibilityOptionTitle,
                    { fontSize: scaleFontSize(15) },
                    visibility === 'specific_users' && styles.visibilityOptionTitleActive
                  ]}>
                    Usuarios específicos
                  </Text>
                  <Text style={[styles.visibilityOptionSubtitle, { fontSize: scaleFontSize(12) }]}>
                    Selecciona usuarios concretos
                  </Text>
                </View>
              </View>
              {visibility === 'specific_users' && (
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check_circle" 
                  size={scaleIconSize(24)} 
                  color={colors.primary} 
                />
              )}
            </TouchableOpacity>
          </View>

          {visibility === 'specific_users' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(16) }]}>Seleccionar Usuarios</Text>
              
              <View style={styles.searchContainer}>
                <IconSymbol 
                  ios_icon_name="magnifyingglass" 
                  android_material_icon_name="search" 
                  size={scaleIconSize(20)} 
                  color={colors.textSecondary} 
                />
                <TextInput
                  style={[styles.searchInput, { fontSize: scaleFontSize(15) }]}
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
                          <IconSymbol 
                            ios_icon_name="person.fill" 
                            android_material_icon_name="person" 
                            size={scaleIconSize(20)} 
                            color={colors.headerText} 
                          />
                        </View>
                        <View>
                          <Text style={[styles.userName, { fontSize: scaleFontSize(15) }]}>{searchUser.nombre}</Text>
                          {searchUser.username && (
                            <Text style={[styles.userUsername, { fontSize: scaleFontSize(13) }]}>@{searchUser.username}</Text>
                          )}
                        </View>
                      </View>
                      <IconSymbol 
                        ios_icon_name="plus.circle.fill" 
                        android_material_icon_name="add_circle" 
                        size={scaleIconSize(24)} 
                        color={colors.primary} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {specificUsers.length > 0 && (
                <View style={styles.selectedUsersContainer}>
                  <Text style={[styles.selectedUsersTitle, { fontSize: scaleFontSize(14) }]}>
                    Usuarios seleccionados ({specificUsers.length})
                  </Text>
                  {specificUsers.map(selectedUser => (
                    <View key={selectedUser.id} style={styles.selectedUserChip}>
                      <Text style={[styles.selectedUserName, { fontSize: scaleFontSize(14) }]}>{selectedUser.nombre}</Text>
                      <TouchableOpacity onPress={() => removeSpecificUser(selectedUser.id)}>
                        <IconSymbol 
                          ios_icon_name="xmark.circle.fill" 
                          android_material_icon_name="cancel" 
                          size={scaleIconSize(20)} 
                          color={colors.textSecondary} 
                        />
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
                  size={scaleIconSize(24)} 
                  color={sendNotifications ? colors.primary : colors.textSecondary} 
                />
                <View style={styles.notificationToggleText}>
                  <Text style={[
                    styles.notificationToggleTitle,
                    { fontSize: scaleFontSize(15) },
                    sendNotifications && styles.notificationToggleTitleActive
                  ]}>
                    Enviar notificaciones
                  </Text>
                  <Text style={[styles.notificationToggleSubtitle, { fontSize: scaleFontSize(12) }]}>
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
            <IconSymbol 
              ios_icon_name="lock.shield.fill" 
              android_material_icon_name="security" 
              size={scaleIconSize(20)} 
              color={colors.primary} 
            />
            <Text style={[styles.privacyNoteText, { fontSize: scaleFontSize(13) }]}>
              No se comparte tu ubicación GPS. Solo se muestra el local que seleccionaste manualmente.
            </Text>
          </View>
        </ScrollView>

        {/* ✅ CRITICAL FIX v59.0: Minimal padding to position buttons just above navigation */}
        <View style={[styles.modalFooter, { paddingBottom: footerPaddingBottom }]}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check_circle" 
                  size={scaleIconSize(20)} 
                  color={colors.white} 
                />
                <Text style={[styles.confirmButtonText, { fontSize: scaleFontSize(16) }]}>Confirmar Check-in</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelButtonText, { fontSize: scaleFontSize(16) }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      android: {
        minHeight: '100%',
        minWidth: '100%',
      },
    }),
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    ...Platform.select({
      android: {
        paddingTop: 0,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
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
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
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
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  visibilityOptionTitleActive: {
    color: colors.primary,
  },
  visibilityOptionSubtitle: {
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
    fontWeight: '600',
    color: colors.text,
  },
  userUsername: {
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
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  notificationToggleTitleActive: {
    color: colors.primary,
  },
  notificationToggleSubtitle: {
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
    color: colors.text,
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
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
    fontWeight: '700',
    color: colors.white,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
