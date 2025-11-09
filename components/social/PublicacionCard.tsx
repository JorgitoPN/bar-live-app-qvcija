
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Post } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface PublicacionCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export default function PublicacionCard({ post, onLike, onComment, onShare }: PublicacionCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    if (onLike) onLike();
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

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          if (post.tipo === 'local' && post.localId) {
            router.push(`/detalle/local?id=${post.localId}`);
          } else {
            router.push(`/perfil?id=${post.autorId}`);
          }
        }}
      >
        {post.autorAvatar ? (
          <Image source={{ uri: post.autorAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <IconSymbol name="person.fill" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.autorNombre}>{post.autorNombre}</Text>
          <Text style={styles.fecha}>{formatearFecha(post.fecha)}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <IconSymbol name="ellipsis" size={20} color={colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Contenido */}
      {post.contenido && <Text style={styles.contenido}>{post.contenido}</Text>}

      {/* Imagen */}
      {post.imagen && (
        <Image source={{ uri: post.imagen }} style={styles.imagen} resizeMode="cover" />
      )}

      {/* Acciones */}
      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accionButton} onPress={handleLike}>
          <IconSymbol
            name={liked ? 'heart.fill' : 'heart'}
            size={24}
            color={liked ? '#EF4444' : colors.text}
          />
          <Text style={[styles.accionText, liked && styles.accionTextLiked]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={onComment}>
          <IconSymbol name="bubble.left" size={24} color={colors.text} />
          <Text style={styles.accionText}>{post.comentarios}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={onShare}>
          <IconSymbol name="paperplane" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton}>
          <IconSymbol name="bookmark" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  autorNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  fecha: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  contenido: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  imagen: {
    width: '100%',
    height: 400,
    backgroundColor: colors.cardBorder,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  accionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  accionTextLiked: {
    color: '#EF4444',
  },
});
