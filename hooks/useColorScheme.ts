
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Custom hook to get the current color scheme (light or dark)
 * Returns 'light' or 'dark' based on the device's color scheme
 */
export function useColorScheme() {
  return useRNColorScheme() ?? 'light';
}
