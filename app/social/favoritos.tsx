
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
import { mockLocales } from '@/data/mockData';

export default function FavoritosScreen() {
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
        <Text style={styles.headerTitle}>Favoritos</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {mockLocales.slice(0, 5).map((local) => (
          <TouchableOpacity
            key={local.id}
            style={[commonStyles.card, commonStyles.cardShadow, styles.localCard]}
            onPress={() => router.push(`/detalle/local?id=${local.id}`)}
          >
            <Image source={{ uri: local.imagenes[0] }} style={styles.localImage} />
            <View style={styles.localInfo}>
              <Text style={styles.localNombre}>{local.nombre}</Text>
              <Text style={styles.localTipo}>
                {local.tipo.charAt(0).toUpperCase() + local.tipo.slice(1)}
              </Text>
              <View style={styles.localMeta}>
                <View style={styles.metaItem}>
                  <IconSymbol name="star.fill" size={14} color={colors.badgeDestacado} />
                  <Text style={styles.metaText}>{local.rating}</Text>
                </View>
                <View style={styles.metaItem}>
                  <IconSymbol name="location" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{local.distancia}km</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.favoriteButton}>
              <IconSymbol name="heart.fill" size={24} color={colors.badgeNuevo} />
            </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 16,
  },
  localCard: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  localImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  localInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
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
  localMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
