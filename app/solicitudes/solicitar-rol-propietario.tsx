
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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Local {
  id: string;
  nombre: string;
  direccion: string;
  provincia: string;
  tipo: string;
}

export default function SolicitarRolPropietarioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const tipo = params.tipo as 'reclamar' | 'nuevo';

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Local[]>([]);
  const [selectedLocals, setSelectedLocals] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  // For new local
  const [nombreLocal, setNombreLocal] = useState('');
  const [direccionLocal, setDireccionLocal] = useState('');
  const [provinciaLocal, setProvinciaLocal] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [mensaje, setMensaje] = useState('');

  const provincias = [
    'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
    'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real',
    'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva',
    'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León',
    'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
    'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
    'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
  ];

  const searchLocals = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, provincia, tipo')
        .ilike('nombre', `%${searchQuery}%`)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('[SolicitarRolPropietario] Error searching locals:', error);
      Alert.alert('Error', 'No se pudieron buscar los locales');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (tipo === 'reclamar' && searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchLocals();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, tipo, searchLocals]);

  const toggleLocalSelection = (localId: string) => {
    if (selectedLocals.includes(localId)) {
      setSelectedLocals(selectedLocals.filter(id => id !== localId));
    } else {
      setSelectedLocals([...selectedLocals, localId]);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para continuar');
      return;
    }

    if (tipo === 'reclamar' && selectedLocals.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un local');
      return;
    }

    if (tipo === 'nuevo') {
      if (!nombreLocal.trim() || !direccionLocal.trim() || !provinciaLocal) {
        Alert.alert('Error', 'Por favor, completa todos los campos obligatorios');
        return;
      }
    }

    setLoading(true);

    try {
      if (tipo === 'reclamar') {
        // Create requests for each selected local
        for (const localId of selectedLocals) {
          const { error } = await supabase
            .from('solicitudes_propietario')
            .insert({
              usuario_id: user.id,
              tipo_solicitud: 'reclamar_local',
              local_id: localId,
              telefono_contacto: telefonoContacto || null,
              email_contacto: emailContacto || user.email,
              mensaje: mensaje || null,
              estado: 'pendiente',
            });

          if (error) throw error;
        }

        Alert.alert(
          'Solicitud enviada',
          `Tu solicitud para reclamar ${selectedLocals.length} ${selectedLocals.length === 1 ? 'local' : 'locales'} ha sido enviada. Te notificaremos cuando sea revisada.`,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)/explorar'),
            },
          ]
        );
      } else {
        // Create request for new local
        const { error } = await supabase
          .from('solicitudes_propietario')
          .insert({
            usuario_id: user.id,
            tipo_solicitud: 'nuevo_local',
            nombre_local: nombreLocal,
            direccion_local: direccionLocal,
            provincia_local: provinciaLocal,
            telefono_contacto: telefonoContacto || null,
            email_contacto: emailContacto || user.email,
            mensaje: mensaje || null,
            estado: 'pendiente',
          });

        if (error) throw error;

        Alert.alert(
          'Solicitud enviada',
          'Tu solicitud para añadir un nuevo local ha sido enviada. Te notificaremos cuando sea revisada.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)/explorar'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('[SolicitarRolPropietario] Error submitting request:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {tipo === 'reclamar' ? 'Reclamar Local' : 'Añadir Nuevo Local'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            {tipo === 'reclamar'
              ? 'Selecciona los locales que deseas reclamar. Tu solicitud será revisada por nuestro equipo.'
              : 'Completa la información del local que deseas añadir. Tu solicitud será revisada antes de ser publicada.'}
          </Text>
        </View>

        {tipo === 'reclamar' ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Buscar Local</Text>
              <View style={styles.searchInputContainer}>
                <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Nombre del local..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searching && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
            </View>

            {searchResults.length > 0 && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Resultados ({searchResults.length})</Text>
                {searchResults.map((local) => (
                  <TouchableOpacity
                    key={local.id}
                    style={[
                      styles.localCard,
                      selectedLocals.includes(local.id) && styles.localCardSelected,
                    ]}
                    onPress={() => toggleLocalSelection(local.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.localCardContent}>
                      <View style={styles.localCardInfo}>
                        <Text style={styles.localCardName}>{local.nombre}</Text>
                        <Text style={styles.localCardAddress}>{local.direccion}</Text>
                        <Text style={styles.localCardType}>
                          {local.tipo} • {local.provincia}
                        </Text>
                      </View>
                      {selectedLocals.includes(local.id) && (
                        <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedLocals.length > 0 && (
              <View style={styles.selectedContainer}>
                <Text style={styles.selectedTitle}>
                  Locales seleccionados ({selectedLocals.length})
                </Text>
                <Text style={styles.selectedText}>
                  Has seleccionado {selectedLocals.length} {selectedLocals.length === 1 ? 'local' : 'locales'}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Nombre del Local <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Bar El Rincón"
                placeholderTextColor={colors.textSecondary}
                value={nombreLocal}
                onChangeText={setNombreLocal}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Dirección <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Calle Mayor 123"
                placeholderTextColor={colors.textSecondary}
                value={direccionLocal}
                onChangeText={setDireccionLocal}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Provincia <Text style={styles.required}>*</Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.provinciaScroll}
                contentContainerStyle={styles.provinciaScrollContent}
              >
                {provincias.map((prov) => (
                  <TouchableOpacity
                    key={prov}
                    style={[
                      styles.provinciaChip,
                      provinciaLocal === prov && styles.provinciaChipActive,
                    ]}
                    onPress={() => setProvinciaLocal(prov)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.provinciaChipText,
                        provinciaLocal === prov && styles.provinciaChipTextActive,
                      ]}
                    >
                      {prov}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Teléfono de Contacto</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: +34 600 000 000"
            placeholderTextColor={colors.textSecondary}
            value={telefonoContacto}
            onChangeText={setTelefonoContacto}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email de Contacto</Text>
          <TextInput
            style={styles.input}
            placeholder={user?.email || 'tu@email.com'}
            placeholderTextColor={colors.textSecondary}
            value={emailContacto}
            onChangeText={setEmailContacto}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mensaje Adicional (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Información adicional que quieras compartir..."
            placeholderTextColor={colors.textSecondary}
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol name="paperplane.fill" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Enviar Solicitud</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.noteCard}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.secondary} />
          <Text style={styles.noteText}>
            Tu solicitud será revisada por nuestro equipo. Te notificaremos por email cuando sea aprobada o si necesitamos más información.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  backButton: {
    marginRight: 16,
    padding: 4,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '20',
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  localCardSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  localCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  localCardInfo: {
    flex: 1,
  },
  localCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  localCardAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  localCardType: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectedContainer: {
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  selectedText: {
    fontSize: 14,
    color: colors.text,
  },
  provinciaScroll: {
    marginTop: 8,
  },
  provinciaScrollContent: {
    gap: 8,
    paddingRight: 20,
  },
  provinciaChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  provinciaChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  provinciaChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  provinciaChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: colors.secondary + '20',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
