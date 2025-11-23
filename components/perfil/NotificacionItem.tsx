
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Notificacion } from '@/types';
import { colors } from '@/styles/commonStyles';

interface NotificacionItemProps {
  notificacion: Notificacion;
  onPress?: () => void;
  onAprobar?: () => void;
  onRechazar?: () => void;
}

export default function NotificacionItem({
  notificacion,
  onPress,
  onAprobar,
  onRechazar,
}: NotificacionItemProps) {
  const getIcono = () => {
    switch (notificacion.tipo) {
      case 'like':
        return { name: 'heart.fill', color: '#EF4444' };
      case 'comentario':
        return { name: 'bubble.left.fill', color: colors.primary };
      case 'seguidor':
        return { name: 'person.badge.plus.fill', color: colors.secondary };
      case 'mencion':
        return { name: 'at', color: colors.primary };
      case 'solicitud':
        return { name: 'person.2.fill', color: colors.primary };
      default:
        return { name: 'bell.fill', color: colors.primary };
    }
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora.getTime() - date.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos}m`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const icono = getIcono();

  // ✅ UPDATED: Display username instead of full name
  const displayUsername = notificacion.usuarioUsername || notificacion.usuarioNombre;

  return (
    <TouchableOpacity
      style={[styles.container, !notificacion.leida && styles.containerNoLeida]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {notificacion.usuarioAvatar ? (
          <Image source={{ uri: notificacion.usuarioAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <IconSymbol name="person.fill" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={[styles.iconoBadge, { backgroundColor: icono.color }]}>
          <IconSymbol name={icono.name as any} size={12} color={colors.headerText} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.texto}>
          <Text style={styles.nombreUsuario}>{displayUsername}</Text>
          {' '}
          {notificacion.contenido}
        </Text>
        <Text style={styles.fecha}>{formatearFecha(notificacion.fecha)}</Text>

        {notificacion.tipo === 'solicitud' && onAprobar && onRechazar && (
          <View style={styles.accionesContainer}>
            <TouchableOpacity style={styles.aprobarButton} onPress={onAprobar}>
              <Text style={styles.aprobarText}>Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rechazarButton} onPress={onRechazar}>
              <Text style={styles.rechazarText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!notificacion.leida && <View style={styles.indicadorNoLeida} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 12,
  },
  containerNoLeida: {
    backgroundColor: `${colors.primary}10`,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  content: {
    flex: 1,
  },
  texto: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  nombreUsuario: {
    fontWeight: '700',
  },
  fecha: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  accionesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  aprobarButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  aprobarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  rechazarButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rechazarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  indicadorNoLeida: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
});
