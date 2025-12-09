
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';

export type UserRole = 'admin' | 'propietario' | 'cliente';
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise';

export interface LocalSubscriptionInfo {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt?: string;
  planDetails?: {
    nombre: string;
    descripcion: string;
    caracteristicas: string[];
  };
}

export interface PermissionCheck {
  allowed: boolean;
  reason: string;
  requiresUpgrade?: boolean;
  suggestedPlan?: SubscriptionPlan;
}

export type PermissionAction = 
  | 'create_post'
  | 'create_story'
  | 'create_event'
  | 'view_analytics'
  | 'featured_promotion'
  | 'priority_support'
  | 'unlimited_posts'
  | 'advanced_stats';

export function useRolePermissions(
  userId: string | undefined,
  isInteractingAsLocal: boolean,
  localId: string | null
) {
  const [userRole, setUserRole] = useState<UserRole>('cliente');
  const [localSubscription, setLocalSubscription] = useState<LocalSubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user role and subscription info
  useEffect(() => {
    const loadPermissions = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get user role
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('rol_app')
          .eq('id', userId)
          .single();

        if (userData && !userError) {
          setUserRole(userData.rol_app as UserRole);
          console.log('[useRolePermissions] User role loaded:', userData.rol_app);
        }

        // If interacting as local, get subscription info
        if (isInteractingAsLocal && localId) {
          const { data: subData, error: subError } = await supabase
            .from('suscripciones_locales')
            .select(`
              estado,
              plan_id,
              planes_suscripcion (
                nombre,
                descripcion,
                caracteristicas,
                activo
              )
            `)
            .eq('local_id', localId)
            .eq('usuario_id', userId)
            .single();

          if (subData && !subError && subData.planes_suscripcion) {
            const planData = subData.planes_suscripcion as any;
            const planName = planData.nombre as SubscriptionPlan;
            const isActive = subData.estado === 'activa' && planData.activo;
            
            setLocalSubscription({
              plan: planName,
              isActive,
              planDetails: {
                nombre: planData.nombre,
                descripcion: planData.descripcion,
                caracteristicas: planData.caracteristicas || [],
              },
            });
            
            console.log('[useRolePermissions] Local subscription loaded:', {
              plan: planName,
              isActive,
            });
          } else {
            // No active subscription found - default to free
            setLocalSubscription({
              plan: 'free',
              isActive: false,
            });
          }
        } else {
          setLocalSubscription(null);
        }
      } catch (error) {
        console.error('[useRolePermissions] Error loading permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [userId, isInteractingAsLocal, localId]);

  // Check if user can perform action based on role and subscription
  const canPerformAction = useCallback((action: PermissionAction): PermissionCheck => {
    // Admin can do everything
    if (userRole === 'admin') {
      return { allowed: true, reason: '' };
    }

    // Cliente permissions
    if (userRole === 'cliente') {
      if (action === 'create_post' || action === 'create_story') {
        return { allowed: true, reason: '' };
      }
      return { 
        allowed: false, 
        reason: 'Esta función está disponible solo para propietarios de locales',
        requiresUpgrade: false,
      };
    }

    // Propietario permissions
    if (userRole === 'propietario') {
      // If not interacting as local, same as cliente
      if (!isInteractingAsLocal) {
        if (action === 'create_post' || action === 'create_story') {
          return { allowed: true, reason: '' };
        }
        return { 
          allowed: false, 
          reason: 'Cambia al perfil de tu local para acceder a esta función',
          requiresUpgrade: false,
        };
      }

      // Check subscription plan
      if (!localSubscription || !localSubscription.isActive) {
        return {
          allowed: false,
          reason: 'Necesitas una suscripción activa para usar esta función',
          requiresUpgrade: true,
          suggestedPlan: 'basic',
        };
      }

      const plan = localSubscription.plan;

      // Free plan - very limited
      if (plan === 'free') {
        return { 
          allowed: false, 
          reason: 'Actualiza a un plan de pago para acceder a esta función',
          requiresUpgrade: true,
          suggestedPlan: 'basic',
        };
      }

      // Basic plan - standard features
      if (plan === 'basic') {
        const basicAllowed: PermissionAction[] = [
          'create_post',
          'create_story',
          'view_analytics',
          'unlimited_posts',
        ];

        if (basicAllowed.includes(action)) {
          return { allowed: true, reason: '' };
        }

        return { 
          allowed: false, 
          reason: 'Actualiza a Premium para acceder a esta función',
          requiresUpgrade: true,
          suggestedPlan: 'premium',
        };
      }

      // Premium plan - all features
      if (plan === 'premium' || plan === 'enterprise') {
        return { allowed: true, reason: '' };
      }
    }

    return { 
      allowed: false, 
      reason: 'Acción no permitida',
      requiresUpgrade: false,
    };
  }, [userRole, isInteractingAsLocal, localSubscription]);

  // Get feature availability for current plan
  const getFeatureAvailability = useCallback(() => {
    if (userRole === 'admin') {
      return {
        createPost: true,
        createStory: true,
        createEvent: true,
        viewAnalytics: true,
        featuredPromotion: true,
        prioritySupport: true,
        unlimitedPosts: true,
        advancedStats: true,
      };
    }

    if (userRole === 'cliente') {
      return {
        createPost: true,
        createStory: true,
        createEvent: false,
        viewAnalytics: false,
        featuredPromotion: false,
        prioritySupport: false,
        unlimitedPosts: true,
        advancedStats: false,
      };
    }

    if (userRole === 'propietario' && isInteractingAsLocal && localSubscription?.isActive) {
      const plan = localSubscription.plan;

      if (plan === 'basic') {
        return {
          createPost: true,
          createStory: true,
          createEvent: false,
          viewAnalytics: true,
          featuredPromotion: false,
          prioritySupport: false,
          unlimitedPosts: true,
          advancedStats: false,
        };
      }

      if (plan === 'premium' || plan === 'enterprise') {
        return {
          createPost: true,
          createStory: true,
          createEvent: true,
          viewAnalytics: true,
          featuredPromotion: true,
          prioritySupport: true,
          unlimitedPosts: true,
          advancedStats: true,
        };
      }
    }

    // Default: no features
    return {
      createPost: false,
      createStory: false,
      createEvent: false,
      viewAnalytics: false,
      featuredPromotion: false,
      prioritySupport: false,
      unlimitedPosts: false,
      advancedStats: false,
    };
  }, [userRole, isInteractingAsLocal, localSubscription]);

  return {
    userRole,
    localSubscription,
    loading,
    canPerformAction,
    getFeatureAvailability,
    isAdmin: userRole === 'admin',
    isPropietario: userRole === 'propietario',
    isCliente: userRole === 'cliente',
  };
}
