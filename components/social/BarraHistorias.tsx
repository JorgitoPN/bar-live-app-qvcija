
import React, { memo, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

interface BarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress: (historia: Historia) => void;
  onCrearHistoria?: () => void;
}

// ✅ ULTRA-OPTIMIZED: Memoized story item with INSTANT image preloading
const StoryItem = memo(({ 
  historia, 
  onPress 
}: { 
  historia: Historia; 
  onPress: () => void;
}) => {
  const hasBeenViewed = historia.visto_por_usuario === true;
  
  // ✅ CRITICAL: Preload BOTH avatar AND story image immediately
  useEffect(() => {
    const imagesToPreload: string[] = [];
    
    if (historia.autorAvatar) {
      imagesToPreload.push(historia.autorAvatar);
    }
    
    // ✅ CRITICAL: Preload story image IMMEDIATELY when avatar is visible
    if (historia.imagen) {
      imagesToPreload.push(historia.imagen);
    }
    
    if (imagesToPreload.length > 0) {
      // Preload in parallel without blocking
      Promise.allSettled(imagesToPreload.map(uri => Image.prefetch(uri)))
        .catch(() => {
          console.log('[BarraHistorias] Failed to prefetch images for story:', historia.id);
        });
    }
  }, [historia.autorAvatar, historia.imagen, historia.id]);
  
  // ✅ Memoize display name
  const displayName = useMemo(() => {
    return historia.tipo === 'local'
      ? (historia.autorNombre || 'Local')
      : (historia.autor?.username || historia.autorUsername || historia.autorNombre || historia.autor?.nombre || 'Usuario').replace(/^@/, '');
  }, [historia.tipo, historia.autorNombre, historia.autor?.username, historia.autorUsername, historia.autor?.nombre]);
  
  // ✅ Memoize gradient colors
  const gradientColors = useMemo(() => {
    return hasBeenViewed ? ['#E5E7EB', '#E5E7EB'] : ['#FFD700', '#00FF00'];
  }, [hasBeenViewed]);
  
  return (
    <TouchableOpacity
      style={styles.historiaContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.historiaGradient}
      >
        <View style={styles.historiaImageContainer}>
          {historia.autorAvatar ? (
            <Image 
              source={{ uri: historia.autorAvatar }} 
              style={styles.historiaImage}
              fadeDuration={0}
              cache="force-cache"
              resizeMethod="resize"
            />
          ) : (
            <View style={styles.historiaPlaceholder}>
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={32} color={colors.textSecondary} />
            </View>
          )}
        </View>
      </LinearGradient>
      <Text style={styles.historiaNombre} numberOfLines={1}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // ✅ Only re-render if essential props change
  return (
    prevProps.historia.id === nextProps.historia.id &&
    prevProps.historia.visto_por_usuario === nextProps.historia.visto_por_usuario &&
    prevProps.historia.autorAvatar === nextProps.historia.autorAvatar
  );
});

StoryItem.displayName = 'StoryItem';

// Memoized create story button
const CreateStoryButton = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.crearHistoria} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.avatarWithAddButton}>
      <View style={styles.avatarBackground}>
        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={40} color={colors.textSecondary} />
      </View>
      <View style={styles.addButtonOverlay}>
        <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={28} color={colors.primary} />
      </View>
    </View>
    <Text style={styles.crearText}>Tu historia</Text>
  </TouchableOpacity>
));

CreateStoryButton.displayName = 'CreateStoryButton';

// ✅ ULTRA-OPTIMIZED: Main component with aggressive memoization
const BarraHistorias = memo(function BarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
}: BarraHistoriasProps) {
  // ✅ Memoize historias to prevent unnecessary re-renders
  const memoizedHistorias = useMemo(() => historias, [historias.length, historias[0]?.id]);
  
  // ✅ CRITICAL: Preload ALL story images when component mounts
  useEffect(() => {
    const allStoryImages: string[] = [];
    
    historias.forEach(historia => {
      if (historia.imagen) {
        allStoryImages.push(historia.imagen);
      }
    });
    
    if (allStoryImages.length > 0) {
      console.log('[BarraHistorias] 🚀 Preloading ALL', allStoryImages.length, 'story images...');
      
      // Preload in background without blocking
      Promise.allSettled(allStoryImages.map(uri => Image.prefetch(uri)))
        .then(results => {
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          console.log('[BarraHistorias] ✅ Preloaded', successCount, '/', allStoryImages.length, 'story images');
        })
        .catch(() => {
          console.log('[BarraHistorias] ⚠️ Some story images failed to preload');
        });
    }
  }, [historias]);
  
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        decelerationRate="fast"
        // ✅ Performance optimizations
        pagingEnabled={false}
        snapToInterval={100}
        snapToAlignment="start"
        disableIntervalMomentum={true}
      >
        {/* Crear historia */}
        {onCrearHistoria && <CreateStoryButton onPress={onCrearHistoria} />}

        {/* Historias */}
        {memoizedHistorias.map((historia) => (
          <StoryItem
            key={historia.id}
            historia={historia}
            onPress={() => onHistoriaPress(historia)}
          />
        ))}
      </ScrollView>
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better memoization
  return (
    prevProps.historias.length === nextProps.historias.length &&
    prevProps.historias[0]?.id === nextProps.historias[0]?.id &&
    prevProps.historias[0]?.visto_por_usuario === nextProps.historias[0]?.visto_por_usuario
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  crearHistoria: {
    alignItems: 'center',
    width: 88,
  },
  avatarWithAddButton: {
    width: 84,
    height: 84,
    position: 'relative',
    marginBottom: 6,
  },
  avatarBackground: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addButtonOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  crearText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  historiaContainer: {
    alignItems: 'center',
    width: 88,
  },
  historiaGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    padding: 2,
    marginBottom: 6,
  },
  historiaImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.cardBackground,
  },
  historiaImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  historiaPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historiaNombre: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
});

export default BarraHistorias;
