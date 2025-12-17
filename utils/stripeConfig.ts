
/**
 * ✅ STRIPE CONFIGURATION UTILITY
 * 
 * Manages Stripe configuration and payment processing
 */

import { supabase } from './supabase';

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  testMode: boolean;
}

/**
 * Get Stripe configuration from database
 */
export async function getStripeConfig(): Promise<StripeConfig | null> {
  try {
    const { data, error } = await supabase
      .from('stripe_configuration')
      .select('*')
      .single();

    if (error) {
      console.error('[stripeConfig] Error fetching config:', error);
      return null;
    }

    if (!data) {
      console.error('[stripeConfig] No Stripe configuration found');
      return null;
    }

    return {
      publishableKey: data.publishable_key || '',
      secretKey: data.secret_key || '',
      webhookSecret: data.webhook_secret || '',
      testMode: data.test_mode !== false,
    };
  } catch (error) {
    console.error('[stripeConfig] Error:', error);
    return null;
  }
}

/**
 * Update Stripe configuration (admin only)
 */
export async function updateStripeConfig(config: Partial<StripeConfig>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('stripe_configuration')
      .update({
        publishable_key: config.publishableKey,
        secret_key: config.secretKey,
        webhook_secret: config.webhookSecret,
        test_mode: config.testMode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (await supabase.from('stripe_configuration').select('id').single()).data?.id);

    if (error) {
      console.error('[stripeConfig] Error updating config:', error);
      return false;
    }

    console.log('[stripeConfig] ✅ Configuration updated successfully');
    return true;
  } catch (error) {
    console.error('[stripeConfig] Error:', error);
    return false;
  }
}

/**
 * Check if Stripe is properly configured
 */
export async function isStripeConfigured(): Promise<boolean> {
  const config = await getStripeConfig();
  
  if (!config) {
    return false;
  }

  const hasPublishableKey = !!config.publishableKey && config.publishableKey.length > 0;
  const hasSecretKey = !!config.secretKey && config.secretKey.length > 0;

  console.log('[stripeConfig] Configuration status:', {
    hasPublishableKey,
    hasSecretKey,
    testMode: config.testMode,
  });

  return hasPublishableKey && hasSecretKey;
}

/**
 * Add item to shopping cart
 */
export async function addToCart(userId: string, localId: string, planId: string): Promise<boolean> {
  try {
    // Check if item already in cart
    const { data: existing } = await supabase
      .from('shopping_cart')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('local_id', localId)
      .eq('plan_id', planId)
      .maybeSingle();

    if (existing) {
      // Update quantity
      const { error } = await supabase
        .from('shopping_cart')
        .update({
          quantity: existing.quantity + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Insert new item
      const { error } = await supabase
        .from('shopping_cart')
        .insert({
          user_id: userId,
          local_id: localId,
          plan_id: planId,
          quantity: 1,
        });

      if (error) throw error;
    }

    console.log('[stripeConfig] ✅ Item added to cart');
    return true;
  } catch (error) {
    console.error('[stripeConfig] Error adding to cart:', error);
    return false;
  }
}

/**
 * Remove item from shopping cart
 */
export async function removeFromCart(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    console.log('[stripeConfig] ✅ Item removed from cart');
    return true;
  } catch (error) {
    console.error('[stripeConfig] Error removing from cart:', error);
    return false;
  }
}

/**
 * Clear shopping cart for user
 */
export async function clearCart(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    console.log('[stripeConfig] ✅ Cart cleared');
    return true;
  } catch (error) {
    console.error('[stripeConfig] Error clearing cart:', error);
    return false;
  }
}

/**
 * Get cart items for user
 */
export async function getCartItems(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('shopping_cart')
      .select(`
        *,
        planes_suscripcion (nombre, precio_mensual, descripcion),
        locales (nombre)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[stripeConfig] Error getting cart items:', error);
    return [];
  }
}

/**
 * Calculate cart total
 */
export function calculateCartTotal(items: any[]): number {
  return items.reduce((sum, item) => {
    return sum + (item.planes_suscripcion.precio_mensual * item.quantity);
  }, 0);
}
