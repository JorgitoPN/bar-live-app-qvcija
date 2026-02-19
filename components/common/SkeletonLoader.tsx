
/**
 * ✅ SKELETON LOADER COMPONENT v1.0 - INSTAGRAM-STYLE LOADING
 * 
 * Componentes de skeleton para diferentes tipos de contenido:
 * - LocalCard: Tarjetas de locales
 * - PostCard: Publicaciones sociales
 * - ProfileHeader: Cabecera de perfil
 * - ListItem: Items de lista genéricos
 * 
 * OBJETIVO: Percepción de carga instantánea con placeholders animados
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * ✅ SKELETON BASE - Elemento básico con animación shimmer
 */
export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: shimmerOpacity,
          },
        ]}
      />
    </View>
  );
}

/**
 * ✅ SKELETON LOCAL CARD - Tarjeta de local
 */
export function SkeletonLocalCard() {
  return (
    <View style={styles.localCard}>
      {/* Imagen */}
      <Skeleton width="100%" height={140} borderRadius={0} />
      
      {/* Contenido */}
      <View style={styles.localCardContent}>
        {/* Nombre */}
        <Skeleton width="70%" height={20} style={{ marginBottom: 8 }} />
        
        {/* Dirección */}
        <View style={styles.localCardRow}>
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width="80%" height={14} style={{ marginLeft: 8 }} />
        </View>
        
        {/* Categorías */}
        <View style={styles.localCardCategories}>
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={100} height={24} borderRadius={12} />
        </View>
        
        {/* Botones */}
        <View style={styles.localCardButtons}>
          <Skeleton width="48%" height={40} borderRadius={8} />
          <Skeleton width="48%" height={40} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

/**
 * ✅ SKELETON POST CARD - Publicación social
 */
export function SkeletonPostCard() {
  return (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.postHeaderInfo}>
          <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
          <Skeleton width={60} height={12} />
        </View>
      </View>
      
      {/* Imagen */}
      <Skeleton width="100%" height={400} borderRadius={0} />
      
      {/* Acciones */}
      <View style={styles.postActions}>
        <Skeleton width={26} height={26} borderRadius={13} />
        <Skeleton width={26} height={26} borderRadius={13} style={{ marginLeft: 16 }} />
        <Skeleton width={26} height={26} borderRadius={13} style={{ marginLeft: 16 }} />
      </View>
      
      {/* Contenido */}
      <View style={styles.postContent}>
        <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  );
}

/**
 * ✅ SKELETON PROFILE HEADER - Cabecera de perfil
 */
export function SkeletonProfileHeader() {
  return (
    <View style={styles.profileHeader}>
      {/* Avatar */}
      <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
      
      {/* Nombre */}
      <Skeleton width={150} height={20} style={{ marginBottom: 8 }} />
      
      {/* Username */}
      <Skeleton width={100} height={14} style={{ marginBottom: 16 }} />
      
      {/* Stats */}
      <View style={styles.profileStats}>
        <View style={styles.profileStat}>
          <Skeleton width={40} height={18} style={{ marginBottom: 4 }} />
          <Skeleton width={60} height={12} />
        </View>
        <View style={styles.profileStat}>
          <Skeleton width={40} height={18} style={{ marginBottom: 4 }} />
          <Skeleton width={60} height={12} />
        </View>
        <View style={styles.profileStat}>
          <Skeleton width={40} height={18} style={{ marginBottom: 4 }} />
          <Skeleton width={60} height={12} />
        </View>
      </View>
      
      {/* Botones */}
      <View style={styles.profileButtons}>
        <Skeleton width="48%" height={36} borderRadius={8} />
        <Skeleton width="48%" height={36} borderRadius={8} />
      </View>
    </View>
  );
}

/**
 * ✅ SKELETON LIST ITEM - Item de lista genérico
 */
export function SkeletonListItem() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.listItemContent}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}

/**
 * ✅ SKELETON GRID - Grid de 3 columnas (para posts en perfil)
 */
export function SkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          width="32%"
          height={120}
          borderRadius={4}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.cardBorder,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Local Card
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localCardContent: {
    padding: 16,
  },
  localCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  localCardCategories: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  localCardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  // Post Card
  postCard: {
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  postActions: {
    flexDirection: 'row',
    padding: 12,
  },
  postContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  profileStat: {
    alignItems: 'center',
  },
  profileButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  
  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  listItemContent: {
    flex: 1,
  },
  
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 2,
    gap: 2,
  },
});
