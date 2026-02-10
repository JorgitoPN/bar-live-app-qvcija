
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { IconSymbol } from '@/components/IconSymbol';
import PostStyleImageUploader from '@/components/propiedad/PostStyleImageUploader';
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
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';

/**
 * 🆕 SISTEMA ULTRA SIMPLE - VERSIÓN DEFINITIVA
 * 
 * Sistema completamente reconstruido:
 * - Flujo lineal y claro
 * - Sin sistema de subida de imágenes (eliminado por problemas técnicos)
 * - Logs detallados para debugging
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

export default function SolicitarPropiedadUltraSimpleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const webViewRef = useRef<WebView>(null);

  const requestType = params.type as 'reclamar_local' | 'nuevo_local' | undefined;
  const preselectedLocalId = params.localId as string | undefined;

  const [showSelectionScreen, setShowSelectionScreen] = useState(!requestType);
  const [selectedRequestType, setSelectedRequestType] = useState<'reclamar_local' | 'nuevo_local' | null>(
    requestType || null
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([]);
  const [searchingLocales, setSearchingLocales] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState<LocalSearchResult | null>(null);

  // Form data for reclamar_local
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [emailContacto, setEmailContacto] = useState(user?.email || '');
  const [mensaje, setMensaje] = useState('');
  const [verificationImageUrl, setVerificationImageUrl] = useState<string>('');

  // Form data for nuevo_local
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

  console.log('═══════════════════════════════════════');
  console.log('[UltraSimpleScreen] 🎬 Pantalla inicializada');
  console.log('[UltraSimpleScreen] 📋 Tipo:', selectedRequestType);
  console.log('[UltraSimpleScreen] 👤 Usuario:', user?.nombre);
  console.log('[UltraSimpleScreen] 📧 Email:', user?.email);
  console.log('═══════════════════════════════════════');

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
      console.log('[UltraSimpleScreen] 🔍 Cargando local preseleccionado:', localId);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, ciudad, provincia, imagen_url, tipo, propietario_id')
        .eq('id', localId)
        .single();

      if (error) throw error;

      if (data.propietario_id) {
        Alert.alert(
          'Local No Disponible',
          'Este local ya tiene un propietario asignado.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.log('[UltraSimpleScreen] ✅ Local cargado:', data.nombre);
      setSelectedLocal(data);
      setCurrentStep(2);
    } catch (error) {
      console.error('[UltraSimpleScreen] ❌ Error:', error);
      Alert.alert('Error', 'No se pudo cargar el local');
    }
  }, [router]);

  // ✅ LINT FIX v225.0: Added loadPreselectedLocal to dependencies
  useEffect(() => {
    if (preselectedLocalId && selectedRequestType === 'reclamar_local') {
      loadPreselectedLocal(preselectedLocalId);
    }
  }, [preselectedLocalId, selectedRequestType, loadPreselectedLocal]);

  const searchLocales = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingLocales(true);
      console.log('[UltraSimpleScreen] 🔍 Buscando locales:', query);

      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, ciudad, provincia, imagen_url, tipo, propietario_id')
        .or(`nombre.ilike.%${query}%,direccion.ilike.%${query}%,ciudad.ilike.%${query}%`)
        .is('propietario_id', null)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      console.log('[UltraSimpleScreen] ✅ Locales encontrados:', data?.length || 0);
      setSearchResults(data || []);
    } catch (error) {
      console.error('[UltraSimpleScreen] ❌ Error en búsqueda:', error);
    } finally {
      setSearchingLocales(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedRequestType === 'reclamar_local') {
        searchLocales(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedRequestType, searchLocales]);

  const handleSelectLocal = async (local: LocalSearchResult) => {
    console.log('[UltraSimpleScreen] ✅ Local seleccionado:', local.nombre);

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
      console.log('[UltraSimpleScreen] 📍 Obteniendo ubicación actual...');
      
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

      console.log('[UltraSimpleScreen] ✅ Ubicación obtenida');

      if (geocode.length > 0) {
        const place = geocode[0];
        setLatitudLocal(location.coords.latitude);
        setLongitudLocal(location.coords.longitude);
        
        if (place.street) setDireccionLocal(place.street);
        if (place.city) setCiudadLocal(place.city);
        if (place.region) setProvinciaLocal(place.region);
        if (place.postalCode) setCodigoPostalLocal(place.postalCode);
      }
    } catch (error) {
      console.error('[UltraSimpleScreen] ❌ Error ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location_selected') {
        console.log('[UltraSimpleScreen] 📍 Ubicación seleccionada en mapa:', data.lat, data.lng);
        setLatitudLocal(data.lat);
        setLongitudLocal(data.lng);
      }
    } catch (error) {
      console.error('[UltraSimpleScreen] ❌ Error mensaje webview:', error);
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
    if (selectedRequestType === 'reclamar_local') {
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
          if (!verificationImageUrl || verificationImageUrl.trim() === '') {
            Alert.alert('Documento requerido', 'Debes subir una foto de un documento de verificación');
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
      const maxSteps = selectedRequestType === 'reclamar_local' ? 2 : 5;
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
      console.log('\n🚀 ═══ ENVIANDO SOLICITUD ═══');
      console.log('📋 Tipo:', selectedRequestType);
      console.log('👤 Usuario:', user.id);

      if (selectedRequestType === 'reclamar_local') {
        if (!selectedLocal) {
          Alert.alert('Error', 'No se ha seleccionado ningún local');
          setLoading(false);
          return;
        }

        console.log('🏢 Local:', selectedLocal.nombre);
        console.log('📸 Imagen de verificación:', verificationImageUrl ? 'Sí' : 'No');
        console.log('💾 Insertando en base de datos...');
        
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
            imagen_verificacion_url: verificationImageUrl || null,
            estado: 'pendiente',
          });

        if (insertError) {
          console.error('❌ Error al insertar:', insertError.message);
          throw insertError;
        }

        console.log('✅ Solicitud creada exitosamente');

        // ✅ REMOVED: Email notification as per user request
        // Only in-app notification is sent
        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'sistema',
          titulo: '✅ Solicitud enviada',
          mensaje: `Tu solicitud para reclamar "${selectedLocal.nombre}" ha sido enviada y está siendo revisada por nuestro equipo.`,
        });

        console.log('🎉 ═══ PROCESO COMPLETADO ═══\n');

        Alert.alert(
          '✅ Solicitud Enviada',
          'Nuestro equipo revisará tu solicitud. Una vez sea aprobada o denegada, recibirás una notificación y el estado del proceso de verificación se actualizará en tu perfil.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        // nuevo_local
        if (!nombreLocal.trim() || tiposLocalMultiple.length === 0) {
          Alert.alert('Campos requeridos', 'Completa todos los campos obligatorios');
          setLoading(false);
          return;
        }

        console.log('🏢 Nuevo local:', nombreLocal);
        console.log('💾 Insertando en base de datos...');
        
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
            estado: 'pendiente',
          });

        if (insertError) {
          console.error('❌ Error al insertar:', insertError.message);
          throw insertError;
        }

        console.log('✅ Solicitud creada exitosamente');

        // ✅ REMOVED: Email notification as per user request
        // Only in-app notification is sent
        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'sistema',
          titulo: '✅ Solicitud enviada',
          mensaje: `Tu solicitud para crear "${nombreLocal}" ha sido enviada.`,
        });

        console.log('🎉 ═══ PROCESO COMPLETADO ═══\n');

        Alert.alert(
          '✅ Solicitud Enviada',
          'Nuestro equipo revisará tu solicitud. Una vez sea aprobada o denegada, recibirás una notificación y el estado del proceso de verificación se actualizará en tu perfil.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('\n💥 ═══ ERROR AL ENVIAR ═══');
      console.error('❌ Mensaje:', error.message);
      console.error('═══════════════════════════════════════\n');
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequestType = (type: 'reclamar_local' | 'nuevo_local') => {
    console.log('[UltraSimpleScreen] ✅ Tipo de solicitud seleccionado:', type);
    setSelectedRequestType(type);
    setShowSelectionScreen(false);
  };

  const renderSelectionScreen = () => (
    <View style={styles.selectionContainer}>
      <ScrollView 
        style={styles.selectionContent}
        contentContainerStyle={styles.selectionScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.selectionHeader}>
          <IconSymbol 
            ios_icon_name="building.2.fill" 
            android_material_icon_name="store" 
            size={56} 
            color={colors.primary} 
          />
          <Text style={styles.selectionTitle}>¿Qué deseas hacer?</Text>
          <Text style={styles.selectionDescription}>
            Selecciona una opción para continuar con tu solicitud
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelectRequestType('reclamar_local')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.optionGradient}
            >
              <View style={styles.optionIconContainer}>
                <IconSymbol 
                  ios_icon_name="checkmark.shield.fill" 
                  android_material_icon_name="verified_user" 
                  size={40} 
                  color={colors.headerText} 
                />
              </View>
              <Text style={styles.optionTitle}>Reclamar Local Existente</Text>
              <Text style={styles.optionDescription}>
                Si tu local ya está en BarLive, reclámalo para gestionarlo
              </Text>
              <View style={styles.optionArrow}>
                <IconSymbol 
                  ios_icon_name="arrow.right" 
                  android_material_icon_name="arrow_forward" 
                  size={20} 
                  color={colors.headerText} 
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelectRequestType('nuevo_local')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.secondary, colors.secondary + 'CC']}
              style={styles.optionGradient}
            >
              <View style={styles.optionIconContainer}>
                <IconSymbol 
                  ios_icon_name="plus.circle.fill" 
                  android_material_icon_name="add_circle" 
                  size={40} 
                  color={colors.headerText} 
                />
              </View>
              <Text style={styles.optionTitle}>Crear Nuevo Local</Text>
              <Text style={styles.optionDescription}>
                Si tu local no está en BarLive, créalo desde cero
              </Text>
              <View style={styles.optionArrow}>
                <IconSymbol 
                  ios_icon_name="arrow.right" 
                  android_material_icon_name="arrow_forward" 
                  size={20} 
                  color={colors.headerText} 
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelSelectionButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelSelectionText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderStepIndicator = () => {
    const maxSteps = selectedRequestType === 'reclamar_local' ? 2 : 5;
    const steps = Array.from({ length: maxSteps }, (_, i) => i + 1);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step) => (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>
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
      <Text style={styles.stepTitle}>Buscar Local</Text>
      <Text style={styles.stepDescription}>
        Busca y selecciona el local que deseas reclamar
      </Text>

      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, dirección o ciudad..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {searchingLocales && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.searchingText}>Buscando locales...</Text>
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
                <Text style={styles.localName}>{local.nombre}</Text>
                {local.tipo && (
                  <View style={styles.localTypeChip}>
                    <Text style={styles.localTypeText}>{local.tipo}</Text>
                  </View>
                )}
                {local.direccion && (
                  <View style={styles.localAddressRow}>
                    <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.textSecondary} />
                    <Text style={styles.localAddress} numberOfLines={1}>{local.direccion}</Text>
                  </View>
                )}
                {local.ciudad && (
                  <Text style={styles.localCity}>{local.ciudad}, {local.provincia}</Text>
                )}
              </View>
              {selectedLocal?.id === local.id && (
                <View style={styles.selectedBadge}>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {searchQuery.length >= 3 && !searchingLocales && searchResults.length === 0 && (
        <View style={styles.noResultsContainer}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={48} color={colors.textSecondary} />
          <Text style={styles.noResultsText}>No se encontraron locales</Text>
          <Text style={styles.noResultsSubtext}>
            Si tu local no aparece, puedes crear uno nuevo
          </Text>
          <TouchableOpacity
            style={styles.createNewButton}
            onPress={() => {
              router.replace({
                pathname: '/solicitudes/solicitar-propiedad-ultra-simple',
                params: { type: 'nuevo_local' },
              });
            }}
          >
            <Text style={styles.createNewButtonText}>Crear Nuevo Local</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderReclamarStep2 = () => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={{ 
        paddingBottom: Platform.OS === 'ios' ? 280 : 260 
      }}
    >
      <Text style={styles.stepTitle}>Información de Contacto y Verificación</Text>
      <Text style={styles.stepDescription}>
        Proporciona tus datos de contacto y una foto de un documento para verificar tu identidad
      </Text>

      {selectedLocal && (
        <View style={styles.selectedLocalCard}>
          <Text style={styles.selectedLocalLabel}>Local seleccionado:</Text>
          <Text style={styles.selectedLocalName}>{selectedLocal.nombre}</Text>
          {selectedLocal.direccion && (
            <Text style={styles.selectedLocalAddress}>{selectedLocal.direccion}</Text>
          )}
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email de Contacto *</Text>
        <Text style={styles.helperText}>Recibirás notificaciones en este email (obligatorio)</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textSecondary}
          value={emailContacto}
          onChangeText={setEmailContacto}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Teléfono de Contacto *</Text>
        <Text style={styles.helperText}>Número de teléfono para contactarte (obligatorio)</Text>
        <TextInput
          style={styles.input}
          placeholder="+34 600 000 000"
          placeholderTextColor={colors.textSecondary}
          value={telefonoContacto}
          onChangeText={setTelefonoContacto}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Mensaje Explicativo *</Text>
        <Text style={styles.helperText}>
          Explica por qué eres el propietario de este local (obligatorio)
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ej: Soy el propietario desde hace 5 años..."
          placeholderTextColor={colors.textSecondary}
          value={mensaje}
          onChangeText={setMensaje}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.verificationSection}>
        <View style={styles.verificationHeader}>
          <IconSymbol 
            ios_icon_name="checkmark.shield.fill" 
            android_material_icon_name="verified_user" 
            size={24} 
            color={colors.primary} 
          />
          <Text style={styles.verificationTitle}>Imagen de verificación obligatoria</Text>
        </View>
        <Text style={styles.verificationDescription}>
          Sube una foto de algún documento para verificar que eres el propietario (DNI, escrituras, licencia de apertura, etc.)
        </Text>
        
        <PostStyleImageUploader
          onImageUploaded={(url) => {
            console.log('[ReclamarStep2] 📸 Imagen de verificación subida:', url);
            setVerificationImageUrl(url);
          }}
          currentImageUrl={verificationImageUrl}
          userId={user?.id || ''}
          label="Imagen de Verificación *"
          helperText="Sube una foto de un documento que acredite tu relación con el local (DNI, escrituras, licencia, etc.)"
        />
      </View>

      <View style={styles.infoBox}>
        <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.primary} />
        <Text style={styles.infoBoxText}>
          Nuestro equipo revisará tu solicitud. Una vez sea aprobada o denegada, recibirás una notificación y el estado del proceso de verificación se actualizará en tu perfil.
        </Text>
      </View>
    </ScrollView>
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
      <Text style={styles.stepTitle}>Información Básica</Text>
      <Text style={styles.stepDescription}>
        Datos esenciales de tu local
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nombre del Local *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Bar Central"
          placeholderTextColor={colors.textSecondary}
          value={nombreLocal}
          onChangeText={setNombreLocal}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tipo de Local * (Selecciona al menos uno)</Text>
        <View style={styles.tipoGrid}>
          {TIPOS_LOCAL.map((tipo) => (
            <TouchableOpacity
              key={tipo.value}
              style={[styles.tipoButton, tiposLocalMultiple.includes(tipo.value) && styles.tipoButtonActive]}
              onPress={() => toggleTipoLocal(tipo.value)}
            >
              <Text style={[styles.tipoButtonText, tiposLocalMultiple.includes(tipo.value) && styles.tipoButtonTextActive]}>
                {tipo.label}
              </Text>
              {tiposLocalMultiple.includes(tipo.value) && (
                <View style={styles.tipoCheckmark}>
                  <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={14} color={colors.headerText} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Descripción (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
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
      <Text style={styles.stepTitle}>Ubicación</Text>
      <Text style={styles.stepDescription}>
        Dirección y ubicación en el mapa
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Dirección *</Text>
        <TextInput
          style={styles.input}
          placeholder="Calle, número"
          placeholderTextColor={colors.textSecondary}
          value={direccionLocal}
          onChangeText={setDireccionLocal}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Ciudad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ciudad"
            placeholderTextColor={colors.textSecondary}
            value={ciudadLocal}
            onChangeText={setCiudadLocal}
          />
        </View>

        <View style={[styles.inputContainer, styles.flex1]}>
          <Text style={styles.label}>Código Postal</Text>
          <TextInput
            style={styles.input}
            placeholder="28001"
            placeholderTextColor={colors.textSecondary}
            value={codigoPostalLocal}
            onChangeText={setCodigoPostalLocal}
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
          value={provinciaLocal}
          onChangeText={setProvinciaLocal}
        />
      </View>

      <TouchableOpacity style={styles.locationButton} onPress={handleGetCurrentLocation} disabled={loading}>
        <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={20} color={colors.primary} />
        <Text style={styles.locationButtonText}>Usar mi ubicación actual</Text>
      </TouchableOpacity>

      <View style={styles.mapContainer}>
        <Text style={styles.mapLabel}>Ubicación en el Mapa *</Text>
        <Text style={styles.mapHelperText}>
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
            <Text style={styles.coordinatesText}>
              📍 {latitudLocal.toFixed(6)}, {longitudLocal.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderNuevoStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Contacto</Text>
      <Text style={styles.stepDescription}>
        Información de contacto
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email de Contacto *</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textSecondary}
          value={emailContacto}
          onChangeText={setEmailContacto}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Teléfono del Local (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="+34 600 000 000"
          placeholderTextColor={colors.textSecondary}
          value={telefonoLocal}
          onChangeText={setTelefonoLocal}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tu Teléfono (Opcional)</Text>
        <TextInput
          style={styles.input}
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
      <Text style={styles.stepTitle}>Horarios y Servicios</Text>
      <Text style={styles.stepDescription}>
        Configura horarios y servicios
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Horarios</Text>
        {DIAS_SEMANA.map((dia) => (
          <View key={dia} style={styles.horarioItem}>
            <View style={styles.horarioHeader}>
              <Text style={styles.horarioDia}>{dia}</Text>
              <TouchableOpacity
                style={styles.horarioToggle}
                onPress={() => updateHorario(dia, 'abierto', !horariosLocal[dia]?.abierto)}
              >
                <View style={[styles.toggleCircle, horariosLocal[dia]?.abierto && styles.toggleCircleActive]}>
                  <View style={[styles.toggleDot, horariosLocal[dia]?.abierto && styles.toggleDotActive]} />
                </View>
                <Text style={styles.toggleText}>
                  {horariosLocal[dia]?.abierto ? 'Abierto' : 'Cerrado'}
                </Text>
              </TouchableOpacity>
            </View>

            {horariosLocal[dia]?.abierto && (
              <View style={styles.horarioInputs}>
                <View style={styles.horarioInputGroup}>
                  <Text style={styles.horarioLabel}>Apertura</Text>
                  <TextInput
                    style={styles.horarioInput}
                    placeholder="09:00"
                    placeholderTextColor={colors.textSecondary}
                    value={horariosLocal[dia]?.apertura || ''}
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
        <Text style={styles.label}>Servicios (Opcional)</Text>
        <View style={styles.serviciosGrid}>
          {SERVICIOS_DISPONIBLES.map((servicio) => (
            <TouchableOpacity
              key={servicio}
              style={[styles.servicioChip, serviciosLocal.includes(servicio) && styles.servicioChipActive]}
              onPress={() => toggleServicio(servicio)}
            >
              <Text style={[styles.servicioChipText, serviciosLocal.includes(servicio) && styles.servicioChipTextActive]}>
                {servicio}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderNuevoStep5 = () => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={{ 
        paddingBottom: Platform.OS === 'ios' ? 280 : 260 
      }}
    >
      <Text style={styles.stepTitle}>Información Adicional</Text>
      <Text style={styles.stepDescription}>
        Mensaje adicional (opcional)
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Mensaje Adicional (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Información adicional sobre tu local..."
          placeholderTextColor={colors.textSecondary}
          value={mensaje}
          onChangeText={setMensaje}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.infoBox}>
        <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.primary} />
        <Text style={styles.infoBoxText}>
          Nuestro equipo revisará tu solicitud. Una vez sea aprobada o denegada, recibirás una notificación y el estado del proceso de verificación se actualizará en tu perfil.
        </Text>
      </View>
    </ScrollView>
  );

  // ✅ PANTALLA DE SELECCIÓN: Mostrar cuando no hay tipo seleccionado
  if (showSelectionScreen) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Solicitar Propiedad</Text>
            <Text style={styles.headerSubtitle}>Elige una opción</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {renderSelectionScreen()}
      </View>
    );
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {selectedRequestType === 'reclamar_local' ? 'Reclamar Local' : 'Nuevo Local'}
          </Text>
          <Text style={styles.headerSubtitle}>Solicitud de propiedad</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {renderStepIndicator()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {selectedRequestType === 'reclamar_local' ? (
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
            <Text style={styles.secondaryButtonText}>Anterior</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => {
            const maxSteps = selectedRequestType === 'reclamar_local' ? 2 : 5;
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
              <Text style={styles.primaryButtonText}>
                {currentStep === (selectedRequestType === 'reclamar_local' ? 2 : 5) ? 'Enviar Solicitud' : 'Siguiente'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  selectionContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  selectionContent: {
    flex: 1,
  },
  selectionScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    justifyContent: 'center',
  },
  selectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionGradient: {
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.headerText,
    opacity: 0.9,
    lineHeight: 19,
    marginBottom: 12,
  },
  optionArrow: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSelectionButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelSelectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
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
    lineHeight: 20,
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
    fontSize: 16,
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
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 11,
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
    fontSize: 13,
    color: colors.textSecondary,
  },
  localCity: {
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  selectedLocalName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalAddress: {
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
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 24,
  },
  verificationSection: {
    marginBottom: 20,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  verificationDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
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
    fontSize: 14,
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
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 56,
  },
  primaryGradient: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
});
