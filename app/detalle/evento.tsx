
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';

const mockEvento = {
  id: '1',
  titulo: 'Noche de Jazz en Vivo',
  descripcion:
    'Disfruta de una velada única con los mejores músicos de jazz de la ciudad. Ambiente íntimo y sofisticado con cócteles especiales.',
  fecha: '2024-02-15',
  hora: '21:00',
  precio: 15,
  imagen: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
  localNombre: 'Jazz Club Madrid',
  localDireccion: 'Calle Mayor 45, Madrid',
  provincia: 'Madrid',
  entradasVendidas: 75,
  entradasTotales: 100,
  destacado: true,
};

export default function DetalleEventoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [cantidad, setCantidad] = useState(1);

  const porcentajeVendido = Math.round(
    (mockEvento.entradasVendidas / mockEvento.entradasTotales) * 100
  );

  const handleComprar = () => {
    Alert.alert(
      'Confirmar compra',
      `¿Comprar ${cantidad} entrada(s) por ${mockEvento.precio * cantidad}€?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar',
          onPress: () => {
            console.log('Comprar entradas:', { eventoId: mockEvento.id, cantidad });
            Alert.alert('Éxito', 'Entradas compradas correctamente');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.imageContainer}>
          <Image source={{ uri: mockEvento.imagen }} style={styles.image} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonCircle}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </View>
          </TouchableOpacity>
          {mockEvento.destacado && (
            <View style={[commonStyles.badge, commonStyles.badgeDestacado, styles.badge]}>
              <Text style={commonStyles.badgeDestacadoText}>⭐ Destacado</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.titulo}>{mockEvento.titulo}</Text>

          <View style={styles.infoRow}>
            <IconSymbol name="calendar" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              {new Date(mockEvento.fecha).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="clock" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{mockEvento.hora}</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="location" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>{mockEvento.localNombre}</Text>
              <Text style={styles.infoSubtext}>{mockEvento.localDireccion}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.descripcion}>{mockEvento.descripcion}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Disponibilidad</Text>
          <View style={styles.disponibilidadContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${porcentajeVendido}%` }]}
              />
            </View>
            <Text style={styles.disponibilidadText}>
              {mockEvento.entradasVendidas} / {mockEvento.entradasTotales} entradas
              vendidas ({porcentajeVendido}%)
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.precioContainer}>
            <View>
              <Text style={styles.precioLabel}>Precio por entrada</Text>
              <Text style={styles.precio}>{mockEvento.precio}€</Text>
            </View>
            <View style={styles.cantidadContainer}>
              <TouchableOpacity
                style={styles.cantidadButton}
                onPress={() => setCantidad(Math.max(1, cantidad - 1))}
              >
                <IconSymbol name="minus" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.cantidad}>{cantidad}</Text>
              <TouchableOpacity
                style={styles.cantidadButton}
                onPress={() => setCantidad(cantidad + 1)}
              >
                <IconSymbol name="plus" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrecio}>{mockEvento.precio * cantidad}€</Text>
        </View>
        <TouchableOpacity style={styles.comprarButton} onPress={handleComprar}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.comprarGradient}
          >
            <Text style={styles.comprarText}>Comprar Entradas</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
  },
  backButtonCircle: {
    backgroundColor: colors.cardBackground,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 50,
    right: 16,
  },
  content: {
    padding: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  infoSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  descripcion: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  disponibilidadContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  disponibilidadText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  precioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  precioLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  precio: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cantidadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidad: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  totalPrecio: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  comprarButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  comprarGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  comprarText: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
