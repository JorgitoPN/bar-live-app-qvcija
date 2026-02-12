
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/utils/supabase';

interface SolicitudStatus {
  id: string;
  tipo_solicitud: 'reclamar_local' | 'nuevo_local';
  nombre_local: string;
  estado: 'pendiente' | 'en_revision' | 'informacion_adicional' | 'aprobada' | 'denegada';
  created_at: string;
  motivo_denegacion?: string;
  notas_admin?: string;
}

interface Props {
  userId: string;
}

/**
 * ✅ SOLICITUD PROPIEDAD STATUS v2.0 - FIXED NAVIGATION
 * 
 * FIXES v2.0:
 * - ✅ Fixed "Ver Detalles" button navigation (now goes to /admin/solicitud-detalle, not /perfil/notificaciones)
 * - ✅ Proper route parameters passing
 * - ✅ Console logs for debugging navigation
 */

export default function SolicitudPropiedadStatus({ userId }: Props) {
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<SolicitudStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSolicitud = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_propietario')
        .select('id, tipo_solicitud, nombre_local, estado, created_at, motivo_denegacion, notas_admin')
        .eq('usuario_id', userId)
        .in('estado', ['pendiente', 'en_revision', 'informacion_adicional'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[SolicitudStatus v2.0] Error loading request:', error);
        return;
      }

      setSolicitud(data);
      console.log('[SolicitudStatus v2.0] Loaded request:', data?.estado);
    } catch (error) {
      console.error('[SolicitudStatus v2.0] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolicitud();

    // Subscribe to changes
    const channel = supabase
      .channel(`solicitud-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_propietario',
          filter: `usuario_id=eq.${userId}`,
        },
        () => {
          console.log('[SolicitudStatus v2.0] Request changed, reloading...');
          loadSolicitud();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadSolicitud]);

  const getEstadoInfo = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return {
          label: 'Pendiente de Confirmación',
          icon: 'clock',
          androidIcon: 'schedule',
          color: '#F59E0B',
          description: 'Confirma tu email para que tu solicitud pase a revisión',
        };
      case 'en_revision':
        return {
          label: 'En Revisión',
          icon: 'doc.text.magnifyingglass',
          androidIcon: 'search',
          color: '#3B82F6',
          description: 'Un administrador está revisando tu solicitud',
        };
      case 'informacion_adicional':
        return {
          label: 'Información Adicional Requerida',
          icon: 'exclamationmark.circle',
          androidIcon: 'info',
          color: '#8B5CF6',
          description: 'El administrador necesita más información',
        };
      case 'aprobada':
        return {
          label: 'Aprobada',
          icon: 'checkmark.circle.fill',
          androidIcon: 'check_circle',
          color: '#10B981',
          description: '¡Tu solicitud ha sido aprobada!',
        };
      case 'denegada':
        return {
          label: 'Denegada',
          icon: 'xmark.circle.fill',
          androidIcon: 'cancel',
          color: '#EF4444',
          description: 'Tu solicitud ha sido denegada',
        };
      default:
        return {
          label: estado,
          icon: 'circle',
          androidIcon: 'circle',
          color: colors.textSecondary,
          description: '',
        };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!solicitud) {
    return null;
  }

  const estadoInfo = getEstadoInfo(solicitud.estado);
  const tipoLabel = solicitud.tipo_solicitud === 'reclamar_local' ? 'Reclamar Local' : 'Nuevo Local';

  return (
    <View style={styles.container}>
      <View style={[styles.statusCard, { borderLeftColor: estadoInfo.color }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIconContainer, { backgroundColor: estadoInfo.color + '20' }]}>
            <IconSymbol
              ios_icon_name={estadoInfo.icon}
              android_material_icon_name={estadoInfo.androidIcon}
              size={24}
              color={estadoInfo.color}
            />
          </View>
          <View style={styles.statusHeaderText}>
            <Text style={styles.statusTitle}>Solicitud de Propiedad</Text>
            <Text style={styles.statusSubtitle}>{tipoLabel}</Text>
          </View>
        </View>

        <View style={styles.statusBody}>
          <View style={styles.localNameRow}>
            <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={16} color={colors.text} />
            <Text style={styles.localName}>{solicitud.nombre_local}</Text>
          </View>

          <View style={[styles.estadoBadge, { backgroundColor: estadoInfo.color }]}>
            <Text style={styles.estadoBadgeText}>{estadoInfo.label}</Text>
          </View>

          <Text style={styles.statusDescription}>{estadoInfo.description}</Text>

          {solicitud.notas_admin && (
            <View style={styles.notasAdminContainer}>
              <IconSymbol ios_icon_name="note.text" android_material_icon_name="note" size={16} color={colors.primary} />
              <Text style={styles.notasAdminLabel}>Nota del administrador:</Text>
              <Text style={styles.notasAdminText}>{solicitud.notas_admin}</Text>
            </View>
          )}

          {solicitud.motivo_denegacion && (
            <View style={styles.motivoDenegacionContainer}>
              <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={16} color="#EF4444" />
              <Text style={styles.motivoDenegacionLabel}>Motivo de denegación:</Text>
              <Text style={styles.motivoDenegacionText}>{solicitud.motivo_denegacion}</Text>
            </View>
          )}

          <View style={styles.statusActions}>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => {
                console.log('[SolicitudStatus v2.0] ✅ FIXED: Navigating to solicitud-detalle:', solicitud.id);
                console.log('[SolicitudStatus v2.0] Route: /admin/solicitud-detalle');
                console.log('[SolicitudStatus v2.0] Params:', { id: solicitud.id });
                
                // ✅ FIX: Correct navigation to solicitud-detalle (not notificaciones)
                router.push({
                  pathname: '/admin/solicitud-detalle',
                  params: { id: solicitud.id },
                });
              }}
            >
              <Text style={styles.viewDetailsButtonText}>Ver Detalles</Text>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={16} color={colors.primary} />
            </TouchableOpacity>

            {solicitud.estado === 'informacion_adicional' && (
              <TouchableOpacity
                style={styles.respondButton}
                onPress={() => {
                  Alert.alert(
                    'Información Adicional',
                    'Por favor, contacta con el administrador a través del email de soporte para proporcionar la información adicional requerida.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.respondButtonGradient}
                >
                  <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={16} color={colors.headerText} />
                  <Text style={styles.respondButtonText}>Responder</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusHeaderText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusBody: {
    padding: 16,
    gap: 12,
  },
  localNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  localName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  estadoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  estadoBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  notasAdminContainer: {
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: 4,
  },
  notasAdminLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  notasAdminText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  motivoDenegacionContainer: {
    backgroundColor: '#EF4444' + '10',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    gap: 4,
  },
  motivoDenegacionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  motivoDenegacionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingVertical: 12,
    borderRadius: 10,
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  respondButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  respondButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  respondButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
});
