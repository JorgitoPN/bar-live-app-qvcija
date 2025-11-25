
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_CREDENTIALS_KEY = 'barlive_biometric_credentials';

export interface BiometricCredentials {
  email: string;
  password: string;
}

/**
 * Check if the device supports biometric authentication
 */
export const isBiometricSupported = async (): Promise<boolean> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    console.log('[Biometric] Has hardware:', hasHardware);
    return hasHardware;
  } catch (error) {
    console.error('[Biometric] Error checking hardware:', error);
    return false;
  }
};

/**
 * Check if biometric authentication is enrolled (user has set up Face ID/Touch ID)
 */
export const isBiometricEnrolled = async (): Promise<boolean> => {
  try {
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    console.log('[Biometric] Is enrolled:', isEnrolled);
    return isEnrolled;
  } catch (error) {
    console.error('[Biometric] Error checking enrollment:', error);
    return false;
  }
};

/**
 * Get the types of biometric authentication available on the device
 */
export const getSupportedBiometricTypes = async (): Promise<LocalAuthentication.AuthenticationType[]> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    console.log('[Biometric] Supported types:', types);
    return types;
  } catch (error) {
    console.error('[Biometric] Error getting supported types:', error);
    return [];
  }
};

/**
 * Get a user-friendly name for the biometric type
 */
export const getBiometricTypeName = (types: LocalAuthentication.AuthenticationType[]): string => {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Reconocimiento facial';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Huella digital';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Reconocimiento de iris';
  }
  return 'Autenticación biométrica';
};

/**
 * Authenticate using biometric authentication
 */
export const authenticateWithBiometric = async (
  promptMessage?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if biometric is supported and enrolled
    const isSupported = await isBiometricSupported();
    if (!isSupported) {
      return { success: false, error: 'Tu dispositivo no soporta autenticación biométrica' };
    }

    const isEnrolled = await isBiometricEnrolled();
    if (!isEnrolled) {
      return { 
        success: false, 
        error: 'No tienes configurada la autenticación biométrica en tu dispositivo. Por favor, configúrala en los ajustes del sistema.' 
      };
    }

    // Get biometric types for the prompt message
    const types = await getSupportedBiometricTypes();
    const biometricName = getBiometricTypeName(types);

    // Perform authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || `Usa ${biometricName} para iniciar sesión`,
      fallbackLabel: 'Usar contraseña',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false, // Allow device passcode as fallback
    });

    console.log('[Biometric] Authentication result:', result);

    if (result.success) {
      return { success: true };
    } else {
      // Handle different error types
      if (result.error === 'user_cancel') {
        return { success: false, error: 'Autenticación cancelada' };
      } else if (result.error === 'not_enrolled') {
        return { success: false, error: 'No tienes configurada la autenticación biométrica' };
      } else if (result.error === 'lockout') {
        return { success: false, error: 'Demasiados intentos fallidos. Por favor, intenta más tarde.' };
      } else if (result.error === 'authentication_failed') {
        return { success: false, error: 'Autenticación fallida. Por favor, intenta nuevamente.' };
      } else {
        return { success: false, error: 'Error en la autenticación biométrica' };
      }
    }
  } catch (error: any) {
    console.error('[Biometric] Error during authentication:', error);
    return { success: false, error: error.message || 'Error inesperado durante la autenticación' };
  }
};

/**
 * Save credentials securely for biometric authentication
 */
export const saveBiometricCredentials = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const credentials: BiometricCredentials = { email, password };
    await SecureStore.setItemAsync(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify(credentials)
    );
    console.log('[Biometric] Credentials saved securely');
    return { success: true };
  } catch (error: any) {
    console.error('[Biometric] Error saving credentials:', error);
    return { success: false, error: error.message || 'Error al guardar credenciales' };
  }
};

/**
 * Get saved biometric credentials
 */
export const getBiometricCredentials = async (): Promise<BiometricCredentials | null> => {
  try {
    const credentialsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    if (!credentialsJson) {
      console.log('[Biometric] No saved credentials found');
      return null;
    }
    const credentials: BiometricCredentials = JSON.parse(credentialsJson);
    console.log('[Biometric] Retrieved saved credentials for:', credentials.email);
    return credentials;
  } catch (error: any) {
    console.error('[Biometric] Error getting credentials:', error);
    return null;
  }
};

/**
 * Check if biometric credentials are saved
 */
export const hasBiometricCredentials = async (): Promise<boolean> => {
  try {
    const credentials = await getBiometricCredentials();
    return credentials !== null;
  } catch (error) {
    console.error('[Biometric] Error checking credentials:', error);
    return false;
  }
};

/**
 * Remove saved biometric credentials
 */
export const removeBiometricCredentials = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    console.log('[Biometric] Credentials removed');
    return { success: true };
  } catch (error: any) {
    console.error('[Biometric] Error removing credentials:', error);
    return { success: false, error: error.message || 'Error al eliminar credenciales' };
  }
};

/**
 * Enable biometric authentication for the user
 * This will authenticate the user and save their credentials
 */
export const enableBiometricAuth = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First check if biometric is available
    const isSupported = await isBiometricSupported();
    if (!isSupported) {
      return { success: false, error: 'Tu dispositivo no soporta autenticación biométrica' };
    }

    const isEnrolled = await isBiometricEnrolled();
    if (!isEnrolled) {
      return { 
        success: false, 
        error: 'Por favor, configura Face ID o Touch ID en los ajustes de tu dispositivo primero' 
      };
    }

    // Authenticate to confirm user wants to enable biometric
    const types = await getSupportedBiometricTypes();
    const biometricName = getBiometricTypeName(types);
    
    const authResult = await authenticateWithBiometric(
      `Confirma con ${biometricName} para habilitar inicio de sesión rápido`
    );

    if (!authResult.success) {
      return authResult;
    }

    // Save credentials
    const saveResult = await saveBiometricCredentials(email, password);
    if (!saveResult.success) {
      return saveResult;
    }

    console.log('[Biometric] Biometric authentication enabled successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[Biometric] Error enabling biometric auth:', error);
    return { success: false, error: error.message || 'Error al habilitar autenticación biométrica' };
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometricAuth = async (): Promise<{ success: boolean; error?: string }> => {
  return await removeBiometricCredentials();
};
