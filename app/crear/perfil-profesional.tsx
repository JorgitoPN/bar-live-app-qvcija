
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const PUESTOS = ['Camarero/a', 'Cocinero/a', 'Barman', 'Gerente', 'Limpieza', 'Seguridad', 'DJ', 'Relaciones Públicas'];

const PROVINCIAS = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
  'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria',
  'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Gerona', 'Granada',
  'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares', 'Jaén',
  'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lérida', 'Lugo',
  'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Orense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya',
  'Zamora', 'Zaragoza'
];

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
  const [provincia, setProvincia] = useState('');
  const [foto, setFoto] = useState<string | null>(null);

  const [showProvinciaModal, setShowProvinciaModal] = useState(false);
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
              }
            }
          ]
        );
      } else {
        setNombreCompleto(user.nombre || '');
        setFoto(user.avatar || null);
      }
    } catch (error) {
      console.error('[PerfilProfesional] Error checking existing profile:', error);
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
      console.error('[PerfilProfesional] Error uploading image:', error);
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
      console.error('[PerfilProfesional] Error saving profile:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProvincias = PROVINCIAS.filter(p => 
    p.toLowerCase().includes(provinciaSearch.toLowerCase())
  );

  if (checkingExisting) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Cargando...</Text>
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
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil Profesional</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.infoBanner}>
            <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Tu perfil profesional está vinculado a tu perfil social. Los propietarios podrán contactarte mediante mensajes.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account_circle" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Datos Personales</Text>
            </View>

            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {foto ? (
                <Image source={{ uri: foto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="add_a_photo" size={40} color={colors.textSecondary} />
                  <Text style={styles.photoText}>Añadir foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Nombre completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textSecondary}
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="briefcase.fill" android_material_icon_name="work" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Experiencia</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Puesto deseado *</Text>
              <View style={styles.puestoButtons}>
                {PUESTOS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.puestoButton, puesto === p && styles.puestoButtonActive]}
                    onPress={() => setPuesto(p)}
                  >
                    <Text
                      style={[
                        styles.puestoButtonText,
                        puesto === p && styles.puestoButtonTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Experiencia laboral *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe tu experiencia laboral..."
                placeholderTextColor={colors.textSecondary}
                value={experiencia}
                onChangeText={setExperiencia}
                multiline
                numberOfLines={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Habilidades</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Idiomas, certificaciones, habilidades especiales..."
                placeholderTextColor={colors.textSecondary}
                value={habilidades}
                onChangeText={setHabilidades}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Disponibilidad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Inmediata, fines de semana, noches..."
                placeholderTextColor={colors.textSecondary}
                value={disponibilidad}
                onChangeText={setDisponibilidad}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Ubicación</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.floatingLabel}>Provincia</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowProvinciaModal(true)}
              >
                <Text style={[styles.dropdownButtonText, !provincia && styles.dropdownPlaceholder]}>
                  {provincia || 'Selecciona una provincia'}
                </Text>
                <IconSymbol 
                  ios_icon_name="chevron.down" 
                  android_material_icon_name="arrow_drop_down" 
                  size={20} 
                  color={colors.textSecondary} 
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
                <>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.headerText} />
                  <Text style={styles.submitText}>Guardar Perfil</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showProvinciaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProvinciaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalOverlayTouchable}
            onPress={() => setShowProvinciaModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona Provincia</Text>
              <TouchableOpacity onPress={() => setShowProvinciaModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar provincia..."
                placeholderTextColor={colors.textSecondary}
                value={provinciaSearch}
                onChangeText={setProvinciaSearch}
              />
              {provinciaSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProvinciaSearch('')}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView 
              style={styles.provinciaList}
              showsVerticalScrollIndicator={false}
            >
              {filteredProvincias.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.provinciaItem,
                    provincia === p && styles.provinciaItemActive
                  ]}
                  onPress={() => {
                    setProvincia(p);
                    setShowProvinciaModal(false);
                    setProvinciaSearch('');
                  }}
                >
                  <Text style={[
                    styles.provinciaItemText,
                    provincia === p && styles.provinciaItemTextActive
                  ]}>
                    {p}
                  </Text>
                  {provincia === p && (
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check_circle" 
                      size={24} 
                      color={colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  headerTitle: {
    fontSize: 20,
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
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '20',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary + '30',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  floatingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 2,
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
  dropdownButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownPlaceholder: {
    color: colors.textSecondary,
  },
  puestoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  puestoButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  puestoButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  puestoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  puestoButtonTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 20,
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
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submitText: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
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
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  provinciaList: {
    flex: 1,
  },
  provinciaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  provinciaItemActive: {
    backgroundColor: colors.primary + '10',
  },
  provinciaItemText: {
    fontSize: 16,
    color: colors.text,
  },
  provinciaItemTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
});
