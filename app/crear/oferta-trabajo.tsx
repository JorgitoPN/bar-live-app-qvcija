
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ✅ OFERTA TRABAJO v2.0 - EXPANDED EXPERIENCE OPTIONS
 * 
 * NEW CHANGES v2.0:
 * - ✅ Added comprehensive nightlife industry job categories
 * - ✅ Organized by sections: Barra y bebidas, Música y ambiente, Seguridad y control, etc.
 * - ✅ Total of 30+ job position options
 * - ✅ Emoji icons for better visual organization
 * - ✅ Matches options from perfil-profesional.tsx for consistency
 */

const TIPOS = [
  // 🍸 Barra y bebidas
  { id: 'camarero', label: 'Camarero/a', icon: '🍸', category: 'Barra y bebidas' },
  { id: 'bartender', label: 'Bartender / Barman / Barmaid', icon: '🍸', category: 'Barra y bebidas' },
  { id: 'coctelero', label: 'Coctelero/a', icon: '🍸', category: 'Barra y bebidas' },
  { id: 'ayudante_camarero', label: 'Ayudante de camarero/a', icon: '🍸', category: 'Barra y bebidas' },
  { id: 'barback', label: 'Barback (apoyo de barra)', icon: '🍸', category: 'Barra y bebidas' },
  
  // 🎧 Música y ambiente
  { id: 'dj', label: 'DJ', icon: '🎧', category: 'Música y ambiente' },
  { id: 'dj_residente', label: 'DJ residente', icon: '🎧', category: 'Música y ambiente' },
  { id: 'tecnico_sonido', label: 'Técnico/a de sonido', icon: '🎧', category: 'Música y ambiente' },
  { id: 'tecnico_iluminacion', label: 'Técnico/a de iluminación', icon: '🎧', category: 'Música y ambiente' },
  { id: 'vj', label: 'VJ (visual jockey)', icon: '🎧', category: 'Música y ambiente' },
  
  // 🛡️ Seguridad y control
  { id: 'portero', label: 'Portero/a / Controlador/a de acceso', icon: '🛡️', category: 'Seguridad y control' },
  { id: 'jefe_seguridad', label: 'Jefe/a de seguridad', icon: '🛡️', category: 'Seguridad y control' },
  { id: 'vigilante', label: 'Vigilante de seguridad', icon: '🛡️', category: 'Seguridad y control' },
  
  // 🎉 Sala y atención al cliente
  { id: 'rrpp', label: 'Relaciones públicas (RRPP)', icon: '🎉', category: 'Sala y atención al cliente' },
  { id: 'hostess', label: 'Hostess / Anfitrión/a', icon: '🎉', category: 'Sala y atención al cliente' },
  { id: 'animador', label: 'Animador/a', icon: '🎉', category: 'Sala y atención al cliente' },
  { id: 'gogodancer', label: 'Go-go dancer', icon: '🎉', category: 'Sala y atención al cliente' },
  { id: 'performer', label: 'Performer / Artista de espectáculo', icon: '🎉', category: 'Sala y atención al cliente' },
  
  // 🧹 Logística y apoyo
  { id: 'limpieza', label: 'Personal de limpieza', icon: '🧹', category: 'Logística y apoyo' },
  { id: 'mozo_almacen', label: 'Mozo/a de almacén', icon: '🧹', category: 'Logística y apoyo' },
  { id: 'montador_eventos', label: 'Montador/a de eventos', icon: '🧹', category: 'Logística y apoyo' },
  
  // 📋 Gestión y organización
  { id: 'encargado_sala', label: 'Encargado/a de sala', icon: '📋', category: 'Gestión y organización' },
  { id: 'supervisor', label: 'Supervisor/a de turno', icon: '📋', category: 'Gestión y organización' },
  { id: 'gerente', label: 'Gerente de discoteca', icon: '📋', category: 'Gestión y organización' },
  { id: 'director_eventos', label: 'Director/a de eventos', icon: '📋', category: 'Gestión y organización' },
  { id: 'promotor', label: 'Promotor/a de fiestas', icon: '📋', category: 'Gestión y organización' },
  
  // 💼 Administración y marketing
  { id: 'community_manager', label: 'Community manager', icon: '💼', category: 'Administración y marketing' },
  { id: 'responsable_marketing', label: 'Responsable de marketing', icon: '💼', category: 'Administración y marketing' },
  { id: 'responsable_reservas', label: 'Responsable de reservas y listas', icon: '💼', category: 'Administración y marketing' },
  { id: 'taquillero', label: 'Taquillero/a', icon: '💼', category: 'Administración y marketing' },
  
  // 👨‍🍳 Cocina (legacy - mantener compatibilidad)
  { id: 'cocinero', label: 'Cocinero/a', icon: '👨‍🍳', category: 'Cocina' },
];

// Group positions by category for better UI organization
const groupedTipos = TIPOS.reduce((acc, tipo) => {
  const category = tipo.category;
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(tipo);
  return acc;
}, {} as Record<string, typeof TIPOS>);

interface LocalConSuscripcion {
  id: string;
  nombre: string;
  provincia: string;
  imagen_url?: string;
}

export default function CrearOfertaTrabajoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingLocales, setLoadingLocales] = useState(true);
  
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('');
  const [salario, setSalario] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [localSeleccionado, setLocalSeleccionado] = useState<string>('');
  const [misLocales, setMisLocales] = useState<LocalConSuscripcion[]>([]);

  const cargarMisLocales = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[OfertaTrabajo v2.0] Cargando locales del propietario...');
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, provincia, imagen_url')
        .eq('propietario_id', user.id)
        .eq('activo', true);

      if (error) throw error;

      console.log('[OfertaTrabajo v2.0] Locales cargados:', data?.length);
      setMisLocales(data || []);

      if (data && data.length > 0) {
        setLocalSeleccionado(data[0].id);
      } else {
        Alert.alert(
          'Sin Locales',
          'No tienes locales registrados. Debes registrar un local primero.',
          [
            { text: 'Cancelar', onPress: () => router.back() },
            { text: 'Registrar Local', onPress: () => router.push('/crear/local') }
          ]
        );
      }
    } catch (error) {
      console.error('[OfertaTrabajo v2.0] Error cargando locales:', error);
      Alert.alert('Error', 'No se pudieron cargar tus locales');
    } finally {
      setLoadingLocales(false);
    }
  }, [user, router]);

  useEffect(() => {
    cargarMisLocales();
  }, [cargarMisLocales]);

  const handlePublish = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para publicar ofertas');
      return;
    }

    if (!titulo || !descripcion || !tipo || !localSeleccionado) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);

    try {
      const localData = misLocales.find(l => l.id === localSeleccionado);

      // Parse requisitos as array
      const requisitosArray = requisitos
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const { error } = await supabase
        .from('ofertas_trabajo')
        .insert({
          titulo,
          descripcion,
          tipo,
          salario: salario || null,
          requisitos: requisitosArray.length > 0 ? requisitosArray : null,
          local_id: localSeleccionado,
          propietario_id: user.id,
          provincia: localData?.provincia,
          imagen_url: localData?.imagen_url || null,
          activo: true,
        });

      if (error) throw error;

      Alert.alert('Éxito', 'Oferta de trabajo publicada correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[OfertaTrabajo v2.0] Error publicando oferta:', error);
      Alert.alert('Error', 'No se pudo publicar la oferta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const localSeleccionadoData = misLocales.find(l => l.id === localSeleccionado);

  if (loadingLocales) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicar Oferta</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Preview de la foto del local */}
          {localSeleccionadoData?.imagen_url && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Foto de portada (del local)</Text>
              <Image 
                source={{ uri: localSeleccionadoData.imagen_url }} 
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
          )}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="business" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Local</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Selecciona el local *</Text>
              <View style={styles.localButtons}>
                {misLocales.map((local) => (
                  <TouchableOpacity
                    key={local.id}
                    style={[
                      styles.localButton,
                      localSeleccionado === local.id && styles.localButtonActive,
                    ]}
                    onPress={() => setLocalSeleccionado(local.id)}
                  >
                    <Text
                      style={[
                        styles.localButtonText,
                        localSeleccionado === local.id && styles.localButtonTextActive,
                      ]}
                    >
                      {local.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="doc.text.fill" android_material_icon_name="description" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Detalles de la Oferta</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Título del puesto *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Camarero/a con experiencia"
                placeholderTextColor={colors.textSecondary}
                value={titulo}
                onChangeText={setTitulo}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Tipo de puesto *</Text>
              <ScrollView 
                style={styles.tipoScrollContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {Object.entries(groupedTipos).map(([category, tipos]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <View style={styles.tipoButtons}>
                      {tipos.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.tipoButton, tipo === t.id && styles.tipoButtonActive]}
                          onPress={() => setTipo(t.id)}
                        >
                          <Text style={styles.tipoIcon}>{t.icon}</Text>
                          <Text
                            style={[
                              styles.tipoButtonText,
                              tipo === t.id && styles.tipoButtonTextActive,
                            ]}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Descripción *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe las responsabilidades del puesto..."
                placeholderTextColor={colors.textSecondary}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Salario (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 1.200€ - 1.500€/mes"
                placeholderTextColor={colors.textSecondary}
                value={salario}
                onChangeText={setSalario}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Requisitos (uno por línea)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Experiencia mínima&#10;Idiomas&#10;Disponibilidad..."
                placeholderTextColor={colors.textSecondary}
                value={requisitos}
                onChangeText={setRequisitos}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handlePublish}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color={colors.headerText} />
              ) : (
                <React.Fragment>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.headerText} />
                  <Text style={styles.submitText}>Publicar Oferta</Text>
                </React.Fragment>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
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
  },
  form: {
    padding: 16,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '20',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  floatingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  localButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  localButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  localButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  localButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  localButtonTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  tipoScrollContainer: {
    maxHeight: 400,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    paddingLeft: 4,
  },
  tipoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  tipoButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tipoIcon: {
    fontSize: 16,
  },
  tipoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  tipoButtonTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: {
    color: colors.headerText,
    fontSize: 17,
    fontWeight: 'bold',
  },
});
