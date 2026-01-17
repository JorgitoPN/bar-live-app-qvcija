
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
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { WebView } from 'react-native-webview';

/**
 * ✅ SOLICITAR PROPIEDAD v5.0 - SISTEMA ROBUSTO DE IMÁGENES
 * 
 * NUEVO SISTEMA v5.0:
 * - ✅ SOLO imágenes permitidas (JPG, PNG, WEBP) - NO PDF
 * - ✅ Validación mejorada de tipos de archivo
 * - ✅ URLs públicas directas de Supabase Storage
 * - ✅ Preview inmediato de la imagen subida
 * - ✅ Logs detallados para debugging
 * - ✅ Manejo de errores mejorado
 * - ✅ Indicadores de carga durante la subida
 * - ✅ Visualización garantizada con Image de React Native
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

export default function SolicitarPropiedadScreen() {
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
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [documentoTipo, setDocumentoTipo] = useState<string>('factura_luz');

  // Form data for nuevo_local
  const [nombreLocal, setNombreLocal] = useState('');
  const [tipoLocal, setTipoLocal] = useState('');
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
  const [imagenPortadaUrl, setImagenPortadaUrl] = useState<string | null>(null);
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);

  const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);

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
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, ciudad, provincia, imagen_url, tipo, propietario_id')
        .eq('id', localId)
        .single();

      if (error) throw error;

      if (data.propietario_id) {
        Alert.alert(
          'Local No Disponible',
          'Este local ya tiene un propietario asignado. No puedes reclamarlo.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      setSelectedLocal(data);
      setCurrentStep(2);
    } catch (error) {
      console.error('[SolicitarPropiedad v4.0] ❌ Error cargando local:', error);
      Alert.alert('Error', 'No se pudo cargar el local seleccionado');
    }
  }, [router]);

  const searchLocales = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingLocales(true);
      console.log('[SolicitarPropiedad v4.0] 🔍 Buscando locales:', query);

      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, ciudad, provincia, imagen_url, tipo, propietario_id')
        .or(`nombre.ilike.%${query}%,direccion.ilike.%${query}%,ciudad.ilike.%${query}%`)
        .is('propietario_id', null)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      console.log('[SolicitarPropiedad v4.0] ✅ Locales encontrados:', data?.length || 0);
      setSearchResults(data || []);
    } catch (error) {
      console.error('[SolicitarPropiedad v4.0] ❌ Error buscando locales:', error);
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
    console.log('[SolicitarPropiedad v4.0] ✅ Local seleccionado:', local.nombre);

    const { data: existingRequest, error } = await supabase
      .from('solicitudes_propietario')
      .select('id, estado')
      .eq('local_id', local.id)
      .in('estado', ['pendiente', 'en_revision', 'informacion_adicional'])
      .maybeSingle();

    if (error) {
      console.error('[SolicitarPropiedad v4.0] ❌ Error verificando solicitudes:', error);
    }

    if (existingRequest) {
      Alert.alert(
        'Solicitud Existente',
        'Ya existe una solicitud activa para este local.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedLocal(local);
    setCurrentStep(2);
  };

  /**
   * ✅ SISTEMA NUEVO v5.0: Subir imagen con validación mejorada
   * - Usa ImagePicker para seleccionar SOLO imágenes
   * - Sube a Supabase Storage con validación de tipo
   * - Obtiene URL pública verificada
   * - Muestra preview inmediato
   */
  const handleUploadDocument = async () => {
    try {
      console.log('[SolicitarPropiedad v5.0] 📸 Iniciando selección de imagen...');
      
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar la imagen');
        return;
      }

      // Seleccionar SOLO imágenes (JPG, PNG, WEBP)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
        allowsMultipleSelection: false,
      });

      console.log('[SolicitarPropiedad v5.0] 📸 Resultado de selección:', {
        canceled: result.canceled,
        hasAssets: result.assets?.length > 0,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[SolicitarPropiedad v5.0] ⚠️ Selección cancelada por el usuario');
        return;
      }

      const image = result.assets[0];
      console.log('[SolicitarPropiedad v5.0] ✅ Imagen seleccionada:', {
        uri: image.uri,
        width: image.width,
        height: image.height,
        type: image.type,
      });

      // Validar que sea una imagen
      if (!image.uri.match(/\.(jpg|jpeg|png|webp)$/i)) {
        Alert.alert('Error', 'Por favor selecciona una imagen válida (JPG, PNG o WEBP)');
        return;
      }

      // Mostrar indicador de carga
      setLoading(true);

      // Convertir a blob
      const response = await fetch(image.uri);
      const blob = await response.blob();
      
      console.log('[SolicitarPropiedad v5.0] 📦 Blob creado:', {
        size: blob.size,
        type: blob.type,
      });
      
      // Generar nombre único
      const fileExtension = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileName = `${user?.id}/${timestamp}-${randomId}.${fileExtension}`;
      
      console.log('[SolicitarPropiedad v5.0] ⬆️ Subiendo a Supabase Storage:', fileName);

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos-propiedad')
        .upload(fileName, blob, {
          contentType: `image/${fileExtension}`,
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[SolicitarPropiedad v5.0] ❌ Error subiendo:', uploadError);
        throw uploadError;
      }

      console.log('[SolicitarPropiedad v5.0] ✅ Subida exitosa:', uploadData.path);

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documentos-propiedad')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      console.log('[SolicitarPropiedad v5.0] ✅ URL pública generada:', publicUrl);

      // Verificar que la URL es válida
      if (!publicUrl || !publicUrl.startsWith('http')) {
        throw new Error('URL pública inválida');
      }

      // Guardar URL
      setDocumentoUrl(publicUrl);
      
      console.log('[SolicitarPropiedad v5.0] ✅ Imagen guardada correctamente');
      Alert.alert('✅ Éxito', 'Imagen subida correctamente');
    } catch (error) {
      console.error('[SolicitarPropiedad v5.0] ❌ Error completo:', error);
      Alert.alert('Error', 'No se pudo subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCoverPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const image = result.assets[0];
        const response = await fetch(image.uri);
        const blob = await response.blob();
        
        const fileExtension = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user?.id}/portada-${Date.now()}.${fileExtension}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('locales')
          .upload(fileName, blob, {
            contentType: `image/${fileExtension}`,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('locales')
          .getPublicUrl(uploadData.path);

        setImagenPortadaUrl(urlData.publicUrl);
        console.log('[SolicitarPropiedad v4.0] ✅ Portada subida:', urlData.publicUrl);
      } catch (error) {
        console.error('[SolicitarPropiedad v4.0] ❌ Error subiendo portada:', error);
        Alert.alert('Error', 'No se pudo subir la foto de portada');
      }
    }
  };

  const handleSelectGalleryImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería');
      return;
    }

    const remainingSlots = 5 - galeriaUrls.length;
    if (remainingSlots <= 0) {
      Alert.alert('Límite alcanzado', 'Solo puedes añadir hasta 5 imágenes');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled && result.assets.length > 0) {
      try {
        const uploadedUrls: string[] = [];
        
        for (const image of result.assets) {
          const response = await fetch(image.uri);
          const blob = await response.blob();
          
          const fileExtension = image.uri.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${user?.id}/galeria-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('locales')
            .upload(fileName, blob, {
              contentType: `image/${fileExtension}`,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('locales')
            .getPublicUrl(uploadData.path);

          uploadedUrls.push(urlData.publicUrl);
        }
        
        setGaleriaUrls([...galeriaUrls, ...uploadedUrls]);
        console.log('[SolicitarPropiedad v4.0] ✅ Galería subida:', uploadedUrls.length, 'imágenes');
      } catch (error) {
        console.error('[SolicitarPropiedad v4.0] ❌ Error subiendo galería:', error);
        Alert.alert('Error', 'No se pudieron subir algunas imágenes');
      }
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
        setLatitudLocal(location.coords.latitude);
        setLongitudLocal(location.coords.longitude);
        
        if (place.street) setDireccionLocal(place.street);
        if (place.city) setCiudadLocal(place.city);
        if (place.region) setProvinciaLocal(place.region);
        if (place.postalCode) setCodigoPostalLocal(place.postalCode);
      }
    } catch (error) {
      console.error('[SolicitarPropiedad v4.0] ❌ Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location_selected') {
        console.log('[SolicitarPropiedad v4.0] 📍 Ubicación seleccionada:', data.lat, data.lng);
        setLatitudLocal(data.lat);
        setLongitudLocal(data.lng);
      }
    } catch (error) {
      console.error('[SolicitarPropiedad v4.0] ❌ Error procesando mensaje:', error);
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
            Alert.alert('Selección requerida', 'Por favor selecciona un local para reclamar');
            return false;
          }
          return true;
        case 2:
          if (!emailContacto.trim()) {
            Alert.alert('Email requerido', 'El email de contacto es obligatorio');
            return false;
          }
          if (!telefonoContacto.trim()) {
            Alert.alert('Teléfono requerido', 'El teléfono de contacto es obligatorio');
            return false;
          }
          if (!documentoUrl) {
            Alert.alert('Imagen requerida', 'Debes subir una imagen que acredite tu relación con el local');
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
            Alert.alert('Nombre requerido', 'Por favor completa el nombre del local');
            return false;
          }
          if (tiposLocalMultiple.length === 0) {
            Alert.alert('Tipo requerido', 'Por favor selecciona al menos un tipo de local');
            return false;
          }
          return true;
        case 2:
          if (!direccionLocal.trim() || !ciudadLocal.trim() || !provinciaLocal.trim()) {
            Alert.alert('Campos requeridos', 'Por favor completa la dirección, ciudad y provincia');
            return false;
          }
          if (!latitudLocal || !longitudLocal) {
            Alert.alert('Ubicación requerida', 'Por favor selecciona la ubicación exacta en el mapa');
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
      Alert.alert('Error', 'Debes iniciar sesión para enviar una solicitud');
      return;
    }

    setLoading(true);
    try {
      console.log('[SolicitarPropiedad v4.0] 📤 Enviando solicitud:', requestType);

      if (requestType === 'reclamar_local') {
        if (!selectedLocal) {
          Alert.alert('Error', 'No se ha seleccionado ningún local');
          setLoading(false);
          return;
        }

        const { data: existingRequest } = await supabase
          .from('solicitudes_propietario')
          .select('id')
          .eq('local_id', selectedLocal.id)
          .in('estado', ['pendiente', 'en_revision', 'informacion_adicional'])
          .maybeSingle();

        if (existingRequest) {
          Alert.alert('Solicitud Existente', 'Ya existe una solicitud activa para este local.');
          setLoading(false);
          return;
        }

        // ✅ v5.0: Guardar URL pública directa de Supabase Storage
        console.log('[SolicitarPropiedad v5.0] 💾 Guardando solicitud con URL:', documentoUrl);
        
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
            documento_propiedad_url: documentoUrl, // ✅ URL pública completa de Supabase
            documento_propiedad_tipo: documentoTipo,
            estado: 'pendiente',
          });

        if (insertError) throw insertError;

        console.log('[SolicitarPropiedad v4.0] ✅ Solicitud creada exitosamente');

        try {
          await supabase.functions.invoke('send-ownership-request-confirmation', {
            body: {
              email: emailContacto,
              nombre: user.nombre,
              nombreLocal: selectedLocal.nombre,
              tipoSolicitud: 'reclamar_local',
            },
          });
        } catch (emailError) {
          console.error('[SolicitarPropiedad v4.0] ⚠️ Error enviando email:', emailError);
        }

        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'sistema',
          titulo: '📧 Confirma tu email',
          mensaje: `Hemos enviado un correo de confirmación a ${emailContacto}.`,
        });

        const { data: createdRequest } = await supabase
          .from('solicitudes_propietario')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('local_id', selectedLocal.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        Alert.alert(
          '✅ Solicitud Enviada',
          `Tu solicitud para reclamar "${selectedLocal.nombre}" ha sido enviada.\n\n` +
          `📧 Revisa tu email (${emailContacto}) para confirmar.\n\n` +
          `Recibirás notificaciones sobre el estado de tu solicitud.`,
          [{ 
            text: 'Ver Detalles', 
            onPress: () => {
              if (createdRequest?.id) {
                router.replace({
                  pathname: '/admin/solicitud-detalle',
                  params: { id: createdRequest.id },
                });
              } else {
                router.back();
              }
            }
          }]
        );
      } else {
        // nuevo_local
        if (!nombreLocal.trim() || tiposLocalMultiple.length === 0 || !direccionLocal.trim() || !ciudadLocal.trim() || !provinciaLocal.trim()) {
          Alert.alert('Campos requeridos', 'Por favor completa todos los campos obligatorios');
          setLoading(false);
          return;
        }

        if (!latitudLocal || !longitudLocal) {
          Alert.alert('Ubicación requerida', 'Por favor selecciona la ubicación en el mapa');
          setLoading(false);
          return;
        }

        console.log('[SolicitarPropiedad v4.0] 🔍 Verificando duplicados...');
        const { data: duplicates, error: duplicateError } = await supabase
          .rpc('check_duplicate_local', {
            p_nombre: nombreLocal,
            p_latitud: latitudLocal,
            p_longitud: longitudLocal,
          });

        if (duplicateError) {
          console.error('[SolicitarPropiedad v4.0] ❌ Error verificando duplicados:', duplicateError);
        } else if (duplicates && duplicates.length > 0) {
          const duplicate = duplicates[0];
          Alert.alert(
            'Local Duplicado',
            `Ya existe un local con el nombre "${nombreLocal}" en esta ubicación.\n\n` +
            `Dirección: ${duplicate.direccion || 'No especificada'}\n` +
            `Ciudad: ${duplicate.ciudad || 'No especificada'}`,
            [{ text: 'Entendido' }]
          );
          setLoading(false);
          return;
        }

        // ✅ v5.0: Guardar todas las URLs públicas de Supabase Storage
        console.log('[SolicitarPropiedad v5.0] 💾 Guardando solicitud de nuevo local');
        console.log('[SolicitarPropiedad v5.0] 📄 Documento URL:', documentoUrl);
        console.log('[SolicitarPropiedad v5.0] 🖼️ Portada URL:', imagenPortadaUrl);
        console.log('[SolicitarPropiedad v5.0] 🖼️ Galería URLs:', galeriaUrls.length);
        
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
            imagen_portada_url: imagenPortadaUrl, // ✅ URL pública completa
            galeria_urls: galeriaUrls, // ✅ Array de URLs públicas completas
            documento_propiedad_url: documentoUrl, // ✅ URL pública completa
            documento_propiedad_tipo: documentoTipo,
            estado: 'pendiente',
          });

        if (insertError) throw insertError;

        console.log('[SolicitarPropiedad v4.0] ✅ Solicitud de nuevo local creada');

        try {
          await supabase.functions.invoke('send-ownership-request-confirmation', {
            body: {
              email: emailContacto,
              nombre: user.nombre,
              nombreLocal: nombreLocal,
              tipoSolicitud: 'nuevo_local',
            },
          });
        } catch (emailError) {
          console.error('[SolicitarPropiedad v4.0] ⚠️ Error enviando email:', emailError);
        }

        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'sistema',
          titulo: '📧 Confirma tu email',
          mensaje: `Hemos enviado un correo de confirmación a ${emailContacto}.`,
        });

        const { data: createdRequest } = await supabase
          .from('solicitudes_propietario')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('nombre_local', nombreLocal)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        Alert.alert(
          '✅ Solicitud Enviada',
          `Tu solicitud para crear "${nombreLocal}" ha sido enviada.\n\n` +
          `📧 Revisa tu email (${emailContacto}) para confirmar.\n\n` +
          `Recibirás notificaciones sobre el estado de tu solicitud.`,
          [{ 
            text: 'Ver Detalles', 
            onPress: () => {
              if (createdRequest?.id) {
                router.replace({
                  pathname: '/admin/solicitud-detalle',
                  params: { id: createdRequest.id },
                });
              } else {
                router.back();
              }
            }
          }]
        );
      }
    } catch (error) {
      console.error('[SolicitarPropiedad v4.0] ❌ Error enviando solicitud:', error);
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
          <View key={step} style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>
                {step}
              </Text>
            </View>
            {step < maxSteps && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
          </View>
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
          <Text style={styles.noResultsText}>No se encontraron locales sin propietario</Text>
          <Text style={styles.noResultsSubtext}>
            Si tu local no aparece, puedes crear uno nuevo
          </Text>
          <TouchableOpacity
            style={styles.createNewButton}
            onPress={() => {
              router.replace({
                pathname: '/solicitudes/solicitar-propiedad',
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
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Información de Contacto</Text>
      <Text style={styles.stepDescription}>
        Proporciona tus datos de contacto y documentación
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
        <Text style={styles.helperText}>Recibirás notificaciones en este email</Text>
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
        <Text style={styles.helperText}>Número de teléfono para contactarte</Text>
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
        <Text style={styles.label}>Imagen de Documento de Propiedad *</Text>
        <Text style={styles.helperText}>
          Sube una FOTO del documento que acredite tu relación con el local
        </Text>
        <Text style={styles.helperTextWarning}>
          ⚠️ Solo imágenes (JPG, PNG, WEBP). NO se aceptan PDF.
        </Text>
        
        {/* ✅ NUEVO v5.0: Visualización mejorada de imagen */}
        {documentoUrl ? (
          <View style={styles.documentImageCard}>
            <Image 
              source={{ uri: documentoUrl }} 
              style={styles.documentImage}
              resizeMode="cover"
              onLoadStart={() => console.log('[SolicitarPropiedad v5.0] 🔄 Cargando imagen...')}
              onLoad={() => console.log('[SolicitarPropiedad v5.0] ✅ Imagen cargada correctamente')}
              onError={(error) => {
                console.error('[SolicitarPropiedad v5.0] ❌ Error cargando imagen:', error.nativeEvent.error);
                Alert.alert('Error', 'No se pudo cargar la imagen. Por favor intenta subirla de nuevo.');
              }}
            />
            <View style={styles.documentImageOverlay}>
              <View style={styles.documentImageInfo}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color="#10B981" />
                <Text style={styles.documentImageTitle}>
                  {TIPOS_DOCUMENTO.find(t => t.value === documentoTipo)?.label || 'Documento'}
                </Text>
              </View>
              <View style={styles.documentImageActions}>
                <TouchableOpacity
                  style={styles.changeDocumentTypeButton}
                  onPress={() => setShowDocumentTypeModal(true)}
                >
                  <IconSymbol ios_icon_name="tag.fill" android_material_icon_name="label" size={16} color={colors.primary} />
                  <Text style={styles.changeDocumentTypeText}>Cambiar Tipo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeDocumentButton}
                  onPress={() => {
                    console.log('[SolicitarPropiedad v5.0] 🗑️ Eliminando imagen');
                    setDocumentoUrl(null);
                  }}
                >
                  <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={18} color="#EF4444" />
                  <Text style={styles.removeDocumentText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.uploadImageButton} 
            onPress={handleUploadDocument}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.uploadImageButtonText}>Subiendo imagen...</Text>
              </>
            ) : (
              <>
                <IconSymbol ios_icon_name="photo.badge.plus" android_material_icon_name="add_photo_alternate" size={48} color={colors.primary} />
                <Text style={styles.uploadImageButtonText}>Seleccionar Imagen</Text>
                <Text style={styles.uploadImageButtonSubtext}>JPG, PNG, WEBP</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Mensaje Explicativo *</Text>
        <Text style={styles.helperText}>
          Explica por qué eres el propietario de este local
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
        <Text style={styles.label}>Tipo de Local * (Puedes seleccionar varios)</Text>
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
        {tiposLocalMultiple.length > 0 && (
          <View style={styles.selectedTiposContainer}>
            <Text style={styles.selectedTiposLabel}>Categorías seleccionadas:</Text>
            <View style={styles.selectedTiposChips}>
              {tiposLocalMultiple.map((tipoValue) => {
                const tipo = TIPOS_LOCAL.find(t => t.value === tipoValue);
                return (
                  <View key={tipoValue} style={styles.selectedTipoChip}>
                    <Text style={styles.selectedTipoChipText}>{tipo?.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
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
        Dirección completa y ubicación exacta en el mapa
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
        <Text style={styles.mapLabel}>Ubicación Exacta en el Mapa *</Text>
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
                <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
              </View>
            )}
          />
        </View>
        {latitudLocal && longitudLocal && (
          <View style={styles.coordinatesDisplay}>
            <Text style={styles.coordinatesText}>
              📍 Lat: {latitudLocal.toFixed(6)}, Lng: {longitudLocal.toFixed(6)}
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
        Información de contacto del local
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email de Contacto *</Text>
        <Text style={styles.helperText}>Recibirás notificaciones en este email</Text>
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
        <Text style={styles.label}>Tu Teléfono de Contacto (Opcional)</Text>
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
        Configura los horarios y servicios disponibles
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Horarios de Apertura</Text>
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
        <Text style={styles.label}>Servicios Disponibles (Opcional)</Text>
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
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Imágenes y Documentación</Text>
      <Text style={styles.stepDescription}>
        Añade fotos de tu local y documentación
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Foto de Portada (Opcional)</Text>
        {imagenPortadaUrl ? (
          <View style={styles.coverImageContainer}>
            <Image source={{ uri: imagenPortadaUrl }} style={styles.coverImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setImagenPortadaUrl(null)}>
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
        <Text style={styles.label}>Galería ({galeriaUrls.length}/5) (Opcional)</Text>
        {galeriaUrls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {galeriaUrls.map((uri, index) => (
              <View key={index} style={styles.galleryImageContainer}>
                <Image source={{ uri }} style={styles.galleryImage} />
                <TouchableOpacity
                  style={styles.removeGalleryImageButton}
                  onPress={() => setGaleriaUrls(prev => prev.filter((_, i) => i !== index))}
                >
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {galeriaUrls.length < 5 && (
          <TouchableOpacity style={styles.uploadButton} onPress={handleSelectGalleryImages}>
            <IconSymbol ios_icon_name="photo.on.rectangle.angled" android_material_icon_name="add_photo_alternate" size={32} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Añadir Imágenes</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Imagen de Documento de Propiedad (Opcional)</Text>
        <Text style={styles.helperText}>
          Foto del documento que acredite tu propiedad
        </Text>
        <Text style={styles.helperTextWarning}>
          ⚠️ Solo imágenes (JPG, PNG, WEBP). NO se aceptan PDF.
        </Text>
        
        {/* ✅ NUEVO v5.0: Visualización mejorada de imagen */}
        {documentoUrl ? (
          <View style={styles.documentImageCard}>
            <Image 
              source={{ uri: documentoUrl }} 
              style={styles.documentImage}
              resizeMode="cover"
              onLoadStart={() => console.log('[SolicitarPropiedad v5.0] 🔄 Cargando imagen...')}
              onLoad={() => console.log('[SolicitarPropiedad v5.0] ✅ Imagen cargada correctamente')}
              onError={(error) => {
                console.error('[SolicitarPropiedad v5.0] ❌ Error cargando imagen:', error.nativeEvent.error);
                Alert.alert('Error', 'No se pudo cargar la imagen. Por favor intenta subirla de nuevo.');
              }}
            />
            <View style={styles.documentImageOverlay}>
              <View style={styles.documentImageInfo}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color="#10B981" />
                <Text style={styles.documentImageTitle}>
                  {TIPOS_DOCUMENTO.find(t => t.value === documentoTipo)?.label || 'Documento'}
                </Text>
              </View>
              <View style={styles.documentImageActions}>
                <TouchableOpacity
                  style={styles.changeDocumentTypeButton}
                  onPress={() => setShowDocumentTypeModal(true)}
                >
                  <IconSymbol ios_icon_name="tag.fill" android_material_icon_name="label" size={16} color={colors.primary} />
                  <Text style={styles.changeDocumentTypeText}>Cambiar Tipo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeDocumentButton}
                  onPress={() => {
                    console.log('[SolicitarPropiedad v5.0] 🗑️ Eliminando imagen');
                    setDocumentoUrl(null);
                  }}
                >
                  <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={18} color="#EF4444" />
                  <Text style={styles.removeDocumentText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.uploadImageButton} 
            onPress={handleUploadDocument}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.uploadImageButtonText}>Subiendo imagen...</Text>
              </>
            ) : (
              <>
                <IconSymbol ios_icon_name="photo.badge.plus" android_material_icon_name="add_photo_alternate" size={48} color={colors.primary} />
                <Text style={styles.uploadImageButtonText}>Seleccionar Imagen</Text>
                <Text style={styles.uploadImageButtonSubtext}>JPG, PNG, WEBP</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
    </View>
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
          <Text style={styles.headerSubtitle}>Solicitud de propiedad</Text>
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
            <Text style={styles.modalSubtitle}>Selecciona el tipo de documento</Text>
            
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
  },
  helperTextWarning: {
    fontSize: 12,
    color: '#F59E0B',
    marginBottom: 8,
    fontWeight: '600',
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
  uploadButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // ✅ SIMPLE: Estilos para mostrar imagen (igual que posts)
  uploadImageButton: {
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  uploadImageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  uploadImageButtonSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  documentImageCard: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  documentImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.cardBorder,
  },
  documentImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    gap: 10,
  },
  documentImageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  documentImageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  documentImageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  changeDocumentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeDocumentTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  removeDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  removeDocumentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
  selectedTiposContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  selectedTiposLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  selectedTiposChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTipoChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedTipoChipText: {
    fontSize: 12,
    fontWeight: '600',
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
  coverImageContainer: {
    position: 'relative',
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
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
