
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useMode } from '@/contexts/ModeContext';

interface PermissionGuardProps {
  children: React.ReactNode;
  requireSocialProfile?: boolean;
  localId?: string;
}

/**
 * ✅ PERMISSION GUARD v48.0 - ACCESS CONTROL FOR FREE PLAN LOCALS
 * 
 * Features:
 * - ✅ Blocks access to social network for free plan locals
 * - ✅ Blocks access to local profile page for free plan locals
 * - ✅ Shows persuasive upgrade message
 * - ✅ Redirects to plans page
 * - ✅ Only applies to local profiles, not user profiles
 */
export default function PermissionGuard({
  children,
  requireSocialProfile = false,
  localId,
}: PermissionGuardProps) {
  const router = useRouter();
  const { currentMode, activeProfileType, activeProfileId } = useMode();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        console.log('[PermissionGuard v48.0] 🔍 Checking permissions:', {
          currentMode,
          activeProfileType,
          activeProfileId,
          localId,
          requireSocialProfile,
        });

        // ✅ If in user mode, always allow access
        if (currentMode === 'cliente' || activeProfileType === 'user') {
          console.log('[PermissionGuard v48.0] ✅ User mode - access granted');
          setHasPermission(true);
          setLoading(false);
          return;
        }

        // ✅ If in admin mode, always allow access
        if (currentMode === 'admin') {
          console.log('[PermissionGuard v48.0] ✅ Admin mode - access granted');
          setHasPermission(true);
          setLoading(false);
          return;
        }

        // ✅ Check if local has active subscription with social profile permission
        const targetLocalId = localId || activeProfileId;
        
        if (!targetLocalId) {
          console.log('[PermissionGuard v48.0] ⚠️ No local ID - denying access');
          setHasPermission(false);
          setLoading(false);
          return;
        }

        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('suscripciones_locales')
          .select(`
            id,
            estado,
            plan_id,
            planes_suscripcion!suscripciones_locales_plan_id_fkey(
              nombre,
              perfil_social
            )
          `)
          .eq('local_id', targetLocalId)
          .eq('estado', 'activa')
          .maybeSingle();

        if (subscriptionError) {
          console.error('[PermissionGuard v48.0] ❌ Error checking subscription:', subscriptionError);
          setHasPermission(false);
          setLoading(false);
          return;
        }

        const hasActiveSub = !!subscriptionData;
        const currentPlanName = subscriptionData?.planes_suscripcion?.nombre || 'Gratuito';
        const hasSocialProfile = subscriptionData?.planes_suscripcion?.perfil_social || false;

        setPlanName(currentPlanName);

        console.log('[PermissionGuard v48.0] 📊 Subscription check:', {
          hasActiveSub,
          planName: currentPlanName,
          hasSocialProfile,
          requireSocialProfile,
        });

        // ✅ If social profile is required and local doesn't have it, deny access
        if (requireSocialProfile && !hasSocialProfile) {
          console.log('[PermissionGuard v48.0] ❌ Social profile required but not available - denying access');
          setHasPermission(false);
        } else {
          console.log('[PermissionGuard v48.0] ✅ Permission granted');
          setHasPermission(true);
        }

        setLoading(false);
      } catch (error) {
        console.error('[PermissionGuard v48.0] ❌ Error checking permissions:', error);
        setHasPermission(false);
        setLoading(false);
      }
    };

    checkPermissions();
  }, [currentMode, activeProfileType, activeProfileId, localId, requireSocialProfile]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verificando permisos...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.replace('/(tabs)/explorar')}
          >
            <IconSymbol 
              ios_icon_name="chevron.left" 
              android_material_icon_name="arrow_back" 
              size={24} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Acceso Restringido</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.blockedContainer}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.iconContainer}
          >
            <IconSymbol 
              ios_icon_name="lock.fill" 
              android_material_icon_name="lock" 
              size={64} 
              color={colors.white} 
            />
          </LinearGradient>

          <Text style={styles.blockedTitle}>
            🔒 Perfil Social No Disponible
          </Text>

          <Text style={styles.blockedMessage}>
            Para acceder a esta función necesitas activar un plan de suscripción.
          </Text>

          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>
              ✨ Con un plan activo podrás:
            </Text>
            
            <View style={styles.benefitItem}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle" 
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.benefitText}>
                Hacer visible tu perfil social
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle" 
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.benefitText}>
                Publicar eventos y promociones
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle" 
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.benefitText}>
                Destacar tu local en búsquedas
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle" 
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.benefitText}>
                Acceder a estadísticas avanzadas
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <IconSymbol 
                ios_icon_name="checkmark.circle.fill" 
                android_material_icon_name="check_circle" 
                size={20} 
                color={colors.primary} 
              />
              <Text style={styles.benefitText}>
                Atraer más clientes cada día
              </Text>
            </View>
          </View>

          <View style={styles.ctaContainer}>
            <Text style={styles.ctaText}>
              💡 No estás comprando un plan, estás invirtiendo en más clientes.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              router.replace('/(tabs)/explorar');
              setTimeout(() => {
                router.push(`/gestion/planes-suscripcion${localId ? `?localId=${localId}` : ''}`);
              }, 100);
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.upgradeButtonGradient}
            >
              <IconSymbol 
                ios_icon_name="star.fill" 
                android_material_icon_name="star" 
                size={20} 
                color={colors.white} 
              />
              <Text style={styles.upgradeButtonText}>Ver Planes de Suscripción</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToExploreButton}
            onPress={() => router.replace('/(tabs)/explorar')}
            activeOpacity={0.8}
          >
            <Text style={styles.backToExploreButtonText}>Volver a Explorar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
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
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  blockedMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  ctaContainer: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 22,
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  backToExploreButton: {
    paddingVertical: 12,
  },
  backToExploreButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
