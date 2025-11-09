
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CheckIn {
  id: string;
  usuario_id: string;
  local_id: string;
  created_at: string;
  usuario: {
    id: string;
    nombre: string;
    username: string;
    avatar?: string;
  };
}

export default function SalaVirtualScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [local, setLocal] = useState<any>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [userHasCheckedIn, setUserHasCheckedIn] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load local info
      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('id, nombre, direccion, provincia')
        .eq('id', params.id)
        .single();

      if (localError) {
        console.error('[SalaVirtual] Error loading local:', localError);
        Alert.alert('Error', 'No se pudo cargar la información del local');
        return;
      }

      setLocal(localData);

      // Load check-ins from the last 6 hours
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select(`
          id,
          usuario_id,
          local_id,
          created_at,
          usuario:usuarios(id, nombre, username, avatar)
        `)
        .eq('local_id', params.id)
        .gte('created_at', sixHoursAgo.toISOString())
        .order('created_at', { ascending: false });

      if (checkInsError) {
        console.error('[SalaVirtual] Error loading check-ins:', checkInsError);
      } else {
        setCheckIns(checkInsData || []);
        
        // Check if current user has checked in
        if (user) {
          const hasCheckedIn = checkInsData?.some(ci => ci.usuario_id === user.id) || false;
          setUserHasCheckedIn(hasCheckedIn);
        }
      }
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [params.id, user]);

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para hacer check-in');
      return;
    }

    if (userHasCheckedIn) {
      Alert.alert('Ya has hecho check-in', 'Ya estás registrado en este local');
      return;
    }

    try {
      const { error } = await supabase
        .from('check_ins')
        .insert({
          usuario_id: user.id,
          local_id: params.id,
        });

      if (error) {
        console.error('[SalaVirtual] Error creating check-in:', error);
        Alert.alert('Error', 'No se pudo hacer check-in');
        return;
      }

      Alert.alert('¡Check-in exitoso!', 'Ahora apareces en la sala virtual');
      loadData();
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al hacer check-in');
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('usuario_id', user.id)
        .eq('local_id', params.id);

      if (error) {
        console.error('[SalaVirtual] Error deleting check-in:', error);
        Alert.alert('Error', 'No se pudo hacer check-out');
        return;
      }

      Alert.alert('Check-out exitoso', 'Ya no apareces en la sala virtual');
      loadData();
    } catch (error) {
      console.error('[SalaVirtual] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al hacer check-out');
    }
  };

  const handleSendMessage = (usuarioId: string) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    // Navigate to chat with this user
    router.push(`/(tabs)/perfil/chats?userId=${usuarioId}`);
  };

  const formatCheckInTime = (created_at: string): string => {
    const now = new Date();
    const checkInTime = new Date(created_at);
    const diffMs = now.getTime() - checkInTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 6) return `Hace ${diffHours} h`;
    return checkInTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sala Virtual</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando sala virtual...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sala Virtual</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <IconSymbol name="person.2.fill" size={32} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>
              {checkIns.length} {checkIns.length === 1 ? 'persona' : 'personas'} aquí ahora
            </Text>
            <Text style={styles.infoSubtitle}>
              {local?.nombre} - {local?.provincia}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {checkIns.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Usuarios en el local</Text>
            {checkIns.map((checkIn) => (
              <View key={checkIn.id} style={styles.usuarioCard}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => router.push(`/(tabs)/perfil?userId=${checkIn.usuario_id}`)}
                >
                  {checkIn.usuario.avatar ? (
                    <Image source={{ uri: checkIn.usuario.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {checkIn.usuario.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.usuarioInfo}>
                    <Text style={styles.nombre}>{checkIn.usuario.nombre}</Text>
                    {checkIn.usuario.username && (
                      <Text style={styles.username}>@{checkIn.usuario.username}</Text>
                    )}
                    <View style={styles.checkInInfo}>
                      <IconSymbol name="clock" size={14} color={colors.textSecondary} />
                      <Text style={styles.checkInTime}>
                        Check-in: {formatCheckInTime(checkIn.created_at)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {user && checkIn.usuario_id !== user.id && (
                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={() => handleSendMessage(checkIn.usuario_id)}
                  >
                    <IconSymbol name="message" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No hay nadie aquí ahora</Text>
            <Text style={styles.emptySubtitle}>
              Sé el primero en hacer check-in y aparecer en la sala virtual
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {userHasCheckedIn ? (
          <TouchableOpacity 
            style={styles.checkOutButton}
            onPress={handleCheckOut}
          >
            <IconSymbol name="location.slash.fill" size={24} color={colors.headerText} />
            <Text style={styles.checkOutText}>Hacer Check-out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.checkInButton}
            onPress={handleCheckIn}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.checkInGradient}
            >
              <IconSymbol name="location.fill" size={24} color={colors.headerText} />
              <Text style={styles.checkInText}>Hacer Check-in</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  usuarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  usuarioInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  checkInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkInTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  messageButton: {
    padding: 8,
    backgroundColor: colors.primary + '15',
    borderRadius: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  checkInButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  checkInText: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkOutText: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
