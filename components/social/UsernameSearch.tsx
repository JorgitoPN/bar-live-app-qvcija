
import React, { useState, useEffect, useRef, useCallback } from 'react';
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

/**
 * ✅ USERNAME SEARCH v231.0 - KEYBOARD PERSISTENCE FIX
 * 
 * CRITICAL FIXES v231.0:
 * - ✅ FIXED: TextInput now uses useRef to store value instead of state
 * - ✅ FIXED: No re-renders when typing - component stays stable
 * - ✅ FIXED: Keyboard stays visible throughout typing
 * - ✅ FIXED: Users can type complete words without interruption
 * - ✅ FIXED: Search triggers after 300ms pause (debounced)
 */

export function UsernameSearch({
  onSelectUser,
  onSelectLocal,
  placeholder = 'Buscar por @usuario',
  autoFocus = false,
}: UsernameSearchProps) {
  const router = useRouter();
  
  // ✅ CRITICAL v231.0: Use ref for search query to prevent re-renders
  const queryRef = useRef('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{
    users: { id: string; username: string; nombre: string; avatar: string | null }[];
    locals: { id: string; username: string; nombre: string; imagen_url: string | null }[];
  }>({ users: [], locals: [] });

  // ✅ CRITICAL v231.0: Stable ref for TextInput to prevent recreation
  const searchInputRef = useRef<TextInput>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ CRITICAL FIX v231.0: Handle text change without causing re-renders
  const handleSearchChange = useCallback((text: string) => {
    console.log('[UsernameSearch v231.0] 📝 User typing (no re-render):', text);
    
    // Store in ref - doesn't cause re-render
    queryRef.current = text;
    
    // Clear existing timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    // Set new timer to trigger search after 300ms
    searchTimerRef.current = setTimeout(() => {
      console.log('[UsernameSearch v231.0] 🔍 Triggering search after typing pause');
      setSearchTrigger(prev => prev + 1);
    }, 300);
  }, []);

  // ✅ CRITICAL v231.0: Search when searchTrigger changes (not on every keystroke)
  useEffect(() => {
    const performSearch = async () => {
      const query = queryRef.current.trim();
      
      if (query.length >= 2) {
        setSearching(true);
        const searchResults = await searchByUsername(query, 10);
        setResults(searchResults);
        setSearching(false);
      } else {
        setResults({ users: [], locals: [] });
      }
    };

    performSearch();
  }, [searchTrigger]);

  const handleSelectUser = (userId: string) => {
    if (onSelectUser) {
      onSelectUser(userId);
    } else {
      router.push(`/perfil/usuario?id=${userId}`);
    }
  };

  const handleSelectLocal = (localId: string) => {
    if (onSelectLocal) {
      onSelectLocal(localId);
    } else {
      router.push(`/detalle/local?id=${localId}`);
    }
  };

  // ✅ CRITICAL v231.0: Clear search without losing focus
  const handleClearSearch = useCallback(() => {
    console.log('[UsernameSearch v231.0] 🧹 Clearing search');
    queryRef.current = '';
    if (searchInputRef.current) {
      searchInputRef.current.clear();
    }
    setResults({ users: [], locals: [] });
    setSearchTrigger(prev => prev + 1);
  }, []);

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
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          defaultValue={queryRef.current}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={false}
        />
        {queryRef.current.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch}>
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

      {!searching && queryRef.current.length >= 2 && totalResults === 0 && (
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
