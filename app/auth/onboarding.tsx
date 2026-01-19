
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const userEmail = params.userEmail as string;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Username (MANDATORY)
  const [username, setUsername] = useState('');
  const [usernameValidating, setUsernameValidating] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Step 2: Date of Birth (MANDATORY)
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 3: Optional info
  const [avatar, setAvatar] = useState<string | null>(null);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [bio, setBio] = useState('');

  // Real-time username validation
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
          setUsernameAvailable(true);
        } else if (data) {
          setUsernameAvailable(false);
        }
      } catch (error) {
        console.error('Error validating username:', error);
        setUsernameAvailable(null);
      } finally {
        setUsernameValidating(false);
      }
    };

    const timeoutId = setTimeout(validateUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const validarUsername = (text: string) => {
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

  const validateStep1 = () => {
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

    if (usernameAvailable === false) {
      Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor, elige otro.');
      return false;
    }

    if (usernameAvailable === null) {
      Alert.alert('Error', 'Por favor, espera mientras verificamos la disponibilidad del nombre de usuario');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const edad = calcularEdad(fechaNacimiento);
    if (edad < 13) {
      Alert.alert('Error', 'Debes tener al menos 13 años para usar BarLive');
      return false;
    }

    return true;
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (!validateStep1()) return;

      // Double-check username availability
      setLoading(true);
      try {
        const { data } = await supabase
          .from('usuarios')
          .select('id')
          .eq('username', username)
          .single();

        if (data) {
          Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor, elige otro.');
          setLoading(false);
          return;
        }

        setStep(2);
      } catch (error) {
        console.error('Error verificando username:', error);
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    } else if (step === 3) {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);

    try {
      // Upload avatar if exists
      let avatarUrl = null;
      if (avatar) {
        // TODO: Upload to Supabase Storage
        avatarUrl = avatar;
      }

      // Update profile
      const { error } = await supabase
        .from('usuarios')
        .update({
          username: username,
          fecha_nacimiento: fechaNacimiento.toISOString().split('T')[0],
          nombre: nombreCompleto || username,
          avatar: avatarUrl,
          bio: bio || null,
          perfil_completado: true,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error guardando perfil:', error);
        Alert.alert('Error', 'No se pudo guardar el perfil. Por favor, intenta nuevamente.');
        return;
      }

      // Redirect to explore
      router.replace('/(tabs)/explorar');
    } catch (error) {
      console.error('Error en completeOnboarding:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Elige tu nombre de usuario</Text>
      <Text style={styles.stepSubtitle}>
        Este será tu identificador único en BarLive
      </Text>

      <View style={styles.usernameInputContainer}>
        <Text style={styles.usernamePrefix}>@</Text>
        <TextInput
          style={styles.usernameInput}
          placeholder="tunombre"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {usernameValidating && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.usernameIndicator} />
        )}
        {!usernameValidating && usernameAvailable === true && username.length >= 3 && (
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color="#10B981" style={styles.usernameIndicator} />
        )}
        {!usernameValidating && usernameAvailable === false && username.length >= 3 && (
          <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color="#EF4444" style={styles.usernameIndicator} />
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
          Mínimo 3 caracteres. Solo letras, números, puntos y guiones bajos
        </Text>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>¿Cuándo naciste?</Text>
      <Text style={styles.stepSubtitle}>
        Necesitamos verificar que tienes la edad mínima requerida
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
        <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar_today" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.helperText}>
        Tu fecha de nacimiento no se mostrará públicamente
      </Text>

      {showDatePicker && (
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
        />
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personaliza tu perfil</Text>
      <Text style={styles.stepSubtitle}>
        Información opcional que puedes agregar ahora o después
      </Text>

      <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={48} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.avatarOverlay}>
          <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="camera_alt" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo (opcional)"
        placeholderTextColor={colors.textSecondary}
        value={nombreCompleto}
        onChangeText={setNombreCompleto}
        autoCapitalize="words"
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Biografía (opcional)"
        placeholderTextColor={colors.textSecondary}
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
        maxLength={150}
      />
      <Text style={styles.helperText}>{bio.length}/150 caracteres</Text>
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
        <Text style={styles.headerTitle}>Bienvenido a BarLive</Text>
        <Text style={styles.headerSubtitle}>Paso {step} de 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setStep(step - 1)}
            disabled={loading}
          >
            <Text style={styles.buttonTextSecondary}>Atrás</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, { flex: 1 }]}
          onPress={handleContinue}
          disabled={loading || (step === 1 && usernameValidating)}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonTextPrimary}>
              {step === 3 ? 'Completar' : 'Continuar'}
            </Text>
          )}
        </TouchableOpacity>

        {step === 3 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.replace('/(tabs)/explorar')}
            disabled={loading}
          >
            <Text style={styles.buttonTextSecondary}>Omitir</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
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
    padding: 24,
    paddingBottom: 120,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingLeft: 20,
    paddingRight: 16,
    width: '100%',
    marginBottom: 12,
  },
  usernamePrefix: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    fontSize: 20,
    color: colors.text,
    paddingVertical: 16,
  },
  usernameIndicator: {
    marginLeft: 8,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
  avatarButton: {
    position: 'relative',
    marginBottom: 24,
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
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    width: '100%',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
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
