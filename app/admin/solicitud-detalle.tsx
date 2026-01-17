
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
  Platform,
  Linking,
  Modal,
  Pressable,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface Solicitud {
  id: string;
  usuario_id: string;
  local_id?: string;
  nombre_local: string;
  direccion_local?: string;
  ciudad_local?: string;
  provincia_local?: string;
  codigo_postal_local?: string;
  telefono_contacto?: string;
  telefono_local?: string;
  email_contacto?: string;
  mensaje?: string;
  descripcion?: string;
  tipo_local?: string;
  tipos_local_multiple?: string[];
  latitud_local?: number;
  longitud_local?: number;
  horarios_local?: Record<string, any>;
  servicios_local?: string[];
  imagen_portada_url?: string;
  galeria_urls?: string[];
  documento_propiedad_url?: string;
  documento_propiedad_tipo?: string;
  estado: 'pendiente' | 'en_revision' | 'informacion_adicional' | 'aprobada' | 'denegada';
  tipo_solicitud: 'reclamar_local' | 'nuevo_local';
  motivo_denegacion?: string;
  notas_admin?: string;
  created_at: string;
  usuario?: {
    nombre: string;
    email: string;
    avatar?: string;
    username?: string;
    rol_app?: string;
  };
}

/**
 * ✅ SOLICITUD DETALLE v11.0 - SISTEMA ROBUSTO DE VISUALIZACIÓN
 * 
 * SISTEMA v11.0:
 * - ✅ Visualización directa de imágenes con Image de React Native
 * - ✅ URLs públicas de Supabase Storage con validación
 * - ✅ Construcción automática y robusta de URLs desde paths
 * - ✅ Galería horizontal con thumbnails numerados
 * - ✅ Modal de pantalla completa con navegación entre imágenes
 * - ✅ Indicadores de tipo de imagen (Documento, Portada, Galería)
 * - ✅ Eliminación automática de imágenes al aprobar/denegar
 * - ✅ Logs detallados para debugging
 * - ✅ Manejo de errores con fallbacks visuales
 */

const { width } = Dimensions.get('window');

export default function SolicitudDetalleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const solicitudId = params.id as string;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'aprobar' | 'denegar' | 'cambiar_estado' | null>(null);
  const [motivoDenegacion, setMotivoDenegacion] = useState('');
  const [notasAdmin, setNotasAdmin] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<'en_revision' | 'informacion_adicional'>('en_revision');

  const loadSolicitud = useCallback(async () => {
    try {
      console.log('[SolicitudDetalle v10.0] 📥 Cargando solicitud:', solicitudId);
      
      const { data, error } = await supabase
        .from('solicitudes_propietario')
        .select(`
          *,
          usuario:usuarios!solicitudes_propietario_usuario_id_fkey (
            nombre,
            email,
            avatar,
            username,
            rol_app
          )
        `)
        .eq('id', solicitudId)
        .single();

      if (error) {
        console.error('[SolicitudDetalle v10.0] ❌ Error cargando solicitud:', error);
        throw error;
      }

      console.log('[SolicitudDetalle v10.0] ✅ Solicitud cargada:', data.nombre_local);
      console.log('[SolicitudDetalle v10.0] 📄 Documento:', data.documento_propiedad_url ? 'Sí' : 'No');
      console.log('[SolicitudDetalle v10.0] 🖼️ Portada:', data.imagen_portada_url ? 'Sí' : 'No');
      console.log('[SolicitudDetalle v10.0] 🖼️ Galería:', data.galeria_urls?.length || 0, 'imágenes');
      
      setSolicitud(data);
    } catch (error) {
      console.error('[SolicitudDetalle v10.0] ❌ Error:', error);
      Alert.alert('Error', 'No se pudo cargar la solicitud');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [solicitudId, router]);

  useEffect(() => {
    loadSolicitud();
  }, [loadSolicitud]);

  /**
   * ✅ v11.0: Eliminar imágenes de Supabase Storage de forma robusta
   */
  const deleteImagesFromStorage = async (imageUrls: string[]) => {
    console.log('[SolicitudDetalle v11.0] 🗑️ Iniciando eliminación de', imageUrls.length, 'imágenes');
    
    for (const url of imageUrls) {
      if (!url || typeof url !== 'string') {
        console.log('[SolicitudDetalle v11.0] ⚠️ URL inválida, saltando');
        continue;
      }
      
      try {
        console.log('[SolicitudDetalle v11.0] 🗑️ Procesando URL:', url.substring(0, 80) + '...');
        
        let filePath = url;
        let bucket = 'documentos-propiedad';
        
        // Extraer path de URL completa
        if (url.includes('/storage/v1/object/public/')) {
          const parts = url.split('/storage/v1/object/public/');
          if (parts.length > 1) {
            const pathWithBucket = parts[1];
            const pathParts = pathWithBucket.split('/');
            
            // El primer elemento es el bucket
            if (pathParts[0] === 'locales') {
              bucket = 'locales';
            } else if (pathParts[0] === 'documentos-propiedad') {
              bucket = 'documentos-propiedad';
            }
            
            // El resto es el path del archivo
            pathParts.shift();
            filePath = pathParts.join('/');
          }
        }
        
        // Limpiar path de slashes iniciales
        filePath = filePath.replace(/^\/+/, '');
        
        console.log('[SolicitudDetalle v11.0] 🗑️ Eliminando del bucket:', bucket);
        console.log('[SolicitudDetalle v11.0] 🗑️ Path del archivo:', filePath);
        
        // Eliminar del bucket correcto
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([filePath]);
        
        if (deleteError) {
          console.error('[SolicitudDetalle v11.0] ❌ Error eliminando:', deleteError);
        } else {
          console.log('[SolicitudDetalle v11.0] ✅ Imagen eliminada correctamente');
        }
      } catch (error) {
        console.error('[SolicitudDetalle v11.0] ❌ Error en proceso de eliminación:', error);
      }
    }
    
    console.log('[SolicitudDetalle v11.0] ✅ Proceso de eliminación completado');
  };

  const handleViewImage = (index: number) => {
    console.log('[SolicitudDetalle v10.0] 👁️ Abriendo imagen:', index + 1, 'de', allImages.length);
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const executeAction = async () => {
    if (!solicitud) return;

    try {
      if (actionType === 'aprobar') {
        console.log('[SolicitudDetalle v9.2] ✅ Aprobando solicitud...');
        
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ estado: 'aprobada' })
          .eq('id', solicitud.id);

        if (updateError) throw updateError;

        const { error: roleError } = await supabase
          .from('usuarios')
          .update({ rol_app: 'propietario' })
          .eq('id', solicitud.usuario_id);

        if (roleError) throw roleError;

        if (solicitud.tipo_solicitud === 'reclamar_local' && solicitud.local_id) {
          const { error: localError } = await supabase
            .from('locales')
            .update({ propietario_id: solicitud.usuario_id })
            .eq('id', solicitud.local_id);

          if (localError) throw localError;

          const { error: propError } = await supabase
            .from('propietarios_locales')
            .insert({
              propietario_id: solicitud.usuario_id,
              local_id: solicitud.local_id,
              rol: 'propietario',
            });

          if (propError && propError.code !== '23505') {
            throw propError;
          }
        } else if (solicitud.tipo_solicitud === 'nuevo_local') {
          const { data: newLocal, error: createError } = await supabase
            .from('locales')
            .insert({
              nombre: solicitud.nombre_local,
              tipo: solicitud.tipo_local,
              descripcion: solicitud.descripcion,
              direccion: solicitud.direccion_local,
              ciudad: solicitud.ciudad_local,
              provincia: solicitud.provincia_local,
              codigo_postal: solicitud.codigo_postal_local,
              telefono: solicitud.telefono_local,
              email: solicitud.email_contacto,
              latitud: solicitud.latitud_local,
              longitud: solicitud.longitud_local,
              horarios_completos: solicitud.horarios_local,
              servicios: solicitud.servicios_local,
              imagen_url: solicitud.imagen_portada_url,
              galeria_urls: solicitud.galeria_urls,
              propietario_id: solicitud.usuario_id,
              source_type: 'manual',
              estado_solicitud: 'aprobado',
              activo: true,
            })
            .select()
            .single();

          if (createError) throw createError;

          const { error: propError } = await supabase
            .from('propietarios_locales')
            .insert({
              propietario_id: solicitud.usuario_id,
              local_id: newLocal.id,
              rol: 'propietario',
            });

          if (propError && propError.code !== '23505') {
            throw propError;
          }
        }

        // ✅ v11.0: Eliminar imágenes del storage después de aprobar
        const imagesToDelete: string[] = [];
        if (solicitud.documento_propiedad_url) {
          console.log('[SolicitudDetalle v11.0] 📄 Añadiendo documento para eliminar');
          imagesToDelete.push(solicitud.documento_propiedad_url);
        }
        if (solicitud.imagen_portada_url) {
          console.log('[SolicitudDetalle v11.0] 🖼️ Añadiendo portada para eliminar');
          imagesToDelete.push(solicitud.imagen_portada_url);
        }
        if (solicitud.galeria_urls && Array.isArray(solicitud.galeria_urls)) {
          console.log('[SolicitudDetalle v11.0] 🖼️ Añadiendo', solicitud.galeria_urls.length, 'imágenes de galería para eliminar');
          imagesToDelete.push(...solicitud.galeria_urls);
        }
        
        if (imagesToDelete.length > 0) {
          console.log('[SolicitudDetalle v11.0] 🗑️ Eliminando', imagesToDelete.length, 'imágenes después de aprobar...');
          await deleteImagesFromStorage(imagesToDelete);
        }

        await supabase.from('notificaciones').insert({
          usuario_id: solicitud.usuario_id,
          tipo: 'sistema',
          titulo: '🎉 Solicitud aprobada',
          mensaje: 'Tu solicitud para ser propietario ha sido aprobada.',
        });

        Alert.alert('✅ Éxito', 'Solicitud aprobada correctamente. Las imágenes han sido eliminadas del sistema.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else if (actionType === 'denegar') {
        if (!motivoDenegacion.trim()) {
          Alert.alert('Error', 'Debes proporcionar un motivo de denegación');
          return;
        }

        console.log('[SolicitudDetalle v9.2] ❌ Denegando solicitud...');

        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ 
            estado: 'denegada',
            motivo_denegacion: motivoDenegacion,
          })
          .eq('id', solicitud.id);

        if (updateError) throw updateError;

        // ✅ v11.0: Eliminar imágenes del storage después de denegar
        const imagesToDelete: string[] = [];
        if (solicitud.documento_propiedad_url) {
          console.log('[SolicitudDetalle v11.0] 📄 Añadiendo documento para eliminar');
          imagesToDelete.push(solicitud.documento_propiedad_url);
        }
        if (solicitud.imagen_portada_url) {
          console.log('[SolicitudDetalle v11.0] 🖼️ Añadiendo portada para eliminar');
          imagesToDelete.push(solicitud.imagen_portada_url);
        }
        if (solicitud.galeria_urls && Array.isArray(solicitud.galeria_urls)) {
          console.log('[SolicitudDetalle v11.0] 🖼️ Añadiendo', solicitud.galeria_urls.length, 'imágenes de galería para eliminar');
          imagesToDelete.push(...solicitud.galeria_urls);
        }
        
        if (imagesToDelete.length > 0) {
          console.log('[SolicitudDetalle v11.0] 🗑️ Eliminando', imagesToDelete.length, 'imágenes después de denegar...');
          await deleteImagesFromStorage(imagesToDelete);
        }

        await supabase.from('notificaciones').insert({
          usuario_id: solicitud.usuario_id,
          tipo: 'sistema',
          titulo: 'Solicitud denegada',
          mensaje: `Tu solicitud ha sido denegada. Motivo: ${motivoDenegacion}`,
        });

        Alert.alert('✅ Éxito', 'Solicitud denegada. Las imágenes han sido eliminadas del sistema.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else if (actionType === 'cambiar_estado') {
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ 
            estado: nuevoEstado,
            notas_admin: notasAdmin || null,
          })
          .eq('id', solicitud.id);

        if (updateError) throw updateError;

        const estadoTexto = nuevoEstado === 'en_revision' ? 'en revisión' : 'requiere información adicional';
        await supabase.from('notificaciones').insert({
          usuario_id: solicitud.usuario_id,
          tipo: 'sistema',
          titulo: 'Estado actualizado',
          mensaje: `Tu solicitud está ahora ${estadoTexto}.${notasAdmin ? ' Nota: ' + notasAdmin : ''}`,
        });

        Alert.alert('✅ Éxito', 'Estado actualizado.', [
          { text: 'OK', onPress: () => loadSolicitud() }
        ]);
      }

      setShowActionModal(false);
      setActionType(null);
      setMotivoDenegacion('');
      setNotasAdmin('');
    } catch (error) {
      console.error('[SolicitudDetalle v9.2] ❌ Error ejecutando acción:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { label: 'Pendiente', color: '#F59E0B', icon: 'schedule' };
      case 'en_revision':
        return { label: 'En Revisión', color: '#3B82F6', icon: 'search' };
      case 'informacion_adicional':
        return { label: 'Info Adicional', color: '#8B5CF6', icon: 'info' };
      case 'aprobada':
        return { label: 'Aprobada', color: '#10B981', icon: 'check_circle' };
      case 'denegada':
        return { label: 'Denegada', color: '#EF4444', icon: 'cancel' };
      default:
        return { label: estado, color: colors.textSecondary, icon: 'circle' };
    }
  };

  const getTipoDocumentoLabel = (tipo?: string) => {
    switch (tipo) {
      case 'factura_luz': return 'Factura de Luz';
      case 'factura_agua': return 'Factura de Agua';
      case 'contrato_alquiler': return 'Contrato de Alquiler';
      case 'escritura': return 'Escritura de Propiedad';
      case 'licencia_actividad': return 'Licencia de Actividad';
      case 'otro': return 'Otro Documento';
      default: return 'Documento';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando solicitud...</Text>
      </View>
    );
  }

  if (!solicitud) {
    return null;
  }

  const estadoConfig = getEstadoConfig(solicitud.estado);
  
  /**
   * ✅ SISTEMA NUEVO v11.0: Construcción robusta de URLs de imágenes
   * - Valida y normaliza todas las URLs
   * - Maneja URLs completas y paths relativos
   * - Detecta automáticamente el bucket correcto
   * - Logs detallados para debugging
   */
  const allImages: string[] = [];
  
  // Función helper mejorada para obtener URL pública de Supabase Storage
  const getSupabaseImageUrl = (path: any): string | null => {
    if (!path) {
      console.log('[SolicitudDetalle v11.0] ⚠️ Path vacío o nulo');
      return null;
    }
    
    // Convertir a string si no lo es
    const pathString = String(path).trim();
    
    if (!pathString) {
      console.log('[SolicitudDetalle v11.0] ⚠️ Path vacío después de trim');
      return null;
    }
    
    // Si ya es una URL completa válida, usarla directamente
    if (pathString.startsWith('http://') || pathString.startsWith('https://')) {
      console.log('[SolicitudDetalle v11.0] ✅ URL completa detectada:', pathString.substring(0, 80) + '...');
      return pathString;
    }
    
    // Si es un path relativo, construir URL completa
    console.log('[SolicitudDetalle v11.0] 🔧 Construyendo URL desde path:', pathString);
    
    // Limpiar el path
    let cleanPath = pathString.replace(/^\/+/, ''); // Remover slashes iniciales
    
    // Detectar el bucket basado en el path
    let bucket = 'documentos-propiedad';
    let filePath = cleanPath;
    
    if (cleanPath.startsWith('documentos-propiedad/')) {
      bucket = 'documentos-propiedad';
      filePath = cleanPath.replace('documentos-propiedad/', '');
      console.log('[SolicitudDetalle v11.0] 📁 Bucket detectado: documentos-propiedad');
    } else if (cleanPath.startsWith('locales/')) {
      bucket = 'locales';
      filePath = cleanPath.replace('locales/', '');
      console.log('[SolicitudDetalle v11.0] 📁 Bucket detectado: locales');
    } else {
      // Si no tiene prefijo, asumir que es documentos-propiedad
      console.log('[SolicitudDetalle v11.0] 📁 Bucket por defecto: documentos-propiedad');
    }
    
    console.log('[SolicitudDetalle v11.0] 📄 File path limpio:', filePath);
    
    // Construir URL pública usando el cliente de Supabase
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    const publicUrl = data.publicUrl;
    console.log('[SolicitudDetalle v11.0] ✅ URL pública construida:', publicUrl.substring(0, 80) + '...');
    
    return publicUrl;
  };
  
  // Añadir documento de propiedad
  if (solicitud.documento_propiedad_url) {
    console.log('[SolicitudDetalle v11.0] 📄 Procesando documento de propiedad...');
    const url = getSupabaseImageUrl(solicitud.documento_propiedad_url);
    if (url) {
      console.log('[SolicitudDetalle v11.0] ✅ Documento añadido al array');
      allImages.push(url);
    } else {
      console.log('[SolicitudDetalle v11.0] ❌ No se pudo obtener URL del documento');
    }
  }
  
  // Añadir imagen de portada
  if (solicitud.imagen_portada_url) {
    console.log('[SolicitudDetalle v11.0] 🖼️ Procesando imagen de portada...');
    const url = getSupabaseImageUrl(solicitud.imagen_portada_url);
    if (url) {
      console.log('[SolicitudDetalle v11.0] ✅ Portada añadida al array');
      allImages.push(url);
    } else {
      console.log('[SolicitudDetalle v11.0] ❌ No se pudo obtener URL de la portada');
    }
  }
  
  // Añadir galería
  if (solicitud.galeria_urls && Array.isArray(solicitud.galeria_urls)) {
    console.log('[SolicitudDetalle v11.0] 🖼️ Procesando galería:', solicitud.galeria_urls.length, 'imágenes');
    solicitud.galeria_urls.forEach((imageUrl, index) => {
      console.log('[SolicitudDetalle v11.0] 🖼️ Procesando imagen de galería', index + 1);
      const url = getSupabaseImageUrl(imageUrl);
      if (url) {
        console.log('[SolicitudDetalle v11.0] ✅ Imagen de galería añadida');
        allImages.push(url);
      } else {
        console.log('[SolicitudDetalle v11.0] ❌ No se pudo obtener URL de imagen de galería', index + 1);
      }
    });
  }

  console.log('[SolicitudDetalle v11.0] ✅ TOTAL DE IMÁGENES PROCESADAS:', allImages.length);
  console.log('[SolicitudDetalle v11.0] 📋 URLs finales:', allImages.map((url, i) => `${i + 1}. ${url.substring(0, 60)}...`));

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Detalles</Text>
          <Text style={styles.headerSubtitle}>
            {solicitud.tipo_solicitud === 'reclamar_local' ? 'Reclamar Local' : 'Nuevo Local'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status Badge */}
        <View style={[styles.statusBanner, { backgroundColor: estadoConfig.color }]}>
          <IconSymbol 
            ios_icon_name={estadoConfig.icon} 
            android_material_icon_name={estadoConfig.icon} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.statusBannerText}>{estadoConfig.label}</Text>
        </View>

        {/* User Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Solicitante</Text>
          <View style={styles.userCard}>
            {solicitud.usuario?.avatar ? (
              <Image source={{ uri: solicitud.usuario.avatar }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={28} color={colors.white} />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userNameText}>{solicitud.usuario?.nombre || 'Usuario'}</Text>
              {solicitud.usuario?.username && (
                <Text style={styles.userUsernameText}>@{solicitud.usuario.username}</Text>
              )}
              <TouchableOpacity 
                style={styles.emailBtn}
                onPress={() => Linking.openURL(`mailto:${solicitud.usuario?.email}`)}
              >
                <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={14} color={colors.primary} />
                <Text style={styles.emailBtnText}>{solicitud.usuario?.email}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Local Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 Información del Local</Text>
          <View style={styles.localCard}>
            <View style={styles.localTitleRow}>
              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color={colors.primary} />
              <Text style={styles.localNameText}>{solicitud.nombre_local}</Text>
            </View>

            {solicitud.tipo_local && (
              <View style={styles.detailRow}>
                <IconSymbol ios_icon_name="tag.fill" android_material_icon_name="label" size={16} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Tipo:</Text>
                <Text style={styles.detailValue}>{solicitud.tipo_local}</Text>
              </View>
            )}

            {solicitud.tipos_local_multiple && solicitud.tipos_local_multiple.length > 1 && (
              <View style={styles.categoriesBox}>
                <Text style={styles.categoriesBoxLabel}>Categorías múltiples:</Text>
                <View style={styles.categoriesChips}>
                  {solicitud.tipos_local_multiple.map((tipo, index) => (
                    <View key={index} style={styles.categoryChip}>
                      <Text style={styles.categoryChipText}>{tipo}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {solicitud.direccion_local && (
              <View style={styles.detailRow}>
                <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={16} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Dirección:</Text>
                <Text style={styles.detailValue}>{solicitud.direccion_local}</Text>
              </View>
            )}

            {solicitud.ciudad_local && (
              <View style={styles.detailRow}>
                <IconSymbol ios_icon_name="building.2" android_material_icon_name="location_city" size={16} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Ciudad:</Text>
                <Text style={styles.detailValue}>
                  {solicitud.codigo_postal_local && `${solicitud.codigo_postal_local} `}
                  {solicitud.ciudad_local}, {solicitud.provincia_local}
                </Text>
              </View>
            )}

            {solicitud.telefono_contacto && (
              <TouchableOpacity 
                style={styles.detailRow}
                onPress={() => Linking.openURL(`tel:${solicitud.telefono_contacto}`)}
              >
                <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={16} color={colors.primary} />
                <Text style={styles.detailLabel}>Teléfono:</Text>
                <Text style={[styles.detailValue, { color: colors.primary }]}>{solicitud.telefono_contacto}</Text>
              </TouchableOpacity>
            )}

            {solicitud.email_contacto && (
              <TouchableOpacity 
                style={styles.detailRow}
                onPress={() => Linking.openURL(`mailto:${solicitud.email_contacto}`)}
              >
                <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={16} color={colors.primary} />
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={[styles.detailValue, { color: colors.primary }]}>{solicitud.email_contacto}</Text>
              </TouchableOpacity>
            )}

            {solicitud.descripcion && (
              <View style={styles.descBox}>
                <Text style={styles.descBoxText}>{solicitud.descripcion}</Text>
              </View>
            )}

            {solicitud.mensaje && (
              <View style={styles.messageBox}>
                <Text style={styles.messageBoxLabel}>💬 Mensaje del solicitante:</Text>
                <Text style={styles.messageBoxText}>{solicitud.mensaje}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ✅ NUEVO v11.0: Galería de imágenes con mejor visualización */}
        {allImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              🖼️ Imágenes ({allImages.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              Incluye documento de propiedad, portada y galería
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.imagesScroll}
              contentContainerStyle={styles.imagesScrollContent}
            >
              {allImages.map((imageUrl, index) => {
                // Determinar el tipo de imagen
                let imageType = '📸 Galería';
                if (index === 0 && solicitud.documento_propiedad_url) {
                  imageType = '📄 Documento';
                } else if (index === (solicitud.documento_propiedad_url ? 1 : 0) && solicitud.imagen_portada_url) {
                  imageType = '🖼️ Portada';
                }
                
                return (
                  <TouchableOpacity 
                    key={`image-${index}`} 
                    onPress={() => {
                      console.log('[SolicitudDetalle v11.0] 👁️ Abriendo imagen', index + 1, 'de', allImages.length);
                      handleViewImage(index);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.imageThumbContainer}>
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.imageThumb}
                        resizeMode="cover"
                        onLoadStart={() => {
                          console.log('[SolicitudDetalle v11.0] 🔄 Cargando imagen', index + 1);
                        }}
                        onLoad={() => {
                          console.log('[SolicitudDetalle v11.0] ✅ Imagen', index + 1, 'cargada correctamente');
                        }}
                        onError={(error) => {
                          console.error('[SolicitudDetalle v11.0] ❌ Error cargando imagen', index + 1, ':', error.nativeEvent.error);
                          console.error('[SolicitudDetalle v11.0] ❌ URL problemática:', imageUrl);
                        }}
                      />
                      {/* Indicador de tipo de imagen */}
                      <View style={styles.imageTypeIndicator}>
                        <Text style={styles.imageTypeText}>{imageType}</Text>
                      </View>
                      {/* Número de imagen */}
                      <View style={styles.imageNumberIndicator}>
                        <Text style={styles.imageNumberText}>{index + 1}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Map Card */}
        {solicitud.latitud_local && solicitud.longitud_local && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Ubicación</Text>
            <TouchableOpacity 
              style={styles.mapCard} 
              onPress={() => {
                const url = Platform.select({
                  ios: `maps:0,0?q=${solicitud.latitud_local},${solicitud.longitud_local}`,
                  android: `google.navigation:q=${solicitud.latitud_local},${solicitud.longitud_local}`,
                  default: `https://www.google.com/maps/search/?api=1&query=${solicitud.latitud_local},${solicitud.longitud_local}`
                });
                if (url) Linking.openURL(url);
              }}
            >
              <View style={styles.mapCardContent}>
                <View style={styles.mapIconBox}>
                  <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={32} color={colors.primary} />
                </View>
                <View style={styles.mapTextBox}>
                  <Text style={styles.mapTitle}>Ver en Mapas</Text>
                  <Text style={styles.mapCoords}>
                    {solicitud.latitud_local.toFixed(6)}, {solicitud.longitud_local.toFixed(6)}
                  </Text>
                </View>
                <IconSymbol ios_icon_name="arrow.up.right" android_material_icon_name="open_in_new" size={20} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Services */}
        {solicitud.servicios_local && solicitud.servicios_local.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Servicios</Text>
            <View style={styles.servicesGrid}>
              {solicitud.servicios_local.map((servicio, index) => (
                <View key={index} style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>{servicio}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Schedules */}
        {solicitud.horarios_local && Object.keys(solicitud.horarios_local).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 Horarios</Text>
            <View style={styles.schedulesCard}>
              {Object.entries(solicitud.horarios_local).map(([dia, horario]: [string, any]) => (
                <View key={dia} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDayText}>{dia}</Text>
                  <Text style={styles.scheduleHoursText}>
                    {horario.abierto ? `${horario.apertura} - ${horario.cierre}` : 'Cerrado'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      {(solicitud.estado === 'pendiente' || solicitud.estado === 'en_revision' || solicitud.estado === 'informacion_adicional') && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#10B981' }]}
            onPress={() => {
              setActionType('aprobar');
              setShowActionModal(true);
            }}
          >
            <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color="#fff" />
            <Text style={styles.footerBtnText}>Aprobar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => {
              setActionType('cambiar_estado');
              setShowActionModal(true);
            }}
          >
            <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="sync" size={20} color="#fff" />
            <Text style={styles.footerBtnText}>Estado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#EF4444' }]}
            onPress={() => {
              setActionType('denegar');
              setShowActionModal(true);
            }}
          >
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color="#fff" />
            <Text style={styles.footerBtnText}>Denegar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ NUEVO v11.0: Modal de imágenes mejorado con mejor visualización */}
      <Modal
        visible={showImageModal}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {
          console.log('[SolicitudDetalle v11.0] 🚪 Cerrando modal de imágenes');
          setShowImageModal(false);
        }}
      >
        <View style={styles.imageModalOverlay}>
          {/* Botón de cerrar */}
          <TouchableOpacity 
            style={styles.imageModalClose} 
            onPress={() => {
              console.log('[SolicitudDetalle v11.0] 🚪 Usuario cerró el modal');
              setShowImageModal(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.closeButtonCircle}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
          
          {/* Imagen a pantalla completa */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.fullImageScroll}
            contentOffset={{ x: selectedImageIndex * width, y: 0 }}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              if (index !== selectedImageIndex) {
                console.log('[SolicitudDetalle v11.0] 📸 Cambiando a imagen', index + 1);
                setSelectedImageIndex(index);
              }
            }}
            scrollEventThrottle={16}
          >
            {allImages.map((imageUrl, index) => (
              <View key={`full-${index}`} style={styles.fullImageContainer}>
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.fullImage} 
                  resizeMode="contain"
                  onLoadStart={() => {
                    console.log('[SolicitudDetalle v11.0] 🔄 Cargando imagen completa', index + 1);
                  }}
                  onLoad={() => {
                    console.log('[SolicitudDetalle v11.0] ✅ Imagen completa', index + 1, 'cargada');
                  }}
                  onError={(error) => {
                    console.error('[SolicitudDetalle v11.0] ❌ Error cargando imagen completa', index + 1);
                    console.error('[SolicitudDetalle v11.0] ❌ Error:', error.nativeEvent.error);
                    console.error('[SolicitudDetalle v11.0] ❌ URL:', imageUrl);
                  }}
                />
                {/* Indicador de carga */}
                <View style={styles.imageLoadingIndicator}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              </View>
            ))}
          </ScrollView>
          
          {/* Contador e indicadores */}
          <View style={styles.imageModalFooter}>
            <View style={styles.imageCounterContainer}>
              <Text style={styles.imageCounter}>{selectedImageIndex + 1} / {allImages.length}</Text>
            </View>
            {allImages.length > 1 && (
              <View style={styles.imageIndicators}>
                {allImages.map((_, index) => (
                  <View
                    key={`indicator-${index}`}
                    style={[
                      styles.imageIndicatorDot,
                      index === selectedImageIndex && styles.imageIndicatorDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModalContent}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>
                {actionType === 'aprobar' && '✅ Aprobar'}
                {actionType === 'denegar' && '❌ Denegar'}
                {actionType === 'cambiar_estado' && '🔄 Cambiar Estado'}
              </Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {actionType === 'aprobar' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalText}>¿Aprobar esta solicitud?</Text>
                <Text style={styles.actionModalSubtext}>
                  El usuario recibirá el rol de propietario.
                </Text>
                <Text style={styles.actionModalWarning}>
                  ⚠️ Las imágenes se eliminarán automáticamente del sistema.
                </Text>
              </View>
            )}

            {actionType === 'denegar' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalLabel}>Motivo de denegación *</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Ej: No se pudo verificar..."
                  placeholderTextColor={colors.textSecondary}
                  value={motivoDenegacion}
                  onChangeText={setMotivoDenegacion}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.actionModalWarning}>
                  ⚠️ Las imágenes se eliminarán automáticamente del sistema.
                </Text>
              </View>
            )}

            {actionType === 'cambiar_estado' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalLabel}>Nuevo estado:</Text>
                <View style={styles.stateOptions}>
                  <TouchableOpacity
                    style={[styles.stateOption, nuevoEstado === 'en_revision' && styles.stateOptionActive]}
                    onPress={() => setNuevoEstado('en_revision')}
                  >
                    <IconSymbol 
                      ios_icon_name="search" 
                      android_material_icon_name="search" 
                      size={20} 
                      color={nuevoEstado === 'en_revision' ? '#3B82F6' : colors.textSecondary} 
                    />
                    <Text style={[styles.stateOptionText, nuevoEstado === 'en_revision' && { color: '#3B82F6' }]}>
                      En Revisión
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stateOption, nuevoEstado === 'informacion_adicional' && styles.stateOptionActive]}
                    onPress={() => setNuevoEstado('informacion_adicional')}
                  >
                    <IconSymbol 
                      ios_icon_name="info" 
                      android_material_icon_name="info" 
                      size={20} 
                      color={nuevoEstado === 'informacion_adicional' ? '#8B5CF6' : colors.textSecondary} 
                    />
                    <Text style={[styles.stateOptionText, nuevoEstado === 'informacion_adicional' && { color: '#8B5CF6' }]}>
                      Info Adicional
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.actionModalLabel}>Notas (opcional):</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Notas para el usuario..."
                  placeholderTextColor={colors.textSecondary}
                  value={notasAdmin}
                  onChangeText={setNotasAdmin}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            <View style={styles.actionModalFooter}>
              <TouchableOpacity style={styles.actionModalCancelBtn} onPress={() => setShowActionModal(false)}>
                <Text style={styles.actionModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionModalConfirmBtn} onPress={executeAction}>
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.actionModalConfirmGradient}
                >
                  <Text style={styles.actionModalConfirmText}>Confirmar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  userUsernameText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailBtnText: {
    fontSize: 13,
    color: colors.primary,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  localTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  localNameText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 75,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  categoriesBox: {
    backgroundColor: colors.primary + '10',
    padding: 10,
    borderRadius: 8,
  },
  categoriesBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  categoriesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.headerText,
  },
  descBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
  },
  descBoxText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  messageBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  messageBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  messageBoxText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  // ✅ NUEVO v11.0: Estilos mejorados para galería de imágenes
  imagesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  imagesScrollContent: {
    gap: 12,
  },
  imageThumbContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  imageThumb: {
    width: 160,
    height: 160,
    backgroundColor: colors.cardBorder,
  },
  imageTypeIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  imageTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  imageNumberIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.headerText,
  },
  mapCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  mapCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  mapIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTextBox: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  mapCoords: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  schedulesCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scheduleDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    width: 90,
  },
  scheduleHoursText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  footerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  // ✅ NUEVO: Modal de imágenes simple (igual que posts)
  imageModalOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 20,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageScroll: {
    width: width,
    flex: 1,
  },
  fullImageContainer: {
    width: width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  fullImage: {
    width: width,
    height: Dimensions.get('window').height,
  },
  imageLoadingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  imageModalFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  imageCounterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  imageCounter: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  imageIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  imageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  actionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  actionModalBody: {
    marginBottom: 20,
  },
  actionModalText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 6,
    fontWeight: '600',
  },
  actionModalSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  actionModalWarning: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    backgroundColor: '#F59E0B' + '15',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  actionModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  modalTextArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  stateOptions: {
    gap: 10,
    marginBottom: 14,
  },
  stateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 14,
  },
  stateOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  stateOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionModalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  actionModalCancelBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionModalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionModalConfirmGradient: {
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
});
