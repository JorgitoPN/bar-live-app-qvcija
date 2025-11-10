
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface HiddenContent {
  id: string;
  type: 'post' | 'user';
  title: string;
  subtitle?: string;
  image?: string;
  hidden_at: string;
}

export default function ContenidoOcultoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [hiddenContent, setHiddenContent] = useState<HiddenContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHiddenContent();
  }, []);

  const loadHiddenContent = async () => {
    if (!user) return;

    try {
      // In production, load from database
      // For now, show empty state
      setHiddenContent([]);
    } catch (error) {
      console.error('Error loading hidden content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnhide = (contentId: string) => {
    Alert.alert(
      'Mostrar Contenido',
      '¿Estás seguro de que quieres volver a mostrar este contenido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mostrar',
          onPress: async () => {
            // In production, remove from hidden list
            setHiddenContent(hiddenContent.filter(c => c.id !== contentId));
            Alert.alert('Éxito', 'Contenido visible de nuevo');
          },
        },
      ]
    );
  };

  const renderContent = ({ item }: { item: HiddenContent }) => (
    <View style={styles.contentCard}>
      <View style={styles.contentInfo}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <IconSymbol 
              name={item.type === 'post' ? 'photo' : 'person.fill'} 
              size={24} 
              color={colors.textSecondary} 
            />
          </View>
        )}
        <View style={styles.contentDetails}>
          <Text style={styles.contentTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.contentSubtitle}>{item.subtitle}</Text>
          )}
          <Text style={styles.contentType}>
            {item.type === 'post' ? 'Publicación' : 'Usuario'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unhideButton}
        onPress={() => handleUnhide(item.id)}
      >
        <IconSymbol name="eye" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contenido Oculto</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {hiddenContent.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="eye.slash" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No hay contenido oculto</Text>
          <Text style={styles.emptyDescription}>
            El contenido que ocultes aparecerá aquí
          </Text>
        </View>
      ) : (
        <FlatList
          data={hiddenContent}
          renderItem={renderContent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  contentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentDetails: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  contentSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contentType: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  unhideButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
