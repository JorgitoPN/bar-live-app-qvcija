
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { useRouter } from 'expo-router';

interface CartItem {
  id: string;
  local_id: string;
  plan_id: string;
  quantity: number;
  locales: {
    nombre: string;
    imagen_url: string | null;
  };
  planes_suscripcion: {
    nombre: string;
    precio_mensual: number;
    descripcion: string;
  };
}

interface Props {
  onCheckout?: (items: CartItem[], total: number) => void;
  onClose?: () => void;
}

/**
 * ✅ SHOPPING CART - SUBSCRIPTION CART FOR OWNERS
 * 
 * Features:
 * - Shows cart icon with item count badge
 * - Opens modal with cart items
 * - Remove items from cart
 * - Calculate total
 * - Checkout flow
 * - Only visible in owner mode
 */

export default function ShoppingCart({ onCheckout, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadCartItems = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('shopping_cart')
        .select(`
          id,
          local_id,
          plan_id,
          quantity,
          locales (nombre, imagen_url),
          planes_suscripcion (nombre, precio_mensual, descripcion)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('[ShoppingCart] Loaded cart items:', data?.length || 0);
      setCartItems(data || []);
    } catch (error) {
      console.error('[ShoppingCart] Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadCartItems();
    }
  }, [user?.id, loadCartItems]);

  const handleRemoveItem = async (itemId: string) => {
    try {
      setRemoving(itemId);

      const { error } = await supabase
        .from('shopping_cart')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      console.log('[ShoppingCart] Item removed:', itemId);
      await loadCartItems();
    } catch (error) {
      console.error('[ShoppingCart] Error removing item:', error);
      Alert.alert('Error', 'No se pudo eliminar el artículo');
    } finally {
      setRemoving(null);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + (item.planes_suscripcion.precio_mensual * item.quantity);
    }, 0);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Carrito Vacío', 'Agrega planes a tu carrito para continuar');
      return;
    }

    const total = calculateTotal();

    if (onCheckout) {
      onCheckout(cartItems, total);
    } else {
      // Navigate to checkout screen
      router.push('/gestion/checkout');
    }

    setShowCartModal(false);
  };

  const handleClearCart = async () => {
    Alert.alert(
      'Vaciar Carrito',
      '¿Estás seguro de que deseas eliminar todos los artículos del carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Vaciar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shopping_cart')
                .delete()
                .eq('user_id', user?.id);

              if (error) throw error;

              await loadCartItems();
            } catch (error) {
              console.error('[ShoppingCart] Error clearing cart:', error);
              Alert.alert('Error', 'No se pudo vaciar el carrito');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const itemCount = cartItems.length;
  const total = calculateTotal();

  return (
    <>
      {/* Cart Icon Button */}
      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => setShowCartModal(true)}
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

      {/* Cart Modal */}
      <Modal
        visible={showCartModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCartModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCartModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <IconSymbol
                  ios_icon_name="cart.fill"
                  android_material_icon_name="shopping_cart"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={colors.primary}
                />
                <Text style={[styles.modalTitle, { fontSize: scaleFontSize(22) }]}>Mi Carrito</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCartModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { fontSize: scaleFontSize(14) }]}>Cargando carrito...</Text>
              </View>
            ) : cartItems.length === 0 ? (
              <View style={styles.emptyCart}>
                <IconSymbol
                  ios_icon_name="cart"
                  android_material_icon_name="shopping_cart"
                  size={Platform.OS === 'android' ? scaleIconSize(64) : 64}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyCartText, { fontSize: scaleFontSize(18) }]}>Carrito Vacío</Text>
                <Text style={[styles.emptyCartSubtext, { fontSize: scaleFontSize(14) }]}>
                  Agrega planes de suscripción para tus locales
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.cartItemsList} showsVerticalScrollIndicator={false}>
                  {cartItems.map((item) => {
                    const itemTotal = item.planes_suscripcion.precio_mensual * item.quantity;

                    return (
                      <View key={item.id} style={styles.cartItem}>
                        <View style={styles.cartItemLeft}>
                          {item.locales.imagen_url ? (
                            <Image source={{ uri: item.locales.imagen_url }} style={styles.cartItemImage} />
                          ) : (
                            <View style={[styles.cartItemImage, styles.cartItemImagePlaceholder]}>
                              <IconSymbol
                                ios_icon_name="building.2.fill"
                                android_material_icon_name="store"
                                size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                                color={colors.textSecondary}
                              />
                            </View>
                          )}
                          <View style={styles.cartItemInfo}>
                            <Text style={[styles.cartItemLocal, { fontSize: scaleFontSize(15) }]}>
                              {item.locales.nombre}
                            </Text>
                            <Text style={[styles.cartItemPlan, { fontSize: scaleFontSize(13) }]}>
                              Plan {item.planes_suscripcion.nombre}
                            </Text>
                            <Text style={[styles.cartItemPrice, { fontSize: scaleFontSize(14) }]}>
                              {formatPrice(item.planes_suscripcion.precio_mensual)}/mes
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cartItemRight}>
                          <Text style={[styles.cartItemTotal, { fontSize: scaleFontSize(16) }]}>
                            {formatPrice(itemTotal)}
                          </Text>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveItem(item.id)}
                            disabled={removing === item.id}
                          >
                            {removing === item.id ? (
                              <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                              <IconSymbol
                                ios_icon_name="trash.fill"
                                android_material_icon_name="delete"
                                size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                                color="#EF4444"
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Cart Summary */}
                <View style={styles.cartSummary}>
                  <View style={styles.cartSummaryRow}>
                    <Text style={[styles.cartSummaryLabel, { fontSize: scaleFontSize(15) }]}>
                      Subtotal ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
                    </Text>
                    <Text style={[styles.cartSummaryValue, { fontSize: scaleFontSize(15) }]}>
                      {formatPrice(total)}
                    </Text>
                  </View>
                  <View style={styles.cartSummaryDivider} />
                  <View style={styles.cartSummaryRow}>
                    <Text style={[styles.cartSummaryTotal, { fontSize: scaleFontSize(18) }]}>Total</Text>
                    <Text style={[styles.cartSummaryTotalValue, { fontSize: scaleFontSize(22) }]}>
                      {formatPrice(total)}
                    </Text>
                  </View>
                  <Text style={[styles.cartSummaryNote, { fontSize: scaleFontSize(12) }]}>
                    * Todos los planes incluyen 30 días de prueba gratuita
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.cartActions}>
                  <TouchableOpacity style={styles.clearCartButton} onPress={handleClearCart}>
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                      color="#EF4444"
                    />
                    <Text style={[styles.clearCartButtonText, { fontSize: scaleFontSize(14) }]}>
                      Vaciar Carrito
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
                    <LinearGradient
                      colors={[colors.primary, colors.primary + 'DD']}
                      style={styles.checkoutButtonGradient}
                    >
                      <Text style={[styles.checkoutButtonText, { fontSize: scaleFontSize(16) }]}>
                        Proceder al Pago
                      </Text>
                      <IconSymbol
                        ios_icon_name="arrow.right.circle.fill"
                        android_material_icon_name="arrow_forward"
                        size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                        color={colors.white}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  emptyCart: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyCartText: {
    fontWeight: '600',
    color: colors.text,
  },
  emptyCartSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cartItemsList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cartItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  cartItemImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemLocal: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cartItemPlan: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cartItemPrice: {
    color: colors.primary,
    fontWeight: '600',
  },
  cartItemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cartItemTotal: {
    fontWeight: 'bold',
    color: colors.text,
  },
  removeButton: {
    padding: 4,
  },
  cartSummary: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartSummaryLabel: {
    color: colors.text,
  },
  cartSummaryValue: {
    fontWeight: '600',
    color: colors.text,
  },
  cartSummaryDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 12,
  },
  cartSummaryTotal: {
    fontWeight: 'bold',
    color: colors.text,
  },
  cartSummaryTotalValue: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  cartSummaryNote: {
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  cartActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  clearCartButtonText: {
    fontWeight: '600',
    color: '#EF4444',
  },
  checkoutButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  checkoutButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
});
