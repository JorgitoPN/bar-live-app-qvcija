
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Mensaje } from '@/types';
import { colors } from '@/styles/commonStyles';

interface MessageBubbleProps {
  mensaje: Mensaje;
  esPropio: boolean;
  mostrarAvatar?: boolean;
  avatarUrl?: string;
}

export default function MessageBubble({
  mensaje,
  esPropio,
  mostrarAvatar = true,
  avatarUrl,
}: MessageBubbleProps) {
  const formatearHora = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, esPropio && styles.containerPropio]}>
      {!esPropio && mostrarAvatar && (
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <IconSymbol name="person.fill" size={16} color={colors.textSecondary} />
            </View>
          )}
        </View>
      )}

      <View style={[styles.bubble, esPropio ? styles.bubblePropio : styles.bubbleOtro]}>
        {!esPropio && (
          <Text style={styles.nombreAutor}>{mensaje.autorNombre}</Text>
        )}
        
        {mensaje.tipo === 'texto' && (
          <Text style={[styles.contenido, esPropio && styles.contenidoPropio]}>
            {mensaje.contenido}
          </Text>
        )}

        {mensaje.tipo === 'imagen' && (
          <Image source={{ uri: mensaje.contenido }} style={styles.imagen} />
        )}

        <View style={styles.footer}>
          <Text style={[styles.hora, esPropio && styles.horaPropio]}>
            {formatearHora(mensaje.fecha)}
          </Text>
          {esPropio && (
            <IconSymbol
              name={mensaje.leido ? 'checkmark.circle.fill' : 'checkmark.circle'}
              size={14}
              color={mensaje.leido ? colors.primary : colors.textSecondary}
            />
          )}
        </View>
      </View>

      {esPropio && <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  containerPropio: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '70%',
    borderRadius: 16,
    padding: 12,
  },
  bubblePropio: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOtro: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  nombreAutor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  contenido: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  contenidoPropio: {
    color: colors.headerText,
  },
  imagen: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  hora: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  horaPropio: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  spacer: {
    width: 40,
  },
});
