
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { WebView } from 'react-native-webview';

const MAX_GALLERY_IMAGES = 5;

interface LocalFormData {
  nombre: string;
  tipo: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  telefono: string;
  email: string;
  web: string;
  latitud: number | null;
  longitud: number | null;
  horarios: Record<string, { abierto: boolean; apertura: string; cierre: string }>;
  servicios: string[];
  portada_url: string | null;
  galeria_urls: string[];
  ambiente: string[];
  musica: string[];
  tipos_cocina: string[];
  clientela: Record<string, boolean>;
  metodos_pago: Record<string, boolean>;
}

const TIPOS_LOCAL = [
  { value: 'cafe', label: 'Cafetería', icon: 'cup.and.saucer.fill' },
  { value: 'restaurante', label: 'Restaurante', icon: 'fork.knife' },
  { value: 'bar', label: 'Bar', icon: 'wineglass.fill' },
  { value: 'pub', label: 'Pub', icon: 'mug.fill' },
  { value: 'discoteca', label: 'Discoteca', icon: 'music.note' },
  { value: 'cocteleria', label: 'Coctelería', icon: 'wineglass' },
];

const SERVICIOS_DISPONIBLES = [
  'WiFi gratuito',
  'Terraza',
  'Parking',
  'Accesible',
  'Música en vivo',
  'Reservas',
  'Delivery',
  'Takeaway',
  'Pet friendly',
  'Aire acondicionado',
];

const AMBIENTE_OPTIONS = [
  'Acogedor',
  'Romántico',
  'Elegante',
  'Moderno',
  'De moda',
  'Animado',
  'Juvenil',
  'Tranquilo',
  'Familiar',
  'Temático',
];

const MUSICA_OPTIONS = [
  'Ambiental',
  'En vivo',
  'DJ',
  'Rock',
  'Pop',
  'Electrónica',
  'Jazz',
  'Latina',
  'Reggaeton',
  'Indie',
];

const TIPOS_COCINA = [
  'Mediterránea',
  'Española',
  'Italiana',
  'Japonesa',
  'Mexicana',
  'Asiática',
  'Tradicional',
  'Fusión',
  'Vegetariana',
  'Vegana',
];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * ✅ CREAR LOCAL v244.0 - FIXED BUTTON CUTOFF
 * 
 * CRITICAL FIX v244.0:
 * - ✅ FIXED: Continue button no longer cut off at bottom
 * - ✅ FIXED: Increased footer paddingBottom to 24px (was 16px on Android)
 * - ✅ FIXED: Added extra safe area padding for devices with notches
 * - ✅ FIXED: Footer now matches "Anterior" button visibility
 * - ✅ Both buttons now fully visible on all devices
 * 
 * Previous fixes maintained (v10.0):
 * - ✅ FIXED: Bottom button no longer cut off - proper padding added
 * - ✅ FIXED: Dimensions.get('window') error - using useWindowDimensions hook
 * - ✅ OSM map viewer for precise location selection (Step 2) - ALWAYS VISIBLE
 * - ✅ Full preview matching local details page exactly
 * - ✅ All local information, images, gallery, and functions
 * - ✅ Complete consistency with enriched Google locals
 * - ✅ Duplicate local prevention - checks before creation
 */

export default function CrearLocalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const webViewRef = useRef<WebView>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<LocalFormData>({
    nombre: '',
    tipo: '',
    descripcion: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    codigo_postal: '',
    telefono: '',
    email: '',
    web: '',
    latitud: null,
    longitud: null,
    horarios: {},
    servicios: [],
    portada_url: null,
    galeria_urls: [],
    ambiente: [],
    musica: [],
    tipos_cocina: [],
    clientela: {},
    metodos_pago: {},
  });

  // Initialize horarios with default values
  useEffect(() => {
    const defaultHorarios: Record<string, { abierto: boolean; apertura: string; cierre: string }> = {};
    DIAS_SEMANA.forEach(dia => {
      defaultHorarios[dia] = { abierto: true, apertura: '09:00', cierre: '22:00' };
    });
    setFormData(prev => ({ ...prev, horarios: defaultHorarios }));
  }, []);

  const updateFormData = (field: keyof LocalFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectCoverPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar la foto de portada');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateFormData('portada_url', result.assets[0].uri);
    }
  };

  const handleSelectGalleryImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar imágenes');
      return;
    }

    const remainingSlots = MAX_GALLERY_IMAGES - formData.galeria_urls.length;
    if (remainingSlots <= 0) {
      Alert.alert('Límite alcanzado', `Solo puedes añadir hasta ${MAX_GALLERY_IMAGES} imágenes a la galería`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map(asset => asset.uri);
      updateFormData('galeria_urls', [...formData.galeria_urls, ...newImages]);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    const newGallery = [...formData.galeria_urls];
    newGallery.splice(index, 1);
    updateFormData('galeria_urls', newGallery);
  };

  const handleGetCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu ubicación');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        updateFormData('latitud', location.coords.latitude);
        updateFormData('longitud', location.coords.longitude);
        
        if (place.street) updateFormData('direccion', place.street);
        if (place.city) updateFormData('ciudad', place.city);
        if (place.region) updateFormData('provincia', place.region);
        if (place.postalCode) updateFormData('codigo_postal', place.postalCode);
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location_selected') {
        console.log('[CrearLocal v244.0] Location selected:', data.lat, data.lng);
        updateFormData('latitud', data.lat);
        updateFormData('longitud', data.lng);
      }
    } catch (error) {
      console.error('[CrearLocal v244.0] Error parsing WebView message:', error);
    }
  };

  const generateMapHTML = () => {
    const centerLat = formData.latitud || 40.4168;
    const centerLng = formData.longitud || -3.7038;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .custom-marker {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #14B8A6;
      border: 3px solid #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: move;
    }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([${centerLat}, ${centerLng}], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    var markerIcon = L.divIcon({
      className: 'custom-marker',
      html: '📍',
      iconSize: [40, 40]
    });

    var marker = L.marker([${centerLat}, ${centerLng}], { 
      icon: markerIcon,
      draggable: true 
    }).addTo(map);

    marker.on('dragend', function(e) {
      var position = marker.getLatLng();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'location_selected',
        lat: position.lat,
        lng: position.lng
      }));
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'location_selected',
        lat: e.latlng.lat,
        lng: e.latlng.lng
      }));
    });
  </script>
</body>
</html>
    `;
  };

  const toggleServicio = (servicio: string) => {
    const servicios = formData.servicios.includes(servicio)
      ? formData.servicios.filter(s => s !== servicio)
      : [...formData.servicios, servicio];
    updateFormData('servicios', servicios);
  };

  const toggleAmbiente = (ambiente: string) => {
    const ambientes = formData.ambiente.includes(ambiente)
      ? formData.ambiente.filter(a => a !== ambiente)
      : [...formData.ambiente, ambiente];
    updateFormData('ambiente', ambientes);
  };

  const toggleMusica = (musica: string) => {
    const musicas = formData.musica.includes(musica)
      ? formData.musica.filter(m => m !== musica)
      : [...formData.musica, musica];
    updateFormData('musica', musicas);
  };

  const toggleTipoCocina = (tipo: string) => {
    const tipos = formData.tipos_cocina.includes(tipo)
      ? formData.tipos_cocina.filter(t => t !== tipo)
      : [...formData.tipos_cocina, tipo];
    updateFormData('tipos_cocina', tipos);
  };

  const updateHorario = (dia: string, field: 'abierto' | 'apertura' | 'cierre', value: boolean | string) => {
    const newHorarios = { ...formData.horarios };
    if (!newHorarios[dia]) {
      newHorarios[dia] = { abierto: true, apertura: '09:00', cierre: '22:00' };
    }
    newHorarios[dia] = { ...newHorarios[dia], [field]: value };
    updateFormData('horarios', newHorarios);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.nombre || !formData.tipo) {
          Alert.alert('Campos requeridos', 'Por favor completa el nombre y tipo de local');
          return false;
        }
        return true;
      case 2:
        if (!formData.direccion || !formData.ciudad || !formData.provincia) {
          Alert.alert('Campos requeridos', 'Por favor completa la dirección, ciudad y provincia');
          return false;
        }
        if (!formData.latitud || !formData.longitud) {
          Alert.alert('Ubicación requerida', 'Por favor selecciona la ubicación exacta en el mapa');
          return false;
        }
        return true;
      case 3:
      case 4:
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 5) {
        setShowPreview(true);
      } else {
        setCurrentStep(prev => Math.min(prev + 1, 5));
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleClose = () => {
    Alert.alert(
      'Cerrar',
      '¿Estás seguro de que quieres cerrar? Se perderán todos los datos introducidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para crear un local');
      return;
    }

    if (!validateStep(5)) return;

    setLoading(true);
    try {
      console.log('[CrearLocal v244.0] 📝 Creating local with approval workflow...');

      // ✅ CHECK FOR DUPLICATES BEFORE CREATING
      console.log('[CrearLocal v244.0] 🔍 Checking for duplicate locals...');
      const { data: duplicates, error: duplicateError } = await supabase
        .rpc('check_duplicate_local', {
          p_nombre: formData.nombre,
          p_latitud: formData.latitud,
          p_longitud: formData.longitud,
        });

      if (duplicateError) {
        console.error('[CrearLocal v244.0] ❌ Error checking duplicates:', duplicateError);
        // Continue anyway - don't block creation if check fails
      } else if (duplicates && duplicates.length > 0) {
        const duplicate = duplicates[0];
        console.log('[CrearLocal v244.0] ⚠️ Duplicate local found:', duplicate);
        
        setLoading(false);
        Alert.alert(
          'Local Duplicado',
          `Ya existe un local con el nombre "${formData.nombre}" en esta ubicación exacta.\n\n` +
          `Dirección: ${duplicate.direccion || 'No especificada'}\n` +
          `Ciudad: ${duplicate.ciudad || 'No especificada'}\n\n` +
          `Por favor, verifica si es el mismo local o elige una ubicación diferente.`,
          [
            { text: 'Entendido', style: 'default' }
          ]
        );
        return;
      }

      console.log('[CrearLocal v244.0] ✅ No duplicates found, proceeding with creation...');

      let portadaUrl = formData.portada_url;
      if (portadaUrl && portadaUrl.startsWith('file://')) {
        const response = await fetch(portadaUrl);
        const blob = await response.blob();
        const fileName = `${user.id}/portada-${Date.now()}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('locales')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('locales').getPublicUrl(fileName);
          portadaUrl = urlData.publicUrl;
        }
      }

      const galeriaUrls: string[] = [];
      for (const imageUri of formData.galeria_urls) {
        if (imageUri.startsWith('file://')) {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const fileName = `${user.id}/galeria-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('locales')
            .upload(fileName, blob, { contentType: 'image/jpeg' });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from('locales').getPublicUrl(fileName);
            galeriaUrls.push(urlData.publicUrl);
          }
        } else {
          galeriaUrls.push(imageUri);
        }
      }

      const { data: localData, error: localError } = await supabase
        .from('locales')
        .insert({
          nombre: formData.nombre,
          tipo: formData.tipo,
          descripcion: formData.descripcion,
          direccion: formData.direccion,
          ciudad: formData.ciudad,
          provincia: formData.provincia,
          codigo_postal: formData.codigo_postal,
          telefono: formData.telefono,
          email: formData.email,
          website: formData.web,
          latitud: formData.latitud,
          longitud: formData.longitud,
          horarios_completos: formData.horarios,
          servicios: formData.servicios,
          imagen_url: portadaUrl,
          galeria_urls: galeriaUrls,
          propietario_id: user.id,
          source_type: 'manual',
          estado_solicitud: 'pendiente',
          fecha_solicitud: new Date().toISOString(),
          activo: false,
          ambiente: formData.ambiente,
          musica: formData.musica,
          tipos_cocina: formData.tipos_cocina,
          clientela: formData.clientela,
          metodos_pago_completos: formData.metodos_pago,
        })
        .select()
        .single();

      if (localError) throw localError;

      console.log('[CrearLocal v244.0] ✅ Local created successfully with pending status');

      try {
        await supabase.functions.invoke('send-local-approval-notification', {
          body: {
            localId: localData.id,
            propietarioId: user.id,
            tipo: 'solicitud_creada',
          },
        });
      } catch (notificationError) {
        console.error('[CrearLocal v244.0] ⚠️ Error sending notification:', notificationError);
      }

      setShowPreview(false);
      Alert.alert(
        'Solicitud Enviada',
        'Tu solicitud de local ha sido enviada al administrador para su revisión.\n\nRecibirás una notificación por email y en la app cuando sea revisada.\n\nPuedes ver el estado de tu solicitud en "Gestión de Locales".',
        [{ text: 'OK', onPress: () => router.push('/gestion/mis-locales') }]
      );
    } catch (error) {
      console.error('[CrearLocal v244.0] ❌ Error creating local:', error);
      Alert.alert('Error', 'No se pudo crear el local. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>
              {step}
            </Text>
          </View>
          {step < 5 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Información Básica</Text>
      <Text style={styles.stepDescription}>
        Comienza con los datos esenciales de tu local
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nombre del Local *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Bar Central"
          placeholderTextColor={colors.textSecondary}
          value={formData.nombre}
          onChangeText={(text) => updateFormData('nombre', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tipo de Local *</Text>
        <View style={styles.tipoGrid}>
          {TIPOS_LOCAL.map((tipo) => (
            <TouchableOpacity
              key={tipo.value}
              style={[styles.tipoButton, formData.tipo === tipo.value && styles.tipoButtonActive]}
              onPress={() => updateFormData('tipo', tipo.value)}
            >
              <IconSymbol
                ios_icon_name={tipo.icon}
                android_material_icon_name="store"
                size={24}
                color={formData.tipo === tipo.value ? colors.headerText : colors.text}
              />
              <Text style={[styles.tipoButtonText, formData.tipo === tipo.value && styles.tipoButtonTextActive]}>
                {tipo.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe tu local..."
          placeholderTextColor={colors.textSecondary}
          value={formData.descripcion}
          onChangeText={(text) => updateFormData('descripcion', text)}
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ubicación y Contacto</Text>
      <Text style={styles.stepDescription}>
        Añade la dirección completa y selecciona la ubicación exacta en el mapa
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Dirección *</Text>
        <TextInput
          style={styles.input}
          placeholder="Calle, número"
          placeholderTextColor={colors.textSecondary}
          value={formData.direccion}
          onChangeText={(text) => updateFormData('direccion', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Ciudad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ciudad"
            placeholderTextColor={colors.textSecondary}
            value={formData.ciudad}
            onChangeText={(text) => updateFormData('ciudad', text)}
          />
        </View>

        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Código Postal</Text>
          <TextInput
            style={styles.input}
            placeholder="28001"
            placeholderTextColor={colors.textSecondary}
            value={formData.codigo_postal}
            onChangeText={(text) => updateFormData('codigo_postal', text)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Provincia *</Text>
        <TextInput
          style={styles.input}
          placeholder="Provincia"
          placeholderTextColor={colors.textSecondary}
          value={formData.provincia}
          onChangeText={(text) => updateFormData('provincia', text)}
        />
      </View>

      <TouchableOpacity style={styles.locationButton} onPress={handleGetCurrentLocation} disabled={loading}>
        <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={20} color={colors.primary} />
        <Text style={styles.locationButtonText}>Usar mi ubicación actual</Text>
      </TouchableOpacity>

      {/* ✅ OSM Map Viewer - ALWAYS VISIBLE */}
      <View style={styles.mapContainer}>
        <Text style={styles.mapLabel}>Ubicación Exacta en el Mapa *</Text>
        <Text style={styles.mapHelperText}>
          Arrastra el marcador o toca en el mapa para ajustar la ubicación exacta
        </Text>
        <View style={styles.mapViewer}>
          <WebView
            ref={webViewRef}
            source={{ html: generateMapHTML() }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
              </View>
            )}
          />
        </View>
        {formData.latitud && formData.longitud && (
          <View style={styles.coordinatesDisplay}>
            <Text style={styles.coordinatesText}>
              📍 Lat: {formData.latitud.toFixed(6)}, Lng: {formData.longitud.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="+34 600 000 000"
          placeholderTextColor={colors.textSecondary}
          value={formData.telefono}
          onChangeText={(text) => updateFormData('telefono', text)}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="contacto@local.com"
          placeholderTextColor={colors.textSecondary}
          value={formData.email}
          onChangeText={(text) => updateFormData('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Sitio Web</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          placeholderTextColor={colors.textSecondary}
          value={formData.web}
          onChangeText={(text) => updateFormData('web', text)}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Servicios y Ambiente</Text>
      <Text style={styles.stepDescription}>
        Información que ayudará a los clientes a conocer mejor tu local
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Servicios y Comodidades</Text>
        <View style={styles.serviciosGrid}>
          {SERVICIOS_DISPONIBLES.map((servicio) => (
            <TouchableOpacity
              key={servicio}
              style={[styles.servicioChip, formData.servicios.includes(servicio) && styles.servicioChipActive]}
              onPress={() => toggleServicio(servicio)}
            >
              <Text style={[styles.servicioChipText, formData.servicios.includes(servicio) && styles.servicioChipTextActive]}>
                {servicio}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Ambiente</Text>
        <View style={styles.serviciosGrid}>
          {AMBIENTE_OPTIONS.map((ambiente) => (
            <TouchableOpacity
              key={ambiente}
              style={[styles.servicioChip, formData.ambiente.includes(ambiente) && styles.servicioChipActive]}
              onPress={() => toggleAmbiente(ambiente)}
            >
              <Text style={[styles.servicioChipText, formData.ambiente.includes(ambiente) && styles.servicioChipTextActive]}>
                {ambiente}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Música</Text>
        <View style={styles.serviciosGrid}>
          {MUSICA_OPTIONS.map((musica) => (
            <TouchableOpacity
              key={musica}
              style={[styles.servicioChip, formData.musica.includes(musica) && styles.servicioChipActive]}
              onPress={() => toggleMusica(musica)}
            >
              <Text style={[styles.servicioChipText, formData.musica.includes(musica) && styles.servicioChipTextActive]}>
                {musica}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tipos de Cocina</Text>
        <View style={styles.serviciosGrid}>
          {TIPOS_COCINA.map((tipo) => (
            <TouchableOpacity
              key={tipo}
              style={[styles.servicioChip, formData.tipos_cocina.includes(tipo) && styles.servicioChipActive]}
              onPress={() => toggleTipoCocina(tipo)}
            >
              <Text style={[styles.servicioChipText, formData.tipos_cocina.includes(tipo) && styles.servicioChipTextActive]}>
                {tipo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Horarios</Text>
      <Text style={styles.stepDescription}>
        Configura los horarios de apertura de tu local
      </Text>

      {DIAS_SEMANA.map((dia) => (
        <View key={dia} style={styles.horarioItem}>
          <View style={styles.horarioHeader}>
            <Text style={styles.horarioDia}>{dia}</Text>
            <TouchableOpacity
              style={styles.horarioToggle}
              onPress={() => updateHorario(dia, 'abierto', !formData.horarios[dia]?.abierto)}
            >
              <View style={[styles.toggleCircle, formData.horarios[dia]?.abierto && styles.toggleCircleActive]}>
                <View style={[styles.toggleDot, formData.horarios[dia]?.abierto && styles.toggleDotActive]} />
              </View>
              <Text style={styles.toggleText}>
                {formData.horarios[dia]?.abierto ? 'Abierto' : 'Cerrado'}
              </Text>
            </TouchableOpacity>
          </View>

          {formData.horarios[dia]?.abierto && (
            <View style={styles.horarioInputs}>
              <View style={styles.horarioInputGroup}>
                <Text style={styles.horarioLabel}>Apertura</Text>
                <TextInput
                  style={styles.horarioInput}
                  placeholder="09:00"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.horarios[dia]?.apertura || ''}
                  onChangeText={(text) => updateHorario(dia, 'apertura', text)}
                />
              </View>
              <Text style={styles.horarioSeparator}>-</Text>
              <View style={styles.horarioInputGroup}>
                <Text style={styles.horarioLabel}>Cierre</Text>
                <TextInput
                  style={styles.horarioInput}
                  placeholder="22:00"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.horarios[dia]?.cierre || ''}
                  onChangeText={(text) => updateHorario(dia, 'cierre', text)}
                />
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Imágenes</Text>
      <Text style={styles.stepDescription}>
        Añade fotos atractivas de tu local
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Foto de Portada</Text>
        <Text style={styles.helperText}>Imagen principal que se mostrará en el perfil del local</Text>
        
        {formData.portada_url ? (
          <View style={styles.coverImageContainer}>
            <Image source={{ uri: formData.portada_url }} style={styles.coverImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => updateFormData('portada_url', null)}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={handleSelectCoverPhoto}>
            <IconSymbol ios_icon_name="photo" android_material_icon_name="add_photo_alternate" size={32} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Seleccionar Foto de Portada</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Galería ({formData.galeria_urls.length}/{MAX_GALLERY_IMAGES})</Text>
        <Text style={styles.helperText}>Añade hasta 5 imágenes para mostrar tu local</Text>
        
        {formData.galeria_urls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {formData.galeria_urls.map((uri, index) => (
              <View key={index} style={styles.galleryImageContainer}>
                <Image source={{ uri }} style={styles.galleryImage} />
                <TouchableOpacity
                  style={styles.removeGalleryImageButton}
                  onPress={() => handleRemoveGalleryImage(index)}
                >
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {formData.galeria_urls.length < MAX_GALLERY_IMAGES && (
          <TouchableOpacity style={styles.uploadButton} onPress={handleSelectGalleryImages}>
            <IconSymbol ios_icon_name="photo.on.rectangle.angled" android_material_icon_name="add_photo_alternate" size={32} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Añadir Imágenes a la Galería</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ✅ Full preview matching local details page
  const renderPreview = () => {
    const allImages = [
      formData.portada_url,
      ...formData.galeria_urls
    ].filter(Boolean);

    return (
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewContainer}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.previewHeader}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => setShowPreview(false)}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vista Previa</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>

          <ScrollView style={styles.previewContent} contentContainerStyle={styles.previewContentContainer}>
            {/* Cover Image */}
            {formData.portada_url && (
              <Image source={{ uri: formData.portada_url }} style={styles.previewCoverImage} />
            )}

            {/* Gallery */}
            {formData.galeria_urls.length > 0 && (
              <View style={styles.previewGallerySection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewGalleryScroll}>
                  {formData.galeria_urls.map((uri, index) => (
                    <Image key={index} source={{ uri }} style={styles.previewGalleryImage} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Header Section */}
            <View style={styles.previewHeaderSection}>
              <Text style={styles.previewLocalName}>{formData.nombre}</Text>
              <View style={styles.previewCategoryChip}>
                <Text style={styles.previewCategoryText}>{TIPOS_LOCAL.find(t => t.value === formData.tipo)?.label}</Text>
              </View>
              
              {formData.direccion && (
                <View style={styles.previewAddressRow}>
                  <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={18} color={colors.primary} />
                  <Text style={styles.previewAddressText}>{formData.direccion}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            {formData.descripcion && (
              <View style={styles.previewSection}>
                <Text style={styles.previewDescription}>{formData.descripcion}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.previewActionsRow}>
              {formData.telefono && (
                <View style={styles.previewActionBtn}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.previewActionBtnGradient}
                  >
                    <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color="#fff" />
                    <Text style={styles.previewActionBtnText}>Llamar</Text>
                  </LinearGradient>
                </View>
              )}
              
              {formData.latitud && formData.longitud && (
                <View style={styles.previewActionBtn}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.previewActionBtnGradient}
                  >
                    <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color="#fff" />
                    <Text style={styles.previewActionBtnText}>Cómo llegar</Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Horarios */}
            {Object.keys(formData.horarios).length > 0 && (
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <View style={styles.previewIconCircle}>
                    <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.previewSectionTitle}>Horarios</Text>
                </View>
                <View style={styles.previewScheduleCompact}>
                  {DIAS_SEMANA.map((dia) => (
                    <View key={dia} style={styles.previewScheduleRow}>
                      <Text style={styles.previewScheduleDay}>{dia.substring(0, 3)}</Text>
                      <Text style={styles.previewScheduleHours}>
                        {formData.horarios[dia]?.abierto
                          ? `${formData.horarios[dia]?.apertura} - ${formData.horarios[dia]?.cierre}`
                          : 'Cerrado'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Servicios */}
            {formData.servicios.length > 0 && (
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <View style={[styles.previewIconCircle, { backgroundColor: '#10B981' + '20' }]}>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.previewSectionTitle}>Servicios Disponibles</Text>
                </View>
                <View style={styles.previewTagsGrid}>
                  {formData.servicios.map((servicio, index) => (
                    <View key={index} style={styles.previewTag}>
                      <Text style={styles.previewTagText}>{servicio}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Ambiente */}
            {formData.ambiente.length > 0 && (
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <View style={[styles.previewIconCircle, { backgroundColor: '#8B5CF6' + '20' }]}>
                    <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={styles.previewSectionTitle}>Ambiente</Text>
                </View>
                <View style={styles.previewTagsGrid}>
                  {formData.ambiente.map((tag, index) => (
                    <View key={index} style={styles.previewTag}>
                      <Text style={styles.previewTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Extra padding at bottom to ensure content is not cut off */}
            <View style={{ height: 140 }} />
          </ScrollView>

          <View style={styles.previewFooter}>
            <TouchableOpacity style={styles.previewSecondaryButton} onPress={() => setShowPreview(false)}>
              <Text style={styles.previewSecondaryButtonText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.previewPrimaryButton} onPress={handleSubmit} disabled={loading}>
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.previewPrimaryGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.headerText} />
                ) : (
                  <Text style={styles.previewPrimaryButtonText}>Enviar Solicitud</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={currentStep > 1 ? handlePrevious : handleClose}>
          <IconSymbol 
            ios_icon_name={currentStep > 1 ? "chevron.left" : "xmark"} 
            android_material_icon_name={currentStep > 1 ? "arrow_back" : "close"} 
            size={24} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Local</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      {renderStepIndicator()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      {/* ✅ FIXED v244.0: Footer with increased padding to prevent cutoff */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePrevious}>
            <Text style={styles.secondaryButtonText}>Anterior</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.primaryGradient}
          >
            <Text style={styles.primaryButtonText}>
              {currentStep === 5 ? 'Vista Previa' : 'Siguiente'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {renderPreview()}
    </KeyboardAvoidingView>
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
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.headerText,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 140,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
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
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
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
  tipoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tipoButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  mapContainer: {
    marginBottom: 20,
  },
  mapLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  mapHelperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  mapViewer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.cardBackground,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  coordinatesDisplay: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },
  coordinatesText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  serviciosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  servicioChip: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  servicioChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  servicioChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  servicioChipTextActive: {
    color: colors.headerText,
  },
  uploadButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  coverImageContainer: {
    position: 'relative',
    marginTop: 8,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 14,
  },
  galleryScroll: {
    marginTop: 8,
    marginBottom: 12,
  },
  galleryImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
  },
  removeGalleryImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  horarioItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  horarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  horarioDia: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  horarioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleCircle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleCircleActive: {
    backgroundColor: colors.primary,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.headerText,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  horarioInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  horarioInputGroup: {
    flex: 1,
  },
  horarioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  horarioInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  horarioSeparator: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewContent: {
    flex: 1,
  },
  previewContentContainer: {
    paddingBottom: 140,
  },
  previewCoverImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.cardBorder,
  },
  previewGallerySection: {
    backgroundColor: colors.background,
    paddingVertical: 12,
  },
  previewGalleryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  previewGalleryImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: colors.cardBorder,
  },
  previewHeaderSection: {
    padding: 20,
  },
  previewLocalName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  previewCategoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 12,
  },
  previewCategoryText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.headerText,
  },
  previewAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  previewAddressText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  previewSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  previewDescription: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  previewActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  previewActionBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewActionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  previewActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6' + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  previewScheduleCompact: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  previewScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  previewScheduleDay: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    width: 50,
  },
  previewScheduleHours: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  previewTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewTag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  previewTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  previewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  previewSecondaryButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  previewSecondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  previewPrimaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewPrimaryGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  previewPrimaryButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
});
