
import React, { useEffect, useState } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

interface ContentReport {
  id: string;
  content_type: 'post' | 'comment' | 'momento';
  content_id: string;
  post_id?: string;
  comentario_id?: string;
  momento_id?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'action_taken' | 'dismissed';
  reporter_id: string;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  reporter?: {
    nombre: string;
    email: string;
    avatar?: string;
  };
  content_preview?: string;
  content_author?: {
    nombre: string;
    email: string;
  };
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Acoso',
  inappropriate: 'Contenido inapropiado',
  violence: 'Violencia',
  hate_speech: 'Discurso de odio',
  false_information: 'Información falsa',
  other: 'Otro',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  reviewing: 'En revisión',
  action_taken: 'Acción tomada',
  dismissed: 'Desestimado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  reviewing: '#3B82F6',
  action_taken: '#10B981',
  dismissed: '#6B7280',
};

export default function GestionarReportesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.rol_app === 'admin') {
      loadReports();
    }
  }, [user, filterStatus]);

  const loadReports = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('content_reports')
        .select(`
          *,
          reporter:reporter_id (
            nombre,
            email,
            avatar
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load content previews and author info
      const reportsWithDetails = await Promise.all(
        (data || []).map(async (report) => {
          let contentPreview = '';
          let contentAuthor = null;

          try {
            if (report.content_type === 'post' && report.post_id) {
              const { data: post } = await supabase
                .from('posts')
                .select('contenido, autor_id, usuarios!posts_autor_id_fkey(nombre, email)')
                .eq('id', report.post_id)
                .single();
              
              if (post) {
                contentPreview = post.contenido?.substring(0, 100) || '[Sin contenido]';
                contentAuthor = post.usuarios;
              }
            } else if (report.content_type === 'comment' && report.comentario_id) {
              const { data: comment } = await supabase
                .from('comentarios')
                .select('texto, autor_id, usuarios!comentarios_autor_id_fkey(nombre, email)')
                .eq('id', report.comentario_id)
                .single();
              
              if (comment) {
                contentPreview = comment.texto?.substring(0, 100) || '[Sin contenido]';
                contentAuthor = comment.usuarios;
              }
            } else if (report.content_type === 'momento' && report.momento_id) {
              const { data: momento } = await supabase
                .from('momentos')
                .select('imagen_url, autor_id, usuarios!momentos_autor_id_fkey(nombre, email)')
                .eq('id', report.momento_id)
                .single();
              
              if (momento) {
                contentPreview = '[Momento - Imagen]';
                contentAuthor = momento.usuarios;
              }
            }
          } catch (err) {
            console.error('[GestionarReportes] Error loading content details:', err);
          }

          return {
            ...report,
            content_preview: contentPreview,
            content_author: contentAuthor,
          };
        })
      );

      setReports(reportsWithDetails);
    } catch (error) {
      console.error('[GestionarReportes] Error loading reports:', error);
      Alert.alert('Error', 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const openReportDetails = (report: ContentReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setDetailsModalVisible(true);
  };

  const updateReportStatus = async (status: ContentReport['status']) => {
    if (!selectedReport) return;

    try {
      const { error } = await supabase
        .from('content_reports')
        .update({
          status,
          admin_notes: adminNotes.trim() || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      Alert.alert('✅ Éxito', `Reporte marcado como: ${STATUS_LABELS[status]}`);
      setDetailsModalVisible(false);
      loadReports();
    } catch (error) {
      console.error('[GestionarReportes] Error updating report:', error);
      Alert.alert('Error', 'No se pudo actualizar el reporte');
    }
  };

  const deleteContent = async () => {
    if (!selectedReport) return;

    Alert.alert(
      '⚠️ Eliminar Contenido',
      '¿Estás seguro de que quieres eliminar este contenido? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              let tableName = '';
              let idField = '';

              if (selectedReport.content_type === 'post') {
                tableName = 'posts';
                idField = selectedReport.post_id!;
              } else if (selectedReport.content_type === 'comment') {
                tableName = 'comentarios';
                idField = selectedReport.comentario_id!;
              } else if (selectedReport.content_type === 'momento') {
                tableName = 'momentos';
                idField = selectedReport.momento_id!;
              }

              const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', idField);

              if (error) throw error;

              // Update report status
              await updateReportStatus('action_taken');

              Alert.alert('✅ Éxito', 'Contenido eliminado correctamente');
            } catch (error) {
              console.error('[GestionarReportes] Error deleting content:', error);
              Alert.alert('Error', 'No se pudo eliminar el contenido');
            }
          },
        },
      ]
    );
  };

  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      report.reporter?.nombre?.toLowerCase().includes(query) ||
      report.reporter?.email?.toLowerCase().includes(query) ||
      report.content_author?.nombre?.toLowerCase().includes(query) ||
      report.content_preview?.toLowerCase().includes(query) ||
      REASON_LABELS[report.reason]?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    reviewing: reports.filter((r) => r.status === 'reviewing').length,
    action_taken: reports.filter((r) => r.status === 'action_taken').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando reportes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestionar Reportes</Text>
          <TouchableOpacity onPress={loadReports} style={styles.refreshButton}>
            <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Text style={styles.statNumber}>{stats.reviewing}</Text>
            <Text style={styles.statLabel}>En revisión</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <Text style={styles.statNumber}>{stats.action_taken}</Text>
            <Text style={styles.statLabel}>Acción tomada</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(107, 114, 128, 0.2)' }]}>
            <Text style={styles.statNumber}>{stats.dismissed}</Text>
            <Text style={styles.statLabel}>Desestimados</Text>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar reportes..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'pending', 'reviewing', 'action_taken', 'dismissed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                filterStatus === status && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === status && styles.filterChipTextActive,
                ]}
              >
                {status === 'all' ? 'Todos' : STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reports List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="flag.slash" android_material_icon_name="flag" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No hay reportes</Text>
            <Text style={styles.emptyStateSubtext}>
              {filterStatus !== 'all'
                ? `No hay reportes con estado: ${STATUS_LABELS[filterStatus]}`
                : 'No se han recibido reportes aún'}
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.reportCard}
              onPress={() => openReportDetails(report)}
              activeOpacity={0.7}
            >
              <View style={styles.reportHeader}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[report.status] }]} />
                  <Text style={[styles.statusText, { color: STATUS_COLORS[report.status] }]}>
                    {STATUS_LABELS[report.status]}
                  </Text>
                </View>
                <Text style={styles.reportDate}>
                  {new Date(report.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.reportBody}>
                <View style={styles.reportInfo}>
                  <IconSymbol
                    ios_icon_name={
                      report.content_type === 'post'
                        ? 'photo'
                        : report.content_type === 'comment'
                        ? 'bubble.left'
                        : 'camera'
                    }
                    android_material_icon_name={
                      report.content_type === 'post'
                        ? 'image'
                        : report.content_type === 'comment'
                        ? 'comment'
                        : 'camera_alt'
                    }
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.reportType}>
                    {report.content_type === 'post'
                      ? 'Publicación'
                      : report.content_type === 'comment'
                      ? 'Comentario'
                      : 'Momento'}
                  </Text>
                  <Text style={styles.reportSeparator}>•</Text>
                  <Text style={styles.reportReason}>{REASON_LABELS[report.reason]}</Text>
                </View>

                {report.content_preview && (
                  <Text style={styles.contentPreview} numberOfLines={2}>
                    {report.content_preview}
                  </Text>
                )}

                <View style={styles.reportFooter}>
                  <Text style={styles.reporterInfo}>
                    Reportado por: <Text style={styles.reporterName}>{report.reporter?.nombre}</Text>
                  </Text>
                  {report.content_author && (
                    <Text style={styles.authorInfo}>
                      Autor: <Text style={styles.authorName}>{report.content_author.nombre}</Text>
                    </Text>
                  )}
                </View>
              </View>

              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Report Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDetailsModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Detalles del Reporte</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.modalCloseButton}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.headerText} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedReport && (
                <React.Fragment>
                  {/* Status */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Estado</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedReport.status] + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedReport.status] }]} />
                      <Text style={[styles.statusText, { color: STATUS_COLORS[selectedReport.status] }]}>
                        {STATUS_LABELS[selectedReport.status]}
                      </Text>
                    </View>
                  </View>

                  {/* Content Type & Reason */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Tipo de contenido</Text>
                    <Text style={styles.detailValue}>
                      {selectedReport.content_type === 'post'
                        ? 'Publicación'
                        : selectedReport.content_type === 'comment'
                        ? 'Comentario'
                        : 'Momento'}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Motivo</Text>
                    <Text style={styles.detailValue}>{REASON_LABELS[selectedReport.reason]}</Text>
                  </View>

                  {/* Description */}
                  {selectedReport.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Descripción del reporte</Text>
                      <Text style={styles.detailValue}>{selectedReport.description}</Text>
                    </View>
                  )}

                  {/* Content Preview */}
                  {selectedReport.content_preview && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Vista previa del contenido</Text>
                      <View style={styles.contentPreviewBox}>
                        <Text style={styles.contentPreviewText}>{selectedReport.content_preview}</Text>
                      </View>
                    </View>
                  )}

                  {/* Reporter Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reportado por</Text>
                    <Text style={styles.detailValue}>{selectedReport.reporter?.nombre}</Text>
                    <Text style={styles.detailSubvalue}>{selectedReport.reporter?.email}</Text>
                  </View>

                  {/* Content Author */}
                  {selectedReport.content_author && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Autor del contenido</Text>
                      <Text style={styles.detailValue}>{selectedReport.content_author.nombre}</Text>
                      <Text style={styles.detailSubvalue}>{selectedReport.content_author.email}</Text>
                    </View>
                  )}

                  {/* Admin Notes */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Notas del administrador</Text>
                    <TextInput
                      style={styles.adminNotesInput}
                      placeholder="Añadir notas sobre este reporte..."
                      placeholderTextColor={colors.textSecondary}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      multiline
                      maxLength={500}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsSection}>
                    <Text style={styles.detailLabel}>Acciones</Text>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonReviewing]}
                      onPress={() => updateReportStatus('reviewing')}
                    >
                      <IconSymbol ios_icon_name="eye" android_material_icon_name="visibility" size={20} color={colors.white} />
                      <Text style={styles.actionButtonText}>Marcar en revisión</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonDismiss]}
                      onPress={() => updateReportStatus('dismissed')}
                    >
                      <IconSymbol ios_icon_name="xmark.circle" android_material_icon_name="cancel" size={20} color={colors.white} />
                      <Text style={styles.actionButtonText}>Desestimar reporte</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonDelete]}
                      onPress={deleteContent}
                    >
                      <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color={colors.white} />
                      <Text style={styles.actionButtonText}>Eliminar contenido</Text>
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  statsScroll: {
    marginTop: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statLabel: {
    fontSize: 12,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    marginLeft: 12,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    ...commonStyles.shadow,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reportDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reportBody: {
    flex: 1,
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  reportSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 8,
  },
  reportReason: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  contentPreview: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  reportFooter: {
    marginTop: 8,
  },
  reporterInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  reporterName: {
    fontWeight: '600',
    color: colors.text,
  },
  authorInfo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  authorName: {
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  detailSubvalue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  contentPreviewBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  contentPreviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  adminNotesInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionsSection: {
    marginTop: 8,
    marginBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonReviewing: {
    backgroundColor: '#3B82F6',
  },
  actionButtonDismiss: {
    backgroundColor: '#6B7280',
  },
  actionButtonDelete: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
