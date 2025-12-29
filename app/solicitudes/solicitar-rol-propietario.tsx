
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const MAX_GALLERY_IMAGES = 5;

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

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const TIPOS_DOCUMENTO = [
  { value: 'factura_luz', label: 'Factura de Luz' },
  { value: 'factura_agua', label: 'Factura de Agua' },
  { value: 'contrato_alquiler', label: 'Contrato de Alquiler' },
  { value: 'escritura', label: 'Escritura de Propiedad' },
  { value: 'licencia_actividad', label: 'Licencia de Actividad' },
  { value: 'otro', label: 'Otro Documento' },
];

/**
 * ✅ SOLICITAR ROL PROPIETARIO v54.0 - MATCHING CREAR LOCAL FIELDS
 * 
 * CRITICAL FIXES v54.0:
 * - ✅ Same fields as crear local page for consistency
 * - ✅ Mandatory document upload to prove ownership
 * - ✅ Step-by-step wizard matching crear local
 * - ✅ Map location selector
 * - ✅ Image gallery upload
 * - ✅ Complete local information
 */

export default function SolicitarRolPropietarioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { tipo, localId } = useLocalSearchParams<{ tipo?: string; localId?: string }>();
  const webViewRef = useRef<WebView>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data - matching crear local
  const [nombre, setNombre] = useState('');
  const [tipoLocal, setTipoLocal] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [web, setWeb] = useState('');
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [horarios, setHorarios] = useState<Record<string, { abierto: boolean; apertura: string; cierre: string }>>({});
  const [servicios, setServicios] = useState<string[]>([]);
  const [portadaUrl, setPortadaUrl] = useState<string | null>(null);
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  
  // Document upload
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [documentoTipo, setDocumentoTipo] = useState<string>('factura_luz');
  const [documentoNombre, setDocumentoNombre] = useState<string>('');

  // Initialize horarios with default values
  useEffect(() => {
    const defaultHorarios: Record<string, { abierto: boolean; apertura: string; cierre: string }> = {};
    DIAS_SEMANA.forEach(dia => {
      defaultHorarios[dia] = { abierto: true, apertura: '09:00', cierre: '22:00' };
    });
    setHorarios(defaultHorarios);
  }, []);

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
      setPortadaUrl(result.assets[0].uri);
    }
  };

  const handleSelectGalleryImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar imágenes');
      return;
    }

    const remainingSlots = MAX_GALLERY_IMAGES - galeriaUrls.length;
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
      setGaleriaUrls([...galeriaUrls, ...newImages]);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    const newGallery = [...galeriaUrls];
    newGallery.splice(index, 1);
    setGaleriaUrls(newGallery);
  };

  const handleSelectDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setDocumentoUrl(asset.uri);
        setDocumentoNombre(asset.name);
        console.log('[SolicitarRolPropietario v54.0] Document selected:', asset.name);
      }
    } catch (error) {
      console.error('[SolicitarRolPropietario v54.0] Error selecting document:', error);
      Alert.alert('Error', 'No se pudo seleccionar el documento');
    }
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
        setLatitud(location.coords.latitude);
        setLongitud(location.coords.longitude);
        
        if (place.street) setDireccion(place.street);
        if (place.city) setCiudad(place.city);
        if (place.region) setProvincia(place.region);
        if (place.postalCode) setCodigoPostal(place.postalCode);
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
        console.log('[SolicitarRolPropietario v54.0] Location selected:', data.lat, data.lng);
        setLatitud(data.lat);
        setLongitud(data.lng);
      }
    } catch (error) {
      console.error('[SolicitarRolPropietario v54.0] Error parsing WebView message:', error);
    }
  };

  const generateMapHTML = () => {
    const centerLat = latitud || 40.4168;
    const centerLng = longitud || -3.7038;

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
    const newServicios = servicios.includes(servicio)
      ? servicios.filter(s => s !== servicio)
      : [...servicios, servicio];
    setServicios(newServicios);
  };

  const updateHorario = (dia: string, field: 'abierto' | 'apertura' | 'cierre', value: boolean | string) => {
    const newHorarios = { ...horarios };
    if (!newHorarios[dia]) {
      newHorarios[dia] = { abierto: true, apertura: '09:00', cierre: '22:00' };
    }
    newHorarios[dia] = { ...newHorarios[dia], [field]: value };
    setHorarios(newHorarios);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!nombre || !tipoLocal) {
          Alert.alert('Campos requeridos', 'Por favor completa el nombre y tipo de local');
          return false;
        }
        return true;
      case 2:
        if (!direccion || !ciudad || !provincia) {
          Alert.alert('Campos requeridos', 'Por favor completa la dirección, ciudad y provincia');
          return false;
        }
        if (!latitud || !longitud) {
          Alert.alert('Ubicación requerida', 'Por favor selecciona la ubicación exacta en el mapa');
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        // ✅ CRITICAL: Document upload is MANDATORY
        if (!documentoUrl) {
          Alert.alert(
            'Documento Requerido',
            'Debes subir un documento que acredite que eres el propietario del local (factura de luz, contrato de alquiler, etc.)'
          );
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 5) {
        handleSubmit();
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
      Alert.alert('Error', 'Debes iniciar sesión para enviar una solicitud');
      return;
    }

    if (!validateStep(5)) return;

    setLoading(true);
    try {
      console.log('[SolicitarRolPropietario v54.0] 📝 Creating owner request...');

      // Upload document to storage
      let documentoUploadedUrl = documentoUrl;
      if (documentoUrl && documentoUrl.startsWith('file://')) {
        const response = await fetch(documentoUrl);
        const blob = await response.blob();
        const fileName = `${user.id}/documento-propiedad-${Date.now()}.${documentoNombre.split('.').pop()}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documentos-propiedad')
          .upload(fileName, blob);

        if (uploadError) {
          console.error('[SolicitarRolPropietario v54.0] Error uploading document:', uploadError);
          throw new Error('No se pudo subir el documento');
        }

        const { data: urlData } = supabase.storage.from('documentos-propiedad').getPublicUrl(fileName);
        documentoUploadedUrl = urlData.publicUrl;
      }

      // Upload cover photo
      let portadaUploadedUrl = portadaUrl;
      if (portadaUrl && portadaUrl.startsWith('file://')) {
        const response = await fetch(portadaUrl);
        const blob = await response.blob();
        const fileName = `${user.id}/portada-${Date.now()}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('locales')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('locales').getPublicUrl(fileName);
          portadaUploadedUrl = urlData.publicUrl;
        }
      }

      // Upload gallery images
      const galeriaUploadedUrls: string[] = [];
      for (const imageUri of galeriaUrls) {
        if (imageUri.startsWith('file://')) {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const fileName = `${user.id}/galeria-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('locales')
            .upload(fileName, blob, { contentType: 'image/jpeg' });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from('locales').getPublicUrl(fileName);
            galeriaUploadedUrls.push(urlData.publicUrl);
          }
        } else {
          galeriaUploadedUrls.push(imageUri);
        }
      }

      // Create solicitud
      const { error: solicitudError } = await supabase
        .from('solicitudes_propietario')
        .insert({
          usuario_id: user.id,
          tipo_solicitud: tipo === 'reclamar' ? 'reclamar_local' : 'nuevo_local',
          local_id: tipo === 'reclamar' ? localId : null,
          nombre_local: nombre,
          direccion_local: direccion,
          ciudad_local: ciudad,
          provincia_local: provincia,
          codigo_postal_local: codigoPostal,
          telefono_contacto: telefono,
          email_contacto: email,
          telefono_local: telefono,
          descripcion: descripcion,
          tipo_local: tipoLocal,
          latitud_local: latitud,
          longitud_local: longitud,
          horarios_local: horarios,
          servicios_local: servicios,
          imagen_portada_url: portadaUploadedUrl,
          galeria_urls: galeriaUploadedUrls,
          documento_propiedad_url: documentoUploadedUrl,
          documento_propiedad_tipo: documentoTipo,
          estado: 'pendiente',
        });

      if (solicitudError) {
        console.error('[SolicitarRolPropietario v54.0] Error creating request:', solicitudError);
        throw solicitudError;
      }

      console.log('[SolicitarRolPropietario v54.0] ✅ Request created successfully');

      Alert.alert(
        'Solicitud Enviada',
        'Tu solicitud ha sido enviada correctamente. El equipo de BarLive la revisará y te contactará pronto.\n\nRecibirás una notificación cuando sea revisada.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/perfil'),
          },
        ]
      );
    } catch (error: any) {
      console.error('[SolicitarRolPropietario v54.0] Error:', error);
      Alert.alert('Error', error.message || 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
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
          value={nombre}
          onChangeText={setNombre}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tipo de Local *</Text>
        <View style={styles.tipoGrid}>
          {TIPOS_LOCAL.map((tipo) => (
            <TouchableOpacity
              key={tipo.value}
              style={[styles.tipoButton, tipoLocal === tipo.value && styles.tipoButtonActive]}
              onPress={() => setTipoLocal(tipo.value)}
            >
              <IconSymbol
                ios_icon_name={tipo.icon}
                android_material_icon_name="store"
                size={24}
                color={tipoLocal === tipo.value ? colors.headerText : colors.text}
              />
              <Text style={[styles.tipoButtonText, tipoLocal === tipo.value && styles.tipoButtonTextActive]}>
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
          value={descripcion}
          onChangeText={setDescripcion}
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
          value={direccion}
          onChangeText={setDireccion}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Ciudad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ciudad"
            placeholderTextColor={colors.textSecondary}
            value={ciudad}
            onChangeText={setCiudad}
          />
        </View>

        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Código Postal</Text>
          <TextInput
            style={styles.input}
            placeholder="28001"
            placeholderTextColor={colors.textSecondary}
            value={codigoPostal}
            onChangeText={setCodigoPostal}
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
          value={provincia}
          onChangeText={setProvincia}
        />
      </View>

      <TouchableOpacity style={styles.locationButton} onPress={handleGetCurrentLocation} disabled={loading}>
        <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={20} color={colors.primary} />
        <Text style={styles.locationButtonText}>Usar mi ubicación actual</Text>
      </TouchableOpacity>

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
        {latitud && longitud && (
          <View style={styles.coordinatesDisplay}>
            <Text style={styles.coordinatesText}>
              📍 Lat: {latitud.toFixed(6)}, Lng: {longitud.toFixed(6)}
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
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="contacto@local.com"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
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
          value={web}
          onChangeText={setWeb}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Servicios</Text>
      <Text style={styles.stepDescription}>
        Información que ayudará a los clientes a conocer mejor tu local
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Servicios y Comodidades</Text>
        <View style={styles.serviciosGrid}>
          {SERVICIOS_DISPONIBLES.map((servicio) => (
            <TouchableOpacity
              key={servicio}
              style={[styles.servicioChip, servicios.includes(servicio) && styles.servicioChipActive]}
              onPress={() => toggleServicio(servicio)}
            >
              <Text style={[styles.servicioChipText, servicios.includes(servicio) && styles.servicioChipTextActive]}>
                {servicio}
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
              onPress={() => updateHorario(dia, 'abierto', !horarios[dia]?.abierto)}
            >
              <View style={[styles.toggleCircle, horarios[dia]?.abierto && styles.toggleCircleActive]}>
                <View style={[styles.toggleDot, horarios[dia]?.abierto && styles.toggleDotActive]} />
              </View>
              <Text style={styles.toggleText}>
                {horarios[dia]?.abierto ? 'Abierto' : 'Cerrado'}
              </Text>
            </TouchableOpacity>
          </View>

          {horarios[dia]?.abierto && (
            <View style={styles.horarioInputs}>
              <View style={styles.horarioInputGroup}>
                <Text style={styles.horarioLabel}>Apertura</Text>
                <TextInput
                  style={styles.horarioInput}
                  placeholder="09:00"
                  placeholderTextColor={colors.textSecondary}
                  value={horarios[dia]?.apertura || ''}
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
                  value={horarios[dia]?.cierre || ''}
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
      <Text style={styles.stepTitle}>Imágenes y Documentación</Text>
      <Text style={styles.stepDescription}>
        Añade fotos de tu local y un documento que acredite la propiedad
      </Text>

      {/* ✅ CRITICAL: Document upload is MANDATORY */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Documento de Propiedad * (OBLIGATORIO)</Text>
        <Text style={styles.helperText}>
          Sube un documento que acredite que eres el propietario del local
        </Text>
        
        <View style={styles.documentTypeSelector}>
          <Text style={styles.documentTypeLabel}>Tipo de documento:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.documentTypeScroll}>
            {TIPOS_DOCUMENTO.map((tipo) => (
              <TouchableOpacity
                key={tipo.value}
                style={[
                  styles.documentTypeChip,
                  documentoTipo === tipo.value && styles.documentTypeChipActive
                ]}
                onPress={() => setDocumentoTipo(tipo.value)}
              >
                <Text style={[
                  styles.documentTypeChipText,
                  documentoTipo === tipo.value && styles.documentTypeChipTextActive
                ]}>
                  {tipo.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {documentoUrl ? (
          <View style={styles.documentContainer}>
            <View style={styles.documentInfo}>
              <IconSymbol ios_icon_name="doc.fill" android_material_icon_name="description" size={32} color={colors.primary} />
              <View style={styles.documentDetails}>
                <Text style={styles.documentName} numberOfLines={1}>{documentoNombre}</Text>
                <Text style={styles.documentType}>{TIPOS_DOCUMENTO.find(t => t.value === documentoTipo)?.label}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.removeDocumentButton} onPress={() => {
              setDocumentoUrl(null);
              setDocumentoNombre('');
            }}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadDocumentButton} onPress={handleSelectDocument}>
            <IconSymbol ios_icon_name="doc.badge.plus" android_material_icon_name="upload_file" size={32} color={colors.primary} />
            <Text style={styles.uploadDocumentButtonText}>Seleccionar Documento</Text>
            <Text style={styles.uploadDocumentHelperText}>
              PDF, JPG o PNG • Máx. 10MB
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Foto de Portada</Text>
        <Text style={styles.helperText}>Imagen principal que se mostrará en el perfil del local</Text>
        
        {portadaUrl ? (
          <View style={styles.coverImageContainer}>
            <Image source={{ uri: portadaUrl }} style={styles.coverImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setPortadaUrl(null)}>
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
        <Text style={styles.label}>Galería ({galeriaUrls.length}/{MAX_GALLERY_IMAGES})</Text>
        <Text style={styles.helperText}>Añade hasta 5 imágenes para mostrar tu local</Text>
        
        {galeriaUrls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {galeriaUrls.map((uri, index) => (
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

        {galeriaUrls.length < MAX_GALLERY_IMAGES && (
          <TouchableOpacity style={styles.uploadButton} onPress={handleSelectGalleryImages}>
            <IconSymbol ios_icon_name="photo.on.rectangle.angled" android_material_icon_name="add_photo_alternate" size={32} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Añadir Imágenes a la Galería</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={currentStep > 1 ? handlePrevious : handleClose} style={styles.backButton}>
            <IconSymbol 
              ios_icon_name={currentStep > 1 ? "chevron.left" : "xmark"} 
              android_material_icon_name={currentStep > 1 ? "arrow_back" : "close"} 
              size={24} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {tipo === 'reclamar' ? 'Reclamar Local' : 'Crear Nuevo Local'}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {renderStepIndicator()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePrevious}>
            <Text style={styles.secondaryButtonText}>Anterior</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleNext} disabled={loading}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.primaryGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === 5 ? 'Enviar Solicitud' : 'Siguiente'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
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
    paddingBottom: 120,
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
  documentTypeSelector: {
    marginBottom: 12,
  },
  documentTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  documentTypeScroll: {
    marginBottom: 12,
  },
  documentTypeChip: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  documentTypeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  documentTypeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  documentTypeChipTextActive: {
    color: colors.headerText,
  },
  uploadDocumentButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  uploadDocumentButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  uploadDocumentHelperText: {
    fontSize: 12,
    color: '#92400E',
    opacity: 0.7,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: 8,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  documentType: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeDocumentButton: {
    padding: 4,
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
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
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
});
