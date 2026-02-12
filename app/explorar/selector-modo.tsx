
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { useMode } from '@/contexts/ModeContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ✅ ANDROID MODE SELECTOR FULL SCREEN PAGE v1.0
 * 
 * REQUERIMIENTO 1: Modal de selección de modo transformado en pantalla completa
 * 
 * CAMBIOS:
 * - ✅ Pantalla completa en lugar de modal para Android
 * - ✅ Mejor usabilidad y coherencia con patrones de navegación Android
 * - ✅ Navegación con botón de retroceso nativo
 * - ✅ Diseño limpio y espacioso
 */
export default function SelectorModoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, setCurrentMode } = useMode();

  const handleModeChange = async (newMode: 'cliente' | 'propietario' | 'admin') => {
    try {
      console.log('[SelectorModo Android] 🔄 Changing mode to:', newMode);
      await setCurrentMode(newMode);
      console.log('[SelectorModo Android] ✅ Mode changed successfully');
      router.back();
    } catch (error) {
      console.error('[SelectorModo Android] ❌ Error changing mode:', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={scaleIconSize(24)} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>Seleccionar Rol</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { fontSize: scaleFontSize(15) }]}>
          Elige con qué rol quieres navegar en la aplicación
        </Text>

        <View style={styles.modesContainer}>
          <TouchableOpacity
            style={[
              styles.modeCard,
              currentMode === 'cliente' && styles.modeCardActive
            ]}
            onPress={() => handleModeChange('cliente')}
            activeOpacity={0.7}
          >
            <View style={styles.modeCardContent}>
              <View style={[
                styles.modeIconContainer,
                currentMode === 'cliente' && styles.modeIconContainerActive
              ]}>
                <IconSymbol 
                  ios_icon_name="person.fill" 
                  android_material_icon_name="person" 
                  size={scaleIconSize(32)} 
                  color={currentMode === 'cliente' ? colors.white : colors.primary} 
                />
              </View>
              <View style={styles.modeTextContainer}>
                <Text style={[
                  styles.modeTitle,
                  { fontSize: scaleFontSize(18) },
                  currentMode === 'cliente' && styles.modeTitleActive
                ]}>
                  Cliente
                </Text>
                <Text style={[
                  styles.modeDescription,
                  { fontSize: scaleFontSize(14) },
                  currentMode === 'cliente' && styles.modeDescriptionActive
                ]}>
                  Explora locales, eventos y conecta con amigos
                </Text>
              </View>
            </View>
            {currentMode === 'cliente' && (
              <View style={styles.checkmarkContainer}>
                <IconSymbol 
                  ios_icon_name="checkmark.circle.fill" 
                  android_material_icon_name="check_circle" 
                  size={scaleIconSize(28)} 
                  color={colors.primary} 
                />
              </View>
            )}
          </TouchableOpacity>

          {(user?.rol_app === 'propietario' || user?.rol_app === 'admin') && (
            <TouchableOpacity
              style={[
                styles.modeCard,
                currentMode === 'propietario' && styles.modeCardActive
              ]}
              onPress={() => handleModeChange('propietario')}
              activeOpacity={0.7}
            >
              <View style={styles.modeCardContent}>
                <View style={[
                  styles.modeIconContainer,
                  currentMode === 'propietario' && styles.modeIconContainerActive
                ]}>
                  <IconSymbol 
                    ios_icon_name="building.2.fill" 
                    android_material_icon_name="store" 
                    size={scaleIconSize(32)} 
                    color={currentMode === 'propietario' ? colors.white : colors.secondary} 
                  />
                </View>
                <View style={styles.modeTextContainer}>
                  <Text style={[
                    styles.modeTitle,
                    { fontSize: scaleFontSize(18) },
                    currentMode === 'propietario' && styles.modeTitleActive
                  ]}>
                    Propietario
                  </Text>
                  <Text style={[
                    styles.modeDescription,
                    { fontSize: scaleFontSize(14) },
                    currentMode === 'propietario' && styles.modeDescriptionActive
                  ]}>
                    Gestiona tus locales, eventos y promociones
                  </Text>
                </View>
              </View>
              {currentMode === 'propietario' && (
                <View style={styles.checkmarkContainer}>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={scaleIconSize(28)} 
                    color={colors.secondary} 
                  />
                </View>
              )}
            </TouchableOpacity>
          )}

          {user?.rol_app === 'admin' && (
            <TouchableOpacity
              style={[
                styles.modeCard,
                currentMode === 'admin' && styles.modeCardActive
              ]}
              onPress={() => handleModeChange('admin')}
              activeOpacity={0.7}
            >
              <View style={styles.modeCardContent}>
                <View style={[
                  styles.modeIconContainer,
                  currentMode === 'admin' && styles.modeIconContainerActive
                ]}>
                  <IconSymbol 
                    ios_icon_name="shield.fill" 
                    android_material_icon_name="admin_panel_settings" 
                    size={scaleIconSize(32)} 
                    color={currentMode === 'admin' ? colors.white : '#8B5CF6'} 
                  />
                </View>
                <View style={styles.modeTextContainer}>
                  <Text style={[
                    styles.modeTitle,
                    { fontSize: scaleFontSize(18) },
                    currentMode === 'admin' && styles.modeTitleActive
                  ]}>
                    Admin
                  </Text>
                  <Text style={[
                    styles.modeDescription,
                    { fontSize: scaleFontSize(14) },
                    currentMode === 'admin' && styles.modeDescriptionActive
                  ]}>
                    Administra la plataforma y gestiona usuarios
                  </Text>
                </View>
              </View>
              {currentMode === 'admin' && (
                <View style={styles.checkmarkContainer}>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={scaleIconSize(28)} 
                    color="#8B5CF6" 
                  />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoBox}>
          <IconSymbol 
            ios_icon_name="info.circle.fill" 
            android_material_icon_name="info" 
            size={scaleIconSize(20)} 
            color={colors.primary} 
          />
          <Text style={[styles.infoText, { fontSize: scaleFontSize(13) }]}>
            Puedes cambiar de rol en cualquier momento desde esta pantalla
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  modesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  modeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    // ✅ REQUERIMIENTO 1: Removed shadow/elevation on Android to fix gray box issue
    ...Platform.select({
      android: {
        elevation: 0, // Changed from 2 to 0
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  modeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
    // ✅ REQUERIMIENTO 1: Removed shadow/elevation on Android to fix gray box issue
    ...Platform.select({
      android: {
        elevation: 0, // Changed from 4 to 0
      },
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
    }),
  },
  modeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  modeIconContainerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  modeTitleActive: {
    color: colors.primary,
  },
  modeDescription: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modeDescriptionActive: {
    color: colors.text,
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  infoText: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
  },
});
