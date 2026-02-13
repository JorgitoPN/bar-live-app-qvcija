
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
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { WebView } from 'react-native-webview';
import NewDocumentUploader from '@/components/propiedad/NewDocumentUploader';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ SISTEMA COMPLETAMENTE NUEVO v4.1 - SOLICITAR PROPIEDAD
 * 
 * NEW CHANGES v4.1:
 * - ✅ FIXED: Android scaling applied to selection screen
 * - ✅ FIXED: Android scaling applied to all text elements
 * - ✅ FIXED: Android scaling applied to all icons
 * - ✅ RESULT: Proper scaling on Android for all pages
 */

interface LocalSearchResult {
  id: string;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  imagen_url?: string;
  tipo?: string;
  propietario_id?: string;
}

const TIPOS_LOCAL = [
  { value: 'cafe', label: 'Cafetería' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'bar', label: 'Bar' },
  { value: 'pub', label: 'Pub' },
  { value: 'discoteca', label: 'Discoteca' },
  { value: 'cocteleria', label: 'Coctelería' },
];

const TIPOS_DOCUMENTO = [
  { value: 'factura_luz', label: 'Factura de Luz' },
  { value: 'factura_agua', label: 'Factura de Agua' },
  { value: 'contrato_alquiler', label: 'Contrato de Alquiler' },
  { value: 'escritura', label: 'Escritura de Propiedad' },
  { value: 'licencia_actividad', label: 'Licencia de Actividad' },
  { value: 'otro', label: 'Otro Documento' },
];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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

export default function SolicitarPropiedadScreenV2() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const webViewRef = useRef<WebView>(null);

  const requestTypeParam = params.type as 'reclamar_local' | 'nuevo_local' | undefined;
  const preselectedLocalId = params.localId as string | undefined;

  const [showSelectionScreen, setShowSelectionScreen] = useState(!requestTypeParam);
  const [requestType, setRequestType] = useState<'reclamar_local' | 'nuevo_local' | null>(requestTypeParam || null);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([]);
  const [searchingLocales, setSearchingLocales] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState<LocalSearchResult | null>(null);

  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [emailContacto, setEmailContacto] = useState(user?.email || '');
  const [mensaje, setMensaje] = useState('');
  const [documentoUrl, setDocumentoUrl] = useState<string>('');
  const [documentoTipo, setDocumentoTipo] = useState<string>('factura_luz');

  const [nombreLocal, setNombreLocal] = useState('');
  const [tiposLocalMultiple, setTiposLocalMultiple] = useState<string[]>([]);
  const [descripcionLocal, setDescripcionLocal] = useState('');
  const [direccionLocal, setDireccionLocal] = useState('');
  const [ciudadLocal, setCiudadLocal] = useState('');
  const [provinciaLocal, setProvinciaLocal] = useState('');
  const [codigoPostalLocal, setCodigoPostalLocal] = useState('');
  const [telefonoLocal, setTelefonoLocal] = useState('');
  const [latitudLocal, setLatitudLocal] = useState<number | null>(null);
  const [longitudLocal, setLongitudLocal] = useState<number | null>(null);
  const [horariosLocal, setHorariosLocal] = useState<Record<string, { abierto: boolean; apertura: string; cierre: string }>>({});
  const [serviciosLocal, setServiciosLocal] = useState<string[]>([]);
  const [imagenPortadaUrl, setImagenPortadaUrl] = useState<string>('');
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);

  const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);

  console.log('[SolicitarPropiedadV2 v4.1] 🎬 Pantalla inicializada');
  console.log('[SolicitarPropiedadV2 v4.1] 📋 Show selection screen:', showSelectionScreen);
  console.log('[SolicitarPropiedadV2 v4.1] 📋 Request type:', requestType);
  console.log('[SolicitarPropiedadV2 v4.1] 👤 Usuario:', user?.nombre);

  useEffect(() => {
    const defaultHorarios: Record<string, { abierto: boolean; apertura: string; cierre: string }> = {};
    DIAS_SEMANA.forEach(dia => {
      defaultHorarios[dia] = { abierto: true, apertura: '09:00', cierre: '22:00' };
    });
    setHorariosLocal(defaultHorarios);
  }, []);

  useEffect(() => {
    if (user?.email) {
      setEmailContacto(user.email);
    }
  }, [user]);

  const loadPreselectedLocal = useCallback(async (localId: string) => {
    try {
      console.log('[SolicitarPropiedadV2 v4.1] 🔍 Cargando local preseleccionado:', localId);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, ciudad, provincia, imagen_url, tipo, propietario_id')
        .eq('id', localId)
        .single();

      if (error) throw error;

      if (data.propietario_id) {
        console.log('[SolicitarPropiedadV2 v4.1] ⚠️ Local ya tiene propietario');
        Alert.alert(
          'Local No Disponible',
          'Este local ya tiene un propietario asignado.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.log('[SolicitarPropiedadV2 v4.1] ✅ Local cargado:', data.nombre);
      setSelectedLocal(data);
      setCurrentStep(2);
    } catch (error) {
      console.error('[SolicitarPropiedadV2 v4.1] ❌ Error cargando local:', error);
      Alert.alert('Error', 'No se pudo cargar el local');
    }
  }, [router]);

  useEffect(() => {
    if (preselectedLocalId && requestType === 'reclamar_local') {
      loadPreselectedLocal(preselectedLocalId);
    }
  }, [preselectedLocalId, requestType, loadPreselectedLocal]);

  const searchLocales = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingLocales(true);
      console.log('[SolicitarPropiedadV2 v4.1] 🔍 Buscando locales:', query);

      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, ciudad, provincia, imagen_url, tipo, propietario_id')
        .or(`nombre.ilike.%${query}%,direccion.ilike.%${query}%,ciudad.ilike.%${query}%`)
        .is('propietario_id', null)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      console.log('[SolicitarPropiedadV2 v4.1] ✅ Locales encontrados:', data?.length || 0);
      setSearchResults(data || []);
    } catch (error) {
      console.error('[SolicitarPropiedadV2 v4.1] ❌ Error buscando:', error);
    } finally {
      setSearchingLocales(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (requestType === 'reclamar_local') {
        searchLocales(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, requestType, searchLocales]);

  const handleSelectLocal = async (local: LocalSearchResult) => {
    console.log('[SolicitarPropiedadV2 v4.1] ✅ Local seleccionado:', local.nombre);

    const { data: existingRequest } = await supabase
      .from('solicitudes_propietario')
      .select('id, estado')
      .eq('local_id', local.id)
      .in('estado', ['pendiente', 'en_revision', 'informacion_adicional'])
      .maybeSingle();

    if (existingRequest) {
      Alert.alert('Solicitud Existente', 'Ya existe una solicitud activa para este local.');
      return;
    }

    setSelectedLocal(local);
    setCurrentStep(2);
  };

  const handleGetCurrentLocation = async () => {
    setLoading(true);
    try {
      console.log('[SolicitarPropiedadV2 v4.1] 📍 Obteniendo ubicación actual...');
      
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

      console.log('[SolicitarPropiedadV2 v4.1] ✅ Ubicación obtenida:', location.coords);

      if (geocode.length > 0) {
        const place = geocode[0];
        setLatitudLocal(location.coords.latitude);
        setLongitudLocal(location.coords.longitude);
        
        if (place.street) setDireccionLocal(place.street);
        if (place.city) setCiudadLocal(place.city);
        if (place.region) setProvinciaLocal(place.region);
        if (place.postalCode) setCodigoPostalLocal(place.postalCode);
        
        console.log('[SolicitarPropiedadV2 v4.1] ✅ Dirección obtenida:', place.street);
      }
    } catch (error) {
      console.error('[SolicitarPropiedadV2 v4.1] ❌ Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location_selected') {
        console.log('[SolicitarPropiedadV2 v4.1] 📍 Ubicación seleccionada en mapa:', data.lat, data.lng);
        setLatitudLocal(data.lat);
        setLongitudLocal(data.lng);
      }
    } catch (error) {
      console.error('[SolicitarPropiedadV2 v4.1] ❌ Error procesando mensaje del mapa:', error);
    }
  };

  const generateMapHTML = () => {
    const centerLat = latitudLocal || 40.4168;
    const centerLng = longitudLocal || -3.7038;

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
    setServiciosLocal(prev =>
      prev.includes(servicio)
        ? prev.filter(s => s !== servicio)
        : [...prev, servicio]
    );
  };

  const updateHorario = (dia: string, field: 'abierto' | 'apertura' | 'cierre', value: boolean | string) => {
    setHorariosLocal(prev => {
      const newHorarios = { ...prev };
      if (!newHorarios[dia]) {
        newHorarios[dia] = { abierto: true, apertura: '09:00', cierre: '22:00' };
      }
      newHorarios[dia] = { ...newHorarios[dia], [field]: value };
      return newHorarios;
    });
  };

  const validateStep = (step: number): boolean => {
    if (requestType === 'reclamar_local') {
      switch (step) {
        case 1:
          if (!selectedLocal) {
            Alert.alert('Selección requerida', 'Por favor selecciona un local');
            return false;
          }
          return true;
        case 2:
          if (!emailContacto.trim()) {
            Alert.alert('Email requerido', 'El email es obligatorio');
            return false;
          }
          if (!telefonoContacto.trim()) {
            Alert.alert('Teléfono requerido', 'El teléfono es obligatorio');
            return false;
          }
          if (!documentoUrl) {
            Alert.alert('Imagen requerida', 'Debes subir una imagen del documento');
            return false;
          }
          if (!mensaje.trim()) {
            Alert.alert('Mensaje requerido', 'Debes explicar por qué eres el propietario');
            return false;
          }
          return true;
        default:
          return true;
      }
    } else {
      switch (step) {
        case 1:
          if (!nombreLocal.trim()) {
            Alert.alert('Nombre requerido', 'Completa el nombre del local');
            return false;
          }
          if (tiposLocalMultiple.length === 0) {
            Alert.alert('Tipo requerido', 'Selecciona al menos un tipo');
            return false;
          }
          return true;
        case 2:
          if (!direccionLocal.trim() || !ciudadLocal.trim() || !provinciaLocal.trim()) {
            Alert.alert('Campos requeridos', 'Completa dirección, ciudad y provincia');
            return false;
          }
          if (!latitudLocal || !longitudLocal) {
            Alert.alert('Ubicación requerida', 'Selecciona la ubicación en el mapa');
            return false;
          }
          return true;
        default:
          return true;
      }
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const maxSteps = requestType === 'reclamar_local' ? 2 : 5;
      if (currentStep < maxSteps) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    setLoading(true);
    try {
      console.log('[SolicitarPropiedadV2 v4.1] 📤 Enviando solicitud...');

      if (requestType === 'reclamar_local') {
        if (!selectedLocal) {
          Alert.alert('Error', 'No se ha seleccionado ningún local');
          setLoading(false);
          return;
        }

        console.log('[SolicitarPropiedadV2 v4.1] 💾 Guardando solicitud de reclamar local');
        console.log('[SolicitarPropiedadV2 v4.1] 📄 URL del documento:', documentoUrl);
        
        const { error: insertError } = await supabase
          .from('solicitudes_propietario')
          .insert({
            usuario_id: user.id,
            tipo_solicitud: 'reclamar_local',
            local_id: selectedLocal.id,
            nombre_local: selectedLocal.nombre,
            direccion_local: selectedLocal.direccion,
            ciudad_local: selectedLocal.ciudad,
            provincia_local: selectedLocal.provincia,
            telefono_contacto: telefonoContacto || null,
            email_contacto: emailContacto,
            mensaje: mensaje || null,
            documento_propiedad_url: documentoUrl,
            documento_propiedad_tipo: documentoTipo,
            estado: 'pendiente',
          });

        if (insertError) throw insertError;

        console.log('[SolicitarPropiedadV2 v4.1] ✅ Solicitud creada exitosamente');

        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'sistema',
          titulo: '✅ Solicitud enviada',
          mensaje: `Tu solicitud para reclamar "${selectedLocal.nombre}" ha sido enviada.`,
        });

        Alert.alert(
          '✅ Solicitud Enviada',
          `Tu solicitud ha sido enviada correctamente.\n\nRecibirás notificaciones sobre el estado.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        if (!nombreLocal.trim() || tiposLocalMultiple.length === 0) {
          Alert.alert('Campos requeridos', 'Completa todos los campos obligatorios');
          setLoading(false);
          return;
        }

        console.log('[SolicitarPropiedadV2 v4.1] 💾 Guardando solicitud de nuevo local');
        console.log('[SolicitarPropiedadV2 v4.1] 📄 URL del documento:', documentoUrl);
        
        const { error: insertError } = await supabase
          .from('solicitudes_propietario')
          .insert({
            usuario_id: user.id,
            tipo_solicitud: 'nuevo_local',
            nombre_local: nombreLocal,
            tipo_local: tiposLocalMultiple[0],
            tipos_local_multiple: tiposLocalMultiple,
            descripcion: descripcionLocal || null,
            direccion_local: direccionLocal,
            ciudad_local: ciudadLocal,
            provincia_local: provinciaLocal,
            codigo_postal_local: codigoPostalLocal || null,
            telefono_local: telefonoLocal || null,
            telefono_contacto: telefonoContacto || null,
            email_contacto: emailContacto,
            mensaje: mensaje || null,
            latitud_local: latitudLocal,
            longitud_local: longitudLocal,
            horarios_local: horariosLocal,
            servicios_local: serviciosLocal,
            imagen_portada_url: imagenPortadaUrl || null,
            galeria_urls: galeriaUrls,
            documento_propiedad_url: documentoUrl || null,
            documento_propiedad_tipo: documentoTipo,
            estado: 'pendiente',
          });

        if (insertError) throw insertError;

        console.log('[SolicitarPropiedadV2 v4.1] ✅ Solicitud de nuevo local creada exitosamente');

        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'sistema',
          titulo: '✅ Solicitud enviada',
          mensaje: `Tu solicitud para crear "${nombreLocal}" ha sido enviada.`,
        });

        Alert.alert(
          '✅ Solicitud Enviada',
          `Tu solicitud ha sido enviada correctamente.\n\nRecibirás notificaciones sobre el estado.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('[SolicitarPropiedadV2 v4.1] ❌ Error enviando solicitud:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequestType = (type: 'reclamar_local' | 'nuevo_local') => {
    console.log('[SolicitarPropiedadV2 v4.1] ✅ User selected request type:', type);
    setRequestType(type);
    setShowSelectionScreen(false);
    setCurrentStep(1);
  };

  const renderSelectionScreen = () => (
    <View style={styles.selectionContainer}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.selectionHeader}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.selectionHeaderTitle, { fontSize: scaleFontSize(20) }]}>¿Tienes un local?</Text>
          <Text style={[styles.selectionHeaderSubtitle, { fontSize: scaleFontSize(13) }]}>Elige una opción</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.selectionContent} contentContainerStyle={styles.selectionContentContainer}>
        <Text style={[styles.selectionTitle, { fontSize: scaleFontSize(28) }]}>¿Qué deseas hacer?</Text>
        <Text style={[styles.selectionDescription, { fontSize: scaleFontSize(16) }]}>
          Selecciona si quieres reclamar un local existente en nuestra plataforma o crear uno nuevo
        </Text>

        <TouchableOpacity
          style={styles.selectionOption}
          onPress={() => handleSelectRequestType('reclamar_local')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#2DD4BF', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.selectionOptionGradient}
          >
            <View style={styles.selectionOptionIconContainer}>
              <IconSymbol 
                ios_icon_name="building.2.fill" 
                android_material_icon_name="store" 
                size={Platform.OS === 'android' ? scaleIconSize(48) : 48} 
                color={colors.headerText} 
              />
            </View>
            <View style={styles.selectionOptionContent}>
              <Text style={[styles.selectionOptionTitle, { fontSize: scaleFontSize(18) }]}>Reclamar Local Existente</Text>
              <Text style={[styles.selectionOptionDescription, { fontSize: scaleFontSize(14) }]}>
                Tu local ya está en BarLive. Reclámalo para gestionarlo.
              </Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron_right" 
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
              color={colors.headerText} 
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectionOption}
          onPress={() => handleSelectRequestType('nuevo_local')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.selectionOptionGradient}
          >
            <View style={styles.selectionOptionIconContainer}>
              <IconSymbol 
                ios_icon_name="plus.circle.fill" 
                android_material_icon_name="add_circle" 
                size={Platform.OS === 'android' ? scaleIconSize(48) : 48} 
                color={colors.headerText} 
              />
            </View>
            <View style={styles.selectionOptionContent}>
              <Text style={[styles.selectionOptionTitle, { fontSize: scaleFontSize(18) }]}>Crear Nuevo Local</Text>
              <Text style={[styles.selectionOptionDescription, { fontSize: scaleFontSize(14) }]}>
                Tu local no está en BarLive. Créalo desde cero.
              </Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron_right" 
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
              color={colors.headerText} 
            />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.selectionInfoBox}>
          <IconSymbol 
            ios_icon_name="info.circle.fill" 
            android_material_icon_name="info" 
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
            color={colors.primary} 
          />
          <Text style={[styles.selectionInfoText, { fontSize: scaleFontSize(14) }]}>
            Ambas opciones requieren verificación. Recibirás una notificación cuando tu solicitud sea revisada.
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderStepIndicator = () => {
    const maxSteps = requestType === 'reclamar_local' ? 2 : 5;
    const steps = Array.from({ length: maxSteps }, (_, i) => i + 1);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step) => (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, { fontSize: scaleFontSize(16) }, currentStep >= step && styles.stepNumberActive]}>
                  {step}
                </Text>
              </View>
            </View>
            {step < maxSteps && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderReclamarStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(24) }]}>Buscar Local</Text>
      <Text style={[styles.stepDescription, { fontSize: scaleFontSize(14) }]}>
        Busca y selecciona el local que deseas reclamar
      </Text>

      <View style={styles.searchContainer}>
        <IconSymbol 
          ios_icon_name="magnifyingglass" 
          android_material_icon_name="search" 
          size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
          color={colors.textSecondary} 
        />
        <TextInput
          style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
          placeholder="Buscar por nombre, dirección o ciudad..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol 
              ios_icon_name="xmark.circle.fill" 
              android_material_icon_name="cancel" 
              size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>

      {searchingLocales && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.searchingText, { fontSize: scaleFontSize(14) }]}>Buscando locales...</Text>
        </View>
      )}

      {searchResults.length > 0 && (
        <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContent}>
          {searchResults.map((local) => (
            <TouchableOpacity
              key={local.id}
              style={[styles.localCard, selectedLocal?.id === local.id && styles.localCardSelected]}
              onPress={() => handleSelectLocal(local)}
            >
              {local.imagen_url && (
                <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
              )}
              <View style={styles.localInfo}>
                <Text style={[styles.localName, { fontSize: scaleFontSize(16) }]}>{local.nombre}</Text>
                {local.tipo && (
                  <View style={styles.localTypeChip}>
                    <Text style={[styles.localTypeText, { fontSize: scaleFontSize(11) }]}>{local.tipo}</Text>
                  </View>
                )}
                {local.direccion && (
                  <View style={styles.localAddressRow}>
                    <IconSymbol 
                      ios_icon_name="mappin" 
                      android_material_icon_name="location_on" 
                      size={Platform.OS === 'android' ? scaleIconSize(14) : 14} 
                      color={colors.textSecondary} 
                    />
                    <Text style={[styles.localAddress, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>{local.direccion}</Text>
                  </View>
                )}
                {local.ciudad && (
                  <Text style={[styles.localCity, { fontSize: scaleFontSize(12) }]}>{local.ciudad}, {local.provincia}</Text>
                )}
              </View>
              {selectedLocal?.id === local.id && (
                <View style={styles.selectedBadge}>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                    color={colors.primary} 
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {searchQuery.length >= 3 && !searchingLocales && searchResults.length === 0 && (
        <View style={styles.noResultsContainer}>
          <IconSymbol 
            ios_icon_name="magnifyingglass" 
            android_material_icon_name="search" 
            size={Platform.OS === 'android' ? scaleIconSize(48) : 48} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.noResultsText, { fontSize: scaleFontSize(16) }]}>No se encontraron locales</Text>
          <Text style={[styles.noResultsSubtext, { fontSize: scaleFontSize(14) }]}>
            Si tu local no aparece, puedes crear uno nuevo
          </Text>
          <TouchableOpacity
            style={styles.createNewButton}
            onPress={() => handleSelectRequestType('nuevo_local')}
          >
            <Text style={[styles.createNewButtonText, { fontSize: scaleFontSize(14) }]}>Crear Nuevo Local</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderReclamarStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(24) }]}>Información de Contacto</Text>
      <Text style={[styles.stepDescription, { fontSize: scaleFontSize(14) }]}>
        Proporciona tus datos y documentación
      </Text>

      {selectedLocal && (
        <View style={styles.selectedLocalCard}>
          <Text style={[styles.selectedLocalLabel, { fontSize: scaleFontSize(12) }]}>Local seleccionado:</Text>
          <Text style={[styles.selectedLocalName, { fontSize: scaleFontSize(18) }]}>{selectedLocal.nombre}</Text>
          {selectedLocal.direccion && (
            <Text style={[styles.selectedLocalAddress, { fontSize: scaleFontSize(14) }]}>{selectedLocal.direccion}</Text>
          )}
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Email de Contacto *</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textSecondary}
          value={emailContacto}
          onChangeText={setEmailContacto}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Teléfono de Contacto *</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          placeholder="+34 600 000 000"
          placeholderTextColor={colors.textSecondary}
          value={telefonoContacto}
          onChangeText={setTelefonoContacto}
          keyboardType="phone-pad"
        />
      </View>

      <NewDocumentUploader
        onUploadComplete={(url) => {
          console.log('[SolicitarPropiedadV2 v4.1] ✅ Documento recibido:', url);
          setDocumentoUrl(url);
        }}
        currentUrl={documentoUrl}
        userId={user?.id || ''}
        label="Documento de Propiedad *"
        description="Sube una foto clara del documento que acredite tu relación con el local"
      />

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Tipo de Documento</Text>
        <TouchableOpacity
          style={styles.documentTypeSelector}
          onPress={() => setShowDocumentTypeModal(true)}
        >
          <Text style={[styles.documentTypeSelectorText, { fontSize: scaleFontSize(16) }]}>
            {TIPOS_DOCUMENTO.find(t => t.value === documentoTipo)?.label || 'Seleccionar'}
          </Text>
          <IconSymbol 
            ios_icon_name="chevron.down" 
            android_material_icon_name="arrow_drop_down" 
            size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Mensaje Explicativo *</Text>
        <TextInput
          style={[styles.input, styles.textArea, { fontSize: scaleFontSize(16) }]}
          placeholder="Explica por qué eres el propietario..."
          placeholderTextColor={colors.textSecondary}
          value={mensaje}
          onChangeText={setMensaje}
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  const toggleTipoLocal = (tipoValue: string) => {
    setTiposLocalMultiple(prev => {
      if (prev.includes(tipoValue)) {
        return prev.filter(t => t !== tipoValue);
      } else {
        return [...prev, tipoValue];
      }
    });
  };

  const renderNuevoStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(24) }]}>Información Básica</Text>
      <Text style={[styles.stepDescription, { fontSize: scaleFontSize(14) }]}>
        Datos esenciales de tu local
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Nombre del Local *</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          placeholder="Ej: Bar Central"
          placeholderTextColor={colors.textSecondary}
          value={nombreLocal}
          onChangeText={setNombreLocal}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Tipo de Local * (Selecciona al menos uno)</Text>
        <View style={styles.tipoGrid}>
          {TIPOS_LOCAL.map((tipo) => (
            <TouchableOpacity
              key={tipo.value}
              style={[styles.tipoButton, tiposLocalMultiple.includes(tipo.value) && styles.tipoButtonActive]}
              onPress={() => toggleTipoLocal(tipo.value)}
            >
              <Text style={[styles.tipoButtonText, { fontSize: scaleFontSize(14) }, tiposLocalMultiple.includes(tipo.value) && styles.tipoButtonTextActive]}>
                {tipo.label}
              </Text>
              {tiposLocalMultiple.includes(tipo.value) && (
                <View style={styles.tipoCheckmark}>
                  <IconSymbol 
                    ios_icon_name="checkmark" 
                    android_material_icon_name="check" 
                    size={Platform.OS === 'android' ? scaleIconSize(14) : 14} 
                    color={colors.headerText} 
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Descripción (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { fontSize: scaleFontSize(16) }]}
          placeholder="Describe tu local..."
          placeholderTextColor={colors.textSecondary}
          value={descripcionLocal}
          onChangeText={setDescripcionLocal}
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  const renderNuevoStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(24) }]}>Ubicación</Text>
      <Text style={[styles.stepDescription, { fontSize: scaleFontSize(14) }]}>
        Dirección y ubicación en el mapa
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Dirección *</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          placeholder="Calle, número"
          placeholderTextColor={colors.textSecondary}
          value={direccionLocal}
          onChangeText={setDireccionLocal}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Ciudad *</Text>
          <TextInput
            style={[styles.input, { fontSize: scaleFontSize(16) }]}
            placeholder="Ciudad"
            placeholderTextColor={colors.textSecondary}
            value={ciudadLocal}
            onChangeText={setCiudadLocal}
          />
        </View>

        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Código Postal</Text>
          <TextInput
            style={[styles.input, { fontSize: scaleFontSize(16) }]}
            placeholder="28001"
            placeholderTextColor={colors.textSecondary}
            value={codigoPostalLocal}
            onChangeText={setCodigoPostalLocal}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Provincia *</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          placeholder="Provincia"
          placeholderTextColor={colors.textSecondary}
          value={provinciaLocal}
          onChangeText={setProvinciaLocal}
        />
      </View>

      <TouchableOpacity style={styles.locationButton} onPress={handleGetCurrentLocation} disabled={loading}>
        <IconSymbol 
          ios_icon_name="location.fill" 
          android_material_icon_name="my_location" 
          size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
          color={colors.primary} 
        />
        <Text style={[styles.locationButtonText, { fontSize: scaleFontSize(14) }]}>Usar mi ubicación actual</Text>
      </TouchableOpacity>

      <View style={styles.mapContainer}>
        <Text style={[styles.mapLabel, { fontSize: scaleFontSize(14) }]}>Ubicación en el Mapa *</Text>
        <Text style={[styles.mapHelperText, { fontSize: scaleFontSize(12) }]}>
          Arrastra el marcador o toca en el mapa
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
              </View>
            )}
          />
        </View>
        {latitudLocal && longitudLocal && (
          <View style={styles.coordinatesDisplay}>
            <Text style={[styles.coordinatesText, { fontSize: scaleFontSize(12) }]}>
              📍 {latitudLocal.toFixed(6)}, {longitudLocal.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderNuevoStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(24) }]}>Contacto</Text>
      <Text style={[styles.stepDescription, { fontSize: scaleFontSize(14) }]}>
        Información de contacto
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Email de Contacto *</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textSecondary}
          value={emailContacto}
          onChangeText={setEmailContacto}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Teléfono del Local (Opcional)</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          placeholder="+34 600 000 000"
          placeholderTextColor={colors.textSecondary}
          value={telefonoLocal}
          onChangeText={setTelefonoLocal}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Tu Teléfono (Opcional)</Text>
        <TextInput
          style={[styles.input, { fontSize: scaleFontSize(16) }]}
          placeholder="+34 600 000 000"
          placeholderTextColor={colors.textSecondary}
          value={telefonoContacto}
          onChangeText={setTelefonoContacto}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderNuevoStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(24) }]}>Horarios y Servicios</Text>
      <Text style={[styles.stepDescription, { fontSize: scaleFontSize(14) }]}>
        Configura horarios y servicios
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Horarios</Text>
        {DIAS_SEMANA.map((dia) => (
          <View key={dia} style={styles.horarioItem}>
            <View style={styles.horarioHeader}>
              <Text style={[styles.horarioDia, { fontSize: scaleFontSize(16) }]}>{dia}</Text>
              <TouchableOpacity
                style={styles.horarioToggle}
                onPress={() => updateHorario(dia, 'abierto', !horariosLocal[dia]?.abierto)}
              >
                <View style={[styles.toggleCircle, horariosLocal[dia]?.abierto && styles.toggleCircleActive]}>
                  <View style={[styles.toggleDot, horariosLocal[dia]?.abierto && styles.toggleDotActive]} />
                </View>
                <Text style={[styles.toggleText, { fontSize: scaleFontSize(14) }]}>
                  {horariosLocal[dia]?.abierto ? 'Abierto' : 'Cerrado'}
                </Text>
              </TouchableOpacity>
            </View>

            {horariosLocal[dia]?.abierto && (
              <View style={styles.horarioInputs}>
                <View style={styles.horarioInputGroup}>
                  <Text style={[styles.horarioLabel, { fontSize: scaleFontSize(12) }]}>Apertura</Text>
                  <TextInput
                    style={[styles.horarioInput, { fontSize: scaleFontSize(14) }]}
                    placeholder="09:00"
                    placeholderTextColor={colors.textSecondary}
                    value={horariosLocal[dia]?.apertura || ''}
                    onChangeText={(text) => updateHorario(dia, 'apertura', text)}
                  />
                </View>
                <Text style={[styles.horarioSeparator, { fontSize: scaleFontSize(18) }]}>-</Text>
                <View style={styles.horarioInputGroup}>
                  <Text style={[styles.horarioLabel, { fontSize: scaleFontSize(12) }]}>Cierre</Text>
                  <TextInput
                    style={[styles.horarioInput, { fontSize: scaleFontSize(14) }]}
                    placeholder="22:00"
                    placeholderTextColor={colors.textSecondary}
                    value={horariosLocal[dia]?.cierre || ''}
                    onChangeText={(text) => updateHorario(dia, 'cierre', text)}
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Servicios (Opcional)</Text>
        <View style={styles.serviciosGrid}>
          {SERVICIOS_DISPONIBLES.map((servicio) => (
            <TouchableOpacity
              key={servicio}
              style={[styles.servicioChip, serviciosLocal.includes(servicio) && styles.servicioChipActive]}
              onPress={() => toggleServicio(servicio)}
            >
              <Text style={[styles.servicioChipText, { fontSize: scaleFontSize(14) }, serviciosLocal.includes(servicio) && styles.servicioChipTextActive]}>
                {servicio}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderNuevoStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(24) }]}>Imágenes y Documentación</Text>
      <Text style={[styles.stepDescription, { fontSize: scaleFontSize(14) }]}>
        Añade fotos y documentación
      </Text>

      <NewDocumentUploader
        onUploadComplete={(url) => {
          console.log('[SolicitarPropiedadV2 v4.1] ✅ Documento recibido:', url);
          setDocumentoUrl(url);
        }}
        currentUrl={documentoUrl}
        userId={user?.id || ''}
        label="Documento de Propiedad (Opcional)"
        description="Foto del documento que acredite tu propiedad del local"
      />

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Tipo de Documento</Text>
        <TouchableOpacity
          style={styles.documentTypeSelector}
          onPress={() => setShowDocumentTypeModal(true)}
        >
          <Text style={[styles.documentTypeSelectorText, { fontSize: scaleFontSize(16) }]}>
            {TIPOS_DOCUMENTO.find(t => t.value === documentoTipo)?.label || 'Seleccionar'}
          </Text>
          <IconSymbol 
            ios_icon_name="chevron.down" 
            android_material_icon_name="arrow_drop_down" 
            size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Mensaje Adicional (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { fontSize: scaleFontSize(16) }]}
          placeholder="Información adicional..."
          placeholderTextColor={colors.textSecondary}
          value={mensaje}
          onChangeText={setMensaje}
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  if (showSelectionScreen) {
    return renderSelectionScreen();
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (currentStep === 1) {
            setShowSelectionScreen(true);
            setRequestType(null);
          } else {
            router.back();
          }
        }}>
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>
            {requestType === 'reclamar_local' ? 'Reclamar Local' : 'Crear Nuevo Local'}
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(13) }]}>Solicitud de propiedad</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {renderStepIndicator()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {requestType === 'reclamar_local' ? (
          <>
            {currentStep === 1 && renderReclamarStep1()}
            {currentStep === 2 && renderReclamarStep2()}
          </>
        ) : (
          <>
            {currentStep === 1 && renderNuevoStep1()}
            {currentStep === 2 && renderNuevoStep2()}
            {currentStep === 3 && renderNuevoStep3()}
            {currentStep === 4 && renderNuevoStep4()}
            {currentStep === 5 && renderNuevoStep5()}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePrevious}>
            <Text style={[styles.secondaryButtonText, { fontSize: scaleFontSize(16) }]}>Anterior</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => {
            const maxSteps = requestType === 'reclamar_local' ? 2 : 5;
            if (currentStep === maxSteps) {
              handleSubmit();
            } else {
              handleNext();
            }
          }}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.primaryGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={[styles.primaryButtonText, { fontSize: scaleFontSize(16) }]}>
                {currentStep === (requestType === 'reclamar_local' ? 2 : 5) ? 'Enviar Solicitud' : 'Siguiente'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDocumentTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDocumentTypeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDocumentTypeModal(false)}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Tipo de Documento</Text>
            
            <ScrollView style={styles.documentTypesList}>
              {TIPOS_DOCUMENTO.map((tipo) => (
                <TouchableOpacity
                  key={tipo.value}
                  style={[styles.documentTypeOption, documentoTipo === tipo.value && styles.documentTypeOptionActive]}
                  onPress={() => {
                    setDocumentoTipo(tipo.value);
                    setShowDocumentTypeModal(false);
                  }}
                >
                  <Text style={[styles.documentTypeOptionText, { fontSize: scaleFontSize(15) }, documentoTipo === tipo.value && styles.documentTypeOptionTextActive]}>
                    {tipo.label}
                  </Text>
                  {documentoTipo === tipo.value && (
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check_circle" 
                      size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                      color={colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDocumentTypeModal(false)}
            >
              <Text style={[styles.modalCloseButtonText, { fontSize: scaleFontSize(16) }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  selectionContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  selectionHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionHeaderTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  selectionHeaderSubtitle: {
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  selectionContent: {
    flex: 1,
  },
  selectionContentContainer: {
    padding: 20,
  },
  selectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  selectionDescription: {
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  selectionOption: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  selectionOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  selectionOptionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionOptionContent: {
    flex: 1,
  },
  selectionOptionTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 6,
  },
  selectionOptionDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  selectionInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  selectionInfoText: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
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
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    color: colors.textSecondary,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  searchingText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  resultsContainer: {
    maxHeight: 400,
  },
  resultsContent: {
    gap: 12,
  },
  localCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  localCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  localImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
  },
  localInfo: {
    flex: 1,
    gap: 4,
  },
  localName: {
    fontWeight: '700',
    color: colors.text,
  },
  localTypeChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  localTypeText: {
    fontWeight: '700',
    color: colors.primary,
  },
  localAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  localAddress: {
    flex: 1,
    color: colors.textSecondary,
  },
  localCity: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noResultsText: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  noResultsSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  createNewButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createNewButtonText: {
    fontWeight: '700',
    color: colors.headerText,
  },
  selectedLocalCard: {
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedLocalLabel: {
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  selectedLocalName: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalAddress: {
    color: colors.textSecondary,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
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
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  documentTypeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  documentTypeSelectorText: {
    color: colors.text,
    fontWeight: '500',
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
    position: 'relative',
  },
  tipoButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tipoButtonText: {
    fontWeight: '600',
    color: colors.text,
  },
  tipoButtonTextActive: {
    color: colors.headerText,
  },
  tipoCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.headerText,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    color: colors.primary,
  },
  mapContainer: {
    marginBottom: 20,
  },
  mapLabel: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  mapHelperText: {
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
  },
  coordinatesDisplay: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },
  coordinatesText: {
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
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
    color: colors.text,
  },
  horarioSeparator: {
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 20,
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
    fontWeight: '500',
    color: colors.text,
  },
  servicioChipTextActive: {
    color: colors.headerText,
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
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  documentTypesList: {
    maxHeight: 300,
  },
  documentTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  documentTypeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  documentTypeOptionText: {
    fontWeight: '600',
    color: colors.text,
  },
  documentTypeOptionTextActive: {
    color: colors.primary,
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
});
