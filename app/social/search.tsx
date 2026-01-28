
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { scaleFontSize } from '@/utils/androidScaling';

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
 * ✅ SOCIAL FEED SEARCH v282.0 - ANDROID SCALING APPLIED
 * 
 * NEW FIXES v282.0:
 * - ✅ ALL TEXT SIZES use scaleFontSize() for Android consistency
 * - ✅ Header title, search placeholder, result names, badges, etc.
 * - ✅ Consistent with other scaled pages (Explorar, Crear Publicación)
 * 
 * Previous features maintained (v10.0):
 * - ✅ FULL PAGE: No longer a modal, now a full-page screen
 * - ✅ NAVIGATION: Clicking on results navigates to profiles
 * - ✅ USER PROFILES: Navigates to /perfil/usuario?userId={userId}
 * - ✅ LOCAL PROFILES: Navigates to /perfil/local?localId={localId}
 * - ✅ CRITICAL: TextInput is ALWAYS rendered (no conditional rendering)
 * - ✅ CRITICAL: TextInput is a CONTROLLED component with stable state
 * - ✅ CRITICAL: Debounce with useEffect + cleanup (300ms)
 */

export default function SocialSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // ✅ FIX v9.0: Controlled input state (STABLE)
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());

  const loadFollowedUsers = useCallback(async () => {
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
      console.error('[SocialSearch v282.0] Error loading followed users:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFollowedUsers();
    }
  }, [user, loadFollowedUsers]);

  const searchUsersAndLocals = useCallback(async (query: string) => {
    const cleanQuery = query.trim();
    
    if (cleanQuery.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      console.log('[SocialSearch v282.0] 🔍 Searching for:', cleanQuery);
      
      const allResults: SearchResult[] = [];

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
          console.log('[SocialSearch v282.0] ✅ Found', usersData.length, 'users');
        }
      } catch (error) {
        console.error('[SocialSearch v282.0] Error searching users:', error);
      }

      try {
        console.log('[SocialSearch v282.0] 🔍 Searching locals with query:', cleanQuery);
        
        const { data: localsData, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url, descripcion, barlive_type')
          .ilike('nombre', `%${cleanQuery}%`)
          .eq('activo', true)
          .limit(50);

        if (localsError) {
          console.error('[SocialSearch v282.0] ❌ Error searching locals:', localsError);
        } else if (localsData && localsData.length > 0) {
          console.log('[SocialSearch v282.0] 📍 Found', localsData.length, 'locals matching query');
          
          const localIds = localsData.map(l => l.id);
          
          const { data: subscriptionsData, error: subsError } = await supabase
            .from('suscripciones_locales')
            .select('local_id, estado, plan_id')
            .in('local_id', localIds)
            .eq('estado', 'activa');

          if (subsError) {
            console.error('[SocialSearch v282.0] ❌ Error fetching subscriptions:', subsError);
          } else if (subscriptionsData && subscriptionsData.length > 0) {
            console.log('[SocialSearch v282.0] 📊 Found', subscriptionsData.length, 'active subscriptions');
            
            const planIds = [...new Set(subscriptionsData.map(sub => sub.plan_id))];
            
            const { data: plansData, error: plansError } = await supabase
              .from('planes_suscripcion')
              .select('id, nombre')
              .in('id', planIds);

            if (plansError) {
              console.error('[SocialSearch v282.0] ❌ Error fetching plans:', plansError);
            } else if (plansData) {
              console.log('[SocialSearch v282.0] 📋 Found', plansData.length, 'plans');
              
              const planMap = new Map(plansData.map(plan => [plan.id, plan.nombre?.toLowerCase()]));
              
              const validLocalIds = subscriptionsData
                .filter(sub => {
                  const planName = planMap.get(sub.plan_id);
                  const isValid = planName === 'estandar' || planName === 'premium';
                  return isValid;
                })
                .map(sub => sub.local_id);

              console.log('[SocialSearch v282.0] ✅ Valid local IDs with paid plans:', validLocalIds);

              const filteredLocalsData = localsData.filter(local => 
                validLocalIds.includes(local.id)
              );

              console.log('[SocialSearch v282.0] ✅ Filtered locals with active plans:', filteredLocalsData.length);

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
        }
      } catch (error) {
        console.error('[SocialSearch v282.0] ❌ Error searching locals:', error);
      }

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

      console.log('[SocialSearch v282.0] ✅ Total results:', sortedResults.length, {
        users: sortedResults.filter(r => r.tipo === 'usuario').length,
        locals: sortedResults.filter(r => r.tipo === 'local').length,
      });
      setResults(sortedResults);
    } catch (error) {
      console.error('[SocialSearch v282.0] ❌ Error in searchUsersAndLocals:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [followedUserIds]);

  // ✅ FIX v9.0: Debounce search with 300ms delay + cleanup
  useEffect(() => {
    console.log('[SocialSearch v282.0] 📝 Search query changed:', searchQuery);
    
    const timer = setTimeout(() => {
      if (searchQuery.length > 0) {
        console.log('[SocialSearch v282.0] 🔍 Executing search after 300ms pause');
        searchUsersAndLocals(searchQuery);
      } else {
        setResults([]);
      }
    }, 300);

    // Cleanup function - CRITICAL for preventing focus loss
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, searchUsersAndLocals]);

  // ✅ NEW v10.0: Navigate to profile on result click
  const handleSelectResult = (result: SearchResult) => {
    console.log('[SocialSearch v282.0] 🚀 Navigating to profile:', result.tipo, result.id);
    
    Keyboard.dismiss();
    
    if (result.tipo === 'usuario') {
      if (user && result.id === user.id) {
        console.log('[SocialSearch v282.0] 👤 Navigating to own profile');
        router.push('/(tabs)/perfil');
      } else {
        console.log('[SocialSearch v282.0] 👤 Navigating to user profile:', result.id);
        router.push(`/perfil/usuario?userId=${result.id}`);
      }
    } else {
      console.log('[SocialSearch v282.0] 🏪 Navigating to local profile:', result.id);
      router.push(`/perfil/local?localId=${result.id}`);
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
            <Text style={[styles.resultName, { fontSize: scaleFontSize(16) }]}>{item.nombre}</Text>
            {item.isFollowing && (
              <View style={styles.followingBadge}>
                <Text style={[styles.followingBadgeText, { fontSize: scaleFontSize(11) }]}>Siguiendo</Text>
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
                { fontSize: scaleFontSize(12) },
                item.tipo === 'local' ? styles.typeBadgeTextLocal : styles.typeBadgeTextUser
              ]}>
                {item.tipo === 'local' ? 'Local' : 'Usuario'}
              </Text>
            </View>
            {item.tipo === 'usuario' && item.username && (
              <Text style={[styles.resultUsername, { fontSize: scaleFontSize(13) }]}>@{item.username}</Text>
            )}
            {item.tipo === 'local' && item.barlive_type && (
              <Text style={[styles.resultCategory, { fontSize: scaleFontSize(13) }]}>{item.barlive_type}</Text>
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
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color="#FFFFFF"
          />
          <TextInput
            style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
            placeholder="Buscar usuarios y locales..."
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            blurOnSubmit={false}
            enablesReturnKeyAutomatically={false}
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(14) }]}>Buscando...</Text>
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
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No se encontraron resultados</Text>
          <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
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
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>Busca usuarios y locales</Text>
          <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
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
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
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
    fontWeight: '600',
  },
  typeBadgeTextLocal: {
    color: '#10B981',
  },
  typeBadgeTextUser: {
    color: '#3B82F6',
  },
  resultUsername: {
    color: colors.textSecondary,
  },
  resultCategory: {
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
