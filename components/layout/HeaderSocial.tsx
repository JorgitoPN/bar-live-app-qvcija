
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useRouter } from 'expo-router';

interface HeaderSocialProps {
  unreadNotifications?: number;
  unreadMessages?: number;
  onSearchPress?: () => void;
  onCreatePress?: () => void;
}

export default function HeaderSocial({
  unreadNotifications = 0,
  unreadMessages = 0,
  onSearchPress,
  onCreatePress,
}: HeaderSocialProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, setCurrentMode } = useMode();
  const [showModeSelector, setShowModeSelector] = useState(false);

  const userRole = user?.rol_app || 'cliente';
  const canSwitchMode = userRole === 'propietario' || userRole === 'admin';

  const getModeLabel = (mode: 'cliente' | 'propietario' | 'admin') => {
    switch (mode) {
      case 'cliente':
        return 'Cliente';
      case 'propietario':
        return 'Propietario';
      case 'admin':
        return 'Admin';
      default:
        return 'Cliente';
    }
  };

  const getModeIcon = (mode: 'cliente' | 'propietario' | 'admin') => {
    switch (mode) {
      case 'cliente':
        return 'person.fill';
      case 'propietario':
        return 'building.2.fill';
      case 'admin':
        return 'shield.fill';
      default:
        return 'person.fill';
    }
  };

  const availableModes: ('cliente' | 'propietario' | 'admin')[] = [];
  availableModes.push('cliente');
  if (userRole === 'propietario' || userRole === 'admin') {
    availableModes.push('propietario');
  }
  if (userRole === 'admin') {
    availableModes.push('admin');
  }

  const handleModeChange = async (mode: 'cliente' | 'propietario' | 'admin') => {
    await setCurrentMode(mode);
    setShowModeSelector(false);
  };

  const formatBadgeCount = (count: number): string => {
    if (count > 99) return '99+';
    return count.toString();
  };

  return (
    <>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={styles.headerTitle}>Social</Text>
            {canSwitchMode && (
              <TouchableOpacity
                style={styles.modeSelectorButton}
                onPress={() => setShowModeSelector(true)}
                activeOpacity={0.7}
              >
                <IconSymbol name={getModeIcon(currentMode)} size={16} color={colors.headerText} />
                <Text style={styles.modeSelectorText}>{getModeLabel(currentMode)}</Text>
                <IconSymbol name="chevron.down" size={14} color={colors.headerText} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/chats')}
              activeOpacity={0.7}
            >
              <IconSymbol name="message.fill" size={24} color={colors.headerText} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {formatBadgeCount(unreadMessages)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/notificaciones')}
              activeOpacity={0.7}
            >
              <IconSymbol name="bell.fill" size={24} color={colors.headerText} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {formatBadgeCount(unreadNotifications)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {onSearchPress && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onSearchPress}
                activeOpacity={0.7}
              >
                <IconSymbol name="magnifyingglass" size={24} color={colors.headerText} />
              </TouchableOpacity>
            )}

            {onCreatePress && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onCreatePress}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={24} color={colors.headerText} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Mode Selector Modal */}
      <Modal
        visible={showModeSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModeSelector(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowModeSelector(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Modo</Text>
              <TouchableOpacity onPress={() => setShowModeSelector(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {availableModes.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeOption,
                    currentMode === mode && styles.modeOptionActive,
                  ]}
                  onPress={() => handleModeChange(mode)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.modeIconContainer,
                    currentMode === mode && styles.modeIconContainerActive,
                  ]}>
                    <IconSymbol 
                      name={getModeIcon(mode)} 
                      size={24} 
                      color={currentMode === mode ? colors.headerText : colors.primary} 
                    />
                  </View>
                  <View style={styles.modeInfo}>
                    <Text style={[
                      styles.modeLabel,
                      currentMode === mode && styles.modeLabelActive,
                    ]}>
                      {getModeLabel(mode)}
                    </Text>
                    <Text style={styles.modeDescription}>
                      {mode === 'cliente' && 'Vista de usuario normal'}
                      {mode === 'propietario' && 'Gestiona tus locales'}
                      {mode === 'admin' && 'Panel de administración'}
                    </Text>
                  </View>
                  {currentMode === mode && (
                    <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  modeSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeIconContainerActive: {
    backgroundColor: colors.primary,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modeLabelActive: {
    color: colors.primary,
  },
  modeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
