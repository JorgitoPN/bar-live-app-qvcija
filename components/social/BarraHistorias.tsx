
import React, { memo, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface Historia {
  id: string;
  imagen: string;
  autor_id?: string;
  local_id?: string;
  tipo: 'usuario' | 'local';
  visto_por_usuario?: boolean;
  autor?: {
    id: string;
    nombre: string;
    username: string;
    avatar_url?: string;
  };
  local?: {
    id: string;
    nombre: string;
    avatar_url?: string;
  };
}

interface BarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress: (historia: Historia) => void;
  onCrearHistoria?: () => void;
}

const CreateStoryButton = memo(function CreateStoryButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.storyItem}>
      <View style={styles.createStoryCircle}>
        <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.background} />
      </View>
      <Text style={styles.storyUsername}>Tu historia</Text>
    </TouchableOpacity>
  );
});

const StoryItem = memo(function StoryItem({
  historia,
  onPress,
}: {
  historia: Historia;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.storyItem}>
      <LinearGradient
        colors={historia.visto_por_usuario ? [colors.border, colors.border] : [colors.primary, colors.secondary]}
        style={styles.storyGradient}
      >
        <Image source={{ uri: historia.imagen }} style={styles.storyImage} />
      </LinearGradient>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {historia.tipo === 'usuario' ? historia.autor?.username : historia.local?.nombre}
      </Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.historia.id === nextProps.historia.id &&
    prevProps.historia.visto_por_usuario === nextProps.historia.visto_por_usuario
  );
});

const BarraHistorias = memo(function BarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
}: BarraHistoriasProps) {
  // ✅ FIXED: Removed unnecessary dependencies
  const memoizedHistorias = useMemo(() => historias, [historias]);
  
  useEffect(() => {
    const allStoryImages: string[] = [];
    
    historias.forEach(historia => {
      if (historia.imagen) {
        allStoryImages.push(historia.imagen);
      }
    });
    
    if (allStoryImages.length > 0) {
      console.log('[BarraHistorias] 🚀 Preloading ALL', allStoryImages.length, 'story images...');
      
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
        pagingEnabled={false}
        snapToInterval={100}
        snapToAlignment="start"
        disableIntervalMomentum={true}
      >
        {onCrearHistoria && <CreateStoryButton onPress={onCrearHistoria} />}

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
  return (
    prevProps.historias.length === nextProps.historias.length &&
    prevProps.historias[0]?.id === nextProps.historias[0]?.id &&
    prevProps.historias[0]?.visto_por_usuario === nextProps.historias[0]?.visto_por_usuario
  );
});

export default BarraHistorias;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
  },
  createStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  storyGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    marginBottom: 4,
  },
  storyImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.background,
  },
  storyUsername: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
});
