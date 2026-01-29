
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';

interface PermissionGuardProps {
  children: React.ReactNode;
  requireSocialProfile?: boolean;
}

/**
 * ✅ PERMISSION GUARD v55.0 - FIXED PLAN SYNCHRONIZATION & LOCAL NAME
 * 
 * CRITICAL FIXES v55.0:
 * - ✅ Now checks the CORRECT local from activeProfileId (not random local)
 * - ✅ Fixed issue where manually assigned plans weren't recognized
 * - ✅ Shows CORRECT local name in restriction message (from activeLocalData)
 * - ✅ Proper synchronization with admin-assigned plans
 * - ✅ Better error handling and logging
 * - ✅ Real-time subscription updates
 */

export default function PermissionGuard({ children, requireSocialProfile = false }: PermissionGuardProps) {
  const router = useRouter();
  const { userId } = useEffectiveUser();
  const { currentMode, activeProfileType, activeProfileId, activeLocalData } = useMode();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [localName, setLocalName] = useState('');

  const checkPermissions = useCallback(async () => {
    // ✅ Client mode always has access
    if (currentMode === 'cliente' || activeProfileType === 'user') {
      console.log('[PermissionGuard v55.0] ✅ Client mode - access granted');
      setHasPermission(true);
      setLoading(false);
      return;
    }

    // ✅ CRITICAL FIX v55.0: Check permissions for the ACTIVE local profile
    if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
      try {
        console.log('[PermissionGuard v55.0] 🔍 Checking permissions for ACTIVE local:', activeProfileId);

        // ✅ CRITICAL FIX v55.0: Use activeLocalData for local name (already loaded and correct)
        const currentLocalName = activeLocalData?.nombre || '';
        setLocalName(currentLocalName);
        console.log('[PermissionGuard v55.0] 📍 Active local name:', currentLocalName);

        // If we don't have local data yet, load it
        if (!currentLocalName) {
          const { data: localData, error: localError } = await supabase
            .from('locales')
            .select('nombre')
            .eq('id', activeProfileId)
            .single();

          if (localError) {
            console.error('[PermissionGuard v55.0] ❌ Error loading local:', localError);
            setHasPermission(false);
            setLoading(false);
            return;
          }

          setLocalName(localData?.nombre || 'tu local');
        }

        // ✅ CRITICAL FIX v55.0: Check subscription for the ACTIVE local with proper error handling
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('suscripciones_locales')
          .select(`
            id,
            plan_id,
            estado,
            planes_suscripcion!suscripciones_locales_plan_id_fkey(
              nombre,
              perfil_social
            )
          `)
          .eq('local_id', activeProfileId)
          .eq('estado', 'activa')
          .maybeSingle();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error('[PermissionGuard v55.0] ❌ Error loading subscription:', subscriptionError);
        }

        // Check if has social profile permission
        const hasSocialAccess = subscriptionData?.planes_suscripcion?.perfil_social === true;

        console.log('[PermissionGuard v55.0] 📊 Permission check for ACTIVE local:', {
          localId: activeProfileId,
          localName: currentLocalName || localName,
          hasSocialAccess,
          planName: subscriptionData?.planes_suscripcion?.nombre,
          subscriptionId: subscriptionData?.id,
          subscriptionState: subscriptionData?.estado,
        });

        setHasPermission(hasSocialAccess);
      } catch (error) {
        console.error('[PermissionGuard v55.0] ❌ Error checking permissions:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    } else {
      setHasPermission(true);
      setLoading(false);
    }
  }, [currentMode, activeProfileType, activeProfileId, activeLocalData, localName]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // ✅ NEW v55.0: Real-time subscription updates
  useEffect(() => {
    if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
      console.log('[PermissionGuard v55.0] 🔄 Setting up real-time subscription listener for:', activeProfileId);
      
      const subscription = supabase
        .channel(`subscription-updates-${activeProfileId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'suscripciones_locales',
            filter: `local_id=eq.${activeProfileId}`,
          },
          (payload) => {
            console.log('[PermissionGuard v55.0] 🔔 Subscription updated:', payload);
            checkPermissions();
          }
        )
        .subscribe();

      return () => {
        console.log('[PermissionGuard v55.0] 🔌 Unsubscribing from subscription updates');
        subscription.unsubscribe();
      };
    }
  }, [currentMode, activeProfileType, activeProfileId, checkPermissions]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verificando permisos...</Text>
      </View>
    );
  }

  if (!hasPermission && requireSocialProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.restrictedContent}>
          <LinearGradient
            colors={[colors.primary + '20', colors.secondary + '20']}
            style={styles.iconContainer}
          >
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={64}
              color={colors.primary}
            />
          </LinearGradient>

          <Text style={styles.restrictedTitle}>Acceso Restringido</Text>
          
          <Text style={styles.restrictedMessage}>
            El perfil social y las funciones avanzadas están disponibles exclusivamente para locales con planes de pago.
          </Text>

          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Con un plan de pago obtendrás:</Text>
            
            <View style={styles.benefitItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.benefitText}>
                Perfil social completo para {localName || activeLocalData?.nombre || 'tu local'}
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.benefitText}>Publicar contenido y conectar con clientes</Text>
            </View>

            <View style={styles.benefitItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.benefitText}>Crear eventos y promociones destacadas</Text>
            </View>

            <View style={styles.benefitItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.benefitText}>Panel de análisis y estadísticas</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push(`/gestion/planes-suscripcion?localId=${activeProfileId}`)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.upgradeButtonGradient}
            >
              <IconSymbol
                ios_icon_name="crown.fill"
                android_material_icon_name="workspace_premium"
                size={20}
                color={colors.white}
              />
              <Text style={styles.upgradeButtonText}>Ver Planes de Suscripción</Text>
            </LinearGradient>
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
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  restrictedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: 80,
    paddingBottom: 140,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  restrictedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  restrictedMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.white,
  },
});
