
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { searchByUsername } from '@/utils/usernameGenerator';
import { FoodPlateAvatar } from '@/components/common/FoodPlateAvatar';

interface UsernameSearchProps {
  onSelectUser?: (userId: string) => void;
  onSelectLocal?: (localId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function UsernameSearch({
  onSelectUser,
  onSelectLocal,
  placeholder = 'Buscar por @usuario',
  autoFocus = false,
}: UsernameSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{
    users: { id: string; username: string; nombre: string; avatar: string | null }[];
    locals: { id: string; username: string; nombre: string; imagen_url: string | null }[];
  }>({ users: [], locals: [] });

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setSearching(true);
        const searchResults = await searchByUsername(query.trim(), 10);
        setResults(searchResults);
        setSearching(false);
      } else {
        setResults({ users: [], locals: [] });
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSelectUser = (userId: string) => {
    console.log('[UsernameSearch] 🔍 User selected, navigating to profile:', userId);
    if (onSelectUser) {
      onSelectUser(userId);
    } else {
      router.push(`/perfil/usuario?userId=${userId}`);
    }
  };

  const handleSelectLocal = (localId: string) => {
    console.log('[UsernameSearch] 🏪 Local selected, navigating to details:', localId);
    if (onSelectLocal) {
      onSelectLocal(localId);
    } else {
      router.push(`/detalle/local?id=${localId}`);
    }
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectUser(item.id)}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.resultAvatar} />
      ) : (
        <FoodPlateAvatar userId={item.id} size={48} />
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.nombre}</Text>
        <Text style={styles.resultUsername}>@{item.username}</Text>
      </View>
      <IconSymbol
        ios_icon_name="chevron.right"
        android_material_icon_name="chevron_right"
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const renderLocalItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectLocal(item.id)}
    >
      {item.imagen_url ? (
        <Image source={{ uri: item.imagen_url }} style={styles.resultAvatar} />
      ) : (
        <View style={[styles.resultAvatar, styles.resultAvatarPlaceholder]}>
          <IconSymbol
            ios_icon_name="building.2.fill"
            android_material_icon_name="store"
            size={24}
            color={colors.textSecondary}
          />
        </View>
      )}
      <View style={styles.resultInfo}>
        <View style={styles.localNameContainer}>
          <Text style={styles.resultName}>{item.nombre}</Text>
          <IconSymbol
            ios_icon_name="checkmark.seal.fill"
            android_material_icon_name="verified"
            size={16}
            color={colors.primary}
          />
        </View>
        <Text style={styles.resultUsername}>@{item.username}</Text>
      </View>
      <IconSymbol
        ios_icon_name="chevron.right"
        android_material_icon_name="chevron_right"
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const totalResults = results.users.length + results.locals.length;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <IconSymbol
          ios_icon_name="magnifyingglass"
          android_material_icon_name="search"
          size={20}
          color={colors.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {searching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      )}

      {!searching && query.length >= 2 && totalResults === 0 && (
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="person.crop.circle.badge.questionmark"
            android_material_icon_name="person_search"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>No se encontraron resultados</Text>
          <Text style={styles.emptySubtext}>
            Intenta con otro nombre de usuario
          </Text>
        </View>
      )}

      {!searching && totalResults > 0 && (
        <View style={styles.resultsContainer}>
          {results.users.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Usuarios</Text>
              <FlatList
                data={results.users}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {results.locals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Locales</Text>
              <FlatList
                data={results.locals}
                renderItem={renderLocalItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  resultAvatarPlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  resultUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  localNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
