
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
  Image,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';

export default function CompletarPerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const userEmail = params.userEmail as string;
  const provider = params.provider as string;

  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);

  // Paso 1: Datos básicos (MANDATORY)
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [username, setUsername] = useState('');
  const [usernameValidating, setUsernameValidating] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Paso 2: Datos opcionales
  const [avatar, setAvatar] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [genero, setGenero] = useState<string>('');
  const [intereses, setIntereses] = useState<string[]>([]);

  const interesesDisponibles = [
    'Música en vivo',
    'Cócteles',
    'Cerveza artesanal',
    'Vino',
    'Comida gourmet',
    'Tapas',
    'Terraza',
    'Discoteca',
    'Karaoke',
    'Deportes',
    'Arte',
    'Cultura',
  ];

  // FIXED: Real-time username validation
  useEffect(() => {
    const validateUsername = async () => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      if (!validarUsername(username)) {
        setUsernameAvailable(false);
        return;
      }

      setUsernameValidating(true);

      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id')
          .eq('username', username)
          .single();

        if (error && error.code === 'PGRST116') {
          // No rows returned - username is available
          setUsernameAvailable(true);
        } else if (data) {
          // Username already exists
          setUsernameAvailable(false);
        }
      } catch (error) {
        console.error('Error validating username:', error);
        setUsernameAvailable(null);
      } finally {
        setUsernameValidating(false);
      }
    };

    // Debounce validation
    const timeoutId = setTimeout(validateUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const validarUsername = (text: string) => {
    // Solo letras, números, puntos y guiones bajos
    const regex = /^[a-zA-Z0-9._]+$/;
    return regex.test(text);
  };

  const handleUsernameChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9._]/g, '');
    setUsername(cleaned);
  };

  const calcularEdad = (fecha: Date) => {
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mes = hoy.getMonth() - fecha.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    return edad;
  };

  const toggleInteres = (interes: string) => {
    if (intereses.includes(interes)) {
      setIntereses(intereses.filter(i => i !== interes));
    } else {
      setIntereses([...intereses, interes]);
    }
  };

  const validarPaso1 = () => {
    // FIXED: Nombre completo is now MANDATORY
    if (!nombreCompleto.trim()) {
      Alert.alert('Error', 'El nombre completo es obligatorio');
      return false;
    }

    // FIXED: Username is now MANDATORY
    if (!username.trim()) {
      Alert.alert('Error', 'El nombre de usuario es obligatorio');
      return false;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'El nombre de usuario debe tener al menos 3 caracteres');
      return false;
    }

    if (!validarUsername(username)) {
      Alert.alert('Error', 'El nombre de usuario solo puede contener letras, números, puntos y guiones bajos');
      return false;
    }

    // FIXED: Check if username is available
    if (usernameAvailable === false) {
      Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor, elige otro.');
      return false;
    }

    if (usernameAvailable === null) {
      Alert.alert('Error', 'Por favor, espera mientras verificamos la disponibilidad del nombre de usuario');
      return false;
    }

    const edad = calcularEdad(fechaNacimiento);
    if (edad < 13) {
      Alert.alert('Error', 'Debes tener al menos 13 años para usar BarLive');
      return false;
    }

    return true;
  };

  const handleContinuar = async () => {
    if (paso === 1) {
      if (!validarPaso1()) return;

      // Double-check username availability before proceeding
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id')
          .eq('username', username)
          .single();

        if (data) {
          Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor, elige otro.');
          setLoading(false);
          return;
        }

        setPaso(2);
      } catch (error) {
        console.error('Error verificando username:', error);
      } finally {
        setLoading(false);
      }
    } else if (paso === 2) {
      await guardarPerfil();
    }
  };

  // ✅ FIXED: Upload image to Supabase Storage
  const uploadAvatarToStorage = async (imageUri: string): Promise<string | null> => {
    try {
      console.log('[CompletarPerfil] 📤 Uploading avatar to Supabase Storage...');

      // Fetch the image as a blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data:image/...;base64, prefix
          const base64 = base64data.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      
      const base64 = await base64Promise;
      
      // Generate unique filename
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('[CompletarPerfil] 📁 Uploading to path:', filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-content')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error('[CompletarPerfil] ❌ Error uploading avatar:', error);
        return null;
      }

      console.log('[CompletarPerfil] ✅ Avatar uploaded successfully:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(filePath);

      console.log('[CompletarPerfil] 🔗 Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[CompletarPerfil] ❌ Error in uploadAvatarToStorage:', error);
      return null;
    }
  };

  const guardarPerfil = async () => {
    setLoading(true);

    try {
      console.log('[CompletarPerfil] 💾 Saving profile...');

      // ✅ FIXED: Upload avatar to Supabase Storage if exists
      let avatarUrl = null;
      if (avatar) {
        console.log('[CompletarPerfil] 📤 Uploading avatar...');
        avatarUrl = await uploadAvatarToStorage(avatar);
        
        if (!avatarUrl) {
          console.warn('[CompletarPerfil] ⚠️ Avatar upload failed, continuing without avatar');
        } else {
          console.log('[CompletarPerfil] ✅ Avatar uploaded:', avatarUrl);
        }
      }

      // ✅ FIXED: Update profile with mandatory fields (nombre and username)
      console.log('[CompletarPerfil] 💾 Updating user profile in database...');
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: nombreCompleto,
          username: username,
          fecha_nacimiento: fechaNacimiento.toISOString().split('T')[0],
          avatar: avatarUrl,
          bio: bio || null,
          sitio_web: sitioWeb || null,
          genero: genero || null,
          intereses: intereses.length > 0 ? intereses : null,
          perfil_completado: true,
        })
        .eq('id', userId);

      if (error) {
        console.error('[CompletarPerfil] ❌ Error saving profile:', error);
        Alert.alert('Error', 'No se pudo guardar el perfil. Por favor, intenta nuevamente.');
        return;
      }

      console.log('[CompletarPerfil] ✅ Profile saved successfully!');

      // ✅ FIXED: Show success message and redirect to Explorar
      Alert.alert(
        '¡Perfil completado!',
        'Tu perfil ha sido configurado exitosamente. ¡Bienvenido a BarLive!',
        [
          {
            text: 'Comenzar',
            onPress: () => {
              console.log('[CompletarPerfil] 🚀 Redirecting to Explorar...');
              router.replace('/(tabs)/explorar');
            },
          },
        ]
      );
    } catch (error) {
      console.error('[CompletarPerfil] ❌ Error in guardarPerfil:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const renderPaso1 = () => (
    <View style={styles.pasoContainer}>
      <Text style={styles.pasoTitle}>Datos Básicos</Text>
      <Text style={styles.pasoSubtitle}>
        Información necesaria para crear tu perfil
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          Nombre completo <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Juan Pérez"
          placeholderTextColor={colors.textSecondary}
          value={nombreCompleto}
          onChangeText={setNombreCompleto}
          autoCapitalize="words"
        />
        <Text style={styles.helperText}>
          Tu nombre completo es obligatorio para identificarte
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          Nombre de usuario <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.usernameInputContainer}>
          <Text style={styles.usernamePrefix}>@</Text>
          <TextInput
            style={[styles.input, styles.usernameInput]}
            placeholder="juanperez"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameValidating && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.usernameIndicator} />
          )}
          {!usernameValidating && usernameAvailable === true && username.length >= 3 && (
            <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" style={styles.usernameIndicator} />
          )}
          {!usernameValidating && usernameAvailable === false && username.length >= 3 && (
            <IconSymbol name="xmark.circle.fill" size={20} color="#EF4444" style={styles.usernameIndicator} />
          )}
        </View>
        {username.length >= 3 && usernameAvailable === true && (
          <Text style={[styles.helperText, { color: '#10B981' }]}>
            ✓ Nombre de usuario disponible
          </Text>
        )}
        {username.length >= 3 && usernameAvailable === false && (
          <Text style={[styles.helperText, { color: '#EF4444' }]}>
            ✗ Este nombre de usuario ya está en uso
          </Text>
        )}
        {username.length < 3 && (
          <Text style={styles.helperText}>
            Único en la plataforma. Solo letras, números, puntos y guiones bajos
          </Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          Fecha de nacimiento <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {fechaNacimiento.toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <IconSymbol name="calendar" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.helperText}>
          Debes tener al menos 13 años. No se muestra públicamente
        </Text>
      </View>

      {showDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={fechaNacimiento}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setFechaNacimiento(selectedDate);
              }
            }}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            textColor={colors.text}
            themeVariant="light"
            style={styles.datePicker}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.datePickerDoneButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerDoneText}>Listo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderPaso2 = () => (
    <View style={styles.pasoContainer}>
      <Text style={styles.pasoTitle}>Personaliza tu Perfil</Text>
      <Text style={styles.pasoSubtitle}>
        Información opcional que puedes agregar ahora o después
      </Text>

      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <IconSymbol name="person.fill" size={48} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.avatarOverlay}>
            <IconSymbol name="camera.fill" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarLabel}>Foto de perfil</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Biografía</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Cuéntanos sobre ti..."
          placeholderTextColor={colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={150}
        />
        <Text style={styles.helperText}>{bio.length}/150 caracteres</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Sitio web</Text>
        <TextInput
          style={styles.input}
          placeholder="https://tusitio.com"
          placeholderTextColor={colors.textSecondary}
          value={sitioWeb}
          onChangeText={setSitioWeb}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Género</Text>
        <View style={styles.generoContainer}>
          {['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.generoButton,
                genero === g.toLowerCase().replace(/ /g, '_') && styles.generoButtonActive,
              ]}
              onPress={() => setGenero(g.toLowerCase().replace(/ /g, '_'))}
            >
              <Text
                style={[
                  styles.generoButtonText,
                  genero === g.toLowerCase().replace(/ /g, '_') && styles.generoButtonTextActive,
                ]}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Intereses</Text>
        <Text style={styles.helperText}>
          Selecciona tus intereses para personalizar tu experiencia
        </Text>
        <View style={styles.interesesContainer}>
          {interesesDisponibles.map((interes) => (
            <TouchableOpacity
              key={interes}
              style={[
                styles.interesChip,
                intereses.includes(interes) && styles.interesChipActive,
              ]}
              onPress={() => toggleInteres(interes)}
            >
              <Text
                style={[
                  styles.interesChipText,
                  intereses.includes(interes) && styles.interesChipTextActive,
                ]}
              >
                {interes}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Completa tu Perfil</Text>
          <Text style={styles.headerSubtitle}>
            Paso {paso} de 2
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(paso / 2) * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {paso === 1 ? renderPaso1() : renderPaso2()}
      </ScrollView>

      <View style={styles.footer}>
        {paso === 2 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setPaso(1)}
            disabled={loading}
          >
            <Text style={styles.buttonTextSecondary}>Atrás</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, { flex: 1 }]}
          onPress={handleContinuar}
          disabled={loading || (paso === 1 && usernameValidating)}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonTextPrimary}>
              {paso === 1 ? 'Continuar' : 'Completar Perfil'}
            </Text>
          )}
        </TouchableOpacity>

        {paso === 2 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.replace('/(tabs)/explorar')}
            disabled={loading}
          >
            <Text style={styles.buttonTextSecondary}>Omitir</Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  pasoContainer: {
    flex: 1,
  },
  pasoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  pasoSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 12,
  },
  usernamePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  usernameIndicator: {
    marginLeft: 8,
  },
  dateButton: {
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
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  datePickerContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  datePicker: {
    backgroundColor: colors.cardBackground,
  },
  datePickerDoneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarButton: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  generoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  generoButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  generoButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  generoButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  generoButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  interesesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  interesChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  interesChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  interesChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  interesChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
