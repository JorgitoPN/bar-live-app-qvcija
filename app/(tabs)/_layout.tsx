
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import UnifiedMomentoAvatar from '@/components/common/UnifiedMomentoAvatar';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          position: 'absolute',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="explorar"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol
              android_material_icon_name="explore"
              ios_icon_name="explore"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol
              android_material_icon_name="favorite"
              ios_icon_name="favorite"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol
              android_material_icon_name="groups"
              ios_icon_name="groups"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="eventos"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol
              android_material_icon_name="event"
              ios_icon_name="event"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <UnifiedMomentoAvatar
              userId={user?.id}
              size={28}
              showMomentoRing={true}
              onPress={() => {}}
            />
          ),
        }}
      />
    </Tabs>
  );
}
