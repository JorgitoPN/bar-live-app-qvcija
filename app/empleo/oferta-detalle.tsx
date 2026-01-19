
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

interface OfertaTrabajo {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  salario?: string;
  requisitos?: string[];
  provincia?: string;
  imagen_url?: string;
  created_at: string;
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
    direccion?: string;
    telefono?: string;
  };
  propietario?: {
    id: string;
    nombre: string;
    avatar?: string;
  };
}

export default function OfertaDetalleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [oferta, setOferta] = useState<OfertaTrabajo | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarOferta = useCallback(async () => {
    if (!id) {
      Alert.alert('Error', 'No se especificó la oferta');
      router.back();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          local:locales(id, nombre, imagen_url, direccion, telefono),
          propietario:usuarios(id, nombre, avatar)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const ofertaConImagen = {
        ...data,
        imagen_url: data.imagen_url || data.local?.imagen_url,
      };

      setOferta(ofertaConImagen);
    } catch (error) {
      console.error('[OfertaDetalle] Error loading offer:', error);
      Alert.alert('Error', 'No se pudo cargar la oferta');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    cargarOferta();
  }, [cargarOferta]);

  const handleAplicar = () => {
    if (!user) {
      Alert.alert(
        'Inicia Sesión',
        'Debes iniciar sesión para aplicar a ofertas de trabajo',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Aplicar a Oferta',
      '¿Deseas aplicar a esta oferta de trabajo? El propietario recibirá tu perfil profesional.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          onPress: async () => {
            try {
              // Create notification for owner
              if (oferta?.propietario?.id) {
                await supabase.from('notificaciones').insert({
                  usuario_id: oferta.propietario.id,
                  tipo: 'sistema',
                  titulo: 'Nueva aplicación a oferta',
                  mensaje: `${user.nombre} ha aplicado a tu oferta: ${oferta.titulo}`,
                  usuario_origen_id: user.id,
                });
              }

              Alert.alert(
                'Aplicación Enviada',
                'Tu aplicación ha sido enviada al propietario. Te contactarán si están interesados.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('[OfertaDetalle] Error applying:', error);
              Alert.alert('Error', 'No se pudo enviar la aplicación');
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
        <Text style={styles.loadingText}>Cargando oferta...</Text>
      </View>
    );
  }

  if (!oferta) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <IconSymbol name="exclamationmark.triangle" size={64} color={colors.textSecondary} />
        <Text style={styles.loadingText}>Oferta no encontrada</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const diasPublicado = calcularDiasPublicado(oferta.created_at);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Oferta de Trabajo</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {oferta.imagen_url && (
          <Image 
            source={{ uri: oferta.imagen_url }} 
            style={styles.offerImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.offerHeader}>
          <View style={styles.offerTitleContainer}>
            <Text style={styles.offerTitle}>{oferta.titulo}</Text>
            {diasPublicado < 7 && (
              <View style={styles.badgeNuevo}>
                <Text style={styles.badgeNuevoText}>Nuevo</Text>
              </View>
            )}
          </View>
          <Text style={styles.offerLocal}>
            {oferta.local?.nombre || oferta.propietario?.nombre || 'Local'}
          </Text>
          <Text style={styles.offerDate}>
            Publicado hace {diasPublicado} {diasPublicado === 1 ? 'día' : 'días'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.sectionText}>{oferta.descripcion}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles</Text>
          <View style={styles.detailRow}>
            <IconSymbol name="briefcase" size={20} color={colors.primary} />
            <Text style={styles.detailText}>Tipo: {oferta.tipo}</Text>
          </View>
          {oferta.salario && (
            <View style={styles.detailRow}>
              <IconSymbol name="eurosign.circle" size={20} color={colors.primary} />
              <Text style={styles.detailText}>Salario: {oferta.salario}</Text>
            </View>
          )}
          {oferta.provincia && (
            <View style={styles.detailRow}>
              <IconSymbol name="mappin" size={20} color={colors.primary} />
              <Text style={styles.detailText}>Provincia: {oferta.provincia}</Text>
            </View>
          )}
        </View>

        {oferta.requisitos && oferta.requisitos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requisitos</Text>
            {oferta.requisitos.map((requisito, index) => (
              <View key={index} style={styles.requisitoRow}>
                <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                <Text style={styles.requisitoText}>{requisito}</Text>
              </View>
            ))}
          </View>
        )}

        {oferta.local && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Local</Text>
            <Text style={styles.sectionText}>{oferta.local.nombre}</Text>
            {oferta.local.direccion && (
              <Text style={styles.sectionSubtext}>{oferta.local.direccion}</Text>
            )}
            {oferta.local.telefono && (
              <Text style={styles.sectionSubtext}>Tel: {oferta.local.telefono}</Text>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyButton} onPress={handleAplicar}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.applyButtonGradient}
          >
            <Text style={styles.applyButtonText}>Aplicar a esta Oferta</Text>
          </LinearGradient>
        </TouchableOpacity>
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
  offerImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardBorder,
  },
  offerHeader: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  offerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  badgeNuevo: {
    backgroundColor: colors.badgeNuevo,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeNuevoText: {
    color: colors.badgeNuevoText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  offerLocal: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  offerDate: {
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
  sectionSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: colors.text,
  },
  requisitoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  requisitoText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  footer: {
    padding: 16,
    paddingBottom: 34,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  applyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
});
