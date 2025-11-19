
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
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedLocal } from '@/contexts/SelectedLocalContext';
import { supabase } from '@/utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
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
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { selectedLocalId } = useSelectedLocal();
  
  // Check if we're editing an existing event
  const eventoId = params.id as string | undefined;
  const isEditing = !!eventoId;
  
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [horaInicio, setHoraInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [horaFin, setHoraFin] = useState(new Date());
  const [showDateInicioPicker, setShowDateInicioPicker] = useState(false);
  const [showTimeInicioPicker, setShowTimeInicioPicker] = useState(false);
  const [showDateFinPicker, setShowDateFinPicker] = useState(false);
  const [showTimeFinPicker, setShowTimeFinPicker] = useState(false);
  const [precio, setPrecio] = useState('');
  const [esGratis, setEsGratis] = useState(false);
  const [imagen, setImagen] = useState<string | null>(null);
  const [imagenExistente, setImagenExistente] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localData, setLocalData] = useState<LocalConPlan | null>(null);
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);

  // Load existing event data if editing
  const cargarEventoExistente = useCallback(async () => {
    if (!eventoId || !user) return;

    try {
      console.log('[CrearEvento] Loading existing event:', eventoId);

      const { data: eventoData, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .eq('propietario_id', user.id)
        .single();

      if (error || !eventoData) {
        console.error('[CrearEvento] Error loading event:', error);
        Alert.alert(
          'Error',
          'No se pudo cargar el evento para editar.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.log('[CrearEvento] Event loaded for editing:', eventoData);

      // Populate form with existing data
      setTitulo(eventoData.titulo || '');
      setDescripcion(eventoData.descripcion || '');
      
      // Parse start date and time
      if (eventoData.fecha) {
        setFechaInicio(new Date(eventoData.fecha));
      }
      if (eventoData.hora) {
        const [hours, minutes] = eventoData.hora.split(':');
        const horaDate = new Date();
        horaDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setHoraInicio(horaDate);
      }
      
      // Parse end date and time
      if (eventoData.fecha_fin) {
        setFechaFin(new Date(eventoData.fecha_fin));
      } else {
        // Default to same day as start
        setFechaFin(new Date(eventoData.fecha));
      }
      
      if (eventoData.hora_fin) {
        const [hours, minutes] = eventoData.hora_fin.split(':');
        const horaDate = new Date();
        horaDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setHoraFin(horaDate);
      } else {
        // Default to 4 hours after start
        const defaultEnd = new Date();
        if (eventoData.hora) {
          const [hours, minutes] = eventoData.hora.split(':');
          defaultEnd.setHours(parseInt(hours) + 4, parseInt(minutes), 0, 0);
        }
        setHoraFin(defaultEnd);
      }
      
      // Set price
      if (eventoData.precio !== null && eventoData.precio !== undefined) {
        if (eventoData.precio === 0) {
          setEsGratis(true);
          setPrecio('');
        } else {
          setEsGratis(false);
          setPrecio(eventoData.precio.toString());
        }
      }
      
      // Set existing image
      if (eventoData.imagen_url) {
        setImagenExistente(eventoData.imagen_url);
      }

    } catch (error) {
      console.error('[CrearEvento] Error loading event:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar el evento.');
      router.back();
    }
  }, [eventoId, user, router]);

  const cargarLocalSeleccionado = useCallback(async () => {
    if (!user) {
      Alert.alert(
        'Sin Sesión',
        'Debes iniciar sesión para crear eventos.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // If editing, we don't need a selected local
    if (isEditing) {
      await cargarEventoExistente();
      setVerificandoAcceso(false);
      return;
    }

    if (!selectedLocalId) {
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
      let creditosEventosRestantes = suscripcion?.creditos_eventos_restantes;
      
      console.log('[CrearEvento] Raw creditos_eventos_restantes:', creditosEventosRestantes);
      console.log('[CrearEvento] Type:', typeof creditosEventosRestantes);
      
      if (creditosEventosRestantes === null || creditosEventosRestantes === undefined) {
        console.log('[CrearEvento] ⚠️ Credits are null/undefined, initializing from plan...');
        creditosEventosRestantes = eventosDisponibles;
        
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
  }, [user, selectedLocalId, router, isEditing, cargarEventoExistente]);

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
      // Clear existing image when new one is selected
      setImagenExistente(null);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      console.log('[CrearEvento] Starting image upload...');
      console.log('[CrearEvento] Image URI:', uri);
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const fileName = `evento_${Date.now()}.jpg`;
      const filePath = `eventos/${user?.id}/${fileName}`;

      console.log('[CrearEvento] Uploading to bucket: eventos');
      console.log('[CrearEvento] File path:', filePath);

      const { data, error } = await supabase.storage
        .from('eventos')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
        });

      if (error) {
        console.error('[CrearEvento] Error subiendo imagen:', error);
        Alert.alert('Error', `No se pudo subir la imagen: ${error.message}`);
        return null;
      }

      console.log('[CrearEvento] Image uploaded successfully:', data.path);

      const { data: urlData } = supabase.storage
        .from('eventos')
        .getPublicUrl(filePath);

      console.log('[CrearEvento] Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[CrearEvento] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al subir la imagen');
      return null;
    }
  };

  const onDateInicioChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDateInicioPicker(false);
    }
    if (selectedDate) {
      setFechaInicio(selectedDate);
      // Auto-adjust end date if it's before start date
      if (fechaFin < selectedDate) {
        setFechaFin(selectedDate);
      }
    }
  };

  const onTimeInicioChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimeInicioPicker(false);
    }
    if (selectedTime) {
      setHoraInicio(selectedTime);
    }
  };

  const onDateFinChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDateFinPicker(false);
    }
    if (selectedDate) {
      // Ensure end date is not before start date
      if (selectedDate >= fechaInicio) {
        setFechaFin(selectedDate);
      } else {
        Alert.alert('Error', 'La fecha de fin no puede ser anterior a la fecha de inicio');
      }
    }
  };

  const onTimeFinChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimeFinPicker(false);
    }
    if (selectedTime) {
      setHoraFin(selectedTime);
    }
  };

  const closeDateInicioPicker = () => {
    setShowDateInicioPicker(false);
  };

  const closeTimeInicioPicker = () => {
    setShowTimeInicioPicker(false);
  };

  const closeDateFinPicker = () => {
    setShowDateFinPicker(false);
  };

  const closeTimeFinPicker = () => {
    setShowTimeFinPicker(false);
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
    if (!titulo || !descripcion) {
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

    // Validate dates
    const startDateTime = new Date(`${formatDate(fechaInicio)}T${formatTime(horaInicio)}`);
    const endDateTime = new Date(`${formatDate(fechaFin)}T${formatTime(horaFin)}`);
    
    if (endDateTime <= startDateTime) {
      Alert.alert('Error', 'La fecha y hora de fin debe ser posterior a la fecha y hora de inicio');
      return;
    }

    // When editing, we don't need to check credits or selected local
    if (!isEditing) {
      if (!selectedLocalId || !localData) {
        Alert.alert('Error', 'No se ha seleccionado un local');
        return;
      }

      if (!localData.suscripcion || localData.suscripcion.creditos_eventos_restantes <= 0) {
        Alert.alert('Error', 'No tienes créditos de eventos disponibles');
        return;
      }
    }

    try {
      setLoading(true);

      console.log('[CrearEvento] ========================================');
      console.log(isEditing ? '[CrearEvento] Updating event...' : '[CrearEvento] Creating event...');
      if (!isEditing && localData?.suscripcion) {
        console.log('[CrearEvento] Current credits:', localData.suscripcion.creditos_eventos_restantes);
      }

      let imagenUrl = imagenExistente; // Keep existing image by default
      
      // Only upload new image if one was selected
      if (imagen) {
        const uploadedUrl = await uploadImage(imagen);
        if (!uploadedUrl) {
          setLoading(false);
          return;
        }
        imagenUrl = uploadedUrl;
      }

      const precioFinal = esGratis ? 0 : (precio ? parseFloat(precio) : null);
      const fechaInicioFormateada = formatDate(fechaInicio);
      const horaInicioFormateada = formatTime(horaInicio);
      const fechaFinFormateada = formatDate(fechaFin);
      const horaFinFormateada = formatTime(horaFin);

      const eventoData = {
        titulo,
        descripcion,
        fecha: fechaInicioFormateada,
        hora: horaInicioFormateada,
        fecha_fin: fechaFinFormateada,
        hora_fin: horaFinFormateada,
        precio: precioFinal,
        imagen_url: imagenUrl,
      };

      if (isEditing) {
        // Update existing event
        const { error } = await supabase
          .from('eventos')
          .update({
            ...eventoData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventoId)
          .eq('propietario_id', user.id);

        if (error) {
          console.error('[CrearEvento] Error updating event:', error);
          Alert.alert('Error', 'No se pudo actualizar el evento. Intenta de nuevo.');
          return;
        }

        console.log('[CrearEvento] Event updated successfully');
        console.log('[CrearEvento] ========================================');

        Alert.alert(
          '✅ ¡Éxito!',
          'Evento actualizado correctamente.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('eventos')
          .insert({
            ...eventoData,
            provincia: localData!.provincia,
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

        const newCredits = Math.max(0, localData!.suscripcion!.creditos_eventos_restantes - 1);
        const newEventosUsados = (localData!.suscripcion!.eventos_usados_mes || 0) + 1;

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
          .eq('id', localData!.suscripcion!.id);

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
      }
    } catch (error) {
      console.error('[CrearEvento] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar el evento');
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
          <Text style={styles.headerTitle}>{isEditing ? 'Editar Evento' : 'Crear Evento'}</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {isEditing ? 'Cargando evento...' : 'Verificando acceso...'}
          </Text>
        </View>
      </View>
    );
  }

  const displayImage = imagen || imagenExistente;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Evento' : 'Crear Evento'}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              {!isEditing && localData && localData.suscripcion && (
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
                {displayImage ? (
                  <Image source={{ uri: displayImage }} style={styles.imagen} />
                ) : (
                  <View style={styles.imagenPlaceholder}>
                    <IconSymbol name="photo" size={48} color={colors.textSecondary} />
                    <Text style={styles.imagenText}>Añadir imagen del evento</Text>
                  </View>
                )}
              </TouchableOpacity>

              {!isEditing && localData && (
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

              {/* Start Date and Time */}
              <View style={styles.sectionHeader}>
                <IconSymbol name="play.circle.fill" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Inicio del Evento</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Fecha de Inicio *</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowDateInicioPicker(true)}
                  >
                    <IconSymbol name="calendar" size={20} color={colors.primary} />
                    <Text style={styles.dateTimeText}>{formatDisplayDate(fechaInicio)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Hora de Inicio *</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimeInicioPicker(true)}
                  >
                    <IconSymbol name="clock.fill" size={20} color={colors.primary} />
                    <Text style={styles.dateTimeText}>{formatTime(horaInicio)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* End Date and Time */}
              <View style={styles.sectionHeader}>
                <IconSymbol name="stop.circle.fill" size={20} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Fin del Evento</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Fecha de Fin *</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowDateFinPicker(true)}
                  >
                    <IconSymbol name="calendar" size={20} color={colors.secondary} />
                    <Text style={styles.dateTimeText}>{formatDisplayDate(fechaFin)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Hora de Fin *</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimeFinPicker(true)}
                  >
                    <IconSymbol name="clock.fill" size={20} color={colors.secondary} />
                    <Text style={styles.dateTimeText}>{formatTime(horaFin)}</Text>
                  </TouchableOpacity>
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
                  <Text style={styles.priceNote}>
                    Este precio es informativo. No se venderán entradas a través de la app.
                  </Text>
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
                    <Text style={styles.submitText}>
                      {isEditing ? 'Actualizar Evento' : 'Publicar Evento'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Date Inicio Picker Modal */}
      <Modal
        visible={showDateInicioPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDateInicioPicker}
      >
        <TouchableWithoutFeedback onPress={closeDateInicioPicker}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Fecha de Inicio</Text>
                  <TouchableOpacity onPress={closeDateInicioPicker} style={styles.closeButton}>
                    <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={fechaInicio}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateInicioChange}
                  minimumDate={new Date()}
                  textColor={colors.text}
                  style={styles.picker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={closeDateInicioPicker}
                  >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Time Inicio Picker Modal */}
      <Modal
        visible={showTimeInicioPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTimeInicioPicker}
      >
        <TouchableWithoutFeedback onPress={closeTimeInicioPicker}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Hora de Inicio</Text>
                  <TouchableOpacity onPress={closeTimeInicioPicker} style={styles.closeButton}>
                    <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={horaInicio}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeInicioChange}
                  is24Hour={true}
                  textColor={colors.text}
                  style={styles.picker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={closeTimeInicioPicker}
                  >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Fin Picker Modal */}
      <Modal
        visible={showDateFinPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDateFinPicker}
      >
        <TouchableWithoutFeedback onPress={closeDateFinPicker}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Fecha de Fin</Text>
                  <TouchableOpacity onPress={closeDateFinPicker} style={styles.closeButton}>
                    <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={fechaFin}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateFinChange}
                  minimumDate={fechaInicio}
                  textColor={colors.text}
                  style={styles.picker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={closeDateFinPicker}
                  >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Time Fin Picker Modal */}
      <Modal
        visible={showTimeFinPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTimeFinPicker}
      >
        <TouchableWithoutFeedback onPress={closeTimeFinPicker}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Hora de Fin</Text>
                  <TouchableOpacity onPress={closeTimeFinPicker} style={styles.closeButton}>
                    <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={horaFin}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeFinChange}
                  is24Hour={true}
                  textColor={colors.text}
                  style={styles.picker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={closeTimeFinPicker}
                  >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  scrollContent: {
    paddingBottom: 40,
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
  priceNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  picker: {
    width: '100%',
    backgroundColor: colors.white,
  },
  confirmButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
