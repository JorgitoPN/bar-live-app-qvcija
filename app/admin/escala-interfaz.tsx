
import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';

const SCALE_OPTIONS = [
  { value: 0.3, label: '30%', description: 'Muy pequeño - Máxima densidad' },
  { value: 0.4, label: '40%', description: 'Pequeño - Alta densidad' },
  { value: 0.5, label: '50%', description: 'Reducido - Más contenido visible' },
  { value: 0.6, label: '60%', description: 'Compacto' },
  { value: 0.7, label: '70%', description: 'Ligeramente reducido' },
  { value: 0.8, label: '80%', description: 'Casi estándar' },
  { value: 0.9, label: '90%', description: 'Levemente reducido' },
  { value: 1.0, label: '100%', description: 'Tamaño estándar (predeterminado)' },
  { value: 1.1, label: '110%', description: 'Levemente ampliado' },
  { value: 1.25, label: '125%', description: 'Ampliado - Mejor legibilidad' },
  { value: 1.4, label: '140%', description: 'Muy ampliado - Máxima accesibilidad' },
];

export default function EscalaInterfazScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [selectedScale, setSelectedScale] = useState(1.0);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      
      // TODO: Backend Integration - Fetch UI scaling configuration
      // Fetch from Supabase app_config table
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'ui_scaling_android')
        .single();

      if (error) {
        console.log('[EscalaInterfaz] No config found, using defaults');
        setEnabled(false);
        setSelectedScale(1.0);
      } else if (data?.value) {
        const config = data.value as { enabled: boolean; scale_factor: number };
        setEnabled(config.enabled || false);
        setSelectedScale(config.scale_factor || 1.0);
      }
    } catch (error) {
      console.error('[EscalaInterfaz] Error loading config:', error);
      Alert.alert('Error', 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // TODO: Backend Integration - Save UI scaling configuration
      // Save to Supabase app_config table
      const { error } = await supabase
        .from('app_config')
        .upsert({
          key: 'ui_scaling_android',
          value: {
            enabled,
            scale_factor: selectedScale,
          },
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert(
        'Guardado',
        'La configuración se aplicará automáticamente en todos los dispositivos Android al reiniciar la app.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[EscalaInterfaz] Error saving:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow-back" 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escala de interfaz (Android)</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <IconSymbol 
            ios_icon_name="info.circle" 
            android_material_icon_name="info" 
            size={20} 
            color={colors.accent} 
          />
          <Text style={styles.infoText}>
            Esta configuración solo afecta a dispositivos Android. Los usuarios de iOS no verán cambios.
          </Text>
        </View>

        {/* Enable/Disable Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Activar escalado</Text>
              <Text style={styles.sectionSubtitle}>
                Habilitar ajuste de escala global para Android
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#767577', true: colors.accent }}
              thumbColor={enabled ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Scale Options */}
        {enabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seleccionar escala</Text>
            <Text style={styles.sectionSubtitle}>
              Ajusta el tamaño de texto, botones, iconos y espaciados
            </Text>

            {SCALE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.scaleOption,
                  selectedScale === option.value && styles.scaleOptionSelected,
                ]}
                onPress={() => setSelectedScale(option.value)}
              >
                <View style={styles.scaleOptionContent}>
                  <View style={styles.scaleOptionLeft}>
                    <Text style={[
                      styles.scaleLabel,
                      selectedScale === option.value && styles.scaleTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.scaleDescription,
                      selectedScale === option.value && styles.scaleTextSelected,
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                  {selectedScale === option.value && (
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check-circle" 
                      size={24} 
                      color={colors.accent} 
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Impact Warning */}
        {enabled && selectedScale !== 1.0 && (
          <View style={[styles.infoBanner, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle" 
              android_material_icon_name="warning" 
              size={20} 
              color="#856404" 
            />
            <Text style={[styles.infoText, { color: '#856404' }]}>
              Los cambios se aplicarán automáticamente en todos los dispositivos Android al reiniciar la app.
              Valores extremos pueden afectar la usabilidad.
            </Text>
          </View>
        )}

        {/* Technical Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles técnicos</Text>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsText}>
              • Afecta: Texto, botones, iconos, paddings, márgenes{'\n'}
              • No afecta: Sombras, bordes mínimos, animaciones{'\n'}
              • Plataforma: Solo Android{'\n'}
              • Aplicación: Automática al reiniciar la app{'\n'}
              • Accesibilidad: Respeta el tamaño de fuente del sistema
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar configuración</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scaleOption: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scaleOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.background,
  },
  scaleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scaleOptionLeft: {
    flex: 1,
  },
  scaleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  scaleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scaleTextSelected: {
    color: colors.accent,
  },
  detailsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detailsText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
