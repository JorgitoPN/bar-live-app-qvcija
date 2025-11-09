
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { mockChats } from '@/data/mockData';

export default function ChatsScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [chats] = useState(mockChats);

  const chatsFiltrados = chats.filter(chat =>
    chat.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <View style={commonStyles.container}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mensajes</Text>
          <TouchableOpacity style={styles.newChatButton}>
            <IconSymbol name="square.and.pencil" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversaciones..."
            placeholderTextColor={colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {chatsFiltrados.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatCard}
            onPress={() => router.push(`/detalle/sala-virtual?id=${chat.id}`)}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: chat.avatar }}
                style={styles.avatar}
              />
              {chat.online && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatNombre}>{chat.nombre}</Text>
                <Text style={styles.chatHora}>{chat.hora}</Text>
              </View>
              <View style={styles.chatFooter}>
                <Text 
                  style={[
                    styles.chatUltimoMensaje,
                    !chat.leido && styles.chatUltimoMensajeNoLeido
                  ]}
                  numberOfLines={1}
                >
                  {chat.ultimoMensaje}
                </Text>
                {!chat.leido && chat.mensajesNoLeidos > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{chat.mensajesNoLeidos}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {chatsFiltrados.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="bubble.left.and.bubble.right" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron conversaciones' : 'No tienes mensajes'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  newChatButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardBorder,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  chatContent: {
    flex: 1,
    gap: 6,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chatHora: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatUltimoMensaje: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  chatUltimoMensajeNoLeido: {
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.badgeNuevo,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.badgeNuevoText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
