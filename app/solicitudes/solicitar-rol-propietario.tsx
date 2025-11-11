
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmail } from '@/utils/email';

const PROVINCIAS = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona',
  'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca',
  'Gerona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares',
  'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lérida', 'Lugo', 'Madrid', 'Málaga',
  'Murcia', 'Navarra', 'Orense', 'Palencia', 'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife',
  'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid',
  'Vizcaya', 'Zamora', 'Zaragoza'
];

export default function SolicitarRolPropietarioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const [nombreLocal, setNombreLocal] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProvinciasPicker, setShowProvinciasPicker] = useState(false);

  const isClaimMode = tipo === 'reclamar';

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar una solicitud');
      router.push('/auth/login-popup');
      return;
    }

    if (!nombreLocal || !direccion || !ciudad || !provincia) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      console.log('[SolicitarPropietario] Enviando solicitud...', {
        tipo,
        nombreLocal,
        usuario_id: user.id,
      });

      // Create propietario request
      const { data: requestData, error: requestError } = await supabase
        .from('propietario_requests')
        .insert({
          usuario_id: user.id,
          tipo_solicitud: isClaimMode ? 'reclamar' : 'registrar',
          nombre_local: nombreLocal,
          direccion: direccion,
          ciudad: ciudad,
          provincia: provincia,
          telefono: telefono || null,
          descripcion: descripcion || null,
          estado: 'pendiente',
          estado_detalle: 'Solicitud recibida. En espera de revisión por el equipo de BarLive.',
        })
        .select()
        .single();

      if (requestError) {
        console.error('[SolicitarPropietario] Error creating request:', requestError);
        throw requestError;
      }

      console.log('[SolicitarPropietario] Request created:', requestData.id);

      // Send confirmation email to user
      try {
        await sendEmail(
          user.email || '',
          'Solicitud de Modo Propietario Recibida',
          `Hola ${user.nombre || 'Usuario'},\n\nHemos recibido tu solicitud para convertirte en propietario en BarLive.\n\nLocal: ${nombreLocal}\nDirección: ${direccion}, ${ciudad}, ${provincia}\n\nNuestro equipo revisará tu solicitud y te contactará pronto. Puedes ver el estado de tu solicitud en tu perfil.\n\nSaludos,\nEl equipo de BarLive`
        );
      } catch (emailError) {
        console.error('[SolicitarPropietario] Error sending email:', emailError);
        // Don't fail the whole operation if email fails
      }

      Alert.alert(
        '¡Solicitud Enviada!',
        'Tu solicitud ha sido enviada correctamente. El equipo de BarLive la revisará y te contactará pronto. Puedes ver el estado de tu solicitud en tu perfil.',
        [
          {
            text: 'Ver Estado',
            onPress: () => router.replace('/auth/propietario-request-status'),
          },
          {
            text: 'Ir a Inicio',
            onPress: () => router.replace('/(tabs)/explorar'),
          },
        ]
      );
    } catch (error: any) {
      console.error('[SolicitarPropietario] Error al enviar solicitud:', error);
      Alert.alert('Error', error.message || 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isClaimMode ? 'Reclamar Local' : 'Registrar Nuevo Local'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            {isClaimMode
              ? 'Reclama tu local existente en BarLive. Verificaremos que eres el propietario antes de aprobar tu solicitud.'
              : 'Crea un nuevo local en BarLive. Tu solicitud será revisada por nuestro equipo antes de ser aprobada.'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre del Local *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Bar El Rincón"
              placeholderTextColor={colors.textSecondary}
              value={nombreLocal}
              onChangeText={setNombreLocal}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Dirección *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Calle Mayor, 123"
              placeholderTextColor={colors.textSecondary}
              value={direccion}
              onChangeText={setDireccion}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ciudad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Madrid"
              placeholderTextColor={colors.textSecondary}
              value={ciudad}
              onChangeText={setCiudad}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Provincia *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowProvinciasPicker(!showProvinciasPicker)}
              disabled={loading}
            >
              <Text style={[styles.pickerButtonText, !provincia && styles.pickerPlaceholder]}>
                {provincia || 'Selecciona una provincia'}
              </Text>
              <IconSymbol
                name={showProvinciasPicker ? 'chevron.up' : 'chevron.down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {showProvinciasPicker && (
              <ScrollView style={styles.pickerList} nestedScrollEnabled>
                {PROVINCIAS.map((prov) => (
                  <TouchableOpacity
                    key={prov}
                    style={styles.pickerItem}
                    onPress={() => {
                      setProvincia(prov);
                      setShowProvinciasPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{prov}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: +34 912 345 678"
              placeholderTextColor={colors.textSecondary}
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Cuéntanos más sobre tu local..."
              placeholderTextColor={colors.textSecondary}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <View style={styles.infoCard}>
            <IconSymbol name="checkmark.seal.fill" size={20} color={colors.primary} />
            <Text style={styles.infoTextSmall}>
              Al enviar esta solicitud, se generará automáticamente una solicitud de modo Propietario. 
              Podrás ver el progreso de verificación en tu perfil.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Enviar Solicitud</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  infoTextSmall: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 4,
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
    paddingTop: 14,
  },
  pickerButton: {
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
  pickerButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerPlaceholder: {
    color: colors.textSecondary,
  },
  pickerList: {
    maxHeight: 200,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    marginTop: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pickerItemText: {
    fontSize: 16,
    color: colors.text,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
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
});
