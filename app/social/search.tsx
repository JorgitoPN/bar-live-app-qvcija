
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MiniFoodPlateAvatar from '@/components/common/MiniFoodPlateAvatar';

interface SearchResult {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
  descripcion?: string;
  barlive_type?: string;
  isFollowing?: boolean;
}

/**
 * ✅ SOCIAL FEED SEARCH v5.0 - FIXED DATABASE COLUMN ERROR
 * 
 * Features:
 * - ✅ Search without @ symbol
 * - ✅ Predictive from first character
 * - ✅ Mixed results (users + locals)
 * - ✅ FIXED: Removed non-existent 'categoria' column
 * - ✅ FIXED: Use 'barlive_type' instead of 'categoria'
 * - ✅ Search locals by checking active subscriptions properly
 * - ✅ Priority: exact matches, followed users, relevant locals
 * - ✅ Debounce ~300ms
 * - ✅ Show avatar + name + type
 * - ✅ WHITE text and magnifying glass icon
 */

export default function SocialSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());

  // Load followed users for priority sorting
  useEffect(() => {
    if (user) {
      loadFollowedUsers();
    }
  }, [user]);

  const loadFollowedUsers = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('seguidores')
        .select('seguido_id')
        .eq('seguidor_id', user.id)
        .is('local_id', null);

      const ids = new Set(data?.map(f => f.seguido_id) || []);
      setFollowedUserIds(ids);
    } catch (error) {
      console.error('[SocialSearch] Error loading followed users:', error);
    }
  };

  const searchUsersAndLocals = useCallback(async (query: string) => {
    const cleanQuery = query.trim();
    
    if (cleanQuery.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      console.log('[SocialSearch v5.0] 🔍 Searching for:', cleanQuery);
      
      const allResults: SearchResult[] = [];

      // ✅ Search users (without @ requirement)
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .or(`username.ilike.%${cleanQuery}%,nombre.ilike.%${cleanQuery}%`)
          .eq('activo', true)
          .limit(20);

        if (!usersError && usersData) {
          allResults.push(...usersData.map(u => ({
            id: u.id,
            nombre: u.nombre,
            username: u.username || u.nombre,
            avatar: u.avatar,
            tipo: 'usuario' as const,
            isFollowing: followedUserIds.has(u.id),
          })));
          console.log('[SocialSearch v5.0] ✅ Found', usersData.length, 'users');
        }
      } catch (error) {
        console.error('[SocialSearch v5.0] Error searching users:', error);
      }

      // ✅ FIXED: Search locals with active subscriptions (premium or estandar)
      // ✅ CRITICAL FIX: Removed 'categoria' column, using 'barlive_type' instead
      try {
        console.log('[SocialSearch v5.0] 🔍 Searching locals with query:', cleanQuery);
        
        // First, get all locals matching the search query
        const { data: localsData, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url, descripcion, barlive_type')
          .ilike('nombre', `%${cleanQuery}%`)
          .eq('activo', true)
          .limit(50);

        if (localsError) {
          console.error('[SocialSearch v5.0] ❌ Error searching locals:', localsError);
        } else if (localsData && localsData.length > 0) {
          console.log('[SocialSearch v5.0] 📍 Found', localsData.length, 'locals matching query');
          
          const localIds = localsData.map(l => l.id);
          
          // ✅ CRITICAL FIX: Get active subscriptions with plan details
          const { data: subscriptionsData, error: subsError } = await supabase
            .from('suscripciones_locales')
            .select(`
              local_id,
              estado,
              plan_id,
              planes_suscripcion!inner(id, nombre)
            `)
            .in('local_id', localIds)
            .eq('estado', 'activa');

          if (subsError) {
            console.error('[SocialSearch v5.0] ❌ Error fetching subscriptions:', subsError);
          } else if (subscriptionsData) {
            console.log('[SocialSearch v5.0] 📊 Found', subscriptionsData.length, 'active subscriptions');
            
            // ✅ Filter for premium or estandar plans
            const validLocalIds = subscriptionsData
              .filter(sub => {
                const plan = sub.planes_suscripcion as any;
                const planName = plan?.nombre?.toLowerCase();
                const isValid = planName === 'estandar' || planName === 'premium';
                console.log('[SocialSearch v5.0] 🔍 Checking subscription:', {
                  localId: sub.local_id,
                  planName,
                  isValid,
                });
                return isValid;
              })
              .map(sub => sub.local_id);

            console.log('[SocialSearch v5.0] ✅ Valid local IDs with paid plans:', validLocalIds);

            const filteredLocalsData = localsData.filter(local => 
              validLocalIds.includes(local.id)
            );

            console.log('[SocialSearch v5.0] ✅ Filtered locals with active plans:', filteredLocalsData.length);

            allResults.push(...filteredLocalsData.map(l => ({
              id: l.id,
              nombre: l.nombre,
              username: l.nombre,
              avatar: l.imagen_url,
              tipo: 'local' as const,
              descripcion: l.descripcion,
              barlive_type: l.barlive_type,
            })));
          }
        }
      } catch (error) {
        console.error('[SocialSearch v5.0] ❌ Error searching locals:', error);
      }

      // ✅ Sort results by priority:
      // 1. Exact matches (name or username)
      // 2. Followed users
      // 3. Locals with subscriptions
      // 4. Other users
      const sortedResults = allResults.sort((a, b) => {
        const aExactMatch = a.nombre.toLowerCase() === cleanQuery.toLowerCase() || 
                           a.username?.toLowerCase() === cleanQuery.toLowerCase();
        const bExactMatch = b.nombre.toLowerCase() === cleanQuery.toLowerCase() || 
                           b.username?.toLowerCase() === cleanQuery.toLowerCase();
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        if (a.tipo === 'usuario' && b.tipo === 'usuario') {
          if (a.isFollowing && !b.isFollowing) return -1;
          if (!a.isFollowing && b.isFollowing) return 1;
        }
        
        if (a.tipo === 'local' && b.tipo === 'usuario') return -1;
        if (a.tipo === 'usuario' && b.tipo === 'local') return 1;
        
        return 0;
      });

      console.log('[SocialSearch v5.0] ✅ Total results:', sortedResults.length, {
        users: sortedResults.filter(r => r.tipo === 'usuario').length,
        locals: sortedResults.filter(r => r.tipo === 'local').length,
      });
      setResults(sortedResults);
    } catch (error) {
      console.error('[SocialSearch v5.0] ❌ Error in searchUsersAndLocals:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [followedUserIds]);

  // ✅ Debounce search with ~300ms delay
  useEffect(() => {
    if (searchQuery.length > 0) {
      const timeoutId = setTimeout(() => {
        searchUsersAndLocals(searchQuery);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  }, [searchQuery, searchUsersAndLocals]);

  const handleSelectResult = (result: SearchResult) => {
    Keyboard.dismiss();
    
    // ✅ FIXED: Check if selected user is the current user
    if (result.tipo === 'usuario') {
      if (user && result.id === user.id) {
        // Navigate to own profile
        router.push('/(tabs)/perfil');
      } else {
        // Navigate to other user's profile
        router.push({
          pathname: '/perfil/usuario',
          params: { userId: result.id },
        });
      }
    } else {
      // Navigate to local profile
      router.push({
        pathname: '/perfil/local',
        params: { localId: result.id },
      });
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelectResult(item)}
        activeOpacity={0.7}
      >
        <MiniFoodPlateAvatar
          imageUrl={item.avatar}
          size={48}
          nombre={item.nombre}
          userId={item.tipo === 'usuario' ? item.id : undefined}
          localId={item.tipo === 'local' ? item.id : undefined}
          showMomentoBorder={false}
        />
        <View style={styles.resultInfo}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultName}>{item.nombre}</Text>
            {item.isFollowing && (
              <View style={styles.followingBadge}>
                <Text style={styles.followingBadgeText}>Siguiendo</Text>
              </View>
            )}
          </View>
          <View style={styles.resultMeta}>
            <View style={[
              styles.typeBadge,
              item.tipo === 'local' ? styles.typeBadgeLocal : styles.typeBadgeUser
            ]}>
              <IconSymbol
                ios_icon_name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                android_material_icon_name={item.tipo === 'local' ? 'store' : 'person'}
                size={12}
                color={item.tipo === 'local' ? '#10B981' : '#3B82F6'}
              />
              <Text style={[
                styles.typeBadgeText,
                item.tipo === 'local' ? styles.typeBadgeTextLocal : styles.typeBadgeTextUser
              ]}>
                {item.tipo === 'local' ? 'Local' : 'Usuario'}
              </Text>
            </View>
            {item.tipo === 'usuario' && item.username && (
              <Text style={styles.resultUsername}>@{item.username}</Text>
            )}
            {item.tipo === 'local' && item.barlive_type && (
              <Text style={styles.resultCategory}>{item.barlive_type}</Text>
            )}
          </View>
        </View>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="chevron_right"
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ✅ Header with WHITE text and icons */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          {/* ✅ WHITE magnifying glass icon */}
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color="#FFFFFF"
          />
          {/* ✅ WHITE text input */}
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios y locales..."
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setResults([]);
              }}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => `${item.tipo}-${item.id}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : searchQuery.length >= 1 ? (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>No se encontraron resultados</Text>
          <Text style={styles.emptySubtext}>
            Intenta con otro nombre o palabra clave
          </Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="person.2.fill"
            android_material_icon_name="people"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>Busca usuarios y locales</Text>
          <Text style={styles.emptySubtext}>
            Escribe para ver resultados
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    paddingVertical: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  resultInfo: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  followingBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  followingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeLocal: {
    backgroundColor: '#10B981' + '15',
  },
  typeBadgeUser: {
    backgroundColor: '#3B82F6' + '15',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadgeTextLocal: {
    color: '#10B981',
  },
  typeBadgeTextUser: {
    color: '#3B82F6',
  },
  resultUsername: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  resultCategory: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
