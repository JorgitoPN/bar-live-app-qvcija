
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface VerificationStatus {
  has_request: boolean;
  request_id: string;
  estado: string;
  estado_detalle: string;
  created_at: string;
  updated_at: string;
  can_request: boolean;
}

interface StatusHistory {
  id: string;
  estado_anterior: string;
  estado_nuevo: string;
  mensaje: string;
  created_at: string;
}

export default function PropietarioRequestStatusScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);

  const loadStatus = useCallback(async () => {
    if (!user) return;

    try {
      // Get verification status
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_user_verification_status', { user_id: user.id });

      if (statusError) {
        console.error('Error loading status:', statusError);
        throw statusError;
      }

      if (statusData && statusData.length > 0) {
        setStatus(statusData[0]);

        // Load history if there's a request
        if (statusData[0].request_id) {
          const { data: historyData, error: historyError } = await supabase
            .from('verification_status_history')
            .select('*')
            .eq('request_id', statusData[0].request_id)
            .order('created_at', { ascending: false });

          if (historyError) {
            console.error('Error loading history:', historyError);
          } else {
            setHistory(historyData || []);
          }
        }
      }
    } catch (error) {
      console.error('Error in loadStatus:', error);
      Alert.alert('Error', 'No se pudo cargar el estado de verificación');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'clock.fill';
      case 'en_revision':
        return 'doc.text.magnifyingglass';
      case 'documentacion_solicitada':
        return 'doc.badge.plus';
      case 'documentacion_recibida':
        return 'checkmark.circle';
      case 'aprobada':
        return 'checkmark.seal.fill';
      case 'rechazada':
        return 'xmark.circle.fill';
      default:
        return 'questionmark.circle';
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#F59E0B';
      case 'en_revision':
        return '#3B82F6';
      case 'documentacion_solicitada':
        return '#8B5CF6';
      case 'documentacion_recibida':
        return '#10B981';
      case 'aprobada':
        return '#10B981';
      case 'rechazada':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Solicitud Recibida';
      case 'en_revision':
        return 'En Revisión';
      case 'documentacion_solicitada':
        return 'Documentación Solicitada';
      case 'documentacion_recibida':
        return 'Documentación Recibida';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando estado...</Text>
      </View>
    );
  }

  if (!status || !status.has_request) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Estado de Verificación</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <IconSymbol name="doc.text" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Sin solicitudes</Text>
          <Text style={styles.emptyText}>
            No tienes ninguna solicitud de modo propietario activa
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/solicitudes/solicitar-rol-propietario')}
          >
            <Text style={styles.primaryButtonText}>Solicitar Modo Propietario</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Estado de Verificación</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Status Card */}
        <View style={[commonStyles.card, styles.statusCard]}>
          <View style={styles.statusHeader}>
            <View
              style={[
                styles.statusIconContainer,
                { backgroundColor: getStatusColor(status.estado) + '20' },
              ]}
            >
              <IconSymbol
                name={getStatusIcon(status.estado)}
                size={32}
                color={getStatusColor(status.estado)}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Estado Actual</Text>
              <Text style={[styles.statusValue, { color: getStatusColor(status.estado) }]}>
                {getStatusLabel(status.estado)}
              </Text>
            </View>
          </View>

          {status.estado_detalle && (
            <View style={styles.statusDetail}>
              <Text style={styles.statusDetailText}>{status.estado_detalle}</Text>
            </View>
          )}

          <View style={styles.statusDates}>
            <View style={styles.statusDate}>
              <Text style={styles.statusDateLabel}>Solicitado</Text>
              <Text style={styles.statusDateValue}>
                {formatDate(status.created_at)}
              </Text>
            </View>
            <View style={styles.statusDate}>
              <Text style={styles.statusDateLabel}>Última actualización</Text>
              <Text style={styles.statusDateValue}>
                {formatDate(status.updated_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Timeline */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial de Cambios</Text>
            <View style={styles.timeline}>
              {history.map((item, index) => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineIndicator}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: getStatusColor(item.estado_nuevo) },
                      ]}
                    />
                    {index < history.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>
                      {getStatusLabel(item.estado_nuevo)}
                    </Text>
                    {item.mensaje && (
                      <Text style={styles.timelineMessage}>{item.mensaje}</Text>
                    )}
                    <Text style={styles.timelineDate}>{formatDate(item.created_at)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Help Section */}
        <View style={[commonStyles.card, styles.helpCard]}>
          <IconSymbol name="questionmark.circle.fill" size={24} color={colors.primary} />
          <Text style={styles.helpTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.helpText}>
            Si tienes preguntas sobre tu solicitud, contacta con nuestro equipo de soporte.
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => router.push('/soporte/reportar-problema')}
          >
            <Text style={styles.helpButtonText}>Contactar Soporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusCard: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusDetail: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statusDetailText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  statusDates: {
    flexDirection: 'row',
    gap: 16,
  },
  statusDate: {
    flex: 1,
  },
  statusDateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusDateValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.background,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  timelineMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  helpCard: {
    alignItems: 'center',
    padding: 24,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  helpButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
