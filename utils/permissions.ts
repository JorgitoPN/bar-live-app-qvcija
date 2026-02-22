
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

export type PermissionType = 'location' | 'camera' | 'notifications';

/**
 * Solicita un permiso específico y maneja la retroalimentación al usuario.
 * @param type El tipo de permiso a solicitar ('location', 'camera', 'notifications').
 * @param usageDescription Un mensaje amigable explicando por qué se necesita el permiso.
 * @returns Un booleano indicando si el permiso fue concedido.
 */
export async function requestAppPermission(
  type: PermissionType,
  usageDescription: string
): Promise<boolean> {
  console.log(`[Permissions] Solicitando permiso: ${type}`);
  
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    console.warn(`[Permissions] Las solicitudes de permisos no aplican en ${Platform.OS}`);
    return true; // Asumir concedido en plataformas no soportadas
  }

  try {
    let permissionResponse: any = null;

    switch (type) {
      case 'location':
        permissionResponse = await Location.requestForegroundPermissionsAsync();
        break;
      case 'camera':
        permissionResponse = await ImagePicker.requestCameraPermissionsAsync();
        break;
      case 'notifications':
        permissionResponse = await Notifications.requestPermissionsAsync();
        break;
      default:
        console.error(`[Permissions] Tipo de permiso desconocido: ${type}`);
        return false;
    }

    console.log(`[Permissions] Respuesta de ${type}:`, permissionResponse.status);

    if (permissionResponse.status === 'granted') {
      console.log(`[Permissions] ✅ Permiso ${type} concedido.`);
      return true;
    } else if (permissionResponse.status === 'denied') {
      Alert.alert(
        'Permiso Denegado',
        `Necesitamos acceso a tu ${getPermissionLabel(type)} para ${usageDescription}. Por favor, habilítalo en la configuración de tu dispositivo.`,
        [{ text: 'OK' }]
      );
      console.warn(`[Permissions] ❌ Permiso ${type} denegado.`);
      return false;
    } else {
      // 'undetermined' o 'restricted'
      Alert.alert(
        'Permiso Requerido',
        `Necesitamos acceso a tu ${getPermissionLabel(type)} para ${usageDescription}.`,
        [{ text: 'OK' }]
      );
      console.warn(`[Permissions] ⚠️ Estado del permiso ${type}: ${permissionResponse.status}`);
      return false;
    }
  } catch (error) {
    console.error(`[Permissions] ❌ Error solicitando permiso ${type}:`, error);
    Alert.alert(
      'Error de Permiso',
      `Hubo un problema al solicitar acceso a tu ${getPermissionLabel(type)}. Por favor, inténtalo de nuevo más tarde.`,
      [{ text: 'OK' }]
    );
    return false;
  }
}

/**
 * Verifica si un permiso ya está concedido sin solicitarlo.
 * @param type El tipo de permiso a verificar.
 * @returns Un booleano indicando si el permiso está concedido.
 */
export async function checkAppPermission(type: PermissionType): Promise<boolean> {
  console.log(`[Permissions] Verificando permiso: ${type}`);
  
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return true;
  }

  try {
    let permissionResponse: any = null;

    switch (type) {
      case 'location':
        permissionResponse = await Location.getForegroundPermissionsAsync();
        break;
      case 'camera':
        permissionResponse = await ImagePicker.getCameraPermissionsAsync();
        break;
      case 'notifications':
        permissionResponse = await Notifications.getPermissionsAsync();
        break;
      default:
        return false;
    }

    const isGranted = permissionResponse.status === 'granted';
    console.log(`[Permissions] Estado de ${type}: ${permissionResponse.status} (${isGranted ? 'concedido' : 'no concedido'})`);
    return isGranted;
  } catch (error) {
    console.error(`[Permissions] Error verificando permiso ${type}:`, error);
    return false;
  }
}

/**
 * Solicita múltiples permisos de forma secuencial.
 * @param permissions Array de tipos de permisos a solicitar.
 * @returns Un objeto con el estado de cada permiso.
 */
export async function requestMultiplePermissions(
  permissions: Array<{ type: PermissionType; description: string }>
): Promise<Record<PermissionType, boolean>> {
  console.log(`[Permissions] Solicitando múltiples permisos:`, permissions.map(p => p.type));
  
  const results: Record<string, boolean> = {};

  for (const permission of permissions) {
    const granted = await requestAppPermission(permission.type, permission.description);
    results[permission.type] = granted;
  }

  console.log(`[Permissions] Resultados de permisos múltiples:`, results);
  return results as Record<PermissionType, boolean>;
}

/**
 * Obtiene una etiqueta amigable para el tipo de permiso.
 */
function getPermissionLabel(type: PermissionType): string {
  switch (type) {
    case 'location':
      return 'ubicación';
    case 'camera':
      return 'cámara';
    case 'notifications':
      return 'notificaciones';
    default:
      return type;
  }
}

/**
 * Ejemplo de uso en un componente:
 * 
 * import { requestAppPermission, checkAppPermission, requestMultiplePermissions } from '@/utils/permissions';
 * 
 * // Solicitar un permiso individual
 * const handleRequestLocation = async () => {
 *   const granted = await requestAppPermission(
 *     'location',
 *     'mostrar locales cercanos y eventos relevantes'
 *   );
 *   if (granted) {
 *     // Proceder con la funcionalidad que requiere ubicación
 *   }
 * };
 * 
 * // Verificar si un permiso ya está concedido
 * const checkLocationPermission = async () => {
 *   const hasPermission = await checkAppPermission('location');
 *   if (hasPermission) {
 *     // El permiso ya está concedido
 *   }
 * };
 * 
 * // Solicitar múltiples permisos al inicio de la app
 * useEffect(() => {
 *   const initializePermissions = async () => {
 *     const results = await requestMultiplePermissions([
 *       { type: 'location', description: 'mostrar locales cercanos' },
 *       { type: 'camera', description: 'tomar fotos para tus publicaciones' },
 *       { type: 'notifications', description: 'enviarte actualizaciones importantes' }
 *     ]);
 *     console.log('Permisos concedidos:', results);
 *   };
 *   initializePermissions();
 * }, []);
 */
