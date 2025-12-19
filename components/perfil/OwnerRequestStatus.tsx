
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface OwnerRequest {
  id: string;
  nombre_local: string;
  estado: 'pendiente' | 'en_revision' | 'informacion_adicional' | 'aprobada' | 'denegada';
  tipo_solicitud: 'reclamar_local' | 'nuevo_local';
  motivo_denegacion?: string;
  notas_admin?: string;
  created_at: string;
  cerrada_por_usuario: boolean;
}

interface OwnerRequestStatusProps {
  userId: string;
}

export default function OwnerRequestStatus({ userId }: OwnerRequestStatusProps) {
  const router = useRouter();
  const [request, setRequest] = useState<OwnerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    loadRequest();

    // Subscribe to changes
    const channel = supabase
      .channel(`owner-request-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_propietario',
          filter: `usuario_id=eq.${userId}`,
        },
        () => {
          console.log('[OwnerRequestStatus] Request changed, reloading...');
          loadRequest();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_propietario')
        .select('*')
        .eq('usuario_id', userId)
        .in('estado', ['pendiente', 'en_revision', 'informacion_adicional', 'aprobada', 'denegada'])
        .eq('cerrada_por_usuario', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[OwnerRequestStatus] Error loading request:', error);
        setLoading(false);
        return;
      }

      setRequest(data);
      setLoading(false);
    } catch (error) {
      console.error('[OwnerRequestStatus] Error:', error);
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!request) return;

    Alert.alert(
      'Cerrar notificación',
      '¿Deseas cerrar esta notificación? Podrás volver a verla en tu historial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar',
          onPress: async () => {
            setClosing(true);
            try {
              const { error } = await supabase
                .from('solicitudes_propietario')
                .update({ 
                  cerrada_por_usuario: true,
                  fecha_cierre: new Date().toISOString(),
                })
                .eq('id', request.id);

              if (error) throw error;

              setRequest(null);
            } catch (error) {
              console.error('[OwnerRequestStatus] Error closing request:', error);
              Alert.alert('Error', 'No se pudo cerrar la notificación');
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = () => {
    if (request?.estado === 'aprobada') {
      router.push('/auth/bienvenida-propietario' as any);
    }
  };

  const handleReapply = () => {
    router.push('/auth/local-ownership-request' as any);
  };

  const handleContactSupport = () => {
    router.push('/soporte/centro-ayuda' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!request) {
    return null;
  }

  const getStatusConfig = () => {
    switch (request.estado) {
      case 'pendiente':
        return {
          color: '#F59E0B',
          icon: 'clock.fill',
          title: 'Solicitud Pendiente',
          message: 'Tu solicitud está en cola de revisión. Te notificaremos cuando sea procesada.',
        };
      case 'en_revision':
        return {
          color: '#3B82F6',
          icon: 'eye.fill',
          title: 'En Revisión',
          message: 'Nuestro equipo está revisando tu solicitud. Pronto tendrás noticias.',
        };
      case 'informacion_adicional':
        return {
          color: '#8B5CF6',
          icon: 'doc.text.fill',
          title: 'Información Adicional Requerida',
          message: request.notas_admin || 'Necesitamos más información para procesar tu solicitud.',
        };
      case 'aprobada':
        return {
          color: '#10B981',
          icon: 'checkmark.circle.fill',
          title: '🎉 ¡Solicitud Aprobada!',
          message: 'Tu solicitud ha sido aprobada. Ahora eres propietario en BarLive.',
        };
      case 'denegada':
        return {
          color: '#EF4444',
          icon: 'xmark.circle.fill',
          title: 'Solicitud Denegada',
          message: request.motivo_denegacion || 'Tu solicitud no pudo ser aprobada en este momento.',
        };
      default:
        return {
          color: colors.textSecondary,
          icon: 'questionmark.circle.fill',
          title: 'Estado Desconocido',
          message: '',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[config.color + '20', config.color + '10']}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '30' }]}>
            <IconSymbol 
              ios_icon_name={config.icon as any} 
              android_material_icon_name="info" 
              size={24} 
              color={config.color} 
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.subtitle}>
              {request.tipo_solicitud === 'reclamar_local' ? 'Reclamar local' : 'Crear nuevo local'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} disabled={closing}>
            {closing ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <IconSymbol 
                ios_icon_name="xmark.circle.fill" 
                android_material_icon_name="cancel" 
                size={24} 
                color={colors.textSecondary} 
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.localName}>{request.nombre_local}</Text>
          <Text style={styles.message}>{config.message}</Text>

          {request.estado === 'aprobada' && (
            <TouchableOpacity style={styles.actionButton} onPress={handleViewDetails}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.actionButtonGradient}
              >
                <IconSymbol ios_icon_name="arrow.right.circle.fill" android_material_icon_name="arrow_forward" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Ver detalles y comenzar</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {request.estado === 'denegada' && (
            <View style={styles.denialActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleReapply}>
                <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Volver a solicitar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleContactSupport}>
                <IconSymbol ios_icon_name="questionmark.circle" android_material_icon_name="help" size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Contactar soporte</Text>
              </TouchableOpacity>
            </View>
          )}

          {request.estado === 'informacion_adicional' && (
            <TouchableOpacity style={styles.actionButton} onPress={handleContactSupport}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.actionButtonGradient}
              >
                <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Proporcionar información</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={14} color={colors.textSecondary} />
          <Text style={styles.footerText}>
            Solicitado el {new Date(request.created_at).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  body: {
    marginBottom: 12,
  },
  localName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  denialActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
