
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface EstadisticasProps {
  posts: number;
  seguidores: number;
  seguidos: number;
  onPostsPress?: () => void;
  onSeguidoresPress?: () => void;
  onSeguidosPress?: () => void;
}

export default function Estadisticas({
  posts,
  seguidores,
  seguidos,
  onPostsPress,
  onSeguidoresPress,
  onSeguidosPress,
}: EstadisticasProps) {
  const formatearNumero = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.stat} onPress={onPostsPress}>
        <Text style={styles.statNumber}>{formatearNumero(posts)}</Text>
        <Text style={styles.statLabel}>Publicaciones</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.stat} onPress={onSeguidoresPress}>
        <Text style={styles.statNumber}>{formatearNumero(seguidores)}</Text>
        <Text style={styles.statLabel}>Seguidores</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.stat} onPress={onSeguidosPress}>
        <Text style={styles.statNumber}>{formatearNumero(seguidos)}</Text>
        <Text style={styles.statLabel}>Seguidos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  divider: {
    width: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 8,
  },
});
