
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { useRouter } from 'expo-router';

/**
 * ✅ SHOPPING CART v244.0 - NAVIGATES TO FULL-SCREEN PAGE
 * 
 * NEW FEATURES v244.0:
 * - ✅ Removed modal functionality
 * - ✅ Now navigates to /gestion/carrito (full-screen page)
 * - ✅ Shows cart icon with item count badge
 * - ✅ Real-time updates via Supabase subscription
 */

export default function ShoppingCart() {
  const router = useRouter();
  const { user } = useAuth();
  const [itemCount, setItemCount] = useState(0);

  const loadCartItemsCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('shopping_cart')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('[ShoppingCart v244.0] Cart items count:', count || 0);
      setItemCount(count || 0);
    } catch (error) {
      console.error('[ShoppingCart v244.0] Error loading cart count:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadCartItemsCount();

      // ✅ Real-time subscription for cart updates
      const channel = supabase
        .channel('shopping_cart_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shopping_cart',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[ShoppingCart v244.0] Cart changed:', payload);
            loadCartItemsCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, loadCartItemsCount]);

  const handleOpenCart = () => {
    console.log('[ShoppingCart v244.0] Opening cart page');
    router.push('/gestion/carrito');
  };

  return (
    <TouchableOpacity
      style={styles.cartButton}
      onPress={handleOpenCart}
    >
      <IconSymbol
        ios_icon_name="cart.fill"
        android_material_icon_name="shopping_cart"
        size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
        color={colors.headerText}
      />
      {itemCount > 0 && (
        <View style={styles.cartBadge}>
          <Text style={[styles.cartBadgeText, { fontSize: scaleFontSize(11) }]}>
            {itemCount > 9 ? '9+' : itemCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cartButton: {
    position: 'relative',
    padding: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontWeight: '700',
    color: colors.white,
  },
});
