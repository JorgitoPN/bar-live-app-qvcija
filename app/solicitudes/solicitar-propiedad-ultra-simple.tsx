
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import UltraSimpleImageUploader from '@/components/propiedad/UltraSimpleImageUploader';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { IconSymbol } from '@/components/IconSymbol';
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
 * - Usa UltraSimpleImageUploader (nuevo componente)
 * - Flujo lineal y claro
 * - Sin complejidad innecesaria
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

export default function SolicitarPropiedadUltraSimpleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const webViewRef = useRef<WebView>(null);

  const requestType = (params.type as 'reclamar_local' | 'nuevo_local') || 'reclamar_local';
  const preselectedLocalId = params.localId as string | undefined;

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
  const [documentoUrl, setDocumentoUrl] = useState<string>('');
  const [documentoTipo, setDocumentoTipo] = useState<string>('factura_luz');

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

  const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);

  console.log('═══════════════════════════════════════');
  console.log('[UltraSimpleScreen] 🎬 Pantalla inicializada');
  console.log('[UltraSimpleScreen] 📋 Tipo:', requestType);
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

  useEffect(() => {
    if (preselectedLocalId && requestType === 'reclamar_local') {
      loadPreselectedLocal(preselectedLocalId);
    }
  }, [preselectedLocalId, requestType]);

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
      if (requestType === 'reclamar_local') {
        searchLocales(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, requestType, searchLocales]);

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
            Alert.alert('Documento requerido', 'Debes subir una imagen del documento de propiedad');
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
      console.log('\n🚀 ═══ ENVIANDO SOLICITUD ═══');
      console.log('📋 Tipo:', requestType);
      console.log('👤 Usuario:', user.id);
      console.log('📄 URL documento:', documentoUrl);

      if (requestType === 'reclamar_local') {
        if (!selectedLocal) {
          Alert.alert('Error', 'No se ha seleccionado ningún local');
          setLoading(false);
          return;
        }

        console.log('🏢 Local:', selectedLocal.nombre);
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
            documento_propiedad_url: documentoUrl,
            documento_propiedad_tipo: documentoTipo,
            estado: 'pendiente',
          });

        if (insertError) {
          console.error('❌ Error al insertar:', insertError.message);
          throw insertError;
        }

        console.log('✅ Solicitud creada exitosamente');

        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'sistema',
          titulo: '✅ Solicitud enviada',
          mensaje: `Tu solicitud para reclamar "${selectedLocal.nombre}" ha sido enviada.`,
        });

        console.log('🎉 ═══ PROCESO COMPLETADO ═══\n');

        Alert.alert(
          '✅ Solicitud Enviada',
          'Tu solicitud ha sido enviada correctamente.\n\nRecibirás notificaciones sobre el estado.',
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
            documento_propiedad_url: documentoUrl || null,
            documento_propiedad_tipo: documentoTipo,
            estado: 'pendiente',
          });

        if (insertError) {
          console.error('❌ Error al insertar:', insertError.message);
          throw insertError;
        }

        console.log('✅ Solicitud creada exitosamente');

        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'sistema',
          titulo: '✅ Solicitud enviada',
          mensaje: `Tu solicitud para crear "${nombreLocal}" ha sido enviada.`,
        });

        console.log('🎉 ═══ PROCESO COMPLETADO ═══\n');

        Alert.alert(
          '✅ Solicitud Enviada',
          'Tu solicitud ha sido enviada correctamente.\n\nRecibirás notificaciones sobre el estado.',
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

  const renderStepIndicator = () => {
    const maxSteps = requestType === 'reclamar_local' ? 2 : 5;
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
    <ScrollView style={styles.stepContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.stepTitle}>Solicitud de Propiedad</Text>
      <Text style={styles.stepDescription}>
        Proporciona tus datos de contacto y documentación que acredite tu propiedad
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
        <TextInput
          style={styles.input}
          placeholder="+34 600 000 000"
          placeholderTextColor={colors.textSecondary}
          value={telefonoContacto}
          onChangeText={setTelefonoContacto}
          keyboardType="phone-pad"
        />
      </View>

      {/* 🆕 COMPONENTE DE SUBIDA DE IMAGEN */}
      <UltraSimpleImageUploader
        onUploadComplete={(url) => {
          console.log('[ReclamarStep2] ✅ Documento subido:', url);
          setDocumentoUrl(url);
        }}
        currentUrl={documentoUrl}
        userId={user?.id || ''}
        label="Documento de Propiedad *"
        description="Sube una foto clara del documento que acredite tu relación con el local (factura de servicios, contrato de alquiler, escritura de propiedad, licencia de actividad, etc.)"
      />

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tipo de Documento</Text>
        <TouchableOpacity
          style={styles.documentTypeSelector}
          onPress={() => setShowDocumentTypeModal(true)}
        >
          <Text style={styles.documentTypeSelectorText}>
            {TIPOS_DOCUMENTO.find(t => t.value === documentoTipo)?.label || 'Seleccionar'}
          </Text>
          <IconSymbol 
            ios_icon_name="chevron.down" 
            android_material_icon_name="arrow_drop_down" 
            size={20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Mensaje Explicativo *</Text>
        <Text style={styles.helperText}>
          Explica brevemente por qué eres el propietario del local y cualquier información adicional relevante
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ejemplo: Soy el propietario del local desde hace 5 años. Adjunto factura de luz a mi nombre..."
          placeholderTextColor={colors.textSecondary}
          value={mensaje}
          onChangeText={setMensaje}
          multiline
          numberOfLines={6}
        />
      </View>

      <View style={styles.infoBox}>
        <IconSymbol 
          ios_icon_name="info.circle.fill" 
          android_material_icon_name="info" 
          size={24} 
          color={colors.primary} 
        />
        <View style={styles.infoBoxContent}>
          <Text style={styles.infoBoxTitle}>Documentos aceptados</Text>
          <Text style={styles.infoBoxText}>
            • Factura de luz o agua a tu nombre{'\n'}
            • Contrato de alquiler o compraventa{'\n'}
            • Escritura de propiedad{'\n'}
            • Licencia de actividad{'\n'}
            • Cualquier documento oficial que demuestre tu relación con el local
          </Text>
        </View>
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
    <ScrollView style={styles.stepContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.stepTitle}>Documentación</Text>
      <Text style={styles.stepDescription}>
        Añade documentación (opcional)
      </Text>

      {/* 🆕 COMPONENTE DE SUBIDA DE IMAGEN */}
      <UltraSimpleImageUploader
        onUploadComplete={(url) => {
          console.log('[NuevoStep5] ✅ Documento subido:', url);
          setDocumentoUrl(url);
        }}
        currentUrl={documentoUrl}
        userId={user?.id || ''}
        label="Documento de Propiedad (Opcional)"
        description="Foto del documento que acredite tu propiedad del local"
      />

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tipo de Documento</Text>
        <TouchableOpacity
          style={styles.documentTypeSelector}
          onPress={() => setShowDocumentTypeModal(true)}
        >
          <Text style={styles.documentTypeSelectorText}>
            {TIPOS_DOCUMENTO.find(t => t.value === documentoTipo)?.label || 'Seleccionar'}
          </Text>
          <IconSymbol 
            ios_icon_name="chevron.down" 
            android_material_icon_name="arrow_drop_down" 
            size={20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Mensaje Adicional (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Información adicional..."
          placeholderTextColor={colors.textSecondary}
          value={mensaje}
          onChangeText={setMensaje}
          multiline
          numberOfLines={4}
        />
      </View>
    </ScrollView>
  );

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
            {requestType === 'reclamar_local' ? 'Reclamar Local' : 'Crear Nuevo Local'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {requestType === 'reclamar_local' 
              ? `Paso ${currentStep} de 2` 
              : `Paso ${currentStep} de 5`}
          </Text>
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
            <Text style={styles.secondaryButtonText}>Anterior</Text>
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
              <Text style={styles.primaryButtonText}>
                {currentStep === (requestType === 'reclamar_local' ? 2 : 5) ? 'Enviar Solicitud' : 'Siguiente'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Modal de tipo de documento */}
      <Modal
        visible={showDocumentTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDocumentTypeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDocumentTypeModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tipo de Documento</Text>
            
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
                  <Text style={[styles.documentTypeOptionText, documentoTipo === tipo.value && styles.documentTypeOptionTextActive]}>
                    {tipo.label}
                  </Text>
                  {documentoTipo === tipo.value && (
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDocumentTypeModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
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
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '08',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
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
    fontSize: 20,
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
    fontSize: 15,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
});
