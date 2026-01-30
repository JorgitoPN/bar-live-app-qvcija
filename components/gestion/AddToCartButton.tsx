
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface Props {
  localId: string;
  localNombre: string;
  planId: string;
  planNombre: string;
  onAdded?: () => void;
}

/**
 * ✅ ADD TO CART BUTTON - QUICK ADD SUBSCRIPTION TO CART
 * 
 * Features:
 * - Add plan to shopping cart
 * - Visual feedback
 * - Error handling
 * - Success confirmation
 */

export default function AddToCartButton({ localId, localNombre, planId, planNombre, onAdded }: Props) {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Debes iniciar sesión para agregar al carrito');
      return;
    }

    setAdding(true);
    try {
      // Check if already in cart
      const { data: existing, error: checkError } = await supabase
        .from('shopping_cart')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('local_id', localId)
        .eq('plan_id', planId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        // Update quantity
        const { error: updateError } = await supabase
          .from('shopping_cart')
          .update({
            quantity: existing.quantity + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;

        Alert.alert(
          '✅ Actualizado',
          `Cantidad actualizada en el carrito para "${localNombre}"`
        );
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from('shopping_cart')
          .insert({
            user_id: user.id,
            local_id: localId,
            plan_id: planId,
            quantity: 1,
          });

        if (insertError) throw insertError;

        Alert.alert(
          '✅ Agregado al Carrito',
          `Plan "${planNombre}" para "${localNombre}" agregado al carrito`
        );
      }

      if (onAdded) {
        onAdded();
      }
    } catch (error) {
      console.error('[AddToCartButton] Error adding to cart:', error);
      Alert.alert('Error', 'No se pudo agregar al carrito');
    } finally {
      setAdding(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, adding && styles.buttonDisabled]}
      onPress={handleAddToCart}
      disabled={adding}
      activeOpacity={0.7}
    >
      {adding ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <>
          <IconSymbol
            ios_icon_name="cart.fill.badge.plus"
            android_material_icon_name="add_shopping_cart"
            size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
            color={colors.white}
          />
          <Text style={[styles.buttonText, { fontSize: scaleFontSize(14) }]}>Agregar al Carrito</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '600',
    color: colors.white,
  },
});
