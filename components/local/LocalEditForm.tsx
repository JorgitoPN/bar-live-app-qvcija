
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import { googlePlacesTextSearch, googlePlacesDetails, getGooglePlacePhotoUrl } from '@/utils/googlePlacesApi';
import { mapGoogleTypesToBarlive, categorizarPorHorarios } from '@/utils/enrichmentMapping';
import { estaEnEspana } from '@/utils/localTypesBackend';

const TIPOS_LOCAL = ['bar', 'restaurante', 'cafe', 'pub', 'discoteca', 'club', 'lounge'];
const PROVINCIAS = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona',
  'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba',
  'Cuenca', 'Gerona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca',
  'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lérida',
  'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Orense', 'Palencia', 'Pontevedra',
  'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria', 'Tarragona',
  'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
];

const AMBIENTE_OPTIONS = [
  'acogedor', 'romantico', 'elegante', 'moderno', 'de_moda', 
  'animado', 'juvenil', 'tranquilo', 'familiar', 'tematico'
];

const MUSICA_OPTIONS = [
  'ambiental', 'en_vivo', 'dj', 'rock', 'pop', 'electronica', 
  'jazz', 'latina', 'reggaeton', 'indie'
];

const SERVICIOS_OPTIONS = [
  'wifi_gratis', 'terraza_exterior', 'reservas', 'delivery', 
  'parking', 'musica_vivo', 'dj', 'deportes_tv', 'desayuno',
  'almuerzo', 'cena', 'para_llevar', 'entrega_domicilio'
];

interface LocalEditFormProps {
  localId?: string;
  initialData?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isAdmin?: boolean;
}

export default function LocalEditForm({ localId, initialData, onSave, onCancel, isAdmin = false }: LocalEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [tipo, setTipo] = useState('bar');
  const [direccion, setDireccion] = useState('');
  const [provincia, setProvincia] = useState('Madrid');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  const [activo, setActivo] = useState(true);
  const [enriquecido, setEnriquecido] = useState(false);
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);

  // Advanced fields
  const [ambiente, setAmbiente] = useState<string[]>([]);
  const [musica, setMusica] = useState<string[]>([]);
  const [servicios, setServicios] = useState<string[]>([]);
  const [precioMedio, setPrecioMedio] = useState<number>(2);
  const [horarios, setHorarios] = useState<any>({});

  // Modals
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);
  const [showAmbienteModal, setShowAmbienteModal] = useState(false);
  const [showMusicaModal, setShowMusicaModal] = useState(false);
  const [showServiciosModal, setShowServiciosModal] = useState(false);

  // Google Places enrichment
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [googleSuggestions, setGoogleSuggestions] = useState<any[]>([]);
  const [searchingGoogle, setSearchingGoogle] = useState(false);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setNombre(initialData.nombre || '');
      setUsername(initialData.username || '');
      setTipo(initialData.tipo || 'bar');
      setDireccion(initialData.direccion || '');
      setProvincia(initialData.provincia || 'Madrid');
      setTelefono(initialData.telefono || '');
      setEmail(initialData.email || '');
      setSitioWeb(initialData.website || '');
      setDescripcion(initialData.descripcion || initialData.descripcion_google || '');
      setImagenUrl(initialData.imagen_url || '');
      setGaleriaUrls(initialData.galeria_urls || []);
      setActivo(initialData.activo !== false);
      setEnriquecido(initialData.enriquecido || false);
      setLatitud(initialData.latitud ? parseFloat(initialData.latitud) : null);
      setLongitud(initialData.longitud ? parseFloat(initialData.longitud) : null);
      setAmbiente(initialData.ambiente || []);
      setMusica(initialData.musica || []);
      setServicios(initialData.servicios || []);
      setPrecioMedio(initialData.precio_medio || 2);
      setHorarios(initialData.horarios_completos || {});
      setGooglePlaceId(initialData.google_place_id || null);
    }
  }, [initialData]);

  // Validate username availability
  const validateUsername = useCallback(async (newUsername: string) => {
    const cleanUsername = newUsername.trim().toLowerCase();
    
    if (!cleanUsername) {
      setUsernameError('');
      return true;
    }

    // Validate format
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(cleanUsername)) {
      setUsernameError('El nombre de usuario debe tener entre 3-30 caracteres (solo letras, números y guiones bajos)');
      return false;
    }

    setCheckingUsername(true);
    try {
      // Check if username is taken by another local
      const { data, error } = await supabase
        .from('locales')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', localId || '')
        .maybeSingle();

      if (error) {
        console.error('[LocalEditForm] Error checking username:', error);
        setUsernameError('Error al verificar disponibilidad');
        return false;
      }

      if (data) {
        setUsernameError('Este nombre de usuario ya está en uso');
        return false;
      }

      // Also check if username is taken by a user
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (userError) {
        console.error('[LocalEditForm] Error checking username in users:', userError);
      }

      if (userData) {
        setUsernameError('Este nombre de usuario ya está en uso');
        return false;
      }

      setUsernameError('');
      return true;
    } catch (error) {
      console.error('[LocalEditForm] Error validating username:', error);
      setUsernameError('Error al verificar disponibilidad');
      return false;
    } finally {
      setCheckingUsername(false);
    }
  }, [localId]);

  // Debounced username validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        validateUsername(username);
      } else {
        setUsernameError('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, validateUsername]);

  const searchGooglePlaces = async (query: string) => {
    if (query.length < 3) {
      setGoogleSuggestions([]);
      return;
    }

    setSearchingGoogle(true);
    try {
      const results = await googlePlacesTextSearch(query, provincia);
      setGoogleSuggestions(results.slice(0, 5));
    } catch (error) {
      console.error('Error searching Google Places:', error);
    } finally {
      setSearchingGoogle(false);
    }
  };

  const enrichWithGooglePlace = async (placeId: string) => {
    setEnriching(true);
    try {
      console.log('[LocalEditForm] Enriching with Google Place:', placeId);
      
      const placeDetails = await googlePlacesDetails(placeId);
      
      if (!placeDetails) {
        Alert.alert('Error', 'No se pudieron obtener los detalles del lugar');
        return;
      }

      // Validate location is in Spain
      if (!estaEnEspana(placeDetails.geometry.location.lat, placeDetails.geometry.location.lng)) {
        Alert.alert('Error', 'El local debe estar ubicado en España');
        return;
      }

      // Map Google types to BarLive categories
      const barliveTypes = mapGoogleTypesToBarlive(placeDetails.types || []);
      const primaryType = categorizarPorHorarios(placeDetails, barliveTypes);

      // Update form fields with Google data
      setNombre(placeDetails.name || nombre);
      setDireccion(placeDetails.formatted_address || direccion);
      setTelefono(placeDetails.formatted_phone_number || telefono);
      setSitioWeb(placeDetails.website || sitioWeb);
      setDescripcion(placeDetails.editorial_summary?.overview || descripcion);
      setLatitud(placeDetails.geometry.location.lat);
      setLongitud(placeDetails.geometry.location.lng);
      setGooglePlaceId(placeId);
      setTipo(primaryType || tipo);

      // Set price level
      if (placeDetails.price_level) {
        setPrecioMedio(placeDetails.price_level);
      }

      // Extract photos
      if (placeDetails.photos && placeDetails.photos.length > 0) {
        const photoUrls = placeDetails.photos.slice(0, 5).map((photo: any) => 
          getGooglePlacePhotoUrl(photo.photo_reference, 800)
        );
        
        if (photoUrls.length > 0) {
          setImagenUrl(photoUrls[0]);
          setGaleriaUrls(photoUrls);
        }
      }

      // Extract opening hours
      if (placeDetails.opening_hours?.periods) {
        const horariosCompletos: any = {};
        const diasMap: any = {
          0: 'domingo',
          1: 'lunes',
          2: 'martes',
          3: 'miercoles',
          4: 'jueves',
          5: 'viernes',
          6: 'sabado',
        };

        placeDetails.opening_hours.periods.forEach((period: any) => {
          const dia = diasMap[period.open.day];
          if (!dia) return;

          const horaApertura = period.open.time || '0000';
          const horaCierre = period.close?.time || '2359';

          const horaAperturaFormateada = `${horaApertura.slice(0, 2)}:${horaApertura.slice(2)}`;
          const horaCierreFormateada = `${horaCierre.slice(0, 2)}:${horaCierre.slice(2)}`;

          if (!horariosCompletos[dia]) {
            horariosCompletos[dia] = [];
          }
          horariosCompletos[dia].push(`${horaAperturaFormateada}-${horaCierreFormateada}`);
        });

        setHorarios(horariosCompletos);
      }

      setEnriquecido(true);
      setGoogleSuggestions([]);
      Alert.alert('Éxito', 'Local enriquecido con datos de Google Places');
    } catch (error) {
      console.error('[LocalEditForm] Error enriching:', error);
      Alert.alert('Error', 'No se pudo enriquecer el local con Google Places');
    } finally {
      setEnriching(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImagenUrl(result.assets[0].uri);
    }
  };

  const pickGalleryImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUrls = result.assets.map(asset => asset.uri);
      setGaleriaUrls([...galeriaUrls, ...newUrls]);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGaleriaUrls(galeriaUrls.filter((_, i) => i !== index));
  };

  const toggleAmbiente = (item: string) => {
    if (ambiente.includes(item)) {
      setAmbiente(ambiente.filter(a => a !== item));
    } else {
      setAmbiente([...ambiente, item]);
    }
  };

  const toggleMusica = (item: string) => {
    if (musica.includes(item)) {
      setMusica(musica.filter(m => m !== item));
    } else {
      setMusica([...musica, item]);
    }
  };

  const toggleServicio = (item: string) => {
    if (servicios.includes(item)) {
      setServicios(servicios.filter(s => s !== item));
    } else {
      setServicios([...servicios, item]);
    }
  };

  const handleSave = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    if (!direccion.trim()) {
      Alert.alert('Error', 'La dirección no puede estar vacía');
      return;
    }

    // Validate username if provided
    if (username.trim()) {
      const isValid = await validateUsername(username);
      if (!isValid) {
        Alert.alert('Error', usernameError || 'El nombre de usuario no es válido');
        return;
      }
    }

    setSaving(true);

    try {
      const updateData: any = {
        nombre: nombre.trim(),
        username: username.trim() || null,
        tipo,
        direccion: direccion.trim(),
        provincia,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        website: sitioWeb.trim() || null,
        descripcion: descripcion.trim() || null,
        imagen_url: imagenUrl || null,
        galeria_urls: galeriaUrls,
        activo,
        ambiente,
        musica,
        servicios,
        precio_medio: precioMedio,
        horarios_completos: horarios,
        latitud,
        longitud,
        google_place_id: googlePlaceId,
        enriquecido,
        updated_at: new Date().toISOString(),
      };

      await onSave(updateData);
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el local');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.form}>
        {/* Google Places Enrichment Section - only for admins */}
        {isAdmin && (
          <View style={styles.enrichmentSection}>
            <Text style={styles.sectionTitle}>🌐 Enriquecimiento con Google Places</Text>
            <Text style={styles.sectionDescription}>
              Busca tu local en Google Places para autocompletar información
            </Text>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar en Google Places..."
                placeholderTextColor={colors.textSecondary}
                onChangeText={(text) => {
                  searchGooglePlaces(text);
                }}
              />
              {searchingGoogle && (
                <ActivityIndicator size="small" color={colors.primary} style={styles.searchLoader} />
              )}
            </View>

            {googleSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {googleSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => enrichWithGooglePlace(suggestion.place_id)}
                    disabled={enriching}
                  >
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName}>{suggestion.name}</Text>
                      <Text style={styles.suggestionAddress}>{suggestion.formatted_address}</Text>
                    </View>
                    {enriching ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <IconSymbol ios_icon_name="arrow.down.circle" android_material_icon_name="download" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {enriquecido && googlePlaceId && (
              <View style={styles.enrichedBadge}>
                <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={20} color={colors.primary} />
                <Text style={styles.enrichedText}>Local enriquecido con Google Places</Text>
              </View>
            )}
          </View>
        )}

        {/* Imagen Principal */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>Imagen Principal</Text>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {imagenUrl ? (
              <Image source={{ uri: imagenUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={48} color={colors.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Toca para añadir imagen</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Galería de Imágenes */}
        <View style={styles.gallerySection}>
          <Text style={styles.label}>Galería de Imágenes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {galeriaUrls.map((url, index) => (
              <View key={index} style={styles.galleryImageContainer}>
                <Image source={{ uri: url }} style={styles.galleryImage} />
                <TouchableOpacity
                  style={styles.removeGalleryButton}
                  onPress={() => removeGalleryImage(index)}
                >
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.badgeNuevo} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addGalleryButton} onPress={pickGalleryImages}>
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={48} color={colors.primary} />
              <Text style={styles.addGalleryText}>Añadir</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Nombre */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nombre del local *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del local"
            placeholderTextColor={colors.textSecondary}
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        {/* Username field */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nombre de usuario</Text>
          <View style={styles.usernameInputContainer}>
            <Text style={styles.usernamePrefix}>@</Text>
            <TextInput
              style={styles.usernameInput}
              placeholder="nombre_local"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
            {checkingUsername && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
          {usernameError ? (
            <Text style={styles.errorText}>{usernameError}</Text>
          ) : username ? (
            <Text style={styles.successText}>✓ Nombre de usuario disponible</Text>
          ) : (
            <Text style={styles.helperText}>
              Este nombre se usará para mencionar el local en publicaciones
            </Text>
          )}
        </View>

        {/* Tipo */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tipo de local *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowTipoModal(true)}
          >
            <Text style={styles.selectButtonText}>{tipo}</Text>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Dirección */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Dirección *</Text>
          <TextInput
            style={styles.input}
            placeholder="Calle, número, ciudad"
            placeholderTextColor={colors.textSecondary}
            value={direccion}
            onChangeText={setDireccion}
          />
        </View>

        {/* Provincia */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Provincia *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowProvinciaModal(true)}
          >
            <Text style={styles.selectButtonText}>{provincia}</Text>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Teléfono */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="+34 XXX XXX XXX"
            placeholderTextColor={colors.textSecondary}
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}
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

        {/* Sitio Web */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Sitio web</Text>
          <TextInput
            style={styles.input}
            placeholder="https://www.local.com"
            placeholderTextColor={colors.textSecondary}
            value={sitioWeb}
            onChangeText={setSitioWeb}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Descripción */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe el local..."
            placeholderTextColor={colors.textSecondary}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.helperText}>{descripcion.length}/500 caracteres</Text>
        </View>

        {/* Precio Medio */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nivel de Precio</Text>
          <View style={styles.priceSelector}>
            {[1, 2, 3, 4].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.priceButton,
                  precioMedio === level && styles.priceButtonActive
                ]}
                onPress={() => setPrecioMedio(level)}
              >
                <Text style={[
                  styles.priceButtonText,
                  precioMedio === level && styles.priceButtonTextActive
                ]}>
                  {'€'.repeat(level)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ambiente */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Ambiente</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowAmbienteModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {ambiente.length > 0 ? `${ambiente.length} seleccionados` : 'Seleccionar ambiente'}
            </Text>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Música */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Música</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowMusicaModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {musica.length > 0 ? `${musica.length} seleccionados` : 'Seleccionar música'}
            </Text>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Servicios */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Servicios</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowServiciosModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {servicios.length > 0 ? `${servicios.length} seleccionados` : 'Seleccionar servicios'}
            </Text>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Estado */}
        <View style={styles.inputContainer}>
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Local activo</Text>
              <Text style={styles.switchDescription}>
                El local será visible en la aplicación
              </Text>
            </View>
            <Switch
              value={activo}
              onValueChange={setActivo}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            La opción de local destacado se gestiona desde la página de Gestión de Locales, donde puedes ver cuántos destacados te quedan según tu plan.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.saveButton, (saving || checkingUsername || !!usernameError) && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={saving || checkingUsername || !!usernameError}
          >
            {saving ? (
              <ActivityIndicator color={colors.headerText} />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Tipo */}
      <Modal
        visible={showTipoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTipoModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTipoModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona el tipo</Text>
              <TouchableOpacity onPress={() => setShowTipoModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {TIPOS_LOCAL.map((tipoOption) => (
                <TouchableOpacity
                  key={tipoOption}
                  style={[
                    styles.modalOption,
                    tipo === tipoOption && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setTipo(tipoOption);
                    setShowTipoModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      tipo === tipoOption && styles.modalOptionTextActive,
                    ]}
                  >
                    {tipoOption.charAt(0).toUpperCase() + tipoOption.slice(1)}
                  </Text>
                  {tipo === tipoOption && (
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Provincia */}
      <Modal
        visible={showProvinciaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProvinciaModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProvinciaModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona la provincia</Text>
              <TouchableOpacity onPress={() => setShowProvinciaModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {PROVINCIAS.map((provinciaOption) => (
                <TouchableOpacity
                  key={provinciaOption}
                  style={[
                    styles.modalOption,
                    provincia === provinciaOption && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setProvincia(provinciaOption);
                    setShowProvinciaModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      provincia === provinciaOption && styles.modalOptionTextActive,
                    ]}
                  >
                    {provinciaOption}
                  </Text>
                  {provincia === provinciaOption && (
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Ambiente */}
      <Modal
        visible={showAmbienteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAmbienteModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAmbienteModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona el ambiente</Text>
              <TouchableOpacity onPress={() => setShowAmbienteModal(false)}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {AMBIENTE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalOption,
                    ambiente.includes(option) && styles.modalOptionActive,
                  ]}
                  onPress={() => toggleAmbiente(option)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      ambiente.includes(option) && styles.modalOptionTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
                  </Text>
                  {ambiente.includes(option) && (
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Música */}
      <Modal
        visible={showMusicaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMusicaModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMusicaModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona la música</Text>
              <TouchableOpacity onPress={() => setShowMusicaModal(false)}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {MUSICA_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalOption,
                    musica.includes(option) && styles.modalOptionActive,
                  ]}
                  onPress={() => toggleMusica(option)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      musica.includes(option) && styles.modalOptionTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
                  </Text>
                  {musica.includes(option) && (
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Servicios */}
      <Modal
        visible={showServiciosModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiciosModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowServiciosModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona los servicios</Text>
              <TouchableOpacity onPress={() => setShowServiciosModal(false)}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {SERVICIOS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalOption,
                    servicios.includes(option) && styles.modalOptionActive,
                  ]}
                  onPress={() => toggleServicio(option)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      servicios.includes(option) && styles.modalOptionTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
                  </Text>
                  {servicios.includes(option) && (
                    <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  enrichmentSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  searchLoader: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  suggestionsContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  suggestionAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  enrichedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  enrichedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imagePlaceholder: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  gallerySection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  galleryScroll: {
    marginTop: 12,
  },
  galleryImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeGalleryButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  addGalleryButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addGalleryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  inputContainer: {
    marginBottom: 20,
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
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  usernamePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '600',
  },
  successText: {
    fontSize: 13,
    color: '#10B981',
    marginTop: 6,
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.text,
    textTransform: 'capitalize',
  },
  priceSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  priceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  priceButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  priceButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  priceButtonTextActive: {
    color: colors.primary,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalOptionActive: {
    backgroundColor: `${colors.primary}10`,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOptionTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
});
