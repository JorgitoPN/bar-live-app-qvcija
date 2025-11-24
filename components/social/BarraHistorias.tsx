
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

interface BarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress: (historia: Historia) => void;
  onCrearHistoria?: () => void;
  userAvatar?: string;
  userName?: string;
}

export default function BarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  userAvatar,
  userName = 'Tu historia',
}: BarraHistoriasProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Create story */}
        {onCrearHistoria && (
          <TouchableOpacity style={styles.storyContainer} onPress={onCrearHistoria} activeOpacity={0.7}>
            <View style={styles.createStoryWrapper}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.createStoryImage} />
              ) : (
                <View style={[styles.createStoryImage, styles.avatarPlaceholder]}>
                  <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={32} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.addButton}>
                <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={18} color={colors.headerText} />
              </View>
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
              Tu historia
            </Text>
          </TouchableOpacity>
        )}

        {/* Stories */}
        {historias.map((historia) => {
          const hasBeenViewed = historia.visto_por_usuario === true;
          const storyAvatar = historia.autorAvatar || historia.autor?.avatar;
          const storyName = historia.autorNombre || historia.autor?.nombre || 'Usuario';
          
          return (
            <TouchableOpacity
              key={historia.id}
              style={styles.storyContainer}
              onPress={() => onHistoriaPress(historia)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={hasBeenViewed ? ['#D1D5DB', '#D1D5DB'] : ['#F59E0B', '#EF4444', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyGradient}
              >
                <View style={styles.storyImageContainer}>
                  {storyAvatar ? (
                    <Image source={{ uri: storyAvatar }} style={styles.storyImage} />
                  ) : (
                    <View style={styles.storyPlaceholder}>
                      <Text style={styles.storyPlaceholderText}>
                        {storyName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
              <Text style={styles.storyName} numberOfLines={1}>
                {storyName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 16,
  },
  storyContainer: {
    alignItems: 'center',
    width: 80,
  },
  createStoryWrapper: {
    width: 80,
    height: 80,
    position: 'relative',
    marginBottom: 6,
  },
  createStoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBorder,
    borderWidth: 3,
    borderColor: colors.cardBackground,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  addButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.cardBackground,
  },
  storyGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    marginBottom: 6,
  },
  storyImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyPlaceholderText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  storyName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '400',
  },
});
