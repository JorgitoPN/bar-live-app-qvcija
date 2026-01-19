
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function LocalOwnershipRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [requestType, setRequestType] = useState<'reclamar_local' | 'nuevo_local'>(
    params.mode === 'claim' ? 'reclamar_local' : 'reclamar_local'
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  // For new local
  const [nombreLocal, setNombreLocal] = useState('');
  const [direccionLocal, setDireccionLocal] = useState('');
  const [provinciaLocal, setProvinciaLocal] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [emailContacto, setEmailContacto] = useState(user?.email || '');
  const [mensaje, setMensaje] = useState('');

  // If coming from local details page, pre-select the local
  useEffect(() => {
    if (params.localId && params.mode === 'claim') {
      loadLocalDetails(params.localId as string);
    }
  }, [params.localId, params.mode]);

  const loadLocalDetails = async (localId: string) => {
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, provincia, imagen_url, tipo')
        .eq('id', localId)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedLocal(data);
        setSearchQuery(data.nombre);
      }
    } catch (error) {
      console.error('[LocalOwnershipRequest] Error loading local:', error);
    }
  };

  const searchLocals = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, provincia, imagen_url, tipo, propietario_id')
        .ilike('nombre', `%${query}%`)
        .eq('activo', true)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('[LocalOwnershipRequest] Error searching locals:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (requestType === 'reclamar_local' && !params.localId) {
        searchLocals(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, requestType, params.localId]);

  const handleSubmitRequest = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar una solicitud');
      return;
    }

    if (requestType === 'reclamar_local' && !selectedLocal) {
      Alert.alert('Error', 'Debes seleccionar un local de la lista');
      return;
    }

    if (requestType === 'nuevo_local') {
      if (!nombreLocal.trim() || !direccionLocal.trim() || !provinciaLocal.trim()) {
        Alert.alert('Error', 'Debes completar todos los campos obligatorios (nombre, dirección y provincia)');
        return;
      }
    }

    // ✅ Check if local already has owner
    if (requestType === 'reclamar_local' && selectedLocal.propietario_id) {
      Alert.alert(
        'Local ya reclamado',
        'Este local ya tiene un propietario. Si crees que esto es un error, contacta con soporte.',
        [{ text: 'OK' }]
      );
      return;
    }

    // ✅ Check if user already has a pending request for this local
    if (requestType === 'reclamar_local') {
      const { data: existingRequest } = await supabase
        .from('solicitudes_propietario')
        .select('id, estado')
        .eq('usuario_id', user.id)
        .eq('local_id', selectedLocal.id)
        .in('estado', ['pendiente', 'en_revision', 'informacion_adicional'])
        .single();

      if (existingRequest) {
        Alert.alert(
          'Solicitud existente',
          'Ya tienes una solicitud pendiente para este local. Puedes ver su estado en tu perfil.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setLoading(true);

    try {
      const requestData: any = {
        usuario_id: user.id,
        tipo_solicitud: requestType,
        estado: 'pendiente',
        telefono_contacto: telefonoContacto || null,
        email_contacto: emailContacto || user.email,
        mensaje: mensaje || null,
      };

      if (requestType === 'reclamar_local') {
        requestData.local_id = selectedLocal.id;
        requestData.nombre_local = selectedLocal.nombre;
        requestData.direccion_local = selectedLocal.direccion;
      } else {
        requestData.nombre_local = nombreLocal;
        requestData.direccion_local = direccionLocal;
        requestData.provincia_local = provinciaLocal;
      }

      const { error } = await supabase
        .from('solicitudes_propietario')
        .insert(requestData);

      if (error) throw error;

      Alert.alert(
        '✅ Solicitud enviada',
        requestType === 'reclamar_local'
          ? `Tu solicitud para reclamar "${selectedLocal.nombre}" ha sido enviada. Te notificaremos cuando sea revisada por nuestro equipo. Puedes ver el estado de tu solicitud en tu perfil.`
          : `Tu solicitud para crear el local "${nombreLocal}" ha sido enviada. Te notificaremos cuando sea revisada por nuestro equipo. Puedes ver el estado de tu solicitud en tu perfil.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('[LocalOwnershipRequest] Error submitting request:', error);
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
        <View style={styles.infoCard}>
          <IconSymbol 
            ios_icon_name="info.circle.fill" 
            android_material_icon_name="info" 
            size={24} 
            color={colors.primary} 
          />
          <Text style={styles.infoText}>
            Solicita el rol de propietario para gestionar tu local en BarLive. 
            El rol se activará solo tras la aprobación del administrador.
          </Text>
        </View>

        {!params.localId && (
          <React.Fragment>
            <Text style={styles.sectionTitle}>Tipo de solicitud</Text>
            <View style={styles.requestTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.requestTypeButton,
                  requestType === 'reclamar_local' && styles.requestTypeButtonActive,
                ]}
                onPress={() => {
                  setRequestType('reclamar_local');
                  setSelectedLocal(null);
                  setSearchQuery('');
                }}
              >
                <IconSymbol
                  ios_icon_name="building.2.fill"
                  android_material_icon_name="business"
                  size={28}
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
                <Text style={styles.requestTypeDescription}>
                  Si tu local ya está en BarLive
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.requestTypeButton,
                  requestType === 'nuevo_local' && styles.requestTypeButtonActive,
                ]}
                onPress={() => {
                  setRequestType('nuevo_local');
                  setSelectedLocal(null);
                  setSearchQuery('');
                }}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add_circle"
                  size={28}
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
                <Text style={styles.requestTypeDescription}>
                  Si tu local no existe en BarLive
                </Text>
              </TouchableOpacity>
            </View>
          </React.Fragment>
        )}

        {requestType === 'reclamar_local' ? (
          <View>
            {!params.localId && (
              <React.Fragment>
                <Text style={styles.sectionTitle}>Buscar tu local</Text>
                <Text style={styles.sectionDescription}>
                  Escribe el nombre de tu local para buscarlo en nuestra base de datos
                </Text>
                <View style={styles.searchContainer}>
                  <IconSymbol 
                    ios_icon_name="magnifyingglass" 
                    android_material_icon_name="search" 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Nombre del local"
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searching && <ActivityIndicator size="small" color={colors.primary} />}
                </View>

                {searchQuery.length >= 3 && searchResults.length === 0 && !searching && (
                  <View style={styles.noResultsContainer}>
                    <IconSymbol 
                      ios_icon_name="exclamationmark.triangle" 
                      android_material_icon_name="warning" 
                      size={32} 
                      color={colors.textSecondary} 
                    />
                    <Text style={styles.noResultsText}>
                      No se encontraron locales con ese nombre
                    </Text>
                    <Text style={styles.noResultsSubtext}>
                      Intenta con otro nombre o crea un nuevo local
                    </Text>
                  </View>
                )}

                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    <Text style={styles.resultsTitle}>
                      {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
                    </Text>
                    {searchResults.map((local) => (
                      <TouchableOpacity
                        key={local.id}
                        style={[
                          styles.searchResultItem,
                          selectedLocal?.id === local.id && styles.searchResultItemActive,
                          local.propietario_id && styles.searchResultItemDisabled,
                        ]}
                        onPress={() => {
                          if (!local.propietario_id) {
                            setSelectedLocal(local);
                          }
                        }}
                        disabled={!!local.propietario_id}
                      >
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{local.nombre}</Text>
                          <Text style={styles.searchResultAddress}>
                            {local.direccion}
                          </Text>
                          <Text style={styles.searchResultProvince}>
                            {local.provincia} • {local.tipo}
                          </Text>
                          {local.propietario_id && (
                            <View style={styles.ownedBadge}>
                              <IconSymbol 
                                ios_icon_name="person.fill.checkmark" 
                                android_material_icon_name="verified_user" 
                                size={12} 
                                color="#10B981" 
                              />
                              <Text style={styles.ownedBadgeText}>Ya tiene propietario</Text>
                            </View>
                          )}
                        </View>
                        {selectedLocal?.id === local.id && !local.propietario_id && (
                          <IconSymbol
                            ios_icon_name="checkmark.circle.fill"
                            android_material_icon_name="check_circle"
                            size={28}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </React.Fragment>
            )}

            {selectedLocal && (
              <View style={styles.selectedLocalCard}>
                <View style={styles.selectedLocalHeader}>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={24} 
                    color={colors.success} 
                  />
                  <Text style={styles.selectedLocalTitle}>Local seleccionado</Text>
                </View>
                <Text style={styles.selectedLocalName}>{selectedLocal.nombre}</Text>
                <Text style={styles.selectedLocalDetails}>
                  {selectedLocal.direccion}, {selectedLocal.provincia}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Información del local</Text>
            <Text style={styles.sectionDescription}>
              Completa los datos de tu local para que podamos verificarlo
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del local *"
              placeholderTextColor={colors.textSecondary}
              value={nombreLocal}
              onChangeText={setNombreLocal}
            />
            <TextInput
              style={styles.input}
              placeholder="Dirección completa *"
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
        <Text style={styles.sectionDescription}>
          Te contactaremos a través de estos datos para verificar tu solicitud
        </Text>
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
        <Text style={styles.sectionDescription}>
          Cuéntanos más sobre tu solicitud o añade información relevante
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

        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <React.Fragment>
              <IconSymbol 
                ios_icon_name="paperplane.fill" 
                android_material_icon_name="send" 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.submitButtonText}>Enviar solicitud</Text>
            </React.Fragment>
          )}
        </TouchableOpacity>

        <View style={styles.footerNote}>
          <IconSymbol 
            ios_icon_name="clock" 
            android_material_icon_name="schedule" 
            size={16} 
            color={colors.textSecondary} 
          />
          <Text style={styles.footerNoteText}>
            Revisaremos tu solicitud en un plazo de 24-48 horas
          </Text>
        </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
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
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  requestTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  requestTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  requestTypeTextActive: {
    color: colors.primary,
  },
  requestTypeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
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
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
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
  searchResults: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
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
  searchResultItemDisabled: {
    opacity: 0.6,
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
    marginBottom: 2,
  },
  searchResultProvince: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#10B981' + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ownedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  selectedLocalCard: {
    backgroundColor: colors.success + '10',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  selectedLocalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  selectedLocalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  selectedLocalName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalDetails: {
    fontSize: 14,
    color: colors.textSecondary,
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
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  footerNoteText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
