
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
}

export default function BarraHistorias({
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
      >
        {/* Crear historia - Avatar unificado con botón de añadir */}
        {onCrearHistoria && (
          <TouchableOpacity style={styles.crearHistoria} onPress={onCrearHistoria}>
            <View style={styles.avatarWithAddButton}>
              <View style={styles.avatarBackground}>
                <IconSymbol name="person.fill" size={32} color={colors.textSecondary} />
              </View>
              <View style={styles.addButtonOverlay}>
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.crearText}>Tu historia</Text>
          </TouchableOpacity>
        )}

        {/* Historias */}
        {historias.map((historia) => (
          <TouchableOpacity
            key={historia.id}
            style={styles.historiaContainer}
            onPress={() => onHistoriaPress(historia)}
          >
            <LinearGradient
              colors={historia.visto ? ['#E5E7EB', '#E5E7EB'] : [colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.historiaGradient}
            >
              <View style={styles.historiaImageContainer}>
                {historia.autorAvatar ? (
                  <Image source={{ uri: historia.autorAvatar }} style={styles.historiaImage} />
                ) : (
                  <View style={styles.historiaPlaceholder}>
                    <IconSymbol name="person.fill" size={24} color={colors.textSecondary} />
                  </View>
                )}
              </View>
            </LinearGradient>
            <Text style={styles.historiaNombre} numberOfLines={1}>
              {historia.autorNombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

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
