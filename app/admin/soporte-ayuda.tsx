
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/utils/supabase';
import React, { useState, useEffect, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { scaleFontSize } from '@/utils/androidScaling';
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
  Image,
  Platform,
} from 'react-native';

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

interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: 'post' | 'momento' | 'comment';
  content_id: string;
  post_id?: string;
  momento_id?: string;
  comentario_id?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'action_taken' | 'dismissed';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  reporter?: {
    nombre: string;
    email: string;
    username?: string;
  };
  post?: {
    contenido?: string;
    imagenes?: string[];
    autor_id: string;
  };
  momento?: {
    imagen_url: string;
    autor_id: string;
  };
  comentario?: {
    texto: string;
    autor_id: string;
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: Platform.OS === 'android' ? 16 : 20,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
  },
  headerTitle: {
    fontSize: scaleFontSize(28),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Platform.OS === 'android' ? 4 : 8,
  },
  headerSubtitle: {
    fontSize: scaleFontSize(14),
    color: 'rgba(255,255,255,0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
  },
  tab: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
  },
  ticketCard: {
    backgroundColor: colors.card,
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    padding: Platform.OS === 'android' ? 14 : 16,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 8 : 10,
  },
  ticketNumber: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ticketSubject: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.text,
    marginBottom: Platform.OS === 'android' ? 6 : 8,
  },
  ticketDescription: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
    marginBottom: Platform.OS === 'android' ? 8 : 10,
  },
  ticketMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.OS === 'android' ? 6 : 8,
    marginBottom: Platform.OS === 'android' ? 8 : 10,
  },
  badge: {
    paddingHorizontal: Platform.OS === 'android' ? 8 : 10,
    paddingVertical: Platform.OS === 'android' ? 4 : 5,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
  },
  badgeText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: '#fff',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 6 : 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: scaleFontSize(13),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: Platform.OS === 'android' ? 16 : 20,
    padding: Platform.OS === 'android' ? 18 : 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: Platform.OS === 'android' ? 14 : 16,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    fontSize: scaleFontSize(14),
    color: colors.text,
    marginBottom: Platform.OS === 'android' ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: Platform.OS === 'android' ? 80 : 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? 16 : 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'android' ? 4 : 6,
  },
  modalButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  userInfo: {
    fontSize: scaleFontSize(12),
    color: colors.textSecondary,
    marginBottom: Platform.OS === 'android' ? 4 : 6,
  },
});

export default function SoporteAyudaScreen() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'reportes' | 'solicitudes'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [contentReports, setContentReports] = useState<ContentReport[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudAcceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');

  const { user } = useAuth();
  const router = useRouter();

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);

      const [ticketsRes, reportesRes, contentReportsRes, solicitudesRes] = await Promise.all([
        supabase
          .from('support_tickets')
          .select(`
            *,
            user:usuarios!support_tickets_user_id_fkey(id, nombre, email, username)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('reportes')
          .select(`
            *,
            reportador:usuarios!reportes_reportador_id_fkey(nombre, email),
            reportado:usuarios!reportes_reportado_id_fkey(nombre, email),
            local:locales(nombre)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('content_reports')
          .select(`
            *,
            reporter:usuarios!content_reports_reporter_id_fkey(nombre, email, username)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('message_access_requests')
          .select(`
            *,
            user:usuarios!message_access_requests_user_id_fkey(nombre, email)
          `)
          .order('requested_at', { ascending: false })
      ]);

      if (ticketsRes.data) setTickets(ticketsRes.data as any);
      if (reportesRes.data) setReportes(reportesRes.data as any);
      if (contentReportsRes.data) setContentReports(contentReportsRes.data as any);
      if (solicitudesRes.data) setSolicitudes(solicitudesRes.data as any);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleUpdateTicket = useCallback(async (ticketId: string, nuevoEstado: SupportTicket['status']) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
      Alert.alert('Éxito', 'Ticket actualizado');
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo actualizar el ticket');
    }
  }, [cargarDatos]);

  const handleSendResponse = useCallback(async () => {
    if (!selectedTicket || !responseText.trim()) return;

    try {
      const { error } = await supabase.from('ticket_responses').insert({
        ticket_id: selectedTicket.id,
        user_id: user?.id,
        message: responseText,
        is_admin_response: true,
      });

      if (error) throw error;
      Alert.alert('Éxito', 'Respuesta enviada');
      setShowResponseModal(false);
      setResponseText('');
      setSelectedTicket(null);
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo enviar la respuesta');
    }
  }, [selectedTicket, responseText, user, cargarDatos]);

  const handleDeleteTicket = useCallback(async (ticketId: string) => {
    Alert.alert(
      'Eliminar Ticket',
      '¿Estás seguro de eliminar este ticket?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('support_tickets').delete().eq('id', ticketId);
              if (error) throw error;
              Alert.alert('Éxito', 'Ticket eliminado');
              cargarDatos();
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'No se pudo eliminar el ticket');
            }
          },
        },
      ]
    );
  }, [cargarDatos]);

  const handleUpdateReporte = useCallback(async (reporteId: string, nuevoEstado: Reporte['estado']) => {
    try {
      const { error } = await supabase
        .from('reportes')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', reporteId);

      if (error) throw error;
      Alert.alert('Éxito', 'Reporte actualizado');
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo actualizar el reporte');
    }
  }, [cargarDatos]);

  const handleUpdateContentReport = useCallback(async (reportId: string, nuevoEstado: ContentReport['status']) => {
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({ status: nuevoEstado, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', reportId);

      if (error) throw error;
      Alert.alert('Éxito', 'Reporte actualizado');
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo actualizar el reporte');
    }
  }, [user, cargarDatos]);

  const handleDeleteReportedContent = useCallback(async (report: ContentReport) => {
    Alert.alert(
      'Eliminar Contenido',
      '¿Estás seguro de eliminar este contenido reportado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              let error;
              if (report.content_type === 'post' && report.post_id) {
                ({ error } = await supabase.from('publicaciones').delete().eq('id', report.post_id));
              } else if (report.content_type === 'momento' && report.momento_id) {
                ({ error } = await supabase.from('momentos').delete().eq('id', report.momento_id));
              } else if (report.content_type === 'comment' && report.comentario_id) {
                ({ error } = await supabase.from('comentarios').delete().eq('id', report.comentario_id));
              }

              if (error) throw error;
              await handleUpdateContentReport(report.id, 'action_taken');
              Alert.alert('Éxito', 'Contenido eliminado');
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'No se pudo eliminar el contenido');
            }
          },
        },
      ]
    );
  }, [handleUpdateContentReport]);

  const handleViewReportedContent = useCallback((report: ContentReport) => {
    // Implementar navegación al contenido reportado
  }, []);

  const getEstadoBadge = (estado: string) => {
    const colors = {
      open: '#10b981',
      in_progress: '#f59e0b',
      resolved: '#6366f1',
      closed: '#6b7280',
      pendiente: '#f59e0b',
      revisando: '#3b82f6',
      accion_tomada: '#10b981',
      rechazado: '#ef4444',
      pending: '#f59e0b',
      reviewing: '#3b82f6',
      action_taken: '#10b981',
      dismissed: '#6b7280',
    };
    return colors[estado as keyof typeof colors] || '#6b7280';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: '#10b981',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444',
    };
    return colors[priority as keyof typeof colors] || '#6b7280';
  };

  const getCategoryText = (category: string) => {
    const categories: Record<string, string> = {
      technical: 'Técnico',
      billing: 'Facturación',
      account: 'Cuenta',
      feature: 'Funcionalidad',
      other: 'Otro',
    };
    return categories[category] || category;
  };

  const getMotivoText = (motivo: string) => {
    const motivos: Record<string, string> = {
      spam: 'Spam',
      inappropriate: 'Inapropiado',
      harassment: 'Acoso',
      fake: 'Falso',
      other: 'Otro',
    };
    return motivos[motivo] || motivo;
  };

  const getContentTypeText = (type: string) => {
    const types: Record<string, string> = {
      post: 'Publicación',
      momento: 'Momento',
      comment: 'Comentario',
    };
    return types[type] || type;
  };

  const renderTicketsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {tickets.map((ticket) => (
        <View key={ticket.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketNumber}>#{ticket.ticket_number}</Text>
            <View style={[styles.badge, { backgroundColor: getEstadoBadge(ticket.status) }]}>
              <Text style={styles.badgeText}>{ticket.status}</Text>
            </View>
          </View>
          <Text style={styles.ticketSubject}>{ticket.subject}</Text>
          <Text style={styles.ticketDescription} numberOfLines={2}>
            {ticket.description}
          </Text>
          <View style={styles.ticketMeta}>
            <View style={[styles.badge, { backgroundColor: getPriorityBadge(ticket.priority) }]}>
              <Text style={styles.badgeText}>{ticket.priority}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>{getCategoryText(ticket.category)}</Text>
            </View>
          </View>
          {ticket.user && (
            <Text style={styles.userInfo}>
              Usuario: {ticket.user.nombre} ({ticket.user.email})
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.actionButton, { flex: 1 }]}
              onPress={() => {
                setSelectedTicket(ticket);
                setShowResponseModal(true);
              }}
            >
              <Text style={styles.actionButtonText}>Responder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { flex: 1, backgroundColor: colors.success }]}
              onPress={() => handleUpdateTicket(ticket.id, 'resolved')}
            >
              <Text style={styles.actionButtonText}>Resolver</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderReportesTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {contentReports.map((report) => (
        <View key={report.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketNumber}>{getContentTypeText(report.content_type)}</Text>
            <View style={[styles.badge, { backgroundColor: getEstadoBadge(report.status) }]}>
              <Text style={styles.badgeText}>{report.status}</Text>
            </View>
          </View>
          <Text style={styles.ticketSubject}>Motivo: {getMotivoText(report.reason)}</Text>
          {report.description && (
            <Text style={styles.ticketDescription} numberOfLines={2}>
              {report.description}
            </Text>
          )}
          {report.reporter && (
            <Text style={styles.userInfo}>
              Reportado por: {report.reporter.nombre} ({report.reporter.email})
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.actionButton, { flex: 1, backgroundColor: colors.error }]}
              onPress={() => handleDeleteReportedContent(report)}
            >
              <Text style={styles.actionButtonText}>Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { flex: 1, backgroundColor: colors.border }]}
              onPress={() => handleUpdateContentReport(report.id, 'dismissed')}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Descartar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderSolicitudesTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {solicitudes.map((solicitud) => (
        <View key={solicitud.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketNumber}>Solicitud de Acceso</Text>
            <View style={[styles.badge, { backgroundColor: getEstadoBadge(solicitud.status) }]}>
              <Text style={styles.badgeText}>{solicitud.status}</Text>
            </View>
          </View>
          {solicitud.user && (
            <Text style={styles.userInfo}>
              Usuario: {solicitud.user.nombre} ({solicitud.user.email})
            </Text>
          )}
          {solicitud.reason && <Text style={styles.ticketDescription}>{solicitud.reason}</Text>}
          <Text style={styles.userInfo}>
            Solicitado: {new Date(solicitud.requested_at).toLocaleDateString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soporte y Ayuda</Text>
        <Text style={styles.headerSubtitle}>Gestiona tickets y reportes</Text>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
          onPress={() => setActiveTab('tickets')}
        >
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reportes' && styles.activeTab]}
          onPress={() => setActiveTab('reportes')}
        >
          <Text style={[styles.tabText, activeTab === 'reportes' && styles.activeTabText]}>Reportes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'solicitudes' && styles.activeTab]}
          onPress={() => setActiveTab('solicitudes')}
        >
          <Text style={[styles.tabText, activeTab === 'solicitudes' && styles.activeTabText]}>Solicitudes</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'tickets' && renderTicketsTab()}
      {activeTab === 'reportes' && renderReportesTab()}
      {activeTab === 'solicitudes' && renderSolicitudesTab()}

      <Modal visible={showResponseModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Responder Ticket</Text>
            <TextInput
              style={styles.input}
              placeholder="Escribe tu respuesta..."
              placeholderTextColor={colors.textSecondary}
              value={responseText}
              onChangeText={setResponseText}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowResponseModal(false);
                  setResponseText('');
                  setSelectedTicket(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSendResponse}
                disabled={!responseText.trim()}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
