
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

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

interface Props {
  request: MessageAccessRequest;
  onUpdate: () => void;
}

export default function MessageAccessRequestCard({ request, onUpdate }: Props) {
  const [processing, setProcessing] = useState(false);

  const handleResponse = async (approve: boolean) => {
    const action = approve ? 'aprobar' : 'denegar';
    
    Alert.alert(
      `¿${approve ? 'Aprobar' : 'Denegar'} Solicitud?`,
      `¿Estás seguro de que quieres ${action} el acceso del administrador a tus mensajes privados?\n\n${
        approve
          ? 'El administrador podrá ver tus conversaciones privadas. Puedes revocar este acceso en cualquier momento.'
          : 'El administrador no podrá acceder a tus mensajes.'
      }`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: approve ? 'Aprobar' : 'Denegar',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const expiresAt = approve
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                : undefined;

              const { error } = await supabase
                .from('admin_message_access_requests')
                .update({
                  status: approve ? 'approved' : 'denied',
                  responded_at: new Date().toISOString(),
                  expires_at: expiresAt,
                })
                .eq('id', request.id);

              if (error) throw error;

              Alert.alert(
                'Éxito',
                `Solicitud ${approve ? 'aprobada' : 'denegada'} correctamente`
              );
              onUpdate();
            } catch (error) {
              console.error('[MessageAccessRequest] Error responding:', error);
              Alert.alert('Error', 'No se pudo procesar la respuesta');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRevoke = async () => {
    Alert.alert(
      'Revocar Acceso',
      '¿Estás seguro de que quieres revocar el acceso del administrador a tus mensajes?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const { error } = await supabase
                .from('admin_message_access_requests')
                .update({
                  status: 'revoked',
                  responded_at: new Date().toISOString(),
                })
                .eq('id', request.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Acceso revocado correctamente');
              onUpdate();
            } catch (error) {
              console.error('[MessageAccessRequest] Error revoking:', error);
              Alert.alert('Error', 'No se pudo revocar el acceso');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = () => {
    const badges = {
      pending: { color: '#F59E0B', text: 'Pendiente', icon: 'clock.fill' },
      approved: { color: '#10B981', text: 'Aprobado', icon: 'checkmark.circle.fill' },
      denied: { color: '#EF4444', text: 'Denegado', icon: 'xmark.circle.fill' },
      revoked: { color: '#6B7280', text: 'Revocado', icon: 'minus.circle.fill' },
    };

    const badge = badges[request.status];

    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.color + '20' }]}>
        <IconSymbol
          ios_icon_name={badge.icon}
          android_material_icon_name={
            request.status === 'pending' ? 'schedule' :
            request.status === 'approved' ? 'check_circle' :
            request.status === 'denied' ? 'cancel' : 'remove_circle'
          }
          size={14}
          color={badge.color}
        />
        <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol
            ios_icon_name="shield.lefthalf.filled"
            android_material_icon_name="security"
            size={24}
            color={colors.primary}
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>Solicitud de Acceso a Mensajes</Text>
            <Text style={styles.subtitle}>
              De: {request.admin?.nombre || 'Administrador'}
            </Text>
          </View>
        </View>
        {getStatusBadge()}
      </View>

      <View style={styles.body}>
        <Text style={styles.reasonLabel}>Razón:</Text>
        <Text style={styles.reasonText}>{request.reason}</Text>

        <Text style={styles.dateText}>
          Solicitado: {new Date(request.requested_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        {request.status === 'approved' && request.expires_at && (
          <Text style={styles.expiresText}>
            Expira: {new Date(request.expires_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>

      {request.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleResponse(true)}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.actionButtonText}>Aprobar</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton]}
            onPress={() => handleResponse(false)}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color="#EF4444"
                />
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Denegar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {request.status === 'approved' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.revokeButton]}
          onPress={handleRevoke}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="minus.circle.fill"
                android_material_icon_name="remove_circle"
                size={20}
                color="#EF4444"
              />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Revocar Acceso</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  expiresText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  denyButton: {
    backgroundColor: '#FEE2E2',
  },
  revokeButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
