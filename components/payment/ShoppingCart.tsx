
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

export default function ShoppingCart({ onCheckout, onClose }: ShoppingCartProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
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
  };

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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Carrito de Compras</Text>
          <TouchableOpacity onPress={onClose}>
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando carrito...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Carrito de Compras</Text>
        <TouchableOpacity onPress={onClose}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol ios_icon_name="cart" android_material_icon_name="shopping_cart" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtext}>Añade planes de suscripción para tus locales</Text>
        </View>
      ) : (
        <React.Fragment>
          <ScrollView style={styles.itemsContainer} contentContainerStyle={styles.itemsContent}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemPlanName}>{item.planes_suscripcion.nombre}</Text>
                  <Text style={styles.itemLocalName}>{item.locales.nombre}</Text>
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.planes_suscripcion.descripcion}
                  </Text>
                  <Text style={styles.itemPrice}>
                    €{item.planes_suscripcion.precio_mensual.toFixed(2)}/mes
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeItem(item.id)}
                  disabled={removing === item.id}
                >
                  {removing === item.id ? (
                    <ActivityIndicator size="small" color={colors.badgeDestacado} />
                  ) : (
                    <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color={colors.badgeDestacado} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>€{calculateTotal().toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="payment" size={20} color={colors.white} />
              <Text style={styles.checkoutButtonText}>Proceder al Pago</Text>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
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
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  itemsContainer: {
    flex: 1,
  },
  itemsContent: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...commonStyles.shadow,
  },
  itemInfo: {
    flex: 1,
  },
  itemPlanName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  itemLocalName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});
