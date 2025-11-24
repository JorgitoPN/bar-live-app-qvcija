
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function LocalOwnershipRequestScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [requestType, setRequestType] = useState<'reclamar_local' | 'nuevo_local'>('reclamar_local');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<any | null>(null);

  // For new local
  const [nombreLocal, setNombreLocal] = useState('');
  const [direccionLocal, setDireccionLocal] = useState('');
  const [provinciaLocal, setProvinciaLocal] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [mensaje, setMensaje] = useState('');

  const searchLocals = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, provincia, imagen_url')
        .ilike('nombre', `%${query}%`)
        .eq('activo', true)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching locals:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (requestType === 'reclamar_local') {
        searchLocals(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, requestType]);

  const handleSubmitRequest = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar una solicitud');
      return;
    }

    if (requestType === 'reclamar_local' && !selectedLocal) {
      Alert.alert('Error', 'Debes seleccionar un local');
      return;
    }

    if (requestType === 'nuevo_local') {
      if (!nombreLocal.trim() || !direccionLocal.trim() || !provinciaLocal.trim()) {
        Alert.alert('Error', 'Debes completar todos los campos obligatorios');
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('solicitudes_propietario')
        .insert({
          usuario_id: user.id,
          tipo_solicitud: requestType,
          local_id: requestType === 'reclamar_local' ? selectedLocal?.id : null,
          nombre_local: requestType === 'nuevo_local' ? nombreLocal : null,
          direccion_local: requestType === 'nuevo_local' ? direccionLocal : null,
          provincia_local: requestType === 'nuevo_local' ? provinciaLocal : null,
          telefono_contacto: telefonoContacto || null,
          email_contacto: emailContacto || user.email,
          mensaje: mensaje || null,
          estado: 'pendiente',
        });

      if (error) throw error;

      Alert.alert(
        'Solicitud enviada',
        'Tu solicitud ha sido enviada correctamente. Te notificaremos cuando sea revisada.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar Rol de Propietario</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Tipo de solicitud</Text>
        <View style={styles.requestTypeContainer}>
          <TouchableOpacity
            style={[
              styles.requestTypeButton,
              requestType === 'reclamar_local' && styles.requestTypeButtonActive,
            ]}
            onPress={() => setRequestType('reclamar_local')}
          >
            <IconSymbol
              ios_icon_name="building.2.fill"
              android_material_icon_name="business"
              size={24}
              color={requestType === 'reclamar_local' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.requestTypeText,
                requestType === 'reclamar_local' && styles.requestTypeTextActive,
              ]}
            >
              Reclamar local existente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.requestTypeButton,
              requestType === 'nuevo_local' && styles.requestTypeButtonActive,
            ]}
            onPress={() => setRequestType('nuevo_local')}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add_circle"
              size={24}
              color={requestType === 'nuevo_local' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.requestTypeText,
                requestType === 'nuevo_local' && styles.requestTypeTextActive,
              ]}
            >
              Crear nuevo local
            </Text>
          </TouchableOpacity>
        </View>

        {requestType === 'reclamar_local' ? (
          <View>
            <Text style={styles.sectionTitle}>Buscar local</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del local"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((local) => (
                  <TouchableOpacity
                    key={local.id}
                    style={[
                      styles.searchResultItem,
                      selectedLocal?.id === local.id && styles.searchResultItemActive,
                    ]}
                    onPress={() => setSelectedLocal(local)}
                  >
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{local.nombre}</Text>
                      <Text style={styles.searchResultAddress}>
                        {local.direccion}, {local.provincia}
                      </Text>
                    </View>
                    {selectedLocal?.id === local.id && (
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check_circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Información del local</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del local *"
              placeholderTextColor={colors.textSecondary}
              value={nombreLocal}
              onChangeText={setNombreLocal}
            />
            <TextInput
              style={styles.input}
              placeholder="Dirección *"
              placeholderTextColor={colors.textSecondary}
              value={direccionLocal}
              onChangeText={setDireccionLocal}
            />
            <TextInput
              style={styles.input}
              placeholder="Provincia *"
              placeholderTextColor={colors.textSecondary}
              value={provinciaLocal}
              onChangeText={setProvinciaLocal}
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Información de contacto</Text>
        <TextInput
          style={styles.input}
          placeholder="Teléfono de contacto"
          placeholderTextColor={colors.textSecondary}
          value={telefonoContacto}
          onChangeText={setTelefonoContacto}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Email de contacto"
          placeholderTextColor={colors.textSecondary}
          value={emailContacto}
          onChangeText={setEmailContacto}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.sectionTitle}>Mensaje adicional (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Cuéntanos más sobre tu solicitud..."
          placeholderTextColor={colors.textSecondary}
          value={mensaje}
          onChangeText={setMensaje}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Enviar solicitud</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  requestTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  requestTypeButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  requestTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  requestTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  requestTypeTextActive: {
    color: colors.primary,
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
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  searchResults: {
    marginTop: 8,
    marginBottom: 24,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  searchResultItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
