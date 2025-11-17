
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import FoodPlateAvatar from '@/components/common/FoodPlateAvatar';

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
            <FoodPlateAvatar
              size={72}
              showAddButton={true}
              placeholderIcon="person.fill"
            />
            <Text style={styles.crearText}>Tu historia</Text>
          </TouchableOpacity>
        )}

        {/* Historias */}
        {historias.map((historia) => {
          const hasBeenViewed = historia.visto_por_usuario === true;
          
          return (
            <TouchableOpacity
              key={historia.id}
              style={styles.historiaContainer}
              onPress={() => onHistoriaPress(historia)}
            >
              <FoodPlateAvatar
                imageUrl={historia.autorAvatar}
                size={72}
                hasStory={true}
                isViewed={hasBeenViewed}
                placeholderIcon="person.fill"
                placeholderText={historia.autorNombre}
              />
              <Text style={styles.historiaNombre} numberOfLines={1}>
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
  crearText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginTop: 6,
  },
  historiaContainer: {
    alignItems: 'center',
    width: 72,
  },
  historiaNombre: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginTop: 6,
  },
});
