
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

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

/**
 * ✅ CARRITO - FULL SCREEN CART PAGE
 * 
 * NEW FEATURES v244.0:
 * - ✅ Full-screen page (not modal)
 * - ✅ Proper navigation with back button
 * - ✅ Shows all cart items
 * - ✅ Remove items functionality
 * - ✅ Calculate total
 * - ✅ Checkout flow
 * - ✅ Clear cart option
 */

export default function CarritoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
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

      console.log('[Carrito] Loaded cart items:', data?.length || 0);
      setCartItems(data || []);
    } catch (error) {
      console.error('[Carrito] Error loading cart:', error);
      Alert.alert('Error', 'No se pudo cargar el carrito');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCartItems();
  }, [loadCartItems]);

  const handleRemoveItem = async (itemId: string) => {
    try {
      setRemoving(itemId);

      const { error } = await supabase
        .from('shopping_cart')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      console.log('[Carrito] Item removed:', itemId);
      await loadCartItems();
    } catch (error) {
      console.error('[Carrito] Error removing item:', error);
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

    Alert.alert(
      'Pago en Desarrollo',
      `Total a pagar: €${total.toFixed(2)}\n\nLa integración con Stripe está en desarrollo.`,
      [{ text: 'OK' }]
    );
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
              Alert.alert('✅ Carrito Vaciado', 'Se eliminaron todos los artículos');
            } catch (error) {
              console.error('[Carrito] Error clearing cart:', error);
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
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
            color={colors.headerText}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <IconSymbol
              ios_icon_name="cart.fill"
              android_material_icon_name="shopping_cart"
              size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
              color={colors.headerText}
            />
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24) }]}>Mi Carrito</Text>
          </View>
          {itemCount > 0 && (
            <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(14) }]}>
              {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
            </Text>
          )}
        </View>
        <View style={{ width: 28 }} />
      </LinearGradient>

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
            size={Platform.OS === 'android' ? scaleIconSize(80) : 80}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyCartText, { fontSize: scaleFontSize(22) }]}>Carrito Vacío</Text>
          <Text style={[styles.emptyCartSubtext, { fontSize: scaleFontSize(15) }]}>
            Agrega planes de suscripción para tus locales
          </Text>
          <TouchableOpacity
            style={styles.emptyCartButton}
            onPress={() => router.push('/gestion/planes-suscripcion')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.emptyCartButtonGradient}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add_circle"
                size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                color={colors.white}
              />
              <Text style={[styles.emptyCartButtonText, { fontSize: scaleFontSize(16) }]}>
                Ver Planes
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Cart Items */}
            <View style={styles.cartItemsList}>
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
                            size={Platform.OS === 'android' ? scaleIconSize(28) : 28}
                            color={colors.textSecondary}
                          />
                        </View>
                      )}
                      <View style={styles.cartItemInfo}>
                        <Text style={[styles.cartItemLocal, { fontSize: scaleFontSize(16) }]}>
                          {item.locales.nombre}
                        </Text>
                        <Text style={[styles.cartItemPlan, { fontSize: scaleFontSize(14) }]}>
                          Plan {item.planes_suscripcion.nombre}
                        </Text>
                        <Text style={[styles.cartItemPrice, { fontSize: scaleFontSize(15) }]}>
                          {formatPrice(item.planes_suscripcion.precio_mensual)}/mes
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cartItemRight}>
                      <Text style={[styles.cartItemTotal, { fontSize: scaleFontSize(18) }]}>
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
                            size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                            color="#EF4444"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Cart Summary */}
            <View style={styles.cartSummary}>
              <View style={styles.cartSummaryRow}>
                <Text style={[styles.cartSummaryLabel, { fontSize: scaleFontSize(16) }]}>
                  Subtotal ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
                </Text>
                <Text style={[styles.cartSummaryValue, { fontSize: scaleFontSize(16) }]}>
                  {formatPrice(total)}
                </Text>
              </View>
              <View style={styles.cartSummaryDivider} />
              <View style={styles.cartSummaryRow}>
                <Text style={[styles.cartSummaryTotal, { fontSize: scaleFontSize(20) }]}>Total</Text>
                <Text style={[styles.cartSummaryTotalValue, { fontSize: scaleFontSize(26) }]}>
                  {formatPrice(total)}
                </Text>
              </View>
              <Text style={[styles.cartSummaryNote, { fontSize: scaleFontSize(13) }]}>
                * Todos los planes incluyen 30 días de prueba gratuita
              </Text>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <IconSymbol
                  ios_icon_name="checkmark.shield.fill"
                  android_material_icon_name="verified_user"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={colors.primary}
                />
                <Text style={[styles.infoItemText, { fontSize: scaleFontSize(14) }]}>
                  Cancela en cualquier momento sin penalización
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="lock"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={colors.primary}
                />
                <Text style={[styles.infoItemText, { fontSize: scaleFontSize(14) }]}>
                  Pagos seguros procesados por Stripe
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="autorenew"
                  size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                  color={colors.primary}
                />
                <Text style={[styles.infoItemText, { fontSize: scaleFontSize(14) }]}>
                  Renovación automática mensual
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Footer with Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearCartButton} onPress={handleClearCart}>
              <IconSymbol
                ios_icon_name="trash"
                android_material_icon_name="delete"
                size={Platform.OS === 'android' ? scaleIconSize(20) : 20}
                color="#EF4444"
              />
              <Text style={[styles.clearCartButtonText, { fontSize: scaleFontSize(15) }]}>
                Vaciar Carrito
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <LinearGradient
                colors={[colors.primary, colors.primary + 'DD']}
                style={styles.checkoutButtonGradient}
              >
                <Text style={[styles.checkoutButtonText, { fontSize: scaleFontSize(17) }]}>
                  Proceder al Pago
                </Text>
                <IconSymbol
                  ios_icon_name="arrow.right.circle.fill"
                  android_material_icon_name="arrow_forward"
                  size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
                  color={colors.white}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  emptyCartText: {
    fontWeight: '700',
    color: colors.text,
  },
  emptyCartSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCartButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyCartButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  emptyCartButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  cartItemsList: {
    padding: 20,
    gap: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.cardShadow,
  },
  cartItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  cartItemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
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
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  cartItemPlan: {
    color: colors.textSecondary,
    marginBottom: 6,
  },
  cartItemPrice: {
    color: colors.primary,
    fontWeight: '700',
  },
  cartItemRight: {
    alignItems: 'flex-end',
    gap: 12,
  },
  cartItemTotal: {
    fontWeight: 'bold',
    color: colors.text,
  },
  removeButton: {
    padding: 6,
  },
  cartSummary: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.cardShadow,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartSummaryLabel: {
    color: colors.text,
    fontWeight: '500',
  },
  cartSummaryValue: {
    fontWeight: '700',
    color: colors.text,
  },
  cartSummaryDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
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
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  infoSection: {
    paddingHorizontal: 20,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoItemText: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  clearCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  clearCartButtonText: {
    fontWeight: '700',
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
    gap: 10,
    paddingVertical: 16,
  },
  checkoutButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
});
