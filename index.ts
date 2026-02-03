// CRITICAL: Import polyfill FIRST before anything else
// This provides crypto.getRandomValues() required by uuid library
import 'react-native-get-random-values';

// Initialize Natively console log capture
import './utils/errorLogger';

import 'expo-router/entry';
