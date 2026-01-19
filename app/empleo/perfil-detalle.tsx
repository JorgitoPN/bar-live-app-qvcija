
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

interface PerfilProfesional {
  id: string;
  usuario_id?: string;
  nombre_completo: string;
  puesto_deseado: string;
  experiencia: string;
  habilidades?: string;
  disponibilidad?: string;
  foto_url?: string;
  provincia?: string;
  created_at: string;
  usuario?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
}

export default function PerfilDetalleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [perfil, setPerfil] = useState<PerfilProfesional | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = user?.rol_app || 'cliente';
  const isPropietarioMode = currentMode === 'propietario';
  const isOwnProfile = user && perfil?.usuario_id === user.id;

  const cargarPerfil = useCallback(async () => {
    if (!id) {
      Alert.alert('Error', 'No se especificó el perfil');
      router.back();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setPerfil(data);
    } catch (error) {
      console.error('[PerfilDetalle] Error loading profile:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  const handleContactar = async () => {
    if (!user) {
      Alert.alert(
        'Inicia Sesión',
        'Debes iniciar sesión para contactar con profesionales',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isPropietarioMode || (userRole !== 'propietario' && userRole !== 'admin')) {
      Alert.alert(
        'Acceso Restringido',
        'Solo los propietarios pueden contactar con profesionales.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!perfil?.usuario_id) {
      Alert.alert('Error', 'No se pudo obtener la información del usuario');
      return;
    }

    try {
      console.log('[PerfilDetalle] Contacting profile:', perfil.id, 'User:', perfil.usuario_id);

      // Check if chat exists
      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${perfil.usuario_id}),and(usuario1_id.eq.${perfil.usuario_id},usuario2_id.eq.${user.id})`)
        .maybeSingle();

      if (chatError && chatError.code !== 'PGRST116') {
        console.error('[PerfilDetalle] Error checking chat:', chatError);
        throw chatError;
      }

      let chatId = chatExistente?.id;

      if (!chatId) {
        console.log('[PerfilDetalle] Creating new chat...');
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: perfil.usuario_id,
          })
          .select()
          .single();

        if (nuevoChatError) {
          console.error('[PerfilDetalle] Error creating chat:', nuevoChatError);
          throw nuevoChatError;
        }
        chatId = nuevoChat.id;
        console.log('[PerfilDetalle] Chat created:', chatId);
      } else {
        console.log('[PerfilDetalle] Existing chat found:', chatId);
      }

      // Register interest
      const { error: interesError } = await supabase
        .from('intereses_empleo')
        .insert({
          perfil_id: perfil.id,
          propietario_id: user.id,
          estado: 'pendiente',
        });

      if (interesError && !interesError.message.includes('duplicate')) {
        console.error('[PerfilDetalle] Error registering interest:', interesError);
      } else {
        console.log('[PerfilDetalle] Interest registered successfully');
      }

      // Create notification
      const { error: notifError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: perfil.usuario_id,
          tipo: 'sistema',
          titulo: 'Interés en tu perfil profesional',
          mensaje: 'Un propietario está interesado en tu perfil. Revisa tus mensajes.',
          usuario_origen_id: user.id,
        });

      if (notifError) {
        console.error('[PerfilDetalle] Error creating notification:', notifError);
      } else {
        console.log('[PerfilDetalle] Notification created successfully');
      }

      Alert.alert(
        'Mensaje Enviado',
        'Se ha enviado una notificación al profesional. Puedes continuar la conversación en tus chats.',
        [
          { text: 'Ver Chats', onPress: () => router.push('/(tabs)/perfil/chats') },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('[PerfilDetalle] Error contacting profile:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.');
    }
  };

  const handleEditar = () => {
    router.push('/crear/perfil-profesional');
  };

  const handleEliminar = async () => {
    Alert.alert(
      'Eliminar Perfil',
      '¿Estás seguro de que quieres eliminar tu perfil profesional?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('perfiles_profesionales')
                .update({ activo: false })
                .eq('id', perfil!.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Perfil eliminado correctamente', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('[PerfilDetalle] Error deleting profile:', error);
              Alert.alert('Error', 'No se pudo eliminar el perfil');
            }
          },
        },
      ]
    );
  };

  const calcularDiasPublicado = (fecha: string): number => {
    const fechaPublicacion = new Date(fecha);
    const hoy = new Date();
    const diff = hoy.getTime() - fechaPublicacion.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!perfil) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <IconSymbol name="exclamationmark.triangle" size={64} color={colors.textSecondary} />
        <Text style={styles.loadingText}>Perfil no encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const diasPublicado = calcularDiasPublicado(perfil.created_at);
  const fotoUrl = perfil.foto_url || perfil.usuario?.avatar;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil Profesional</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          {fotoUrl ? (
            <Image 
              source={{ uri: fotoUrl }} 
              style={styles.profilePhoto}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
              <IconSymbol name="person.circle" size={60} color={colors.textSecondary} />
            </View>
          )}
          <Text style={styles.profileName}>{perfil.nombre_completo}</Text>
          <Text style={styles.profileJob}>{perfil.puesto_deseado}</Text>
          {diasPublicado < 7 && (
            <View style={styles.badgeNuevo}>
              <Text style={styles.badgeNuevoText}>Nuevo</Text>
            </View>
          )}
          <Text style={styles.profileDate}>
            Publicado hace {diasPublicado} {diasPublicado === 1 ? 'día' : 'días'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experiencia</Text>
          <Text style={styles.sectionText}>{perfil.experiencia}</Text>
        </View>

        {perfil.habilidades && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habilidades</Text>
            <Text style={styles.sectionText}>{perfil.habilidades}</Text>
          </View>
        )}

        {perfil.disponibilidad && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Disponibilidad</Text>
            <Text style={styles.sectionText}>{perfil.disponibilidad}</Text>
          </View>
        )}

        {perfil.provincia && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Provincia</Text>
            <Text style={styles.sectionText}>{perfil.provincia}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        {isOwnProfile ? (
          <View style={styles.footerActions}>
            <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={handleEditar}>
              <Text style={styles.actionButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleEliminar}>
              <Text style={styles.actionButtonText}>Eliminar Perfil</Text>
            </TouchableOpacity>
          </View>
        ) : isPropietarioMode && perfil.usuario_id && (
          <TouchableOpacity style={styles.contactButton} onPress={handleContactar}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.contactButtonGradient}
            >
              <Text style={styles.contactButtonText}>Contactar Profesional</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profilePhotoPlaceholder: {
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  profileJob: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  badgeNuevo: {
    backgroundColor: colors.badgeNuevo,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeNuevoText: {
    color: colors.badgeNuevoText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    paddingBottom: 34,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  contactButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
});
