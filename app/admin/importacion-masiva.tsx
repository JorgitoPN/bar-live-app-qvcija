
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';

interface ImportSource {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  speed: string;
  quality: string;
  advantages: string[];
  icon: string;
  recommended?: boolean;
  route: string;
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: 'google-places',
    title: 'Google Places',
    subtitle: 'Recomendado',
    description: 'Importación directa desde Google Places API con datos completos y verificados',
    speed: 'Media',
    quality: '95%',
    advantages: [
      'Datos verificados',
      'Fotos profesionales',
      'Horarios actualizados',
      'Reviews reales',
    ],
    icon: 'star.fill',
    recommended: true,
    route: '/admin/importacion-google-places',
  },
  {
    id: 'openstreetmap',
    title: 'OpenStreetMap',
    subtitle: 'Gratuito',
    description: 'Base de datos colaborativa de código abierto con cobertura global',
    speed: 'Rápida',
    quality: '70%',
    advantages: [
      'Gratuito',
      'Sin límites',
      'Datos comunitarios',
      'Cobertura amplia',
    ],
    icon: 'map',
    route: '/admin/importacion-osm',
  },
  {
    id: 'enriquecimiento',
    title: 'Enriquecimiento',
    subtitle: 'Híbrido',
    description: 'Mejora locales OSM con datos de Google Places (horarios, fotos, reviews)',
    speed: 'Media',
    quality: '90%',
    advantages: [
      'Lo mejor de ambos',
      'Optimiza costes',
      'Datos completos',
      'Híbrido',
    ],
    icon: 'sparkles',
    route: '/admin/enriquecimiento-google',
  },
  {
    id: 'csv',
    title: 'Archivo CSV',
    subtitle: 'Manual',
    description: 'Importación manual desde archivo CSV para datos personalizados',
    speed: 'Instantánea',
    quality: '85%',
    advantages: [
      'Control total',
      'Datos propios',
      'Flexible',
      'Personalizado',
    ],
    icon: 'doc.text.fill',
    route: '/admin/importacion-csv',
  },
  {
    id: 'sync-photos',
    title: 'Sincronizar Fotos Faltantes',
    subtitle: 'Mantenimiento',
    description: 'Busca y descarga imágenes para locales existentes que no tienen foto de portada',
    speed: 'Lenta',
    quality: '98%',
    advantages: [
      'Mantenimiento',
      'Completa datos',
      'Automático',
      'Visual',
    ],
    icon: 'photo.fill',
    route: '/admin/sincronizar-fotos',
  },
];

export default function ImportacionMasivaScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleImportSource = (source: ImportSource) => {
    router.push(source.route as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Importación Masiva</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>4</Text>
            <Text style={styles.statLabel}>Fuentes disponibles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Validación automática</Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Validación Automática</Text>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="magnifyingglass.circle.fill" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Detección de Duplicados</Text>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="arrow.uturn.backward.circle.fill" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Rollback Automático</Text>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="chart.bar.fill" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Informes Detallados</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Fuentes de Importación</Text>

        {IMPORT_SOURCES.map((source) => (
          <TouchableOpacity
            key={source.id}
            style={[
              styles.sourceCard,
              source.recommended && styles.sourceCardRecommended,
            ]}
            onPress={() => handleImportSource(source)}
          >
            {source.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Recomendado</Text>
              </View>
            )}

            <View style={styles.sourceHeader}>
              <View style={styles.sourceIconContainer}>
                <IconSymbol name={source.icon as any} size={28} color={colors.primary} />
              </View>
              <View style={styles.sourceTitleContainer}>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <Text style={styles.sourceSubtitle}>{source.subtitle}</Text>
              </View>
            </View>

            <Text style={styles.sourceDescription}>{source.description}</Text>

            <View style={styles.sourceMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Velocidad</Text>
                <Text style={styles.metricValue}>{source.speed}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Calidad</Text>
                <Text style={styles.metricValue}>{source.quality}</Text>
              </View>
            </View>

            <View style={styles.advantagesContainer}>
              <Text style={styles.advantagesTitle}>Ventajas:</Text>
              {source.advantages.map((advantage, index) => (
                <View key={index} style={styles.advantageItem}>
                  <IconSymbol name="checkmark" size={14} color={colors.primary} />
                  <Text style={styles.advantageText}>{advantage}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => handleImportSource(source)}
            >
              <Text style={styles.startButtonText}>Comenzar Importación</Text>
              <IconSymbol name="arrow.right" size={16} color="white" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...commonStyles.cardShadow,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...commonStyles.cardShadow,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  sourceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    ...commonStyles.cardShadow,
  },
  sourceCardRecommended: {
    borderColor: colors.primary,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.badgeDestacado,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.badgeDestacadoText,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceTitleContainer: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  sourceSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sourceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  sourceMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  advantagesContainer: {
    marginBottom: 16,
  },
  advantagesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  advantageText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
});
