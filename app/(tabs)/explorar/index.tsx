
import { useRouter } from 'expo-router';
import { getEstadoLocal } from '@/utils/timeUtils';
import { supabase } from '@/utils/supabase';
import { getCategoryIcon } from '@/utils/categoryIcons';
import * as Location from 'expo-location';
import { calcularDistancia } from '@/utils/locationUtils';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { colors, commonStyles } from '@/styles/commonStyles';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import LoginPrompt from '@/components/common/LoginPrompt';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getSearchBoxHeight,
  getCategoryIconSize,
  getCategoryIconInnerSize,
  scaleFontSize,
  scaleIconSize,
} from '@/utils/androidScaling';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

// ... (rest of the imports and constants remain the same)

export default function ExplorarScreen() {
  // ... (all the existing state and logic remains the same)

  return (
    <View style={styles.container}>
      {/* ... (existing header code) */}

      {/* ✅ FIX v103.0: Remove white background from banner */}
      <TouchableOpacity
        style={styles.claimBanner}
        onPress={() => router.push('/auth/local-ownership-request')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.claimBannerGradient}
        >
          <IconSymbol
            ios_icon_name="building.2.fill"
            android_material_icon_name="business"
            size={scaleIconSize(32)}
            color={colors.white}
          />
          <View style={styles.claimBannerContent}>
            <Text style={[styles.claimBannerTitle, { fontSize: scaleFontSize(16) }]}>
              Reclama tu local o crea uno nuevo
            </Text>
            <Text style={[styles.claimBannerSubtitle, { fontSize: scaleFontSize(13) }]}>
              ¿Eres propietario? Gestiona tu local en Barlive
            </Text>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={scaleIconSize(20)}
            color={colors.white}
          />
        </LinearGradient>
      </TouchableOpacity>

      {/* ... (rest of the component remains the same) */}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (existing styles)
  
  // ✅ FIX v103.0: Remove white background from banner
  claimBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  claimBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  claimBannerContent: {
    flex: 1,
  },
  claimBannerTitle: {
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  claimBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  // ... (rest of the styles)
});
