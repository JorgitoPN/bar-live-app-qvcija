
import React, { memo, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import type { Historia } from '@/types';

interface BarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress?: (historia: Historia) => void;
  onCrearHistoria?: () => void;
}

// ✅ FIXED: Extracted complex expression to separate variable and added historias to dependency array
const BarraHistorias = memo(function BarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
}: BarraHistoriasProps) {
  const router = useRouter();

  // ✅ Extract complex expressions
  const historiasLength = historias.length;
  const firstHistoriaId = historias[0]?.id;
  
  // ✅ Memoize historias to prevent unnecessary re-renders
  const memoizedHistorias = useMemo(() => historias, [historias, historiasLength, firstHistoriaId]);

  const handleHistoriaPress = (historia: Historia) => {
    if (onHistoriaPress) {
      onHistoriaPress(historia);
    } else {
      router.push({
        pathname: '/detalle/historia',
        params: { id: historia.id },
      });
    }
  };

  const handleCrearHistoria = () => {
    if (onCrearHistoria) {
      onCrearHistoria();
    } else {
      router.push('/crear/historia');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Botón para crear historia */}
        <TouchableOpacity
          style={styles.crearHistoriaContainer}
          onPress={handleCrearHistoria}
        >
          <View style={styles.crearHistoriaCircle}>
            <Text style={styles.crearHistoriaPlus}>+</Text>
          </View>
          <Text style={styles.historiaLabel}>Tu historia</Text>
        </TouchableOpacity>

        {/* Historias existentes */}
        {memoizedHistorias.map((historia, index) => (
          <TouchableOpacity
            key={index}
            style={styles.historiaContainer}
            onPress={() => handleHistoriaPress(historia)}
          >
            <View style={[
              styles.historiaCircle,
              !historia.visto_por_usuario && styles.historiaCircleUnread,
            ]}>
              {historia.media_url ? (
                <Image
                  source={{ uri: historia.media_url }}
                  style={styles.historiaImage}
                />
              ) : (
                <View style={styles.historiaPlaceholder}>
                  <Text style={styles.historiaPlaceholderText}>
                    {historia.usuario_nombre?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.historiaLabel} numberOfLines={1}>
              {historia.usuario_nombre || 'Usuario'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better memoization
  return (
    prevProps.historias.length === nextProps.historias.length &&
    prevProps.historias[0]?.id === nextProps.historias[0]?.id &&
    prevProps.historias[0]?.visto_por_usuario === nextProps.historias[0]?.visto_por_usuario
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  crearHistoriaContainer: {
    alignItems: 'center',
    marginRight: 4,
  },
  crearHistoriaCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crearHistoriaPlus: {
    fontSize: 32,
    color: colors.primary,
    fontWeight: '300',
  },
  historiaContainer: {
    alignItems: 'center',
    marginRight: 4,
  },
  historiaCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    backgroundColor: colors.cardBackground,
  },
  historiaCircleUnread: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  historiaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  historiaPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historiaPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.background,
  },
  historiaLabel: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text,
    maxWidth: 64,
    textAlign: 'center',
  },
});

export default BarraHistorias;
