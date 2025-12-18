
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ContenidoLegal {
  id: string;
  tipo: 'terminos' | 'privacidad' | 'cookies' | 'acerca';
  contenido: string;
  actualizado_en: string;
  created_at: string;
}

const TIPOS_CONTENIDO = [
  { tipo: 'terminos' as const, nombre: 'Términos y Condiciones', icon: 'doc.text.fill' as const, androidIcon: 'description' as const, color: '#3B82F6' },
  { tipo: 'privacidad' as const, nombre: 'Política de Privacidad', icon: 'lock.shield.fill' as const, androidIcon: 'privacy_tip' as const, color: '#10B981' },
  { tipo: 'cookies' as const, nombre: 'Política de Cookies', icon: 'circle.grid.3x3.fill' as const, androidIcon: 'cookie' as const, color: '#F59E0B' },
  { tipo: 'acerca' as const, nombre: 'Acerca de Barlive', icon: 'info.circle.fill' as const, androidIcon: 'info' as const, color: '#8B5CF6' },
];

export default function GestionTerminosLegalesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contenidos, setContenidos] = useState<ContenidoLegal[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContent, setEditingContent] = useState<ContenidoLegal | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const cargarContenidos = useCallback(async () => {
    try {
      console.log('[GestionTerminosLegales] ✅ Cargando contenidos legales...');
      const { data, error } = await supabase
        .from('contenido_legal')
        .select('*')
        .order('tipo', { ascending: true });

      if (error) throw error;

      console.log('[GestionTerminosLegales] ✅ Contenidos cargados:', data?.length || 0);
      setContenidos(data || []);
    } catch (error) {
      console.error('[GestionTerminosLegales] Error cargando contenidos:', error);
      Alert.alert('Error', 'No se pudieron cargar los contenidos legales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarContenidos();
  }, [cargarContenidos]);

  const handleEdit = (content: ContenidoLegal) => {
    setEditingContent(content);
    setEditText(content.contenido);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editingContent || !editText.trim()) {
      Alert.alert('Error', 'El contenido no puede estar vacío');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('contenido_legal')
        .update({
          contenido: editText.trim(),
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', editingContent.id);

      if (error) throw error;

      Alert.alert('✅ Éxito', 'Contenido actualizado correctamente');
      setShowEditModal(false);
      setEditingContent(null);
      setEditText('');
      await cargarContenidos();
    } catch (error) {
      console.error('[GestionTerminosLegales] Error guardando contenido:', error);
      Alert.alert('Error', 'No se pudo guardar el contenido');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (tipo: 'terminos' | 'privacidad' | 'cookies' | 'acerca') => {
    const tipoInfo = TIPOS_CONTENIDO.find(t => t.tipo === tipo);
    if (!tipoInfo) return;

    Alert.alert(
      `Crear ${tipoInfo.nombre}`,
      '¿Deseas crear este contenido legal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('contenido_legal')
                .insert({
                  tipo,
                  contenido: `# ${tipoInfo.nombre}\n\nEscribe aquí el contenido...`,
                });

              if (error) throw error;

              Alert.alert('✅ Éxito', 'Contenido creado correctamente');
              await cargarContenidos();
            } catch (error) {
              console.error('[GestionTerminosLegales] Error creando contenido:', error);
              Alert.alert('Error', 'No se pudo crear el contenido');
            }
          },
        },
      ]
    );
  };

  const renderContentCard = (tipoInfo: typeof TIPOS_CONTENIDO[0]) => {
    const content = contenidos.find(c => c.tipo === tipoInfo.tipo);

    return (
      <View key={tipoInfo.tipo} style={styles.contentCard}>
        <View style={[styles.contentIconContainer, { backgroundColor: tipoInfo.color + '15' }]}>
          <IconSymbol ios_icon_name={tipoInfo.icon} android_material_icon_name={tipoInfo.androidIcon} size={32} color={tipoInfo.color} />
        </View>

        <View style={styles.contentInfo}>
          <Text style={styles.contentTitle}>{tipoInfo.nombre}</Text>
          {content ? (
            <>
              <Text style={styles.contentDate}>
                Última actualización: {new Date(content.actualizado_en).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              <Text style={styles.contentPreview} numberOfLines={2}>
                {content.contenido.substring(0, 100)}...
              </Text>
            </>
          ) : (
            <Text style={styles.contentEmpty}>No configurado</Text>
          )}
        </View>

        {content ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: tipoInfo.color }]}
            onPress={() => handleEdit(content)}
          >
            <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: tipoInfo.color }]}
            onPress={() => handleCreate(tipoInfo.tipo)}
          >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Crear</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Términos Legales</Text>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando contenidos...</Text>
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
          <Text style={styles.headerTitle}>Términos Legales</Text>
          <Text style={styles.headerSubtitle}>Gestiona información legal</Text>
        </View>
        <TouchableOpacity onPress={cargarContenidos}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Gestión de Contenido Legal</Text>
            <Text style={styles.infoText}>
              - Edita los términos y condiciones de uso{'\n'}
              - Actualiza la política de privacidad{'\n'}
              - Configura la política de cookies{'\n'}
              - Modifica la información "Acerca de"{'\n'}
              - Los cambios se reflejan inmediatamente en la app
            </Text>
          </View>
        </View>

        <View style={styles.contentsList}>
          {TIPOS_CONTENIDO.map(tipoInfo => renderContentCard(tipoInfo))}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Editar {TIPOS_CONTENIDO.find(t => t.tipo === editingContent?.tipo)?.nombre}
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Contenido (Markdown soportado)</Text>
              <TextInput
                style={styles.textArea}
                value={editText}
                onChangeText={setEditText}
                placeholder="Escribe el contenido aquí..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={20}
                textAlignVertical="top"
              />

              <View style={styles.markdownHelp}>
                <Text style={styles.markdownHelpTitle}>Ayuda de Markdown:</Text>
                <Text style={styles.markdownHelpText}>
                  # Título 1{'\n'}
                  ## Título 2{'\n'}
                  **Negrita**{'\n'}
                  *Cursiva*{'\n'}
                  - Lista{'\n'}
                  [Enlace](https://ejemplo.com)
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, saving && styles.modalPrimaryButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                  <Text style={styles.modalPrimaryButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginBottom: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  contentsList: {
    gap: 16,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
    gap: 12,
  },
  contentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  contentDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  contentPreview: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  contentEmpty: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
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
    minHeight: 300,
    fontFamily: 'monospace',
  },
  markdownHelp: {
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  markdownHelpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  markdownHelpText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
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
