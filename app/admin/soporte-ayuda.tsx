
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  admin_notes?: string;
  assigned_to?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    nombre: string;
    email: string;
    username?: string;
  };
  responses?: TicketResponse[];
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  user?: {
    nombre: string;
    email: string;
  };
}

interface Reporte {
  id: string;
  local_id: string;
  reportador_id: string;
  reportado_id: string;
  mensaje_id?: string;
  motivo: string;
  descripcion?: string;
  estado: 'pendiente' | 'revisando' | 'accion_tomada' | 'rechazado';
  notas_admin?: string;
  revisado_por?: string;
  created_at: string;
  updated_at: string;
  reportador?: {
    nombre: string;
    email: string;
  };
  reportado?: {
    nombre: string;
    email: string;
  };
  local?: {
    nombre: string;
  };
}

interface SolicitudAcceso {
  id: string;
  admin_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'denied' | 'revoked';
  reason?: string;
  requested_at: string;
  responded_at?: string;
  expires_at?: string;
  user?: {
    nombre: string;
    email: string;
  };
}

export default function SoporteAyudaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tickets' | 'reportes' | 'solicitudes'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudAcceso[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const cargarTickets = useCallback(async () => {
    try {
      console.log('[SoporteAyuda] ✅ Cargando tickets...');
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user:usuarios!support_tickets_user_id_fkey(
            id,
            nombre,
            email,
            username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      console.log('[SoporteAyuda] ✅ Tickets cargados:', data?.length || 0);
      setTickets(data || []);
    } catch (error) {
      console.error('[SoporteAyuda] Error cargando tickets:', error);
      Alert.alert('Error', 'No se pudieron cargar los tickets');
    }
  }, []);

  const cargarReportes = useCallback(async () => {
    try {
      console.log('[SoporteAyuda] ✅ Cargando reportes...');
      const { data, error } = await supabase
        .from('sala_virtual_reportes')
        .select(`
          *,
          reportador:reportador_id(nombre, email),
          reportado:reportado_id(nombre, email),
          local:local_id(nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('[SoporteAyuda] ✅ Reportes cargados:', data?.length || 0);
      setReportes(data || []);
    } catch (error) {
      console.error('[SoporteAyuda] Error cargando reportes:', error);
      Alert.alert('Error', 'No se pudieron cargar los reportes');
    }
  }, []);

  const cargarSolicitudes = useCallback(async () => {
    try {
      console.log('[SoporteAyuda] ✅ Cargando solicitudes de acceso...');
      const { data, error } = await supabase
        .from('admin_message_access_requests')
        .select(`
          *,
          user:user_id(nombre, email)
        `)
        .order('requested_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('[SoporteAyuda] ✅ Solicitudes cargadas:', data?.length || 0);
      setSolicitudes(data || []);
    } catch (error) {
      console.error('[SoporteAyuda] Error cargando solicitudes:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([cargarTickets(), cargarReportes(), cargarSolicitudes()]);
    setLoading(false);
  }, [cargarTickets, cargarReportes, cargarSolicitudes]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleUpdateTicket = async (ticketId: string, nuevoEstado: SupportTicket['status']) => {
    setUpdating(true);
    try {
      const updateData: any = {
        status: nuevoEstado,
        admin_notes: adminNotes.trim() || null,
        assigned_to: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (nuevoEstado === 'resolved' || nuevoEstado === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      Alert.alert('✅ Éxito', 'Ticket actualizado correctamente');
      setShowDetailModal(false);
      setSelectedTicket(null);
      setAdminNotes('');
      await cargarTickets();
    } catch (error) {
      console.error('[SoporteAyuda] Error actualizando ticket:', error);
      Alert.alert('Error', 'No se pudo actualizar el ticket');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseMessage.trim()) {
      Alert.alert('Error', 'Escribe un mensaje de respuesta');
      return;
    }

    setSendingEmail(true);
    try {
      // Create response record
      const { error: responseError } = await supabase
        .from('support_ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: responseMessage.trim(),
          is_admin_response: true,
        });

      if (responseError) throw responseError;

      // Send email to user
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-support-ticket-email', {
        body: {
          ticketId: selectedTicket.id,
          isNewTicket: false,
          responseMessage: responseMessage.trim(),
        },
      });

      if (emailError) {
        console.error('[SoporteAyuda] Email error:', emailError);
        Alert.alert('Advertencia', 'Respuesta guardada pero el email no se pudo enviar');
      } else {
        Alert.alert('✅ Éxito', 'Respuesta enviada por email al usuario');
      }

      setResponseMessage('');
      await cargarTickets();
    } catch (error) {
      console.error('[SoporteAyuda] Error enviando respuesta:', error);
      Alert.alert('Error', 'No se pudo enviar la respuesta');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    Alert.alert(
      'Eliminar Ticket',
      '¿Estás seguro de que quieres eliminar este ticket? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('support_tickets')
                .delete()
                .eq('id', ticketId);

              if (error) throw error;

              Alert.alert('✅ Éxito', 'Ticket eliminado correctamente');
              setShowDetailModal(false);
              setSelectedTicket(null);
              await cargarTickets();
            } catch (error) {
              console.error('[SoporteAyuda] Error eliminando ticket:', error);
              Alert.alert('Error', 'No se pudo eliminar el ticket');
            }
          },
        },
      ]
    );
  };

  const handleUpdateReporte = async (reporteId: string, nuevoEstado: Reporte['estado']) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('sala_virtual_reportes')
        .update({
          estado: nuevoEstado,
          notas_admin: adminNotes.trim() || null,
          revisado_por: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reporteId);

      if (error) throw error;

      Alert.alert('✅ Éxito', 'Reporte actualizado correctamente');
      setShowDetailModal(false);
      setSelectedReporte(null);
      setAdminNotes('');
      await cargarReportes();
    } catch (error) {
      console.error('[SoporteAyuda] Error actualizando reporte:', error);
      Alert.alert('Error', 'No se pudo actualizar el reporte');
    } finally {
      setUpdating(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      open: { color: '#F59E0B', text: 'Abierto' },
      in_progress: { color: '#3B82F6', text: 'En Progreso' },
      resolved: { color: '#10B981', text: 'Resuelto' },
      closed: { color: '#6B7280', text: 'Cerrado' },
      pendiente: { color: '#F59E0B', text: 'Pendiente' },
      revisando: { color: '#3B82F6', text: 'Revisando' },
      accion_tomada: { color: '#10B981', text: 'Acción Tomada' },
      rechazado: { color: '#EF4444', text: 'Rechazado' },
      pending: { color: '#F59E0B', text: 'Pendiente' },
      approved: { color: '#10B981', text: 'Aprobado' },
      denied: { color: '#EF4444', text: 'Denegado' },
      revoked: { color: '#6B7280', text: 'Revocado' },
    };

    const badge = badges[estado] || badges.open;

    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      low: { color: '#10B981', text: 'Baja' },
      normal: { color: '#3B82F6', text: 'Normal' },
      high: { color: '#F59E0B', text: 'Alta' },
      urgent: { color: '#EF4444', text: 'Urgente' },
    };

    const badge = badges[priority] || badges.normal;

    return (
      <View style={[styles.priorityBadge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.priorityText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const getCategoryText = (category: string) => {
    const categories: Record<string, string> = {
      bug: 'Error técnico',
      account: 'Problema con cuenta',
      payment: 'Problema de pago',
      content: 'Contenido inapropiado',
      feature: 'Sugerencia de mejora',
      other: 'Otro',
    };
    return categories[category] || category;
  };

  const getMotivoText = (motivo: string) => {
    const motivos: Record<string, string> = {
      spam: 'Spam',
      acoso: 'Acoso',
      contenido_ofensivo: 'Contenido Ofensivo',
      comportamiento_inapropiado: 'Comportamiento Inapropiado',
      suplantacion: 'Suplantación',
      otro: 'Otro',
    };
    return motivos[motivo] || motivo;
  };

  const renderTicketsTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
            {tickets.filter(t => t.status === 'open').length}
          </Text>
          <Text style={styles.statLabel}>Abiertos</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
            {tickets.filter(t => t.status === 'in_progress').length}
          </Text>
          <Text style={styles.statLabel}>En Progreso</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {tickets.filter(t => t.status === 'resolved').length}
          </Text>
          <Text style={styles.statLabel}>Resueltos</Text>
        </View>
      </View>

      {tickets.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="ticket.fill" android_material_icon_name="confirmation_number" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay tickets de soporte</Text>
        </View>
      ) : (
        <React.Fragment>
          {tickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={styles.ticketCard}
              onPress={() => {
                setSelectedTicket(ticket);
                setAdminNotes(ticket.admin_notes || '');
                setShowDetailModal(true);
              }}
            >
              <View style={styles.ticketHeader}>
                <View style={styles.ticketHeaderLeft}>
                  <View style={styles.ticketNumberRow}>
                    <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
                    {getPriorityBadge(ticket.priority)}
                  </View>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <Text style={styles.ticketCategory}>{getCategoryText(ticket.category)}</Text>
                </View>
                {getEstadoBadge(ticket.status)}
              </View>

              <View style={styles.ticketBody}>
                <View style={styles.ticketRow}>
                  <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={16} color={colors.textSecondary} />
                  <Text style={styles.ticketText}>
                    {ticket.user?.nombre || 'Usuario desconocido'} (@{ticket.user?.username || 'sin-username'})
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={16} color={colors.textSecondary} />
                  <Text style={styles.ticketText}>
                    {ticket.user?.email || 'Email desconocido'}
                  </Text>
                </View>
                <Text style={styles.ticketDescription} numberOfLines={2}>
                  {ticket.description}
                </Text>
              </View>

              <View style={styles.ticketFooter}>
                <Text style={styles.ticketDate}>
                  {new Date(ticket.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  );

  const renderReportesTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
            {reportes.filter(r => r.estado === 'pendiente').length}
          </Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
            {reportes.filter(r => r.estado === 'revisando').length}
          </Text>
          <Text style={styles.statLabel}>En Revisión</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {reportes.filter(r => r.estado === 'accion_tomada').length}
          </Text>
          <Text style={styles.statLabel}>Resueltos</Text>
        </View>
      </View>

      {reportes.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="checkmark.shield.fill" android_material_icon_name="verified_user" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay reportes</Text>
        </View>
      ) : (
        <React.Fragment>
          {reportes.map((reporte) => (
            <TouchableOpacity
              key={reporte.id}
              style={styles.reporteCard}
              onPress={() => {
                setSelectedReporte(reporte);
                setAdminNotes(reporte.notas_admin || '');
                setShowDetailModal(true);
              }}
            >
              <View style={styles.reporteHeader}>
                <View style={styles.reporteHeaderLeft}>
                  <Text style={styles.reporteMotivo}>{getMotivoText(reporte.motivo)}</Text>
                  <Text style={styles.reporteLocal}>{reporte.local?.nombre || 'Local desconocido'}</Text>
                </View>
                {getEstadoBadge(reporte.estado)}
              </View>

              <View style={styles.reporteBody}>
                <View style={styles.reporteRow}>
                  <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={16} color={colors.textSecondary} />
                  <Text style={styles.reporteText}>
                    Reportado por: {reporte.reportador?.nombre || 'Usuario desconocido'}
                  </Text>
                </View>
                <View style={styles.reporteRow}>
                  <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={16} color={colors.textSecondary} />
                  <Text style={styles.reporteText}>
                    Usuario reportado: {reporte.reportado?.nombre || 'Usuario desconocido'}
                  </Text>
                </View>
                {reporte.descripcion && (
                  <Text style={styles.reporteDescripcion} numberOfLines={2}>
                    {reporte.descripcion}
                  </Text>
                )}
              </View>

              <View style={styles.reporteFooter}>
                <Text style={styles.reporteDate}>
                  {new Date(reporte.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  );

  const renderSolicitudesTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
            {solicitudes.filter(s => s.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {solicitudes.filter(s => s.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Aprobadas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>
            {solicitudes.filter(s => s.status === 'denied').length}
          </Text>
          <Text style={styles.statLabel}>Denegadas</Text>
        </View>
      </View>

      {solicitudes.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="mail" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay solicitudes de acceso</Text>
        </View>
      ) : (
        <React.Fragment>
          {solicitudes.map((solicitud) => (
            <View key={solicitud.id} style={styles.solicitudCard}>
              <View style={styles.solicitudHeader}>
                <View style={styles.solicitudHeaderLeft}>
                  <Text style={styles.solicitudUser}>{solicitud.user?.nombre || 'Usuario desconocido'}</Text>
                  <Text style={styles.solicitudEmail}>{solicitud.user?.email || 'Email desconocido'}</Text>
                </View>
                {getEstadoBadge(solicitud.status)}
              </View>

              {solicitud.reason && (
                <View style={styles.solicitudBody}>
                  <Text style={styles.solicitudReason}>{solicitud.reason}</Text>
                </View>
              )}

              <View style={styles.solicitudFooter}>
                <Text style={styles.solicitudDate}>
                  Solicitado: {new Date(solicitud.requested_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                {solicitud.responded_at && (
                  <Text style={styles.solicitudDate}>
                    Respondido: {new Date(solicitud.responded_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Soporte y Ayuda</Text>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Soporte y Ayuda</Text>
          <Text style={styles.headerSubtitle}>Gestiona tickets y reportes</Text>
        </View>
        <TouchableOpacity onPress={cargarDatos}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.tabActive]}
          onPress={() => setActiveTab('tickets')}
        >
          <IconSymbol
            ios_icon_name="ticket.fill"
            android_material_icon_name="confirmation_number"
            size={20}
            color={activeTab === 'tickets' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.tabTextActive]}>
            Tickets ({tickets.filter(t => t.status === 'open').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reportes' && styles.tabActive]}
          onPress={() => setActiveTab('reportes')}
        >
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={20}
            color={activeTab === 'reportes' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'reportes' && styles.tabTextActive]}>
            Reportes ({reportes.filter(r => r.estado === 'pendiente').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'solicitudes' && styles.tabActive]}
          onPress={() => setActiveTab('solicitudes')}
        >
          <IconSymbol
            ios_icon_name="envelope.fill"
            android_material_icon_name="mail"
            size={20}
            color={activeTab === 'solicitudes' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'solicitudes' && styles.tabTextActive]}>
            Solicitudes ({solicitudes.filter(s => s.status === 'pending').length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'tickets' && renderTicketsTab()}
      {activeTab === 'reportes' && renderReportesTab()}
      {activeTab === 'solicitudes' && renderSolicitudesTab()}

      {/* Ticket Detail Modal */}
      <Modal
        visible={showDetailModal && selectedTicket !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedTicket(null);
          setSelectedReporte(null);
        }}
      >
        <Pressable style={styles.modalOverlay} onPress={() => {
          setShowDetailModal(false);
          setSelectedTicket(null);
          setSelectedReporte(null);
        }}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTicket ? `Ticket ${selectedTicket.ticket_number}` : 'Detalle del Reporte'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowDetailModal(false);
                setSelectedTicket(null);
                setSelectedReporte(null);
              }}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Usuario:</Text>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.detailValue}>
                      {selectedTicket.user?.nombre} (@{selectedTicket.user?.username || 'sin-username'})
                    </Text>
                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => {
                        if (selectedTicket.user?.username) {
                          router.push(`/perfil/usuario?username=${selectedTicket.user.username}`);
                          setShowDetailModal(false);
                        }
                      }}
                    >
                      <IconSymbol ios_icon_name="arrow.up.right.square.fill" android_material_icon_name="open_in_new" size={18} color={colors.primary} />
                      <Text style={styles.linkButtonText}>Ver Perfil</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedTicket.user?.email) {
                        Linking.openURL(`mailto:${selectedTicket.user.email}`);
                      }
                    }}
                  >
                    <Text style={[styles.detailValue, { color: colors.primary }]}>
                      {selectedTicket.user?.email}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Asunto:</Text>
                  <Text style={styles.detailValue}>{selectedTicket.subject}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Descripción:</Text>
                  <Text style={styles.detailValue}>{selectedTicket.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Categoría:</Text>
                  <Text style={styles.detailValue}>{getCategoryText(selectedTicket.category)}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Prioridad:</Text>
                  {getPriorityBadge(selectedTicket.priority)}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Estado actual:</Text>
                  {getEstadoBadge(selectedTicket.status)}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Responder por Email:</Text>
                  <TextInput
                    style={styles.textArea}
                    value={responseMessage}
                    onChangeText={setResponseMessage}
                    placeholder="Escribe tu respuesta al usuario..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.sendEmailButton, (sendingEmail || !responseMessage.trim()) && styles.sendEmailButtonDisabled]}
                    onPress={handleSendResponse}
                    disabled={sendingEmail || !responseMessage.trim()}
                  >
                    {sendingEmail ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={18} color={colors.white} />
                        <Text style={styles.sendEmailButtonText}>Enviar Respuesta por Email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notas del Administrador (internas):</Text>
                  <TextInput
                    style={styles.textArea}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholder="Añade notas internas sobre la resolución..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleUpdateTicket(selectedTicket.id, 'in_progress')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Marcar en Progreso</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleUpdateTicket(selectedTicket.id, 'resolved')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Marcar Resuelto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
                    onPress={() => handleUpdateTicket(selectedTicket.id, 'closed')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Cerrar Ticket</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleDeleteTicket(selectedTicket.id)}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Eliminar Ticket</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {selectedReporte && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Motivo:</Text>
                  <Text style={styles.detailValue}>{getMotivoText(selectedReporte.motivo)}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Descripción:</Text>
                  <Text style={styles.detailValue}>{selectedReporte.descripcion || 'Sin descripción'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Reportado por:</Text>
                  <Text style={styles.detailValue}>
                    {selectedReporte.reportador?.nombre} ({selectedReporte.reportador?.email})
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Usuario reportado:</Text>
                  <Text style={styles.detailValue}>
                    {selectedReporte.reportado?.nombre} ({selectedReporte.reportado?.email})
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Local:</Text>
                  <Text style={styles.detailValue}>{selectedReporte.local?.nombre || 'Desconocido'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Estado actual:</Text>
                  {getEstadoBadge(selectedReporte.estado)}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notas del Administrador:</Text>
                  <TextInput
                    style={styles.textArea}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholder="Añade notas sobre la resolución..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleUpdateReporte(selectedReporte.id, 'revisando')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Marcar en Revisión</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleUpdateReporte(selectedReporte.id, 'accion_tomada')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Acción Tomada</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleUpdateReporte(selectedReporte.id, 'rechazado')}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
              setShowDetailModal(false);
              setSelectedTicket(null);
              setSelectedReporte(null);
            }}>
              <Text style={styles.modalCancelText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  tabContentContainer: {
    padding: 16,
    paddingBottom: 100,
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  ticketCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketHeaderLeft: {
    flex: 1,
  },
  ticketNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ticketNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  ticketCategory: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketBody: {
    gap: 8,
    marginBottom: 12,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  ticketDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  ticketDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reporteCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  reporteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reporteHeaderLeft: {
    flex: 1,
  },
  reporteMotivo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  reporteLocal: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  reporteBody: {
    gap: 8,
    marginBottom: 12,
  },
  reporteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reporteText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  reporteDescripcion: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  reporteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  reporteDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  solicitudCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  solicitudHeaderLeft: {
    flex: 1,
  },
  solicitudUser: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  solicitudEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  solicitudBody: {
    marginBottom: 12,
  },
  solicitudReason: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
  },
  solicitudFooter: {
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  solicitudDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  modalScrollView: {
    maxHeight: 500,
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: colors.text,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 100,
  },
  sendEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  sendEmailButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  sendEmailButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
