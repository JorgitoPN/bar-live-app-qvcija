
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  Modal,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

export interface TaggableUser {
  id: string;
  nombre: string;
  username: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

interface TaggingModalV5Props {
  visible: boolean;
  onClose: () => void;
  onSelectUser: (user: TaggableUser) => void;
  alreadyTagged: TaggableUser[];
}

/**
 * ✅ TAGGING MODAL v141.0 - ANDROID SCALING COMPLETE
 * 
 * CRITICAL FIXES v141.0 (ANDROID ONLY):
 * - ✅ All font sizes use scaleFontSize() for consistency
 * - ✅ All icon sizes use scaleIconSize() for proper proportions
 * - ✅ All text elements properly scaled
 * - ✅ iOS design remains unchanged
 * 
 * Features:
 * - Search both users and locals
 * - Visual differentiation (users vs locals)
 * - Only shows locals with active subscriptions
 * - Keyboard-aware bottom sheet
 * - Prevents duplicate tags
 */

export default function TaggingModalV5({
  visible,
  onClose,
  onSelectUser,
  alreadyTagged,
}: TaggingModalV5Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TaggableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[TaggingModalV5 v141.0] ⌨️ Keyboard shown, height:', e.endCoordinates.height);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[TaggingModalV5 v141.0] ⌨️ Keyboard hidden');
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const searchUsersAndLocals = useCallback(async (query: string) => {
    const cleanQuery = query.trim();
    
    if (cleanQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      console.log('[TaggingModalV5 v141.0] 🔍 Searching for users and locals with query:', cleanQuery);
      
      const results: TaggableUser[] = [];

      // Search users
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .or(`username.ilike.%${cleanQuery}%,nombre.ilike.%${cleanQuery}%`)
          .eq('activo', true)
          .eq('permitir_etiquetas', true)
          .limit(10);

        if (!usersError && usersData) {
          const filteredUsers = usersData.filter(
            (u) => !alreadyTagged.find((t) => t.id === u.id && t.tipo === 'usuario')
          );

          results.push(...filteredUsers.map(u => ({
            id: u.id,
            nombre: u.nombre,
            username: u.username || u.nombre,
            avatar: u.avatar,
            tipo: 'usuario' as const,
          })));
        }
      } catch (error) {
        console.error('[TaggingModalV5 v141.0] Error searching users:', error);
      }

      // Search locals with active subscriptions
      try {
        const { data: localsData, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .ilike('nombre', `%${cleanQuery}%`)
          .eq('activo', true)
          .limit(20);

        if (!localsError && localsData && localsData.length > 0) {
          const localIds = localsData.map(l => l.id);
          
          const { data: subscriptionsData } = await supabase
            .from('suscripciones_locales')
            .select(`
              local_id,
              estado,
              plan_id,
              planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre)
            `)
            .in('local_id', localIds)
            .eq('estado', 'activa');

          if (subscriptionsData) {
            const validLocalIds = subscriptionsData
              .filter(sub => {
                const planName = (sub.planes_suscripcion as any)?.nombre;
                return planName === 'estandar' || planName === 'premium';
              })
              .map(sub => sub.local_id);

            const filteredLocalsData = localsData
              .filter(local => validLocalIds.includes(local.id))
              .filter(l => !alreadyTagged.find((t) => t.id === l.id && t.tipo === 'local'));

            results.push(...filteredLocalsData.map(l => ({
              id: l.id,
              nombre: l.nombre,
              username: l.nombre,
              avatar: l.imagen_url,
              tipo: 'local' as const,
            })));
          }
        }
      } catch (error) {
        console.error('[TaggingModalV5 v141.0] Error searching locals:', error);
      }

      console.log('[TaggingModalV5 v141.0] ✅ Found', results.length, 'results');
      setSuggestions(results);
    } catch (error) {
      console.error('[TaggingModalV5 v141.0] Error in searchUsersAndLocals:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [alreadyTagged]);

  useEffect(() => {
    if (visible && searchQuery.length > 0) {
      const timeoutId = setTimeout(() => {
        searchUsersAndLocals(searchQuery);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, visible, searchUsersAndLocals]);

  const handleClose = () => {
    setSearchQuery('');
    setSuggestions([]);
    Keyboard.dismiss();
    onClose();
  };

  const handleSelectUser = (user: TaggableUser) => {
    onSelectUser(user);
    setSearchQuery('');
    setSuggestions([]);
  };

  if (!visible) {
    return null;
  }

  // ✅ CRITICAL FIX: Calculate modal height to anchor DIRECTLY to keyboard
  const HEADER_RESERVED_SPACE = Platform.OS === 'ios' ? 100 : 80;
  const maxAvailableHeight = SCREEN_HEIGHT - keyboardHeight - HEADER_RESERVED_SPACE;
  
  const idealHeight = SCREEN_HEIGHT * 0.5;
  const modalHeight = Math.min(idealHeight, maxAvailableHeight);

  return (
    <Modal
      visible={visible}
      transparent={Platform.OS === 'android' ? false : true}
      animationType="fade"
      presentationStyle={Platform.OS === 'android' ? 'fullScreen' : 'pageSheet'}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={[styles.modalOverlay, Platform.OS === 'android' && styles.modalOverlayAndroid]}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlayTouchable}>
              <View 
                style={[
                  styles.modalContent,
                  Platform.OS === 'android' && styles.modalContentAndroid,
                  Platform.OS !== 'android' && { 
                    height: modalHeight,
                    bottom: keyboardHeight,
                  }
                ]}
                onStartShouldSetResponder={() => true}
              >
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <IconSymbol 
                      ios_icon_name="person.crop.circle.badge.plus" 
                      android_material_icon_name="person_add" 
                      size={scaleIconSize(20)} 
                      color={colors.primary} 
                    />
                    <Text style={[styles.modalTitle, { fontSize: scaleFontSize(18) }]}>Busca personas o locales</Text>
                  </View>
                  <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                    <IconSymbol 
                      ios_icon_name="xmark.circle.fill" 
                      android_material_icon_name="cancel" 
                      size={scaleIconSize(24)} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <IconSymbol 
                    ios_icon_name="magnifyingglass" 
                    android_material_icon_name="search" 
                    size={scaleIconSize(20)} 
                    color={colors.textSecondary} 
                  />
                  <TextInput
                    style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
                    placeholder="Escribe para ver resultados..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                      }} 
                      activeOpacity={0.7}
                    >
                      <IconSymbol 
                        ios_icon_name="xmark.circle.fill" 
                        android_material_icon_name="cancel" 
                        size={scaleIconSize(20)} 
                        color={colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Results */}
                <ScrollView
                  style={styles.resultsContainer}
                  contentContainerStyle={styles.resultsContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.loadingText, { fontSize: scaleFontSize(14) }]}>Buscando...</Text>
                    </View>
                  ) : suggestions.length > 0 ? (
                    <React.Fragment>
                      {suggestions.map((item) => (
                        <TouchableOpacity
                          key={`${item.id}-${item.tipo}`}
                          style={styles.resultItem}
                          onPress={() => handleSelectUser(item)}
                          activeOpacity={0.7}
                        >
                          {item.avatar ? (
                            <Image source={{ uri: item.avatar }} style={styles.resultAvatar} />
                          ) : (
                            <View style={[styles.resultAvatar, styles.avatarPlaceholder]}>
                              <IconSymbol 
                                ios_icon_name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                                android_material_icon_name={item.tipo === 'local' ? 'business' : 'person'}
                                size={scaleIconSize(20)} 
                                color={colors.textSecondary} 
                              />
                            </View>
                          )}
                          <View style={styles.resultInfo}>
                            <Text style={[styles.resultName, { fontSize: scaleFontSize(16) }]}>{item.nombre}</Text>
                            <View style={styles.resultTypeContainer}>
                              {item.tipo === 'local' ? (
                                <>
                                  <IconSymbol 
                                    ios_icon_name="building.2.fill" 
                                    android_material_icon_name="business" 
                                    size={scaleIconSize(14)} 
                                    color="#F59E0B" 
                                  />
                                  <Text style={[styles.resultType, { fontSize: scaleFontSize(14), color: '#F59E0B' }]}>Local</Text>
                                </>
                              ) : (
                                <Text style={[styles.resultType, { fontSize: scaleFontSize(14) }]}>@{item.username}</Text>
                              )}
                            </View>
                          </View>
                          <IconSymbol 
                            ios_icon_name="plus.circle.fill" 
                            android_material_icon_name="add_circle" 
                            size={scaleIconSize(24)} 
                            color={item.tipo === 'local' ? '#F59E0B' : colors.primary} 
                          />
                        </TouchableOpacity>
                      ))}
                    </React.Fragment>
                  ) : searchQuery.length >= 1 ? (
                    <View style={styles.emptyState}>
                      <IconSymbol 
                        ios_icon_name="magnifyingglass" 
                        android_material_icon_name="search" 
                        size={scaleIconSize(48)} 
                        color={colors.textSecondary} 
                      />
                      <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>No se encontraron resultados</Text>
                      <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
                        Intenta con otro nombre
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <IconSymbol 
                        ios_icon_name="person.2.fill" 
                        android_material_icon_name="people" 
                        size={scaleIconSize(48)} 
                        color={colors.textSecondary} 
                      />
                      <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>Busca personas o locales</Text>
                      <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
                        Escribe para ver resultados
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlayAndroid: {
    backgroundColor: colors.background,
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    overflow: 'hidden',
  },
  modalContentAndroid: {
    position: 'relative',
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  resultTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultType: {
    color: colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
