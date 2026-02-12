
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
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';

/**
 * ✅ PERFIL PROFESIONAL v3.0 - ANDROID FONT SCALING APPLIED
 * 
 * NEW CHANGES v3.0:
 * - ✅ ANDROID SCALING: Applied scaleFontSize to ALL text elements
 * - ✅ CONSISTENT DESIGN: Respects +2 points font increase on Android
 * - ✅ IMPROVED READABILITY: Better text sizing across all sections
 * 
 * Previous changes v2.0:
 * - ✅ Added comprehensive nightlife industry job categories
 * - ✅ Organized by sections: Barra y bebidas, Música y ambiente, Seguridad y control, etc.
 * - ✅ Total of 30+ job position options
 * - ✅ Emoji icons for better visual organization
 */

const PUESTOS = [
  // 🍸 Barra y bebidas
  { id: 'camarero', label: 'Camarero/a', icon: '🍸', category: 'Barra y bebidas' },
  { id: 'bartender', label: 'Bartender / Barman / Barmaid', icon: '🍸', category: 'Barra y bebidas' },
  { id: 'coctelero', label: 'Coctelero/a', icon: '🍸', category: 'Barra y bebidas' },
  { id: 'ayudante_camarero', label: 'Ayudante de camarero/a', icon: '🍸', category: 'Barra y bebidas' },
  { id: 'barback', label: 'Barback (apoyo de barra)', icon: '🍸', category: 'Barra y bebidas' },
  
  // 🎧 Música y ambiente
  { id: 'dj', label: 'DJ', icon: '🎧', category: 'Música y ambiente' },
  { id: 'dj_residente', label: 'DJ residente', icon: '🎧', category: 'Música y ambiente' },
  { id: 'tecnico_sonido', label: 'Técnico/a de sonido', icon: '🎧', category: 'Música y ambiente' },
  { id: 'tecnico_iluminacion', label: 'Técnico/a de iluminación', icon: '🎧', category: 'Música y ambiente' },
  { id: 'vj', label: 'VJ (visual jockey)', icon: '🎧', category: 'Música y ambiente' },
  
  // 🛡️ Seguridad y control
  { id: 'portero', label: 'Portero/a / Controlador/a de acceso', icon: '🛡️', category: 'Seguridad y control' },
  { id: 'jefe_seguridad', label: 'Jefe/a de seguridad', icon: '🛡️', category: 'Seguridad y control' },
  { id: 'vigilante', label: 'Vigilante de seguridad', icon: '🛡️', category: 'Seguridad y control' },
  
  // 🎉 Sala y atención al cliente
  { id: 'rrpp', label: 'Relaciones públicas (RRPP)', icon: '🎉', category: 'Sala y atención al cliente' },
  { id: 'hostess', label: 'Hostess / Anfitrión/a', icon: '🎉', category: 'Sala y atención al cliente' },
  { id: 'animador', label: 'Animador/a', icon: '🎉', category: 'Sala y atención al cliente' },
  { id: 'gogodancer', label: 'Go-go dancer', icon: '🎉', category: 'Sala y atención al cliente' },
  { id: 'performer', label: 'Performer / Artista de espectáculo', icon: '🎉', category: 'Sala y atención al cliente' },
  
  // 🧹 Logística y apoyo
  { id: 'limpieza', label: 'Personal de limpieza', icon: '🧹', category: 'Logística y apoyo' },
  { id: 'mozo_almacen', label: 'Mozo/a de almacén', icon: '🧹', category: 'Logística y apoyo' },
  { id: 'montador_eventos', label: 'Montador/a de eventos', icon: '🧹', category: 'Logística y apoyo' },
  
  // 📋 Gestión y organización
  { id: 'encargado_sala', label: 'Encargado/a de sala', icon: '📋', category: 'Gestión y organización' },
  { id: 'supervisor', label: 'Supervisor/a de turno', icon: '📋', category: 'Gestión y organización' },
  { id: 'gerente', label: 'Gerente de discoteca', icon: '📋', category: 'Gestión y organización' },
  { id: 'director_eventos', label: 'Director/a de eventos', icon: '📋', category: 'Gestión y organización' },
  { id: 'promotor', label: 'Promotor/a de fiestas', icon: '📋', category: 'Gestión y organización' },
  
  // 💼 Administración y marketing
  { id: 'community_manager', label: 'Community manager', icon: '💼', category: 'Administración y marketing' },
  { id: 'responsable_marketing', label: 'Responsable de marketing', icon: '💼', category: 'Administración y marketing' },
  { id: 'responsable_reservas', label: 'Responsable de reservas y listas', icon: '💼', category: 'Administración y marketing' },
  { id: 'taquillero', label: 'Taquillero/a', icon: '💼', category: 'Administración y marketing' },
  
  // 👨‍🍳 Cocina (legacy - mantener compatibilidad)
  { id: 'cocinero', label: 'Cocinero/a', icon: '👨‍🍳', category: 'Cocina' },
];

const COMUNIDADES_PROVINCIAS: Record<string, string[]> = {
  'Andalucía': ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
  'Aragón': ['Huesca', 'Teruel', 'Zaragoza'],
  'Asturias': ['Asturias'],
  'Baleares': ['Islas Baleares'],
  'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife'],
  'Cantabria': ['Cantabria'],
  'Castilla y León': ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
  'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
  'Cataluña': ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
  'Comunidad de Madrid': ['Madrid'],
  'Comunidad Valenciana': ['Alicante', 'Castellón', 'Valencia'],
  'Extremadura': ['Badajoz', 'Cáceres'],
  'Galicia': ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
  'La Rioja': ['La Rioja'],
  'Navarra': ['Navarra'],
  'País Vasco': ['Álava', 'Guipúzcoa', 'Vizcaya'],
  'Región de Murcia': ['Murcia'],
  'Ceuta': ['Ceuta'],
  'Melilla': ['Melilla'],
};

const COMUNIDADES = Object.keys(COMUNIDADES_PROVINCIAS);

// Group positions by category for better UI organization
const groupedPuestos = PUESTOS.reduce((acc, puesto) => {
  const category = puesto.category;
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(puesto);
  return acc;
}, {} as Record<string, typeof PUESTOS>);

export default function CrearPerfilProfesionalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [puesto, setPuesto] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [habilidades, setHabilidades] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('');
  const [comunidad, setComunidad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [foto, setFoto] = useState<string | null>(null);

  const [showComunidadModal, setShowComunidadModal] = useState(false);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);
  const [comunidadSearch, setComunidadSearch] = useState('');
  const [provinciaSearch, setProvinciaSearch] = useState('');

  const checkExistingProfile = useCallback(async () => {
    if (!user) {
      router.back();
      return;
    }

    try {
      const { data: existingProfile, error } = await supabase
        .from('perfiles_profesionales')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

      if (existingProfile) {
        Alert.alert(
          'Perfil Existente',
          'Ya tienes un perfil profesional creado. ¿Deseas editarlo?',
          [
            { text: 'Cancelar', onPress: () => router.back() },
            { 
              text: 'Editar', 
              onPress: () => {
                setNombreCompleto(existingProfile.nombre_completo || '');
                setPuesto(existingProfile.puesto_deseado || '');
                setExperiencia(existingProfile.experiencia || '');
                setHabilidades(existingProfile.habilidades || '');
                setDisponibilidad(existingProfile.disponibilidad || '');
                setProvincia(existingProfile.provincia || '');
                setFoto(existingProfile.foto_url || null);
                
                // Auto-detect community from province
                if (existingProfile.provincia) {
                  for (const [com, provs] of Object.entries(COMUNIDADES_PROVINCIAS)) {
                    if (provs.includes(existingProfile.provincia)) {
                      setComunidad(com);
                      break;
                    }
                  }
                }
              }
            }
          ]
        );
      } else {
        setNombreCompleto(user.nombre || '');
        setFoto(user.avatar || null);
      }
    } catch (error) {
      console.error('[PerfilProfesional v3.0] Error checking existing profile:', error);
    } finally {
      setCheckingExisting(false);
    }
  }, [user, router]);

  useEffect(() => {
    checkExistingProfile();
  }, [checkExistingProfile]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const fileName = `perfil-profesional-${user!.id}-${Date.now()}.jpg`;
      const filePath = `perfiles-profesionales/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('imagenes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('[PerfilProfesional v3.0] Error uploading image:', error);
      return null;
    }
  };

  const handlePublish = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para crear un perfil profesional');
      return;
    }

    if (!nombreCompleto || !puesto || !experiencia) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);

    try {
      let fotoUrl = foto;

      if (foto && foto.startsWith('file://')) {
        fotoUrl = await uploadImage(foto);
        if (!fotoUrl) {
          Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.');
          setLoading(false);
          return;
        }
      }

      const { data: existingProfile } = await supabase
        .from('perfiles_profesionales')
        .select('id')
        .eq('usuario_id', user.id)
        .single();

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('perfiles_profesionales')
          .update({
            nombre_completo: nombreCompleto,
            puesto_deseado: puesto,
            experiencia,
            habilidades,
            disponibilidad,
            provincia,
            foto_url: fotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProfile.id);

        if (updateError) throw updateError;

        Alert.alert('Éxito', 'Perfil profesional actualizado correctamente', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error: insertError } = await supabase
          .from('perfiles_profesionales')
          .insert({
            usuario_id: user.id,
            titulo_profesional: puesto,
            nombre_completo: nombreCompleto,
            puesto_deseado: puesto,
            experiencia,
            habilidades,
            disponibilidad,
            provincia,
            foto_url: fotoUrl,
            activo: true,
          });

        if (insertError) throw insertError;

        Alert.alert(
          'Éxito', 
          'Perfil profesional creado correctamente. Los propietarios podrán contactarte a través de mensajes.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('[PerfilProfesional v3.0] Error saving profile:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const filteredComunidades = COMUNIDADES.filter(c => 
    c.toLowerCase().includes(comunidadSearch.toLowerCase())
  );

  const availableProvincias = comunidad ? COMUNIDADES_PROVINCIAS[comunidad] : [];
  const filteredProvincias = availableProvincias.filter(p => 
    p.toLowerCase().includes(provinciaSearch.toLowerCase())
  );

  const handleComunidadSelect = (selectedComunidad: string) => {
    setComunidad(selectedComunidad);
    setProvincia(''); // Reset province when community changes
    setShowComunidadModal(false);
    setComunidadSearch('');
  };

  if (checkingExisting) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[{ marginTop: 16, color: colors.textSecondary }, { fontSize: scaleFontSize(14) }]}>
          Cargando...
        </Text>
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
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>
          Perfil Profesional
        </Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getContentBottomPadding(20) }}
      >
        <View style={styles.form}>
          <View style={styles.infoBanner}>
            <IconSymbol 
              ios_icon_name="info.circle.fill" 
              android_material_icon_name="info" 
              size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
              color={colors.primary} 
            />
            <Text style={[styles.infoText, { fontSize: scaleFontSize(13) }]}>
              Tu perfil profesional está vinculado a tu perfil social. Los propietarios podrán contactarte mediante mensajes.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol 
                ios_icon_name="person.circle.fill" 
                android_material_icon_name="account_circle" 
                size={Platform.OS === 'android' ? scaleIconSize(22) : 22} 
                color={colors.primary} 
              />
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(17) }]}>
                Datos Personales
              </Text>
            </View>

            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {foto ? (
                <Image source={{ uri: foto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <IconSymbol 
                    ios_icon_name="camera.fill" 
                    android_material_icon_name="add_a_photo" 
                    size={Platform.OS === 'android' ? scaleIconSize(36) : 36} 
                    color={colors.textSecondary} 
                  />
                  <Text style={[styles.photoText, { fontSize: scaleFontSize(11) }]}>
                    Añadir foto
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={[styles.floatingLabel, { fontSize: scaleFontSize(12) }]}>
                Nombre completo *
              </Text>
              <TextInput
                style={[styles.input, { fontSize: scaleFontSize(15) }]}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textSecondary}
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol 
                ios_icon_name="briefcase.fill" 
                android_material_icon_name="work" 
                size={Platform.OS === 'android' ? scaleIconSize(22) : 22} 
                color={colors.primary} 
              />
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(17) }]}>
                Experiencia
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.floatingLabel, { fontSize: scaleFontSize(12) }]}>
                Puesto deseado *
              </Text>
              <ScrollView 
                style={styles.puestoScrollContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {Object.entries(groupedPuestos).map(([category, puestos]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={[styles.categoryTitle, { fontSize: scaleFontSize(14) }]}>
                      {category}
                    </Text>
                    <View style={styles.puestoButtons}>
                      {puestos.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.puestoButton, puesto === p.id && styles.puestoButtonActive]}
                          onPress={() => setPuesto(p.id)}
                        >
                          <Text style={styles.puestoIcon}>{p.icon}</Text>
                          <Text
                            style={[
                              styles.puestoButtonText,
                              { fontSize: scaleFontSize(13) },
                              puesto === p.id && styles.puestoButtonTextActive,
                            ]}
                          >
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.floatingLabel, { fontSize: scaleFontSize(12) }]}>
                Experiencia laboral *
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { fontSize: scaleFontSize(15) }]}
                placeholder="Describe tu experiencia laboral..."
                placeholderTextColor={colors.textSecondary}
                value={experiencia}
                onChangeText={setExperiencia}
                multiline
                numberOfLines={5}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.floatingLabel, { fontSize: scaleFontSize(12) }]}>
                Habilidades
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { fontSize: scaleFontSize(15) }]}
                placeholder="Idiomas, certificaciones, habilidades especiales..."
                placeholderTextColor={colors.textSecondary}
                value={habilidades}
                onChangeText={setHabilidades}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.floatingLabel, { fontSize: scaleFontSize(12) }]}>
                Disponibilidad
              </Text>
              <TextInput
                style={[styles.input, { fontSize: scaleFontSize(15) }]}
                placeholder="Ej: Inmediata, fines de semana, noches..."
                placeholderTextColor={colors.textSecondary}
                value={disponibilidad}
                onChangeText={setDisponibilidad}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol 
                ios_icon_name="mappin.circle.fill" 
                android_material_icon_name="location_on" 
                size={Platform.OS === 'android' ? scaleIconSize(22) : 22} 
                color={colors.primary} 
              />
              <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(17) }]}>
                Ubicación
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.floatingLabel, { fontSize: scaleFontSize(12) }]}>
                Comunidad Autónoma
              </Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowComunidadModal(true)}
              >
                <Text style={[styles.dropdownButtonText, { fontSize: scaleFontSize(15) }, !comunidad && styles.dropdownPlaceholder]}>
                  {comunidad || 'Selecciona una comunidad'}
                </Text>
                <IconSymbol 
                  ios_icon_name="chevron.down" 
                  android_material_icon_name="arrow_drop_down" 
                  size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.floatingLabel, { fontSize: scaleFontSize(12) }]}>
                Provincia
              </Text>
              <TouchableOpacity 
                style={[styles.dropdownButton, !comunidad && styles.dropdownButtonDisabled]}
                onPress={() => {
                  if (comunidad) {
                    setShowProvinciaModal(true);
                  } else {
                    Alert.alert('Atención', 'Primero selecciona una comunidad autónoma');
                  }
                }}
                disabled={!comunidad}
              >
                <Text style={[styles.dropdownButtonText, { fontSize: scaleFontSize(15) }, !provincia && styles.dropdownPlaceholder]}>
                  {provincia || (comunidad ? 'Selecciona una provincia' : 'Primero selecciona comunidad')}
                </Text>
                <IconSymbol 
                  ios_icon_name="chevron.down" 
                  android_material_icon_name="arrow_drop_down" 
                  size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                  color={comunidad ? colors.textSecondary : colors.cardBorder} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handlePublish}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color={colors.headerText} />
              ) : (
                <React.Fragment>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                    color={colors.headerText} 
                  />
                  <Text style={[styles.submitText, { fontSize: scaleFontSize(17) }]}>
                    Guardar Perfil
                  </Text>
                </React.Fragment>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Community Modal - Bottom Sheet */}
      <Modal
        visible={showComunidadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComunidadModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable 
            style={styles.bottomSheetBackdrop}
            onPress={() => setShowComunidadModal(false)}
          />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.bottomSheetKeyboardAvoid}
          >
            <View style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetHandle} />
              
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: scaleFontSize(19) }]}>
                  Comunidad Autónoma
                </Text>
                <TouchableOpacity onPress={() => setShowComunidadModal(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark" 
                    android_material_icon_name="close" 
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                    color={colors.text} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <IconSymbol 
                  ios_icon_name="magnifyingglass" 
                  android_material_icon_name="search" 
                  size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                  color={colors.textSecondary} 
                />
                <TextInput
                  style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
                  placeholder="Buscar comunidad..."
                  placeholderTextColor={colors.textSecondary}
                  value={comunidadSearch}
                  onChangeText={setComunidadSearch}
                />
                {comunidadSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setComunidadSearch('')}>
                    <IconSymbol 
                      ios_icon_name="xmark.circle.fill" 
                      android_material_icon_name="cancel" 
                      size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView 
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {filteredComunidades.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.optionItem,
                      comunidad === c && styles.optionItemActive
                    ]}
                    onPress={() => handleComunidadSelect(c)}
                  >
                    <Text style={[
                      styles.optionItemText,
                      { fontSize: scaleFontSize(16) },
                      comunidad === c && styles.optionItemTextActive
                    ]}>
                      {c}
                    </Text>
                    {comunidad === c && (
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
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Province Modal - Bottom Sheet */}
      <Modal
        visible={showProvinciaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProvinciaModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable 
            style={styles.bottomSheetBackdrop}
            onPress={() => setShowProvinciaModal(false)}
          />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.bottomSheetKeyboardAvoid}
          >
            <View style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetHandle} />
              
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: scaleFontSize(19) }]}>
                  Provincia de {comunidad}
                </Text>
                <TouchableOpacity onPress={() => setShowProvinciaModal(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark" 
                    android_material_icon_name="close" 
                    size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                    color={colors.text} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <IconSymbol 
                  ios_icon_name="magnifyingglass" 
                  android_material_icon_name="search" 
                  size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                  color={colors.textSecondary} 
                />
                <TextInput
                  style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
                  placeholder="Buscar provincia..."
                  placeholderTextColor={colors.textSecondary}
                  value={provinciaSearch}
                  onChangeText={setProvinciaSearch}
                />
                {provinciaSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setProvinciaSearch('')}>
                    <IconSymbol 
                      ios_icon_name="xmark.circle.fill" 
                      android_material_icon_name="cancel" 
                      size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView 
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {filteredProvincias.length > 0 ? (
                  filteredProvincias.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.optionItem,
                        provincia === p && styles.optionItemActive
                      ]}
                      onPress={() => {
                        setProvincia(p);
                        setShowProvinciaModal(false);
                        setProvinciaSearch('');
                      }}
                    >
                      <Text style={[
                        styles.optionItemText,
                        { fontSize: scaleFontSize(16) },
                        provincia === p && styles.optionItemTextActive
                      ]}>
                        {p}
                      </Text>
                      {provincia === p && (
                        <IconSymbol 
                          ios_icon_name="checkmark.circle.fill" 
                          android_material_icon_name="check_circle" 
                          size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
                          color={colors.primary} 
                        />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(14) }]}>
                      No hay provincias disponibles
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
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
    fontWeight: 'bold',
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    flex: 1,
    color: colors.text,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '20',
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: colors.primary + '30',
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  floatingLabel: {
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonDisabled: {
    opacity: 0.5,
  },
  dropdownButtonText: {
    color: colors.text,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: colors.textSecondary,
  },
  puestoScrollContainer: {
    maxHeight: 400,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    paddingLeft: 4,
  },
  puestoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  puestoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  puestoButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  puestoIcon: {
    fontSize: 16,
  },
  puestoButtonText: {
    fontWeight: '600',
    color: colors.text,
  },
  puestoButtonTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: {
    color: colors.headerText,
    fontWeight: 'bold',
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetKeyboardAvoid: {
    maxHeight: '80%',
  },
  bottomSheetContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  optionItemActive: {
    backgroundColor: colors.primary + '10',
  },
  optionItemText: {
    color: colors.text,
  },
  optionItemTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.textSecondary,
  },
});
