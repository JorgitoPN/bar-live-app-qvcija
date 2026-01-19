
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserInterests,
  getAdPreferences,
  updateAdPreferences,
} from '@/utils/activityTracker';

const TEMAS_DISPONIBLES = [
  'Alcohol',
  'Apuestas',
  'Tabaco',
  'Contenido para adultos',
  'Política',
  'Religión',
];

export default function PreferenciasAnunciosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intereses, setIntereses] = useState<any[]>([]);
  const [personalizacionActiva, setPersonalizacionActiva] = useState(true);
  const [datosTercerosActivos, setDatosTercerosActivos] = useState(true);
  const [temasBloqueados, setTemasBloqueados] = useState<string[]>([]);

  const cargarDatos = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [interesesData, preferencesData] = await Promise.all([
        getUserInterests(user.id),
        getAdPreferences(user.id),
      ]);

      setIntereses(interesesData);
      setPersonalizacionActiva(preferencesData.personalizacion_activa);
      setDatosTercerosActivos(preferencesData.datos_terceros_activos);
      setTemasBloqueados(preferencesData.temas_bloqueados || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar tus preferencias');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      cargarDatos();
    }
  }, [user, cargarDatos]);

  const guardarPreferencias = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await updateAdPreferences(user.id, {
        personalizacion_activa: personalizacionActiva,
        datos_terceros_activos: datosTercerosActivos,
        temas_bloqueados: temasBloqueados,
      });

      Alert.alert('Éxito', 'Preferencias guardadas correctamente');
    } catch (error) {
      console.error('Error guardando preferencias:', error);
      Alert.alert('Error', 'No se pudieron guardar tus preferencias');
    } finally {
      setSaving(false);
    }
  };

  const toggleTema = (tema: string) => {
    if (temasBloqueados.includes(tema)) {
      setTemasBloqueados(temasBloqueados.filter((t) => t !== tema));
    } else {
      setTemasBloqueados([...temasBloqueados, tema]);
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando preferencias...</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Header */}
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
          <Text style={styles.headerTitle}>Preferencias de Anuncios</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Info section */}
        <View style={styles.infoCard}>
          <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            BarLive utiliza tu actividad para mostrarte anuncios relevantes. Puedes controlar
            qué información se usa y qué tipos de anuncios ves.
          </Text>
        </View>

        {/* Personalization toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalización</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Anuncios personalizados</Text>
              <Text style={styles.settingDescription}>
                Muestra anuncios basados en tus intereses y actividad
              </Text>
            </View>
            <Switch
              value={personalizacionActiva}
              onValueChange={setPersonalizacionActiva}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Datos de terceros</Text>
              <Text style={styles.settingDescription}>
                Permite usar datos de otras apps y sitios web para personalizar anuncios
              </Text>
            </View>
            <Switch
              value={datosTercerosActivos}
              onValueChange={setDatosTercerosActivos}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>
        </View>

        {/* User interests */}
        {intereses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tus intereses inferidos</Text>
            <Text style={styles.sectionDescription}>
              Basado en tu actividad en BarLive
            </Text>
            <View style={styles.interestsList}>
              {intereses.slice(0, 10).map((interes) => (
                <View key={interes.id} style={styles.interestChip}>
                  <Text style={styles.interestText}>{interes.interes}</Text>
                  <View style={styles.interestScore}>
                    <Text style={styles.interestScoreText}>
                      {Math.round(interes.puntuacion)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Blocked topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limitar anuncios sobre</Text>
          <Text style={styles.sectionDescription}>
            Selecciona los temas sobre los que no quieres ver anuncios
          </Text>
          {TEMAS_DISPONIBLES.map((tema) => (
            <TouchableOpacity
              key={tema}
              style={styles.temaItem}
              onPress={() => toggleTema(tema)}
            >
              <Text style={styles.temaLabel}>{tema}</Text>
              <View
                style={[
                  styles.checkbox,
                  temasBloqueados.includes(tema) && styles.checkboxChecked,
                ]}
              >
                {temasBloqueados.includes(tema) && (
                  <IconSymbol name="checkmark" size={16} color={colors.headerText} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={guardarPreferencias}
          disabled={saving}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={styles.saveButtonText}>Guardar Preferencias</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Privacy info */}
        <View style={styles.privacyInfo}>
          <Text style={styles.privacyTitle}>Sobre tu privacidad</Text>
          <Text style={styles.privacyText}>
            • BarLive analiza tu actividad dentro de la app (me gusta, comentarios, búsquedas,
            tiempo de visualización)
          </Text>
          <Text style={styles.privacyText}>
            • Usamos tu ubicación para mostrar contenido y anuncios relevantes de tu zona
          </Text>
          <Text style={styles.privacyText}>
            • Puedes desactivar la personalización en cualquier momento
          </Text>
          <Text style={styles.privacyText}>
            • Tus datos nunca se venden a terceros
          </Text>
        </View>
      </ScrollView>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  interestText: {
    fontSize: 14,
    color: colors.text,
  },
  interestScore: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  interestScoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  temaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  temaLabel: {
    fontSize: 16,
    color: colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  privacyInfo: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
});
