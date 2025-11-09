
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';

const mockMisLocales = [
  {
    id: '1',
    nombre: 'Bar Central',
    tipo: 'bar',
    imagen: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
    seguidores: 1234,
    visitas: 5678,
    rating: 4.5,
  },
  {
    id: '2',
    nombre: 'Restaurante La Plaza',
    tipo: 'restaurante',
    imagen: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    seguidores: 890,
    visitas: 3456,
    rating: 4.7,
  },
];

export default function MisLocalesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Locales</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crear/local')}
        >
          <IconSymbol name="plus" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {mockMisLocales.map((local) => (
          <TouchableOpacity
            key={local.id}
            style={[commonStyles.card, commonStyles.cardShadow, styles.localCard]}
            onPress={() => router.push(`/gestion/mi-local?id=${local.id}`)}
          >
            <Image source={{ uri: local.imagen }} style={styles.localImage} />
            <View style={styles.localInfo}>
              <Text style={styles.localNombre}>{local.nombre}</Text>
              <Text style={styles.localTipo}>
                {local.tipo.charAt(0).toUpperCase() + local.tipo.slice(1)}
              </Text>

              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <IconSymbol name="person.2" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{local.seguidores}</Text>
                </View>
                <View style={styles.stat}>
                  <IconSymbol name="eye" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{local.visitas}</Text>
                </View>
                <View style={styles.stat}>
                  <IconSymbol name="star.fill" size={16} color={colors.badgeDestacado} />
                  <Text style={styles.statText}>{local.rating}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push(`/editar/local?id=${local.id}`)}
                >
                  <IconSymbol name="pencil" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push(`/gestion/estadisticas-local?id=${local.id}`)}
                >
                  <IconSymbol name="chart.bar" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Estadísticas</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  localCard: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  localImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  localInfo: {
    flex: 1,
    marginLeft: 12,
  },
  localNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localTipo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
