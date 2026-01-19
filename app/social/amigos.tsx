
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const mockAmigos = [
  {
    id: '1',
    nombre: 'María García',
    usuario: '@maria_garcia',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    seguidores: 1234,
    siguiendo: true,
  },
  {
    id: '2',
    nombre: 'Carlos López',
    usuario: '@carlos_lopez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    seguidores: 890,
    siguiendo: true,
  },
  {
    id: '3',
    nombre: 'Ana Martínez',
    usuario: '@ana_martinez',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    seguidores: 2345,
    siguiendo: false,
  },
];

export default function AmigosScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'seguidores' | 'seguidos'>('seguidores');
  const [busqueda, setBusqueda] = useState('');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Amigos</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'seguidores' && styles.tabActive]}
          onPress={() => setActiveTab('seguidores')}
        >
          <Text
            style={[styles.tabText, activeTab === 'seguidores' && styles.tabTextActive]}
          >
            Seguidores
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'seguidos' && styles.tabActive]}
          onPress={() => setActiveTab('seguidos')}
        >
          <Text
            style={[styles.tabText, activeTab === 'seguidos' && styles.tabTextActive]}
          >
            Seguidos
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar..."
          placeholderTextColor={colors.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <ScrollView style={styles.content}>
        {mockAmigos.map((amigo) => (
          <TouchableOpacity
            key={amigo.id}
            style={styles.amigoCard}
            onPress={() => router.push(`/(tabs)/perfil?userId=${amigo.id}`)}
          >
            <Image source={{ uri: amigo.avatar }} style={styles.avatar} />
            <View style={styles.amigoInfo}>
              <Text style={styles.nombre}>{amigo.nombre}</Text>
              <Text style={styles.usuario}>{amigo.usuario}</Text>
              <Text style={styles.seguidores}>{amigo.seguidores} seguidores</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.followButton,
                amigo.siguiendo && styles.followButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.followButtonText,
                  amigo.siguiendo && styles.followButtonTextActive,
                ]}
              >
                {amigo.siguiendo ? 'Siguiendo' : 'Seguir'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  amigoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  amigoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  usuario: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  seguidores: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  followButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  followButtonActive: {
    backgroundColor: 'transparent',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  followButtonTextActive: {
    color: colors.primary,
  },
});
