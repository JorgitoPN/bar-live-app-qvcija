
// CRITICAL FIX v326.0: Import polyfill FIRST to fix crypto.getRandomValues() error
// This MUST be the very first import before anything else
import 'react-native-get-random-values';

// Initialize Natively console log capture
import './utils/errorLogger';

import 'expo-router/entry';
