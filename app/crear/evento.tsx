
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

interface LocalConPlan {
  id: string;
  nombre: string;
  provincia: string;
  suscripcion?: {
    plan_nombre: string;
    eventos_usados_mes: number;
    eventos_disponibles: number;
    puede_crear_eventos: boolean;
  };
}

export default function CrearEventoScreen() {
  const router = useRouter();
  const { localId } = useLocalSearchParams();
  const { user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [precio, setPrecio] = useState('');
  const [provincia, setProvincia] = useState('');
  // FIXED: Removed entradas field as tickets are disabled
  const [imagen, setImagen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [misLocales, setMisLocales] = useState<LocalConPlan[]>([]);
  const [localSeleccionado, setLocalSeleccionado] = useState<string>('');
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);

  const cargarMisLocales = useCallback(async () => {
    if (!user) return;

    try {
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, provincia')
        .eq('propietario_id', user.id)
        .eq('activo', true);

      if (localesError) {
        console.error('[CrearEvento] Error cargando locales:', localesError);
        return;
      }

      if (!localesData || localesData.length === 0) {
        Alert.alert(
          'Sin Locales',
          'Necesitas tener al menos un local registrado para crear eventos.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      const localesConPlan: LocalConPlan[] = await Promise.all(
        localesData.map(async (local) => {
          const { data: suscripcion } = await supabase
            .from('suscripciones_locales')
            .select(`
              eventos_usados_mes,
              planes_suscripcion (
                nombre,
                eventos_mes
              )
            `)
            .eq('local_id', local.id)
            .eq('estado', 'activa')
            .single();

          const planNombre = (suscripcion?.planes_suscripcion as any)?.nombre || 'basico';
          const eventosDisponibles = (suscripcion?.planes_suscripcion as any)?.eventos_mes || 0;
          const eventosUsados = suscripcion?.eventos_usados_mes || 0;
          const puedeCrearEventos =
            planNombre !== 'basico' && (eventosDisponibles === 0 || eventosUsados < eventosDisponibles);

          return {
            ...local,
            suscripcion: {
              plan_nombre: planNombre,
              eventos_usados_mes: eventosUsados,
              eventos_disponibles: eventosDisponibles,
              puede_crear_eventos: puedeCrearEventos,
            },
          };
        })
      );

      const localesConAcceso = localesConPlan.filter((l) => l.suscripcion?.puede_crear_eventos);

      if (localesConAcceso.length === 0) {
        Alert.alert(
          'Plan Requerido',
          'Necesitas un plan de pago activo para crear eventos. Activa un plan Estándar o Premium para desbloquear esta funcionalidad.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Ver Planes',
              onPress: () => {
                router.back();
                const firstLocalId = localesConPlan[0]?.id;
                if (firstLocalId) {
                  router.push(`/gestion/planes-suscripcion?localId=${firstLocalId}`);
                } else {
                  router.push('/gestion/planes-suscripcion');
                }
              },
            },
          ]
        );
        return;
      }

      setMisLocales(localesConAcceso);

      if (localId) {
        const localPreseleccionado = localesConAcceso.find((l) => l.id === localId);
        if (localPreseleccionado) {
          setLocalSeleccionado(localPreseleccionado.id);
          setProvincia(localPreseleccionado.provincia || '');
        } else {
          setLocalSeleccionado(localesConAcceso[0].id);
          setProvincia(localesConAcceso[0].provincia || '');
        }
      } else {
        setLocalSeleccionado(localesConAcceso[0].id);
        setProvincia(localesConAcceso[0].provincia || '');
      }
    } catch (error) {
      console.error('[CrearEvento] Error:', error);
    } finally {
      setVerificandoAcceso(false);
    }
  }, [user, localId, router]);

  useEffect(() => {
    cargarMisLocales();
  }, [cargarMisLocales]);

  const seleccionarImagen = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImagen(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const fileName = `evento_${Date.now()}.jpg`;
      const filePath = `eventos/${user?.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('imagenes')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
        });

      if (error) {
        console.error('[CrearEvento] Error subiendo imagen:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('imagenes')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('[CrearEvento] Error:', error);
      return null;
    }
  };

  const handlePublicar = async () => {
    if (!titulo || !descripcion || !fecha || !hora || !localSeleccionado) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para crear eventos');
      return;
    }

    const localActual = misLocales.find((l) => l.id === localSeleccionado);
    if (!localActual?.suscripcion?.puede_crear_eventos) {
      Alert.alert(
        'Error',
        'Este local no tiene un plan activo que permita crear eventos.',
        [
          {
            text: 'Ver Planes',
            onPress: () => router.push(`/gestion/planes-suscripcion?localId=${localSeleccionado}`),
          },
        ]
      );
      return;
    }

    try {
      setLoading(true);

      let imagenUrl = null;
      if (imagen) {
        imagenUrl = await uploadImage(imagen);
      }

      // FIXED: Removed entradas_totales field
      const { data, error } = await supabase
        .from('eventos')
        .insert({
          titulo,
          descripcion,
          fecha,
          hora,
          precio: precio ? parseFloat(precio) : null,
          provincia,
          imagen_url: imagenUrl,
          local_id: localSeleccionado,
          propietario_id: user.id,
          activo: true,
        })
        .select()
        .single();

      if (error) {
        console.error('[CrearEvento] Error creando evento:', error);
        Alert.alert('Error', 'No se pudo crear el evento. Intenta de nuevo.');
        return;
      }

      const { error: updateError } = await supabase
        .from('suscripciones_locales')
        .update({
          eventos_usados_mes: (localActual.suscripcion.eventos_usados_mes || 0) + 1,
        })
        .eq('local_id', localSeleccionado)
        .eq('estado', 'activa');

      if (updateError) {
        console.error('[CrearEvento] Error updating counter:', updateError);
      }

      console.log('[CrearEvento] Evento creado:', data);
      Alert.alert('¡Éxito!', 'Evento publicado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[CrearEvento] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al crear el evento');
    } finally {
      setLoading(false);
    }
  };

  if (verificandoAcceso) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crear Evento</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verificando acceso...</Text>
        </View>
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
        <Text style={styles.headerTitle}>Crear Evento</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          {misLocales.length > 0 && localSeleccionado && (
            <View style={styles.planInfoBanner}>
              <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
              <View style={styles.planInfoText}>
                <Text style={styles.planInfoTitle}>
                  Plan:{' '}
                  {misLocales
                    .find((l) => l.id === localSeleccionado)
                    ?.suscripcion?.plan_nombre.toUpperCase()}
                </Text>
                <Text style={styles.planInfoSubtitle}>
                  Eventos usados:{' '}
                  {misLocales.find((l) => l.id === localSeleccionado)?.suscripcion
                    ?.eventos_usados_mes || 0}{' '}
                  /{' '}
                  {misLocales.find((l) => l.id === localSeleccionado)?.suscripcion
                    ?.eventos_disponibles || 0}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.imagenContainer} onPress={seleccionarImagen}>
            {imagen ? (
              <Image source={{ uri: imagen }} style={styles.imagen} />
            ) : (
              <View style={styles.imagenPlaceholder}>
                <IconSymbol name="photo" size={48} color={colors.textSecondary} />
                <Text style={styles.imagenText}>Añadir imagen del evento</Text>
              </View>
            )}
          </TouchableOpacity>

          {misLocales.length > 0 && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Local *</Text>
              <View style={styles.localesButtons}>
                {misLocales.map((local) => (
                  <TouchableOpacity
                    key={local.id}
                    style={[
                      styles.localButton,
                      localSeleccionado === local.id && styles.localButtonActive,
                    ]}
                    onPress={() => {
                      setLocalSeleccionado(local.id);
                      setProvincia(local.provincia || '');
                    }}
                  >
                    <Text
                      style={[
                        styles.localButtonText,
                        localSeleccionado === local.id && styles.localButtonTextActive,
                      ]}
                    >
                      {local.nombre}
                    </Text>
                    <Text
                      style={[
                        styles.localButtonPlan,
                        localSeleccionado === local.id && styles.localButtonPlanActive,
                      ]}
                    >
                      {local.suscripcion?.eventos_usados_mes || 0}/
                      {local.suscripcion?.eventos_disponibles || 0}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título del evento *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Noche de Jazz en vivo"
              value={titulo}
              onChangeText={setTitulo}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe el evento..."
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={6}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Fecha *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={fecha}
                onChangeText={setFecha}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Hora *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={hora}
                onChangeText={setHora}
              />
            </View>
          </View>

          {/* FIXED: Removed entradas field - only show precio */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Precio (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={precio}
              onChangeText={setPrecio}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Provincia *</Text>
            <TextInput
              style={styles.input}
              placeholder="Madrid"
              value={provincia}
              onChangeText={setProvincia}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handlePublicar}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color={colors.headerText} />
              ) : (
                <Text style={styles.submitText}>Publicar Evento</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  planInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    marginBottom: 20,
  },
  planInfoText: {
    flex: 1,
  },
  planInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  planInfoSubtitle: {
    fontSize: 12,
    color: '#1E40AF',
  },
  imagenContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imagenPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagenText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  localesButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  localButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
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
    marginBottom: 4,
  },
  localButtonTextActive: {
    color: colors.headerText,
  },
  localButtonPlan: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  localButtonPlanActive: {
    color: colors.headerText,
    opacity: 0.9,
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
