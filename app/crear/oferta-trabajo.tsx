
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const TIPOS = ['Camarero/a', 'Cocinero/a', 'Barman', 'Gerente', 'Limpieza', 'Seguridad', 'DJ', 'Relaciones Públicas'];

interface LocalConSuscripcion {
  id: string;
  nombre: string;
  provincia: string;
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
      console.log('[OfertaTrabajo] Cargando locales del propietario...');
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, provincia')
        .eq('propietario_id', user.id)
        .eq('activo', true);

      if (error) throw error;

      console.log('[OfertaTrabajo] Locales cargados:', data?.length);
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
      console.error('[OfertaTrabajo] Error cargando locales:', error);
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
          activo: true,
        });

      if (error) throw error;

      Alert.alert('Éxito', 'Oferta de trabajo publicada correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[OfertaTrabajo] Error publicando oferta:', error);
      Alert.alert('Error', 'No se pudo publicar la oferta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

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
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicar Oferta</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Local *</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título del puesto *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Camarero/a con experiencia"
              placeholderTextColor={colors.textSecondary}
              value={titulo}
              onChangeText={setTitulo}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tipo de puesto *</Text>
            <View style={styles.tipoButtons}>
              {TIPOS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tipoButton, tipo === t && styles.tipoButtonActive]}
                  onPress={() => setTipo(t)}
                >
                  <Text
                    style={[
                      styles.tipoButtonText,
                      tipo === t && styles.tipoButtonTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción *</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Salario (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 1.200€ - 1.500€/mes"
              placeholderTextColor={colors.textSecondary}
              value={salario}
              onChangeText={setSalario}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Requisitos (uno por línea)</Text>
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
                <Text style={styles.submitText}>Publicar Oferta</Text>
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
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  localButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  localButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  localButtonTextActive: {
    color: colors.headerText,
  },
  tipoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tipoButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tipoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tipoButtonTextActive: {
    color: colors.headerText,
  },
  submitButton: {
    marginTop: 30,
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
