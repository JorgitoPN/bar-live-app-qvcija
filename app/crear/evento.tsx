
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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedLocal } from '@/contexts/SelectedLocalContext';
import { supabase } from '@/utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';

interface LocalConPlan {
  id: string;
  nombre: string;
  provincia: string;
  direccion: string;
  ciudad: string | null;
  suscripcion?: {
    id: string;
    plan_nombre: string;
    eventos_usados_mes: number;
    eventos_disponibles: number;
    creditos_eventos_restantes: number;
    puede_crear_eventos: boolean;
  };
}

export default function CrearEventoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedLocalId } = useSelectedLocal();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [hora, setHora] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [precio, setPrecio] = useState('');
  const [esGratis, setEsGratis] = useState(false);
  const [imagen, setImagen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localData, setLocalData] = useState<LocalConPlan | null>(null);
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);

  const cargarLocalSeleccionado = useCallback(async () => {
    if (!user || !selectedLocalId) {
      Alert.alert(
        'Sin Local Seleccionado',
        'Debes seleccionar un local desde la página de gestión de locales antes de crear un evento.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    try {
      console.log('[CrearEvento] ========================================');
      console.log('[CrearEvento] Loading local:', selectedLocalId);
      console.log('[CrearEvento] User ID:', user.id);

      const { data: localInfo, error: localError } = await supabase
        .from('locales')
        .select('id, nombre, provincia, direccion, ciudad')
        .eq('id', selectedLocalId)
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .single();

      if (localError || !localInfo) {
        console.error('[CrearEvento] Error cargando local:', localError);
        Alert.alert(
          'Error',
          'No se pudo cargar la información del local seleccionado.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.log('[CrearEvento] Local loaded:', localInfo.nombre);

      // ✅ FIX: Fetch subscription and plan separately to avoid cardinality issues
      const { data: suscripcion, error: suscripcionError } = await supabase
        .from('suscripciones_locales')
        .select('id, eventos_usados_mes, creditos_eventos_restantes, plan_id')
        .eq('local_id', localInfo.id)
        .eq('estado', 'activa')
        .single();

      console.log('[CrearEvento] Subscription query result:', { suscripcion, suscripcionError });

      if (suscripcionError) {
        console.error('[CrearEvento] Error fetching subscription:', suscripcionError);
        Alert.alert(
          'Sin Suscripción Activa',
          'El local seleccionado no tiene una suscripción activa. Activa un plan para crear eventos.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Ver Planes',
              onPress: () => {
                router.back();
                router.push(`/gestion/planes-suscripcion?localId=${selectedLocalId}`);
              },
            },
          ]
        );
        return;
      }

      // Fetch plan details separately
      let planNombre = 'basico';
      let eventosDisponibles = 0;

      if (suscripcion?.plan_id) {
        const { data: plan, error: planError } = await supabase
          .from('planes_suscripcion')
          .select('nombre, eventos_mes')
          .eq('id', suscripcion.plan_id)
          .single();

        if (planError) {
          console.error('[CrearEvento] Error fetching plan:', planError);
        } else if (plan) {
          planNombre = plan.nombre || 'basico';
          eventosDisponibles = plan.eventos_mes || 0;
        }
      }

      const eventosUsados = suscripcion?.eventos_usados_mes || 0;
      
      // ✅ FIX: Get creditos_eventos_restantes, if null or undefined, use eventos_mes from plan
      let creditosEventosRestantes = suscripcion?.creditos_eventos_restantes;
      
      console.log('[CrearEvento] Raw creditos_eventos_restantes:', creditosEventosRestantes);
      console.log('[CrearEvento] Type:', typeof creditosEventosRestantes);
      
      // If credits are null/undefined, initialize from plan
      if (creditosEventosRestantes === null || creditosEventosRestantes === undefined) {
        console.log('[CrearEvento] ⚠️ Credits are null/undefined, initializing from plan...');
        creditosEventosRestantes = eventosDisponibles;
        
        // Update the database with the correct credits
        if (suscripcion?.id) {
          const { error: updateError } = await supabase
            .from('suscripciones_locales')
            .update({
              creditos_eventos_restantes: creditosEventosRestantes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', suscripcion.id);
          
          if (updateError) {
            console.error('[CrearEvento] Error initializing credits:', updateError);
          } else {
            console.log('[CrearEvento] ✅ Credits initialized to:', creditosEventosRestantes);
          }
        }
      }
      
      console.log('[CrearEvento] Plan details:');
      console.log('[CrearEvento] - Plan nombre:', planNombre);
      console.log('[CrearEvento] - Eventos disponibles (plan):', eventosDisponibles);
      console.log('[CrearEvento] - Eventos usados este mes:', eventosUsados);
      console.log('[CrearEvento] - Créditos eventos restantes (final):', creditosEventosRestantes);
      
      // ✅ FIXED: Check if can create events based on credits
      // Premium and estandar plans should have credits > 0
      const puedeCrearEventos =
        planNombre !== 'basico' && creditosEventosRestantes > 0;

      console.log('[CrearEvento] - Puede crear eventos:', puedeCrearEventos);
      console.log('[CrearEvento] ========================================');

      if (!puedeCrearEventos) {
        Alert.alert(
          'Sin Créditos de Eventos',
          planNombre === 'basico'
            ? 'El local seleccionado necesita un plan de pago activo para crear eventos. Activa un plan Estándar o Premium para desbloquear esta funcionalidad.'
            : `No tienes créditos de eventos disponibles.\n\nCréditos restantes: ${creditosEventosRestantes}\n\nActualiza a un plan superior o espera a la renovación mensual.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Ver Planes',
              onPress: () => {
                router.back();
                router.push(`/gestion/planes-suscripcion?localId=${selectedLocalId}`);
              },
            },
          ]
        );
        return;
      }

      setLocalData({
        ...localInfo,
        suscripcion: {
          id: suscripcion?.id || '',
          plan_nombre: planNombre,
          eventos_usados_mes: eventosUsados,
          eventos_disponibles: eventosDisponibles,
          creditos_eventos_restantes: creditosEventosRestantes,
          puede_crear_eventos: puedeCrearEventos,
        },
      });
    } catch (error) {
      console.error('[CrearEvento] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al verificar el acceso.');
      router.back();
    } finally {
      setVerificandoAcceso(false);
    }
  }, [user, selectedLocalId, router]);

  useEffect(() => {
    cargarLocalSeleccionado();
  }, [cargarLocalSeleccionado]);

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

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFecha(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setHora(selectedTime);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDisplayDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handlePublicar = async () => {
    if (!titulo || !descripcion || !selectedLocalId || !localData) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (!esGratis && !precio) {
      Alert.alert('Error', 'Por favor indica el precio o marca el evento como gratis');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para crear eventos');
      return;
    }

    if (!localData.suscripcion || localData.suscripcion.creditos_eventos_restantes <= 0) {
      Alert.alert('Error', 'No tienes créditos de eventos disponibles');
      return;
    }

    try {
      setLoading(true);

      console.log('[CrearEvento] ========================================');
      console.log('[CrearEvento] Creating event...');
      console.log('[CrearEvento] Current credits:', localData.suscripcion.creditos_eventos_restantes);

      let imagenUrl = null;
      if (imagen) {
        imagenUrl = await uploadImage(imagen);
      }

      const precioFinal = esGratis ? 0 : (precio ? parseFloat(precio) : null);
      const fechaFormateada = formatDate(fecha);
      const horaFormateada = formatTime(hora);

      const { data, error } = await supabase
        .from('eventos')
        .insert({
          titulo,
          descripcion,
          fecha: fechaFormateada,
          hora: horaFormateada,
          precio: precioFinal,
          provincia: localData.provincia,
          imagen_url: imagenUrl,
          local_id: selectedLocalId,
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

      console.log('[CrearEvento] Event created successfully:', data.id);

      // ✅ FIXED: Update subscription - decrement creditos_eventos_restantes
      const newCredits = Math.max(0, localData.suscripcion.creditos_eventos_restantes - 1);
      const newEventosUsados = (localData.suscripcion.eventos_usados_mes || 0) + 1;

      console.log('[CrearEvento] Updating subscription...');
      console.log('[CrearEvento] - New credits:', newCredits);
      console.log('[CrearEvento] - New eventos usados:', newEventosUsados);

      const { error: updateError } = await supabase
        .from('suscripciones_locales')
        .update({
          eventos_usados_mes: newEventosUsados,
          creditos_eventos_restantes: newCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', localData.suscripcion.id);

      if (updateError) {
        console.error('[CrearEvento] Error updating credits:', updateError);
        Alert.alert('Advertencia', 'El evento se creó pero hubo un error al actualizar los créditos.');
      } else {
        console.log('[CrearEvento] Credits updated successfully');
      }

      console.log('[CrearEvento] ========================================');

      Alert.alert(
        '✅ ¡Éxito!',
        `Evento publicado correctamente.\n\nCrédito consumido: 1\nCréditos restantes: ${newCredits}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('[CrearEvento] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al crear el evento');
    } finally {
      setLoading(false);
    }
  };

  const getLocalAddress = (): string => {
    if (!localData) return '';
    
    let address = localData.direccion || '';
    if (localData.ciudad) {
      address += address ? `, ${localData.ciudad}` : localData.ciudad;
    }
    if (localData.provincia) {
      address += address ? `, ${localData.provincia}` : localData.provincia;
    }
    return address;
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
          {localData && localData.suscripcion && (
            <View style={styles.planInfoBanner}>
              <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
              <View style={styles.planInfoText}>
                <Text style={styles.planInfoTitle}>
                  Local: {localData.nombre}
                </Text>
                <Text style={styles.planInfoSubtitle}>
                  Plan: {localData.suscripcion.plan_nombre.toUpperCase()} • Créditos eventos: {' '}
                  {localData.suscripcion.creditos_eventos_restantes} restantes
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

          {localData && (
            <View style={styles.addressContainer}>
              <View style={styles.addressHeader}>
                <IconSymbol name="location.fill" size={18} color={colors.primary} />
                <Text style={styles.addressLabel}>Ubicación del evento</Text>
              </View>
              <Text style={styles.addressText}>{getLocalAddress()}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título del evento *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Noche de Jazz en vivo"
              placeholderTextColor={colors.textSecondary}
              value={titulo}
              onChangeText={setTitulo}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe el evento..."
              placeholderTextColor={colors.textSecondary}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={6}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Fecha *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <IconSymbol name="calendar" size={20} color={colors.primary} />
                <Text style={styles.dateTimeText}>{formatDisplayDate(fecha)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={fecha}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Hora *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <IconSymbol name="clock.fill" size={20} color={colors.primary} />
                <Text style={styles.dateTimeText}>{formatTime(hora)}</Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={hora}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  is24Hour={true}
                />
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.switchContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Evento Gratis</Text>
                <Text style={styles.switchDescription}>
                  Activa esta opción si el evento es gratuito
                </Text>
              </View>
              <Switch
                value={esGratis}
                onValueChange={(value) => {
                  setEsGratis(value);
                  if (value) {
                    setPrecio('');
                  }
                }}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          {!esGratis && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Precio (€) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={precio}
                onChangeText={setPrecio}
                keyboardType="decimal-pad"
              />
            </View>
          )}

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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  dateTimeButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateTimeText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  addressContainer: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
  },
  addressText: {
    fontSize: 14,
    color: '#0C4A6E',
    lineHeight: 20,
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
