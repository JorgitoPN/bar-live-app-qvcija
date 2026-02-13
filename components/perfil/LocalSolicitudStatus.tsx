
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface SolicitudStatus {
  id: string;
  tipo_solicitud: 'reclamar_local' | 'nuevo_local';
  estado: 'pendiente' | 'en_revision' | 'informacion_adicional' | 'aprobada' | 'denegada';
  created_at: string;
  motivo_denegacion?: string;
  notas_admin?: string;
}

interface Props {
  localId: string;
}

/**
 * ✅ LOCAL SOLICITUD STATUS v1.1 - FIXED NAVIGATION
 * 
 * FIXES v1.1:
 * - ✅ Fixed "Ver Detalles" navigation (now goes to /admin/solicitud-detalle, not /perfil/notificaciones)
 * - ✅ Proper route parameters passing
 * - ✅ Console logs for debugging
 * 
 * Displays ownership request status on local profile pages
 * Shows current status and allows viewing details
 */

export default function LocalSolicitudStatus({ localId }: Props) {
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<SolicitudStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ LINT FIX: Wrap loadSolicitud in useCallback to stabilize dependency
  const loadSolicitud = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_propietario')
        .select('id, tipo_solicitud, estado, created_at, motivo_denegacion, notas_admin')
        .eq('local_id', localId)
        .in('estado', ['pendiente', 'en_revision', 'informacion_adicional'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[LocalSolicitudStatus] Error loading request:', error);
        return;
      }

      setSolicitud(data);
    } catch (error) {
      console.error('[LocalSolicitudStatus] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [localId]);

  useEffect(() => {
    loadSolicitud();

    // Subscribe to changes
    const channel = supabase
      .channel(`local-solicitud-${localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_propietario',
          filter: `local_id=eq.${localId}`,
        },
        () => {
          console.log('[LocalSolicitudStatus] Request changed, reloading...');
          loadSolicitud();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [localId, loadSolicitud]);

  const getEstadoInfo = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return {
          label: 'Solicitud Pendiente',
          icon: 'clock',
          androidIcon: 'schedule',
          color: '#F59E0B',
        };
      case 'en_revision':
        return {
          label: 'En Revisión',
          icon: 'doc.text.magnifyingglass',
          androidIcon: 'search',
          color: '#3B82F6',
        };
      case 'informacion_adicional':
        return {
          label: 'Info. Adicional Requerida',
          icon: 'exclamationmark.circle',
          androidIcon: 'info',
          color: '#8B5CF6',
        };
      default:
        return {
          label: estado,
          icon: 'circle',
          androidIcon: 'circle',
          color: colors.textSecondary,
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

  return (
    <View style={styles.container}>
      <View style={[styles.statusBanner, { backgroundColor: estadoInfo.color + '15', borderLeftColor: estadoInfo.color }]}>
        <View style={[styles.statusIconContainer, { backgroundColor: estadoInfo.color + '20' }]}>
          <IconSymbol
            ios_icon_name={estadoInfo.icon}
            android_material_icon_name={estadoInfo.androidIcon}
            size={20}
            color={estadoInfo.color}
          />
        </View>
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusLabel}>{estadoInfo.label}</Text>
          <Text style={styles.statusDescription}>
            {solicitud.tipo_solicitud === 'reclamar_local' 
              ? 'Solicitud de reclamación en proceso' 
              : 'Solicitud de creación en proceso'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => {
            console.log('[LocalSolicitudStatus v1.1] ✅ FIXED: Navigating to solicitud-detalle:', solicitud.id);
            console.log('[LocalSolicitudStatus v1.1] Route: /admin/solicitud-detalle');
            
            // ✅ FIX v1.1: Navigate to solicitud-detalle instead of notificaciones
            router.push({
              pathname: '/admin/solicitud-detalle',
              params: { id: solicitud.id },
            });
          }}
        >
          <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={estadoInfo.color} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 12,
    alignItems: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewDetailsButton: {
    padding: 8,
  },
});
