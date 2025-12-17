
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface CartItem {
  id: string;
  plan_id: string;
  local_id: string;
  quantity: number;
  planes_suscripcion: {
    nombre: string;
    precio_mensual: number;
    descripcion: string;
  };
  locales: {
    nombre: string;
  };
}

interface ShoppingCartProps {
  onCheckout: (items: CartItem[], total: number) => void;
  onClose: () => void;
}

/**
 * ✅ SHOPPING CART v3.0 - BARLIVE DESIGN (FIXED)
 * 
 * Changes:
 * - ✅ Updated with Barlive colors (teal/cyan gradients)
 * - ✅ Modern card design
 * - ✅ Gradient header
 * - ✅ Improved visual hierarchy
 * - ✅ Better spacing and typography
 * - ✅ FIXED: "Explorar Planes" button now redirects to plans page
 */

export default function ShoppingCart({ onCheckout, onClose }: ShoppingCartProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shopping_cart')
        .select(`
          *,
          planes_suscripcion (nombre, precio_mensual, descripcion),
          locales (nombre)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('[ShoppingCart] Error loading cart:', error);
      Alert.alert('Error', 'No se pudo cargar el carrito');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const removeItem = async (itemId: string) => {
    setRemoving(itemId);
    try {
      const { error } = await supabase
        .from('shopping_cart')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(cartItems.filter(item => item.id !== itemId));
      Alert.alert('Éxito', 'Artículo eliminado del carrito');
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
      Alert.alert('Carrito Vacío', 'Añade artículos al carrito antes de proceder al pago');
      return;
    }

    const total = calculateTotal();
    onCheckout(cartItems, total);
  };

  // ✅ FIXED: Navigate to plans page
  const handleExplorePlans = () => {
    console.log('[ShoppingCart] ✅ Navigating to plans page');
    onClose();
    setTimeout(() => {
      router.push('/gestion/planes-suscripcion');
    }, 300);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Carrito de Compras</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando carrito...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Carrito de Compras</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <IconSymbol ios_icon_name="cart" android_material_icon_name="shopping_cart" size={64} color={colors.primary} />
          </View>
          <Text style={styles.emptyText}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtext}>Añade planes de suscripción para tus locales</Text>
          {/* ✅ FIXED: Button now navigates to plans page */}
          <TouchableOpacity style={styles.emptyButton} onPress={handleExplorePlans}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyButtonGradient}
            >
              <Text style={styles.emptyButtonText}>Explorar Planes</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <React.Fragment>
          <ScrollView style={styles.itemsContainer} contentContainerStyle={styles.itemsContent}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.itemHeader}>
                  <View style={styles.planBadge}>
                    <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.badgeDestacado} />
                    <Text style={styles.planBadgeText}>{item.planes_suscripcion.nombre}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItem(item.id)}
                    disabled={removing === item.id}
                  >
                    {removing === item.id ? (
                      <ActivityIndicator size="small" color={colors.badgeNuevo} />
                    ) : (
                      <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color={colors.badgeNuevo} />
                    )}
                  </TouchableOpacity>
                </View>
                
                <View style={styles.itemInfo}>
                  <View style={styles.localInfo}>
                    <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="business" size={18} color={colors.primary} />
                    <Text style={styles.itemLocalName}>{item.locales.nombre}</Text>
                  </View>
                  
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.planes_suscripcion.descripcion}
                  </Text>
                  
                  <View style={styles.priceContainer}>
                    <Text style={styles.itemPrice}>
                      €{item.planes_suscripcion.precio_mensual.toFixed(2)}
                    </Text>
                    <Text style={styles.priceLabel}>/mes</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalAmount}>€{calculateTotal().toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelSmall}>IVA (21%):</Text>
                <Text style={styles.totalAmountSmall}>€{(calculateTotal() * 0.21).toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelFinal}>Total:</Text>
                <Text style={styles.totalAmountFinal}>€{(calculateTotal() * 1.21).toFixed(2)}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkoutButtonGradient}
              >
                <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="payment" size={20} color={colors.headerText} />
                <Text style={styles.checkoutButtonText}>Proceder al Pago</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </React.Fragment>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.headerText,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headerText,
  },
  itemsContainer: {
    flex: 1,
  },
  itemsContent: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.cardShadow,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.badgeDestacado + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.badgeDestacadoText,
    textTransform: 'uppercase',
  },
  removeButton: {
    padding: 8,
  },
  itemInfo: {
    gap: 10,
  },
  localInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemLocalName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  itemPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footer: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    ...commonStyles.cardShadow,
  },
  totalSection: {
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  totalLabelSmall: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  totalAmountSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 12,
  },
  totalLabelFinal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  totalAmountFinal: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  checkoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  checkoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  checkoutButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.headerText,
  },
});
