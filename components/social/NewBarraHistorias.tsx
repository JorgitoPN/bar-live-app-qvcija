
import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

interface NewBarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress: (historia: Historia) => void;
  onCrearHistoria?: () => void;
}

// Story Item Component
const StoryItem = memo(({ 
  historia, 
  onPress 
}: { 
  historia: Historia; 
  onPress: () => void;
}) => {
  const hasBeenViewed = historia.visto_por_usuario === true;
  
  // Preload story image immediately
  useEffect(() => {
    if (historia.imagen) {
      Image.prefetch(historia.imagen).catch(() => {});
    }
  }, [historia.imagen]);
  
  const displayName = useMemo(() => {
    return historia.tipo === 'local'
      ? (historia.autorNombre || 'Local')
      : (historia.autor?.username || historia.autorUsername || historia.autorNombre || historia.autor?.nombre || 'Usuario').replace(/^@/, '');
  }, [historia.tipo, historia.autorNombre, historia.autor?.username, historia.autorUsername, historia.autor?.nombre]);
  
  const gradientColors = useMemo(() => {
    return hasBeenViewed ? ['#E5E7EB', '#E5E7EB'] : ['#FFD700', '#00FF00'];
  }, [hasBeenViewed]);
  
  return (
    <TouchableOpacity
      style={styles.storyContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.storyGradient}
      >
        <View style={styles.storyImageContainer}>
          {historia.autorAvatar ? (
            <Image 
              source={{ uri: historia.autorAvatar }} 
              style={styles.storyImage}
              fadeDuration={0}
            />
          ) : (
            <View style={styles.storyPlaceholder}>
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={32} color={colors.textSecondary} />
            </View>
          )}
        </View>
      </LinearGradient>
      <Text style={styles.storyName} numberOfLines={1}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.historia.id === nextProps.historia.id &&
    prevProps.historia.visto_por_usuario === nextProps.historia.visto_por_usuario &&
    prevProps.historia.autorAvatar === nextProps.historia.autorAvatar
  );
});

StoryItem.displayName = 'StoryItem';

// Create Story Button
const CreateStoryButton = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.createStory} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.createAvatarContainer}>
      <View style={styles.createAvatarBackground}>
        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={36} color={colors.textSecondary} />
      </View>
      <View style={styles.createAddButton}>
        <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={28} color={colors.primary} />
      </View>
    </View>
    <Text style={styles.createText}>Tu historia</Text>
  </TouchableOpacity>
));

CreateStoryButton.displayName = 'CreateStoryButton';

// Main Component
const NewBarraHistorias = memo(function NewBarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
}: NewBarraHistoriasProps) {
  // Preload ALL story images in background
  useEffect(() => {
    const allImages = historias.map(h => h.imagen).filter(Boolean);
    if (allImages.length > 0) {
      console.log('[NewBarraHistorias] Preloading', allImages.length, 'story images...');
      Promise.allSettled(allImages.map(uri => Image.prefetch(uri)))
        .then(results => {
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          console.log('[NewBarraHistorias] ✅ Preloaded', successCount, '/', allImages.length, 'images');
        })
        .catch(() => {});
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
      >
        {/* Create Story Button */}
        {onCrearHistoria && <CreateStoryButton onPress={onCrearHistoria} />}

        {/* Stories */}
        {historias.map((historia) => (
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
  createStory: {
    alignItems: 'center',
    width: 80,
  },
  createAvatarContainer: {
    width: 76,
    height: 76,
    position: 'relative',
    marginBottom: 6,
  },
  createAvatarBackground: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  createAddButton: {
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
  createText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  storyContainer: {
    alignItems: 'center',
    width: 80,
  },
  storyGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 3,
    marginBottom: 6,
  },
  storyImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.cardBackground,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  storyPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default NewBarraHistorias;
