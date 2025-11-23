
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
  currentUserAvatar?: string;
}

export default function BarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  currentUserAvatar,
}: BarraHistoriasProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Crear historia - Avatar unificado con botón de añadir */}
        {onCrearHistoria && (
          <TouchableOpacity style={styles.crearHistoria} onPress={onCrearHistoria}>
            <View style={styles.avatarWithAddButton}>
              <View style={styles.avatarBackground}>
                {currentUserAvatar ? (
                  <Image source={{ uri: currentUserAvatar }} style={styles.userAvatar} />
                ) : (
                  <IconSymbol 
                    ios_icon_name="person.fill" 
                    android_material_icon_name="person" 
                    size={40} 
                    color={colors.textSecondary} 
                  />
                )}
              </View>
              <View style={styles.addButtonOverlay}>
                <IconSymbol 
                  ios_icon_name="plus.circle.fill" 
                  android_material_icon_name="add_circle" 
                  size={32} 
                  color={colors.primary} 
                />
              </View>
            </View>
            <Text style={styles.crearText}>Tu historia</Text>
          </TouchableOpacity>
        )}

        {/* Historias */}
        {historias.map((historia) => {
          // Check if the story has been viewed by the current user
          const hasBeenViewed = historia.visto_por_usuario === true;
          
          // Display username WITHOUT @ symbol
          const displayName = historia.tipo === 'local' 
            ? historia.autorNombre // Locals use their name
            : historia.autorUsername || historia.autorNombre; // Users should have username
          
          return (
            <TouchableOpacity
              key={historia.id}
              style={styles.historiaContainer}
              onPress={() => onHistoriaPress(historia)}
            >
              <LinearGradient
                colors={hasBeenViewed ? ['#E5E7EB', '#E5E7EB'] : ['#FFD700', '#00FF00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.historiaGradient}
              >
                <View style={styles.historiaImageContainer}>
                  {historia.autorAvatar ? (
                    <Image source={{ uri: historia.autorAvatar }} style={styles.historiaImage} />
                  ) : (
                    <View style={styles.historiaPlaceholder}>
                      <IconSymbol 
                        ios_icon_name="person.fill" 
                        android_material_icon_name="person" 
                        size={32} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  )}
                </View>
              </LinearGradient>
              <Text style={styles.historiaNombre} numberOfLines={1}>
                {displayName}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 16,
  },
  crearHistoria: {
    alignItems: 'center',
    width: 90,
  },
  avatarWithAddButton: {
    width: 86,
    height: 86,
    position: 'relative',
    marginBottom: 8,
  },
  avatarBackground: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
  },
  addButtonOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  crearText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  historiaContainer: {
    alignItems: 'center',
    width: 90,
  },
  historiaGradient: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    marginBottom: 8,
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
