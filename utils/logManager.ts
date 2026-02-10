
/**
 * Log Manager
 * Previene la acumulación masiva de logs
 */

import * as FileSystem from 'expo-file-system/legacy';

const NATIVELY_DIR = `${FileSystem.documentDirectory}.natively/`;
const MAX_LOG_SIZE_MB = 5; // Máximo 5MB por archivo de log
const MAX_TOTAL_LOGS_MB = 20; // Máximo 20MB en total de logs

/**
 * Limpia todos los archivos .log en el directorio .natively/
 */
export async function cleanNativelyLogs(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(NATIVELY_DIR);
    
    if (!dirInfo.exists) {
      console.log('.natively/ directory does not exist, nothing to clean');
      return;
    }

    const files = await FileSystem.readDirectoryAsync(NATIVELY_DIR);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    let totalCleaned = 0;
    
    for (const logFile of logFiles) {
      const filePath = `${NATIVELY_DIR}${logFile}`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.size) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          totalCleaned += fileInfo.size;
          console.log(`Deleted log file: ${logFile} (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB)`);
        }
      } catch (fileError) {
        console.warn(`Could not delete log file ${logFile}:`, fileError);
        // Continuar con el siguiente archivo
      }
    }
    
    console.log(`Total logs cleaned: ${(totalCleaned / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('Error cleaning .natively/ logs:', error);
  }
}

/**
 * Obtiene el tamaño total de los logs en MB
 */
export async function getTotalLogsSize(): Promise<number> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(NATIVELY_DIR);
    
    if (!dirInfo.exists) {
      console.log('Logs directory does not exist, returning 0');
      return 0;
    }

    const files = await FileSystem.readDirectoryAsync(NATIVELY_DIR);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    let totalSize = 0;
    
    for (const logFile of logFiles) {
      const filePath = `${NATIVELY_DIR}${logFile}`;
      
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      } catch (fileError) {
        console.warn(`Could not get info for log file ${logFile}:`, fileError);
        // Continuar con el siguiente archivo
      }
    }
    
    return parseFloat((totalSize / 1024 / 1024).toFixed(2));
  } catch (error) {
    console.warn('Error getting total logs size (directory may not exist):', error);
    return 0;
  }
}

/**
 * Verifica y limpia logs si exceden el límite
 */
export async function checkAndCleanLogsIfNeeded(): Promise<void> {
  try {
    const totalSize = await getTotalLogsSize();
    
    if (totalSize > MAX_TOTAL_LOGS_MB) {
      console.warn(`Logs exceed ${MAX_TOTAL_LOGS_MB}MB (current: ${totalSize}MB), cleaning...`);
      await cleanNativelyLogs();
    } else {
      console.log(`Logs size OK: ${totalSize}MB (max: ${MAX_TOTAL_LOGS_MB}MB)`);
    }
  } catch (error) {
    console.error('Error checking logs size:', error);
  }
}

/**
 * Rotación de logs: mantiene solo los más recientes
 */
export async function rotateLogs(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(NATIVELY_DIR);
    
    if (!dirInfo.exists) {
      console.log('Logs directory does not exist, nothing to rotate');
      return;
    }

    const files = await FileSystem.readDirectoryAsync(NATIVELY_DIR);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    // Obtener info de cada archivo con su fecha de modificación
    const filesWithInfo = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = `${NATIVELY_DIR}${file}`;
        try {
          const info = await FileSystem.getInfoAsync(filePath);
          return {
            name: file,
            path: filePath,
            modificationTime: info.modificationTime || 0,
            size: info.size || 0
          };
        } catch (error) {
          console.warn(`Could not get info for ${file}:`, error);
          return null;
        }
      })
    );
    
    // Filtrar archivos válidos
    const validFiles = filesWithInfo.filter(file => file !== null) as Array<{
      name: string;
      path: string;
      modificationTime: number;
      size: number;
    }>;
    
    // Ordenar por fecha de modificación (más antiguos primero)
    validFiles.sort((a, b) => a.modificationTime - b.modificationTime);
    
    let totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
    const maxSizeBytes = MAX_TOTAL_LOGS_MB * 1024 * 1024;
    
    // Eliminar archivos antiguos hasta que el tamaño total sea aceptable
    for (const file of validFiles) {
      if (totalSize <= maxSizeBytes) {
        break;
      }
      
      try {
        await FileSystem.deleteAsync(file.path, { idempotent: true });
        totalSize -= file.size;
        console.log(`Rotated (deleted) old log: ${file.name}`);
      } catch (deleteError) {
        console.warn(`Could not delete log file ${file.name}:`, deleteError);
      }
    }
  } catch (error) {
    console.error('Error rotating logs:', error);
  }
}
