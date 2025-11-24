
import React, { memo, useEffect } from 'react';
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

// Memoized story item to prevent unnecessary re-renders
const StoryItem = memo(({ 
  historia, 
  onPress 
}: { 
  historia: Historia; 
  onPress: () => void;
}) => {
  const hasBeenViewed = historia.visto_por_usuario === true;
  
  // ✅ Preload image for instant display
  useEffect(() => {
    if (historia.autorAvatar) {
      Image.prefetch(historia.autorAvatar).catch(() => {
        console.log('[BarraHistorias] Failed to prefetch avatar:', historia.autorAvatar);
      });
    }
  }, [historia.autorAvatar]);
  
  // ✅ CRITICAL FIX: Prioritize username over full name (username does NOT have @ in database)
  // For locals, use the local name directly
  // For users, prioritize username over full name
  const displayName = historia.tipo === 'local'
    ? (historia.autorNombre || 'Local')
    : historia.autor?.username 
      ? historia.autor.username
      : historia.autorUsername
        ? historia.autorUsername
        : (historia.autorNombre || historia.autor?.nombre || 'Usuario');
  
  return (
    <TouchableOpacity
      style={styles.historiaContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={hasBeenViewed ? ['#E5E7EB', '#E5E7EB'] : ['#FFD700', '#00FF00']}
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
            />
          ) : (
            <View style={styles.historiaPlaceholder}>
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.textSecondary} />
            </View>
          )}
        </View>
      </LinearGradient>
      <Text style={styles.historiaNombre} numberOfLines={1}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
});

StoryItem.displayName = 'StoryItem';

// Memoized create story button
const CreateStoryButton = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.crearHistoria} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.avatarWithAddButton}>
      <View style={styles.avatarBackground}>
        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={32} color={colors.textSecondary} />
      </View>
      <View style={styles.addButtonOverlay}>
        <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color={colors.primary} />
      </View>
    </View>
    <Text style={styles.crearText}>Tu historia</Text>
  </TouchableOpacity>
));

CreateStoryButton.displayName = 'CreateStoryButton';

// Main component - memoized to prevent unnecessary re-renders
const BarraHistorias = memo(function BarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
}: BarraHistoriasProps) {
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
        {/* Crear historia */}
        {onCrearHistoria && <CreateStoryButton onPress={onCrearHistoria} />}

        {/* Historias */}
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
    width: 72,
  },
  avatarWithAddButton: {
    width: 68,
    height: 68,
    position: 'relative',
    marginBottom: 6,
  },
  avatarBackground: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    width: 24,
    height: 24,
    borderRadius: 12,
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
    width: 72,
  },
  historiaGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    marginBottom: 6,
  },
  historiaImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
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
