
import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

interface NewBarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress: (historia: Historia) => void;
  onCrearHistoria?: () => void;
  userAvatar?: string;
  userName?: string;
}

// Story Item Component
const StoryItem = memo(({ 
  historia, 
  onPress,
  isOwnStory = false,
}: { 
  historia: Historia; 
  onPress: () => void;
  isOwnStory?: boolean;
}) => {
  const hasBeenViewed = historia.visto_por_usuario === true;
  
  // Preload story image immediately
  useEffect(() => {
    if (historia.imagen) {
      Image.prefetch(historia.imagen).catch(() => {
        console.log('[StoryItem] Failed to prefetch image:', historia.imagen);
      });
    }
  }, [historia.imagen]);
  
  const displayName = useMemo(() => {
    if (isOwnStory) return 'Tu historia';
    return historia.tipo === 'local'
      ? (historia.autorNombre || 'Local')
      : (historia.autor?.username || historia.autorUsername || historia.autorNombre || historia.autor?.nombre || 'Usuario').replace(/^@/, '');
  }, [historia.tipo, historia.autorNombre, historia.autor?.username, historia.autorUsername, historia.autor?.nombre, isOwnStory]);
  
  const gradientColors = useMemo(() => {
    return hasBeenViewed ? ['#E5E7EB', '#E5E7EB'] : ['#FFD700', '#00FF00'];
  }, [hasBeenViewed]);
  
  // Get avatar URL - check all possible sources
  const avatarUrl = useMemo(() => {
    return historia.autorAvatar || historia.autor?.avatar || null;
  }, [historia.autorAvatar, historia.autor?.avatar]);
  
  console.log('[StoryItem] Rendering story:', {
    id: historia.id,
    displayName,
    avatarUrl,
    hasAutor: !!historia.autor,
    autorAvatar: historia.autorAvatar,
    autorAvatarFromObject: historia.autor?.avatar,
  });
  
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
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              style={styles.storyImage}
              fadeDuration={0}
              onError={(error) => {
                console.log('[StoryItem] Error loading avatar:', avatarUrl, error.nativeEvent.error);
              }}
            />
          ) : (
            <View style={styles.storyPlaceholder}>
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={40} color={colors.textSecondary} />
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
    prevProps.historia.autorAvatar === nextProps.historia.autorAvatar &&
    prevProps.historia.autor?.avatar === nextProps.historia.autor?.avatar &&
    prevProps.isOwnStory === nextProps.isOwnStory
  );
});

StoryItem.displayName = 'StoryItem';

// Create Story Button (shown when user has no stories)
const CreateStoryButton = memo(({ 
  onPress,
  userAvatar,
  userName,
}: { 
  onPress: () => void;
  userAvatar?: string;
  userName?: string;
}) => {
  console.log('[CreateStoryButton] Rendering with avatar:', userAvatar);
  
  return (
    <TouchableOpacity style={styles.createStory} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.createAvatarContainer}>
        <View style={styles.createAvatarBackground}>
          {userAvatar ? (
            <Image 
              source={{ uri: userAvatar }} 
              style={styles.userAvatarImage}
              fadeDuration={0}
              onError={(error) => {
                console.log('[CreateStoryButton] Error loading avatar:', userAvatar, error.nativeEvent.error);
              }}
            />
          ) : (
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={44} color={colors.textSecondary} />
          )}
        </View>
        <View style={styles.createAddButton}>
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={32} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.createText}>Tu historia</Text>
    </TouchableOpacity>
  );
});

CreateStoryButton.displayName = 'CreateStoryButton';

// Main Component
const NewBarraHistorias = memo(function NewBarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  userAvatar,
  userName,
}: NewBarraHistoriasProps) {
  const { user } = useAuth();
  
  console.log('[NewBarraHistorias] Rendering with:', {
    historiasCount: historias.length,
    userAvatar,
    userName,
    userId: user?.id,
  });
  
  // Separate user's own stories from others
  const { userStories, otherStories } = useMemo(() => {
    const userStories = historias.filter(h => 
      h.tipo === 'usuario' && h.autor_id === user?.id
    );
    const otherStories = historias.filter(h => 
      !(h.tipo === 'usuario' && h.autor_id === user?.id)
    );
    
    console.log('[NewBarraHistorias] Stories separated:', {
      userStories: userStories.length,
      otherStories: otherStories.length,
    });
    
    return { userStories, otherStories };
  }, [historias, user?.id]);
  
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
        .catch(() => {
          console.log('[NewBarraHistorias] Error preloading images');
        });
    }
  }, [historias]);
  
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {/* User's Own Story or Create Story Button */}
        {user && onCrearHistoria && (
          userStories.length > 0 ? (
            // Show user's story with their avatar
            <StoryItem
              key={userStories[0].id}
              historia={userStories[0]}
              onPress={() => onHistoriaPress(userStories[0])}
              isOwnStory={true}
            />
          ) : (
            // Show create story button with user's avatar
            <CreateStoryButton 
              onPress={onCrearHistoria}
              userAvatar={userAvatar || user.avatar}
              userName={userName || user.nombre}
            />
          )
        )}

        {/* Other Users' Stories */}
        {otherStories.map((historia) => (
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
    prevProps.historias[0]?.visto_por_usuario === nextProps.historias[0]?.visto_por_usuario &&
    prevProps.historias[0]?.autorAvatar === nextProps.historias[0]?.autorAvatar &&
    prevProps.userAvatar === nextProps.userAvatar &&
    prevProps.userName === nextProps.userName
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  createStory: {
    alignItems: 'center',
    width: 96,
  },
  createAvatarContainer: {
    width: 92,
    height: 92,
    position: 'relative',
    marginBottom: 6,
  },
  createAvatarBackground: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  createAddButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    width: 96,
  },
  storyGradient: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 3,
    marginBottom: 6,
  },
  storyImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
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
