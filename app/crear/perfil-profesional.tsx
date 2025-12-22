
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

// ✅ FIXED: Complete list of all 50 Spanish provinces
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
  
  // Form fields - pre-filled from user profile
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [puesto, setPuesto] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [habilidades, setHabilidades] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [foto, setFoto] = useState<string | null>(null);

  // ✅ NEW: Province dropdown modal state
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);

  const checkExistingProfile = useCallback(async () => {
    if (!user) {
      router.back();
      return;
    }

    try {
      // Check if user already has a professional profile
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
                // Pre-fill form with existing data
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
        // Pre-fill with user's social profile data
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
      // Use fetch to read the file as blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Convert blob to ArrayBuffer
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

      // Upload new image if it's a local file
      if (foto && foto.startsWith('file://')) {
        fotoUrl = await uploadImage(foto);
        if (!fotoUrl) {
          Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.');
          setLoading(false);
          return;
        }
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('perfiles_profesionales')
        .select('id')
        .eq('usuario_id', user.id)
        .single();

      if (existingProfile) {
        // Update existing profile
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
        // Create new profile - use titulo_profesional as required field
        const { error: insertError } = await supabase
          .from('perfiles_profesionales')
          .insert({
            usuario_id: user.id,
            titulo_profesional: puesto, // Map to existing required field
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

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Tu perfil profesional está vinculado a tu perfil social. Los propietarios podrán contactarte mediante mensajes.
            </Text>
          </View>

          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <IconSymbol ios_icon_name="person.circle" android_material_icon_name="account_circle" size={60} color={colors.textSecondary} />
                <Text style={styles.photoText}>Añadir foto</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textSecondary}
              value={nombreCompleto}
              onChangeText={setNombreCompleto}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Puesto deseado *</Text>
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

          {/* ✅ FIXED: Real dropdown selector for provinces */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Provincia</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Experiencia *</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Habilidades</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Disponibilidad</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Inmediata, fines de semana, noches..."
              placeholderTextColor={colors.textSecondary}
              value={disponibilidad}
              onChangeText={setDisponibilidad}
            />
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
                <Text style={styles.submitText}>Guardar Perfil</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ✅ NEW: Province selection modal */}
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

            <ScrollView 
              style={styles.provinciaList}
              showsVerticalScrollIndicator={false}
            >
              {PROVINCIAS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.provinciaItem,
                    provincia === p && styles.provinciaItemActive
                  ]}
                  onPress={() => {
                    setProvincia(p);
                    setShowProvinciaModal(false);
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
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={20} 
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
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    marginTop: 8,
    fontSize: 12,
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
  dropdownButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
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
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '70%',
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
    fontSize: 18,
    fontWeight: 'bold',
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
    fontWeight: '600',
    color: colors.primary,
  },
});
