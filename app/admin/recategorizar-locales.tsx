
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/integrations/supabase/client';
import { autoCategorizeLocal, addPubCategoryIfNeeded } from '@/utils/categorizeLocal';
import { LocalCategory } from '@/types';
import { colors } from '@/styles/commonStyles';

export default function RecategorizarLocalesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{
    updated: number;
    skipped: number;
    errors: number;
    details: string[];
  }>({
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  });

  const recategorizeAllLocales = async () => {
    try {
      setLoading(true);
      setResults({ updated: 0, skipped: 0, errors: 0, details: [] });

      // Fetch all locales with their schedules
      const { data: locales, error } = await supabase
        .from('locales')
        .select('id, nombre, barlive_types, horarios_completos, tipos_google')
        .eq('activo', true);

      if (error) throw error;

      if (!locales || locales.length === 0) {
        Alert.alert('Info', 'No se encontraron locales para recategorizar');
        return;
      }

      setProgress({ current: 0, total: locales.length });

      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const details: string[] = [];

      for (let i = 0; i < locales.length; i++) {
        const local = locales[i];
        setProgress({ current: i + 1, total: locales.length });

        try {
          const currentCategories = (local.barlive_types || []) as LocalCategory[];
          
          // Add PUB category if needed based on closing time
          const updatedCategories = addPubCategoryIfNeeded(
            currentCategories,
            local.horarios_completos
          );

          // Check if categories changed
          const categoriesChanged = 
            JSON.stringify(currentCategories.sort()) !== 
            JSON.stringify(updatedCategories.sort());

          if (categoriesChanged) {
            // Update the local with new categories
            const { error: updateError } = await supabase
              .from('locales')
              .update({ barlive_types: updatedCategories })
              .eq('id', local.id);

            if (updateError) {
              console.error(`Error updating ${local.nombre}:`, updateError);
              errors++;
              details.push(`❌ ${local.nombre}: Error al actualizar`);
            } else {
              updated++;
              const addedPub = updatedCategories.includes('pub') && !currentCategories.includes('pub');
              if (addedPub) {
                details.push(
                  `✅ ${local.nombre}: Añadida categoría PUB (${currentCategories.join(', ')} → ${updatedCategories.join(', ')})`
                );
              } else {
                details.push(
                  `✅ ${local.nombre}: Actualizado (${currentCategories.join(', ')} → ${updatedCategories.join(', ')})`
                );
              }
            }
          } else {
            skipped++;
          }
        } catch (err) {
          console.error(`Error processing ${local.nombre}:`, err);
          errors++;
          details.push(`❌ ${local.nombre}: Error al procesar`);
        }
      }

      setResults({ updated, skipped, errors, details });

      Alert.alert(
        'Recategorización Completada',
        `✅ Actualizados: ${updated}\n⏭️ Sin cambios: ${skipped}\n❌ Errores: ${errors}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error recategorizando locales:', error);
      Alert.alert('Error', 'Hubo un error al recategorizar los locales');
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorize = () => {
    Alert.alert(
      'Confirmar Recategorización',
      'Esta acción recategorizará todos los locales activos basándose en sus horarios de cierre.\n\n' +
      'Los locales que cierran después de las 2:00 AM recibirán automáticamente la categoría PUB.\n\n' +
      '¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: recategorizeAllLocales },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recategorizar Locales</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={32} color={colors.primary} />
          <Text style={styles.infoTitle}>Recategorización Automática</Text>
          <Text style={styles.infoText}>
            Esta herramienta recategorizará automáticamente todos los locales activos basándose en sus horarios de cierre.
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Regla principal:</Text> Los locales que cierran después de las 2:00 AM (02:00) recibirán automáticamente la categoría PUB, además de sus categorías existentes.
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Ejemplos:</Text>
          </Text>
          <Text style={styles.exampleText}>• Bar que cierra a las 03:00 → Bar + Pub</Text>
          <Text style={styles.exampleText}>• Discoteca que cierra a las 05:00 → Discoteca + Pub</Text>
          <Text style={styles.exampleText}>• Restaurante que cierra a las 23:00 → Restaurante (sin cambios)</Text>
        </View>

        {/* Action Button */}
        {!loading && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRecategorize}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Iniciar Recategorización</Text>
          </TouchableOpacity>
        )}

        {/* Progress */}
        {loading && (
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.progressText}>
              Procesando... {progress.current} / {progress.total}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Results */}
        {!loading && results.details.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Resultados</Text>
            <View style={styles.resultsSummary}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Actualizados:</Text>
                <Text style={[styles.resultValue, styles.successText]}>{results.updated}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Sin cambios:</Text>
                <Text style={styles.resultValue}>{results.skipped}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Errores:</Text>
                <Text style={[styles.resultValue, styles.errorText]}>{results.errors}</Text>
              </View>
            </View>

            <Text style={styles.detailsTitle}>Detalles:</Text>
            <ScrollView style={styles.detailsScroll}>
              {results.details.map((detail, index) => (
                <Text key={index} style={styles.detailText}>
                  {detail}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
    color: colors.text,
  },
  exampleText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: 20,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 12,
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  resultsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  resultsSummary: {
    marginBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  successText: {
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  detailsScroll: {
    maxHeight: 300,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
});
