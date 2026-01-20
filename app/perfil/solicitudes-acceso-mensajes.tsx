
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MessageAccessRequestCard from '@/components/admin/MessageAccessRequestCard';

interface MessageAccessRequest {
  id: string;
  admin_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'denied' | 'revoked';
  reason: string;
  requested_at: string;
  responded_at?: string;
  expires_at?: string;
  admin?: {
    nombre: string;
    email: string;
    avatar?: string;
  };
}

export default function SolicitudesAccesoMensajesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MessageAccessRequest[]>([]);

  const cargarSolicitudes = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_message_access_requests')
        .select(`
          *,
          admin:usuarios!admin_message_access_requests_admin_id_fkey (
            nombre,
            email,
            avatar
          )
        `)
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('[SolicitudesAcceso] Error loading requests:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol
        ios_icon_name="shield.lefthalf.filled"
        android_material_icon_name="security"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>No hay solicitudes</Text>
      <Text style={styles.emptyText}>
        No tienes solicitudes de acceso a mensajes de administradores
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.headerText}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Solicitudes de Acceso</Text>
          <Text style={styles.headerSubtitle}>Gestiona el acceso a tus mensajes</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={cargarSolicitudes}>
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={24}
            color={colors.headerText}
          />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Protección de Datos</Text>
              <Text style={styles.infoText}>
                Los administradores solo pueden acceder a tus mensajes privados con tu aprobación explícita. 
                Puedes revocar el acceso en cualquier momento.
              </Text>
            </View>
          </View>

          {requests.length === 0 ? (
            renderEmpty()
          ) : (
            <View style={styles.requestsList}>
              {requests.map((request) => (
                <MessageAccessRequestCard
                  key={request.id}
                  request={request}
                  onUpdate={cargarSolicitudes}
                />
              ))}
            </View>
          )}
        </ScrollView>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  requestsList: {
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});
