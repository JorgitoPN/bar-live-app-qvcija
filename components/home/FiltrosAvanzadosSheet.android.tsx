
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { Filtros } from '@/types';
import { useFilters } from '@/contexts/FilterContext';
import { useRouter } from 'expo-router';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';

interface FiltrosAvanzadosSheetProps {
  visible: boolean;
  onClose: () => void;
  filtros?: Filtros;
  onAplicarFiltros?: (filtros: Filtros) => void;
}

/**
 * ✅ ANDROID-SPECIFIC FULL-SCREEN IMPLEMENTATION
 * 
 * This component redirects to a full-screen page on Android instead of showing a modal.
 * The modal approach doesn't work well on Android - this provides a native full-screen experience.
 */
export default function FiltrosAvanzadosSheet({
  visible,
  onClose,
  filtros: propFiltros,
  onAplicarFiltros: propOnAplicarFiltros,
}: FiltrosAvanzadosSheetProps) {
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      console.log('[FiltrosAvanzados Android] 🚀 Opening full-screen filters page');
      // Navigate to full-screen page on Android
      router.push('/explorar/filtros-avanzados');
      // Close the modal immediately
      onClose();
    }
  }, [visible, router, onClose]);

  // Return null - we're using navigation instead of modal on Android
  return null;
}
