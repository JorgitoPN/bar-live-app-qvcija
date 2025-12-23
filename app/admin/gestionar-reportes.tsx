
import React, { useEffect, useState, useCallback } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const { width } = Dimensions.get('window');

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
    id: string;
    nombre: string;
    email: string;
    avatar?: string;
    perfil_privado?: boolean;
  };
  content_preview?: string;
  content_image?: string;
  content_author?: {
    id: string;
    nombre: string;
    email: string;
    avatar?: string;
    perfil_privado?: boolean;
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

const REASON_COLORS: Record<string, string> = {
  spam: '#F59E0B',
  harassment: '#EF4444',
  inappropriate: '#F97316',
  violence: '#DC2626',
  hate_speech: '#991B1B',
  false_information: '#EA580C',
  other: '#6B7280',
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
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // ✅ FIXED: Memoize loadReports to prevent infinite loop
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('content_reports')
        .select(`
          *,
          reporter:reporter_id (
            id,
            nombre,
            email,
            avatar,
            perfil_privado
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterType !== 'all') {
        query = query.eq('content_type', filterType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[GestionarReportes] Error loading reports:', error);
        throw error;
      }

      // Load content previews, images, and author info
      const reportsWithDetails = await Promise.all(
        (data || []).map(async (report) => {
          let contentPreview = '';
          let contentImage = '';
          let contentAuthor = null;

          try {
            if (report.content_type === 'post' && report.post_id) {
              const { data: post } = await supabase
                .from('posts')
                .select('contenido, imagenes, imagen, autor_id, usuarios!posts_autor_id_fkey(id, nombre, email, avatar, perfil_privado)')
                .eq('id', report.post_id)
                .single();
              
              if (post) {
                contentPreview = post.contenido?.substring(0, 150) || '[Sin contenido]';
                if (post.imagenes && post.imagenes.length > 0) {
                  contentImage = post.imagenes[0];
                } else if (post.imagen) {
                  contentImage = post.imagen;
                }
                contentAuthor = post.usuarios;
              }
            } else if (report.content_type === 'comment' && report.comentario_id) {
              const { data: comment } = await supabase
                .from('comentarios')
                .select('texto, imagenes, autor_id, usuarios!comentarios_autor_id_fkey(id, nombre, email, avatar, perfil_privado)')
                .eq('id', report.comentario_id)
                .single();
              
              if (comment) {
                contentPreview = comment.texto?.substring(0, 150) || '[Sin contenido]';
                if (comment.imagenes && comment.imagenes.length > 0) {
                  contentImage = comment.imagenes[0];
                }
                contentAuthor = comment.usuarios;
              }
            } else if (report.content_type === 'momento' && report.momento_id) {
              const { data: momento } = await supabase
                .from('momentos')
                .select('imagen_url, autor_id, usuarios!momentos_autor_id_fkey(id, nombre, email, avatar, perfil_privado)')
                .eq('id', report.momento_id)
                .single();
              
              if (momento) {
                contentPreview = '[Momento - Contenido visual]';
                contentImage = momento.imagen_url;
                contentAuthor = momento.usuarios;
              }
            }
          } catch (err) {
            console.error('[GestionarReportes] Error loading content details:', err);
          }

          return {
            ...report,
            content_preview: contentPreview,
            content_image: contentImage,
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
  }, [filterStatus, filterType]); // ✅ FIXED: Only include filter dependencies

  // ✅ FIXED: Separate useEffect with proper dependencies
  useEffect(() => {
    if (user?.rol_app === 'admin') {
      loadReports();
    }
  }, [user?.rol_app, filterStatus, filterType, loadReports]);

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

      if (error) {
        console.error('[GestionarReportes] Error updating report:', error);
        throw error;
      }

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

              console.log('[GestionarReportes] Deleting content:', { tableName, idField });

              // Delete the content
              const { error: deleteError } = await supabase
                .from(tableName)
                .delete()
                .eq('id', idField);

              if (deleteError) {
                console.error('[GestionarReportes] Error deleting content:', deleteError);
                throw deleteError;
              }

              console.log('[GestionarReportes] Content deleted successfully');

              // Send notification to content author
              if (selectedReport.content_author) {
                const { error: notifError } = await supabase.from('notificaciones').insert({
                  usuario_id: selectedReport.content_author.id,
                  tipo: 'sistema',
                  titulo: '🗑️ Contenido eliminado',
                  mensaje: `Tu ${selectedReport.content_type === 'post' ? 'publicación' : selectedReport.content_type === 'comment' ? 'comentario' : 'momento'} ha sido eliminado por violar nuestras normas de la comunidad. Motivo: ${REASON_LABELS[selectedReport.reason]}.`,
                });

                if (notifError) {
                  console.error('[GestionarReportes] Error sending notification:', notifError);
                }
              }

              // Delete the report
              const { error: reportDeleteError } = await supabase
                .from('content_reports')
                .delete()
                .eq('id', selectedReport.id);

              if (reportDeleteError) {
                console.error('[GestionarReportes] Error deleting report:', reportDeleteError);
                // Don't throw here, content is already deleted
              }

              Alert.alert('✅ Éxito', 'Contenido eliminado correctamente');
              setDetailsModalVisible(false);
              loadReports();
            } catch (error: any) {
              console.error('[GestionarReportes] Error in deleteContent:', error);
              Alert.alert('Error', `No se pudo eliminar el contenido: ${error.message || 'Error desconocido'}`);
            }
          },
        },
      ]
    );
  };

  const sendWarning = async () => {
    if (!selectedReport || !selectedReport.content_author) return;

    Alert.alert(
      '⚠️ Enviar Aviso',
      `¿Enviar un aviso a ${selectedReport.content_author.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              // Create notification for the user
              const { error: notifError } = await supabase.from('notificaciones').insert({
                usuario_id: selectedReport.content_author!.id,
                tipo: 'sistema',
                titulo: '⚠️ Aviso de moderación',
                mensaje: `Tu contenido ha sido reportado por ${REASON_LABELS[selectedReport.reason].toLowerCase()}. Por favor, revisa nuestras normas de la comunidad.`,
              });

              if (notifError) {
                console.error('[GestionarReportes] Error sending notification:', notifError);
                throw notifError;
              }

              // Create penalty record
              const { error: penaltyError } = await supabase.from('user_penalties').insert({
                admin_id: user?.id,
                target_user_id: selectedReport.content_author!.id,
                type_of_penalty: 'aviso',
                reason: `Contenido reportado: ${REASON_LABELS[selectedReport.reason]}`,
                description: selectedReport.description || 'Sin descripción adicional',
              });

              if (penaltyError) {
                console.error('[GestionarReportes] Error creating penalty:', penaltyError);
                throw penaltyError;
              }

              // Delete the report after action
              const { error: deleteError } = await supabase
                .from('content_reports')
                .delete()
                .eq('id', selectedReport.id);

              if (deleteError) {
                console.error('[GestionarReportes] Error deleting report:', deleteError);
                // Don't throw, action was successful
              }

              Alert.alert('✅ Éxito', 'Aviso enviado al usuario');
              setDetailsModalVisible(false);
              loadReports();
            } catch (error: any) {
              console.error('[GestionarReportes] Error sending warning:', error);
              Alert.alert('Error', `No se pudo enviar el aviso: ${error.message || 'Error desconocido'}`);
            }
          },
        },
      ]
    );
  };

  const blockUserTemporarily = async () => {
    if (!selectedReport || !selectedReport.content_author) return;

    Alert.alert(
      '🚫 Bloquear Temporalmente',
      `¿Bloquear a ${selectedReport.content_author.nombre} por 24 horas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              const expiresAt = new Date();
              expiresAt.setHours(expiresAt.getHours() + 24);

              const { error: penaltyError } = await supabase.from('user_penalties').insert({
                admin_id: user?.id,
                target_user_id: selectedReport.content_author!.id,
                type_of_penalty: 'bloqueo',
                reason: `Contenido reportado: ${REASON_LABELS[selectedReport.reason]}`,
                description: 'Bloqueo temporal de 24 horas',
                duration_hours: 24,
                expires_at: expiresAt.toISOString(),
              });

              if (penaltyError) {
                console.error('[GestionarReportes] Error creating penalty:', penaltyError);
                throw penaltyError;
              }

              const { error: notifError } = await supabase.from('notificaciones').insert({
                usuario_id: selectedReport.content_author!.id,
                tipo: 'sistema',
                titulo: '🚫 Cuenta bloqueada temporalmente',
                mensaje: 'Tu cuenta ha sido bloqueada por 24 horas debido a violaciones de las normas de la comunidad.',
              });

              if (notifError) {
                console.error('[GestionarReportes] Error sending notification:', notifError);
              }

              // Delete the report after action
              const { error: deleteError } = await supabase
                .from('content_reports')
                .delete()
                .eq('id', selectedReport.id);

              if (deleteError) {
                console.error('[GestionarReportes] Error deleting report:', deleteError);
              }

              Alert.alert('✅ Éxito', 'Usuario bloqueado temporalmente');
              setDetailsModalVisible(false);
              loadReports();
            } catch (error: any) {
              console.error('[GestionarReportes] Error blocking user:', error);
              Alert.alert('Error', `No se pudo bloquear al usuario: ${error.message || 'Error desconocido'}`);
            }
          },
        },
      ]
    );
  };

  const banUserPermanently = async () => {
    if (!selectedReport || !selectedReport.content_author) return;

    Alert.alert(
      '⛔ Banear Permanentemente',
      `¿Estás seguro de que quieres banear permanentemente a ${selectedReport.content_author.nombre}? Esta acción es irreversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Banear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: penaltyError } = await supabase.from('user_penalties').insert({
                admin_id: user?.id,
                target_user_id: selectedReport.content_author!.id,
                type_of_penalty: 'baneo',
                reason: `Contenido reportado: ${REASON_LABELS[selectedReport.reason]}`,
                description: 'Baneo permanente por violaciones graves',
              });

              if (penaltyError) {
                console.error('[GestionarReportes] Error creating penalty:', penaltyError);
                throw penaltyError;
              }

              // Deactivate user account
              const { error: updateError } = await supabase
                .from('usuarios')
                .update({ activo: false })
                .eq('id', selectedReport.content_author!.id);

              if (updateError) {
                console.error('[GestionarReportes] Error deactivating user:', updateError);
                throw updateError;
              }

              const { error: notifError } = await supabase.from('notificaciones').insert({
                usuario_id: selectedReport.content_author!.id,
                tipo: 'sistema',
                titulo: '⛔ Cuenta baneada',
                mensaje: 'Tu cuenta ha sido baneada permanentemente por violaciones graves de las normas de la comunidad.',
              });

              if (notifError) {
                console.error('[GestionarReportes] Error sending notification:', notifError);
              }

              // Delete the report after action
              const { error: deleteError } = await supabase
                .from('content_reports')
                .delete()
                .eq('id', selectedReport.id);

              if (deleteError) {
                console.error('[GestionarReportes] Error deleting report:', deleteError);
              }

              Alert.alert('✅ Éxito', 'Usuario baneado permanentemente');
              setDetailsModalVisible(false);
              loadReports();
            } catch (error: any) {
              console.error('[GestionarReportes] Error banning user:', error);
              Alert.alert('Error', `No se pudo banear al usuario: ${error.message || 'Error desconocido'}`);
            }
          },
        },
      ]
    );
  };

  const keepContent = async () => {
    if (!selectedReport) return;

    Alert.alert(
      '✅ Mantener Contenido',
      '¿Desestimar este reporte y mantener el contenido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mantener',
          onPress: async () => {
            try {
              // Delete the report
              const { error } = await supabase
                .from('content_reports')
                .delete()
                .eq('id', selectedReport.id);

              if (error) {
                console.error('[GestionarReportes] Error deleting report:', error);
                throw error;
              }

              Alert.alert('✅ Éxito', 'Reporte desestimado');
              setDetailsModalVisible(false);
              loadReports();
            } catch (error: any) {
              console.error('[GestionarReportes] Error dismissing report:', error);
              Alert.alert('Error', `No se pudo desestimar el reporte: ${error.message || 'Error desconocido'}`);
            }
          },
        },
      ]
    );
  };

  const deleteReport = async (reportId: string) => {
    Alert.alert(
      '🗑️ Eliminar Reporte',
      '¿Estás seguro de que quieres eliminar este reporte?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('content_reports')
                .delete()
                .eq('id', reportId);

              if (error) {
                console.error('[GestionarReportes] Error deleting report:', error);
                throw error;
              }

              Alert.alert('✅ Éxito', 'Reporte eliminado');
              loadReports();
            } catch (error: any) {
              console.error('[GestionarReportes] Error deleting report:', error);
              Alert.alert('Error', `No se pudo eliminar el reporte: ${error.message || 'Error desconocido'}`);
            }
          },
        },
      ]
    );
  };

  const deleteBulkReports = async () => {
    if (selectedReports.size === 0) {
      Alert.alert('Aviso', 'No hay reportes seleccionados');
      return;
    }

    Alert.alert(
      '🗑️ Eliminar Reportes',
      `¿Estás seguro de que quieres eliminar ${selectedReports.size} reporte(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('content_reports')
                .delete()
                .in('id', Array.from(selectedReports));

              if (error) {
                console.error('[GestionarReportes] Error deleting bulk reports:', error);
                throw error;
              }

              Alert.alert('✅ Éxito', `${selectedReports.size} reporte(s) eliminado(s)`);
              setSelectedReports(new Set());
              setBulkMode(false);
              loadReports();
            } catch (error: any) {
              console.error('[GestionarReportes] Error deleting bulk reports:', error);
              Alert.alert('Error', `No se pudieron eliminar los reportes: ${error.message || 'Error desconocido'}`);
            }
          },
        },
      ]
    );
  };

  const toggleReportSelection = (reportId: string) => {
    const newSelection = new Set(selectedReports);
    if (newSelection.has(reportId)) {
      newSelection.delete(reportId);
    } else {
      newSelection.add(reportId);
    }
    setSelectedReports(newSelection);
  };

  const selectAllReports = () => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredReports.map(r => r.id)));
    }
  };

  const inspectContent = () => {
    if (!selectedReport) return;

    setDetailsModalVisible(false);

    if (selectedReport.content_type === 'post' && selectedReport.post_id) {
      router.push(`/social/post?postId=${selectedReport.post_id}&adminView=true`);
    } else if (selectedReport.content_type === 'comment' && selectedReport.comentario_id) {
      router.push(`/social/comentar?postId=${selectedReport.post_id}&commentId=${selectedReport.comentario_id}&adminView=true`);
    } else if (selectedReport.content_type === 'momento' && selectedReport.momento_id) {
      if (selectedReport.content_author) {
        router.push(`/perfil/usuario?userId=${selectedReport.content_author.id}&openMomento=true&adminView=true`);
      }
    }
  };

  const viewReporterProfile = () => {
    if (!selectedReport || !selectedReport.reporter) return;
    setDetailsModalVisible(false);
    router.push(`/perfil/usuario?userId=${selectedReport.reporter.id}&adminView=true`);
  };

  const viewAuthorProfile = () => {
    if (!selectedReport || !selectedReport.content_author) return;
    setDetailsModalVisible(false);
    router.push(`/perfil/usuario?userId=${selectedReport.content_author.id}&adminView=true`);
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
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => {
                setBulkMode(!bulkMode);
                setSelectedReports(new Set());
              }} 
              style={styles.bulkButton}
            >
              <IconSymbol 
                ios_icon_name={bulkMode ? "checkmark.circle.fill" : "checkmark.circle"} 
                android_material_icon_name={bulkMode ? "check_circle" : "radio_button_unchecked"} 
                size={24} 
                color={colors.headerText} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={loadReports} style={styles.refreshButton}>
              <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
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

      {/* Bulk Actions Bar */}
      {bulkMode && (
        <View style={styles.bulkActionsBar}>
          <TouchableOpacity onPress={selectAllReports} style={styles.bulkActionButton}>
            <IconSymbol 
              ios_icon_name={selectedReports.size === filteredReports.length ? "checkmark.square.fill" : "square"} 
              android_material_icon_name={selectedReports.size === filteredReports.length ? "check_box" : "check_box_outline_blank"} 
              size={20} 
              color={colors.text} 
            />
            <Text style={styles.bulkActionText}>
              {selectedReports.size === filteredReports.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Text>
          </TouchableOpacity>
          {selectedReports.size > 0 && (
            <TouchableOpacity onPress={deleteBulkReports} style={styles.bulkDeleteButton}>
              <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color={colors.white} />
              <Text style={styles.bulkDeleteText}>Eliminar ({selectedReports.size})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
          <Text style={styles.filterLabel}>Estado:</Text>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Text style={styles.filterLabel}>Tipo:</Text>
          {['all', 'post', 'comment', 'momento'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                filterType === type && styles.filterChipActive,
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterType === type && styles.filterChipTextActive,
                ]}
              >
                {type === 'all' ? 'Todos' : type === 'post' ? 'Publicación' : type === 'comment' ? 'Comentario' : 'Momento'}
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
              {filterStatus !== 'all' || filterType !== 'all'
                ? 'No hay reportes con los filtros seleccionados'
                : 'No se han recibido reportes aún'}
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={[
                styles.reportCard,
                { borderLeftColor: REASON_COLORS[report.reason], borderLeftWidth: 4 },
                selectedReports.has(report.id) && styles.reportCardSelected,
              ]}
              onPress={() => {
                if (bulkMode) {
                  toggleReportSelection(report.id);
                } else {
                  openReportDetails(report);
                }
              }}
              onLongPress={() => {
                if (!bulkMode) {
                  setBulkMode(true);
                  toggleReportSelection(report.id);
                }
              }}
              activeOpacity={0.7}
            >
              {bulkMode && (
                <View style={styles.checkboxContainer}>
                  <IconSymbol 
                    ios_icon_name={selectedReports.has(report.id) ? "checkmark.circle.fill" : "circle"} 
                    android_material_icon_name={selectedReports.has(report.id) ? "check_circle" : "radio_button_unchecked"} 
                    size={24} 
                    color={selectedReports.has(report.id) ? colors.primary : colors.textSecondary} 
                  />
                </View>
              )}

              {/* Content Preview Image */}
              {report.content_image && (
                <Image 
                  source={{ uri: report.content_image }} 
                  style={styles.reportThumbnail}
                  resizeMode="cover"
                />
              )}

              <View style={styles.reportContent}>
                <View style={styles.reportHeader}>
                  <View style={[styles.reasonBadge, { backgroundColor: REASON_COLORS[report.reason] + '20' }]}>
                    <View style={[styles.reasonDot, { backgroundColor: REASON_COLORS[report.reason] }]} />
                    <Text style={[styles.reasonText, { color: REASON_COLORS[report.reason] }]}>
                      {REASON_LABELS[report.reason]}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[report.status] }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[report.status] }]}>
                      {STATUS_LABELS[report.status]}
                    </Text>
                  </View>
                </View>

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
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.reportType}>
                    {report.content_type === 'post'
                      ? 'Publicación'
                      : report.content_type === 'comment'
                      ? 'Comentario'
                      : 'Momento'}
                  </Text>
                  <Text style={styles.reportDate}>
                    • {new Date(report.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>

                {report.content_preview && (
                  <Text style={styles.contentPreview} numberOfLines={2}>
                    {report.content_preview}
                  </Text>
                )}

                <View style={styles.reportFooter}>
                  <View style={styles.reporterSection}>
                    <Text style={styles.reporterLabel}>Reportado por:</Text>
                    <View style={styles.userInfo}>
                      {report.reporter?.avatar && (
                        <Image source={{ uri: report.reporter.avatar }} style={styles.userAvatar} />
                      )}
                      <Text style={styles.userName}>{report.reporter?.nombre}</Text>
                      {report.reporter?.perfil_privado && (
                        <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={12} color={colors.textSecondary} />
                      )}
                    </View>
                  </View>
                  {report.content_author && (
                    <View style={styles.authorSection}>
                      <Text style={styles.authorLabel}>Autor:</Text>
                      <View style={styles.userInfo}>
                        {report.content_author.avatar && (
                          <Image source={{ uri: report.content_author.avatar }} style={styles.userAvatar} />
                        )}
                        <Text style={styles.userName}>{report.content_author.nombre}</Text>
                        {report.content_author.perfil_privado && (
                          <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={12} color={colors.textSecondary} />
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {!bulkMode && (
                <>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
                  <TouchableOpacity 
                    style={styles.deleteReportButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteReport(report.id);
                    }}
                  >
                    <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}
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
                  {/* Content Preview with Image */}
                  {selectedReport.content_image && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Vista Previa</Text>
                      <Image 
                        source={{ uri: selectedReport.content_image }} 
                        style={styles.contentPreviewImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity style={styles.inspectButton} onPress={inspectContent}>
                        <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.white} />
                        <Text style={styles.inspectButtonText}>Inspeccionar Contenido</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Status & Reason */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Estado</Text>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedReport.status] + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedReport.status] }]} />
                        <Text style={[styles.statusText, { color: STATUS_COLORS[selectedReport.status] }]}>
                          {STATUS_LABELS[selectedReport.status]}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Motivo</Text>
                      <View style={[styles.reasonBadge, { backgroundColor: REASON_COLORS[selectedReport.reason] + '20' }]}>
                        <View style={[styles.reasonDot, { backgroundColor: REASON_COLORS[selectedReport.reason] }]} />
                        <Text style={[styles.reasonText, { color: REASON_COLORS[selectedReport.reason] }]}>
                          {REASON_LABELS[selectedReport.reason]}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Content Type */}
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

                  {/* Reporter Info with Profile Access */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reportado por</Text>
                    <TouchableOpacity style={styles.userCard} onPress={viewReporterProfile}>
                      {selectedReport.reporter?.avatar && (
                        <Image source={{ uri: selectedReport.reporter.avatar }} style={styles.userCardAvatar} />
                      )}
                      <View style={styles.userCardInfo}>
                        <View style={styles.userCardNameRow}>
                          <Text style={styles.userCardName}>{selectedReport.reporter?.nombre}</Text>
                          {selectedReport.reporter?.perfil_privado && (
                            <View style={styles.privateLabel}>
                              <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={10} color={colors.white} />
                              <Text style={styles.privateLabelText}>Privado</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.userCardEmail}>{selectedReport.reporter?.email}</Text>
                      </View>
                      <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Content Author with Profile Access */}
                  {selectedReport.content_author && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Autor del contenido</Text>
                      <TouchableOpacity style={styles.userCard} onPress={viewAuthorProfile}>
                        {selectedReport.content_author.avatar && (
                          <Image source={{ uri: selectedReport.content_author.avatar }} style={styles.userCardAvatar} />
                        )}
                        <View style={styles.userCardInfo}>
                          <View style={styles.userCardNameRow}>
                            <Text style={styles.userCardName}>{selectedReport.content_author.nombre}</Text>
                            {selectedReport.content_author.perfil_privado && (
                              <View style={styles.privateLabel}>
                                <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={10} color={colors.white} />
                                <Text style={styles.privateLabelText}>Privado</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.userCardEmail}>{selectedReport.content_author.email}</Text>
                        </View>
                        <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
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

                  {/* Quick Actions Panel */}
                  <View style={styles.actionsSection}>
                    <Text style={styles.actionsSectionTitle}>Medidas Disciplinarias</Text>
                    
                    {/* Content Actions */}
                    <View style={styles.actionsGroup}>
                      <Text style={styles.actionsGroupLabel}>Contenido</Text>
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonKeep]}
                          onPress={keepContent}
                        >
                          <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={18} color={colors.white} />
                          <Text style={styles.actionButtonText}>Mantener</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonDelete]}
                          onPress={deleteContent}
                        >
                          <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color={colors.white} />
                          <Text style={styles.actionButtonText}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* User Actions */}
                    {selectedReport.content_author && (
                      <View style={styles.actionsGroup}>
                        <Text style={styles.actionsGroupLabel}>Usuario</Text>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonWarning]}
                          onPress={sendWarning}
                        >
                          <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={18} color={colors.white} />
                          <Text style={styles.actionButtonText}>Enviar Aviso</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonBlock]}
                          onPress={blockUserTemporarily}
                        >
                          <IconSymbol ios_icon_name="clock.badge.xmark" android_material_icon_name="schedule" size={18} color={colors.white} />
                          <Text style={styles.actionButtonText}>Bloquear Temporalmente (24h)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonBan]}
                          onPress={banUserPermanently}
                        >
                          <IconSymbol ios_icon_name="xmark.circle" android_material_icon_name="block" size={18} color={colors.white} />
                          <Text style={styles.actionButtonText}>Banear Permanente</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Review Actions */}
                    <View style={styles.actionsGroup}>
                      <Text style={styles.actionsGroupLabel}>Revisión</Text>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonReviewing]}
                        onPress={() => updateReportStatus('reviewing')}
                      >
                        <IconSymbol ios_icon_name="eye" android_material_icon_name="visibility" size={18} color={colors.white} />
                        <Text style={styles.actionButtonText}>Marcar en revisión</Text>
                      </TouchableOpacity>
                    </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    padding: 8,
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
  bulkActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
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
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
    alignSelf: 'center',
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
  reportCardSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  reportThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  reportContent: {
    flex: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  reportDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  contentPreview: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  reportFooter: {
    gap: 6,
  },
  reporterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reporterLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  deleteReportButton: {
    padding: 8,
    marginLeft: 8,
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
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  contentPreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  inspectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  userCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userCardInfo: {
    flex: 1,
  },
  userCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  privateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  privateLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
  userCardEmail: {
    fontSize: 13,
    color: colors.textSecondary,
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
  actionsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  actionsGroup: {
    marginBottom: 20,
  },
  actionsGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    flex: 1,
  },
  actionButtonKeep: {
    backgroundColor: '#10B981',
  },
  actionButtonDelete: {
    backgroundColor: '#EF4444',
  },
  actionButtonWarning: {
    backgroundColor: '#F59E0B',
  },
  actionButtonBlock: {
    backgroundColor: '#F97316',
  },
  actionButtonBan: {
    backgroundColor: '#991B1B',
  },
  actionButtonReviewing: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
