
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface HeaderSocialProps {
  titulo?: string;
  mostrarBusqueda?: boolean;
  mostrarNotificaciones?: boolean;
  mostrarChat?: boolean;
  notificacionesCount?: number;
  chatsCount?: number;
}

export default function HeaderSocial({
  titulo = 'BarLive',
  mostrarBusqueda = true,
  mostrarNotificaciones = true,
  mostrarChat = true,
  notificacionesCount = 0,
  chatsCount = 0,
}: HeaderSocialProps) {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[colors.headerGradientStart, colors.headerGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <Text style={styles.titulo}>{titulo}</Text>
      
      <View style={styles.acciones}>
        {mostrarBusqueda && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/social/busqueda')}
          >
            <IconSymbol name="magnifyingglass" size={24} color={colors.headerText} />
          </TouchableOpacity>
        )}

        {mostrarNotificaciones && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/social/notificaciones')}
          >
            <IconSymbol name="bell" size={24} color={colors.headerText} />
            {notificacionesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificacionesCount > 9 ? '9+' : notificacionesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {mostrarChat && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/social/chat-list')}
          >
            <IconSymbol name="message" size={24} color={colors.headerText} />
            {chatsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {chatsCount > 9 ? '9+' : chatsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.headerText,
  },
  acciones: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.badgeNuevo,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.badgeNuevoText,
    fontSize: 10,
    fontWeight: '700',
  },
});
