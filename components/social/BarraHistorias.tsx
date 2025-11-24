
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
                  <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.addButton}>
                <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={16} color={colors.headerText} />
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
                  {historia.autorAvatar ? (
                    <Image source={{ uri: historia.autorAvatar }} style={styles.storyImage} />
                  ) : (
                    <View style={styles.storyPlaceholder}>
                      <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                </View>
              </LinearGradient>
              <Text style={styles.storyName} numberOfLines={1}>
                {historia.autorNombre}
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
    gap: 12,
  },
  storyContainer: {
    alignItems: 'center',
    width: 64,
  },
  createStoryWrapper: {
    width: 64,
    height: 64,
    position: 'relative',
    marginBottom: 4,
  },
  createStoryImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardBorder,
    borderWidth: 2,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  storyGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    marginBottom: 4,
  },
  storyImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
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
    fontWeight: '400',
  },
});
