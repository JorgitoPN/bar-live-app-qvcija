
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import type { LocalSubscriptionInfo } from '@/hooks/useRolePermissions';

interface SubscriptionBannerProps {
  subscription: LocalSubscriptionInfo;
  showUpgradeButton?: boolean;
}

export default function SubscriptionBanner({ 
  subscription, 
  showUpgradeButton = true 
}: SubscriptionBannerProps) {
  const router = useRouter();

  const getPlanColors = () => {
    switch (subscription.plan) {
      case 'premium':
      case 'enterprise':
        return ['#FFD700', '#FFA500'];
      case 'basic':
        return ['#4A90E2', '#357ABD'];
      default:
        return ['#95a5a6', '#7f8c8d'];
    }
  };

  const getPlanIcon = () => {
    switch (subscription.plan) {
      case 'premium':
      case 'enterprise':
        return {
          ios: 'crown.fill',
          android: 'workspace_premium',
        };
      case 'basic':
        return {
          ios: 'star.fill',
          android: 'star',
        };
      default:
        return {
          ios: 'circle.fill',
          android: 'circle',
        };
    }
  };

  const getPlanDisplayName = () => {
    return subscription.plan.toUpperCase();
  };

  const icon = getPlanIcon();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getPlanColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <IconSymbol
          ios_icon_name={icon.ios}
          android_material_icon_name={icon.android}
          size={20}
          color="#fff"
        />
        <View style={styles.textContainer}>
          <Text style={styles.planText}>
            Plan {getPlanDisplayName()}
          </Text>
          {!subscription.isActive && (
            <Text style={styles.inactiveText}>(Inactivo)</Text>
          )}
        </View>
        {showUpgradeButton && !subscription.isActive && (
          <TouchableOpacity
            onPress={() => router.push('/gestion/planes-suscripcion')}
            style={styles.upgradeButton}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeButtonText}>Activar</Text>
          </TouchableOpacity>
        )}
        {showUpgradeButton && subscription.isActive && subscription.plan !== 'premium' && subscription.plan !== 'enterprise' && (
          <TouchableOpacity
            onPress={() => router.push('/gestion/planes-suscripcion')}
            style={styles.upgradeButton}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeButtonText}>Mejorar</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'System',
  },
  upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
});
