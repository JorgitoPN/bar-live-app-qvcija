
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface EventoData {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string;
  precio: number | null;
  imagen_url: string | null;
  local_id: string | null;
  provincia: string | null;
  destacado: boolean;
  local_nombre?: string;
  local_direccion?: string;
  local_ciudad?: string;
}

export default function DetalleEventoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [evento, setEvento] = useState<EventoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarEvento();
  }, [params.id]);

  const cargarEvento = async () => {
    try {
      setLoading(true);
      const eventoId = params.id as string;

      if (!eventoId) {
        console.error('[DetalleEvento] No event ID provided');
        router.back();
        return;
      }

      console.log('[DetalleEvento] Loading event:', eventoId);

      const { data, error } = await supabase
        .from('eventos')
        .select(`
          *,
          locales:local_id (
            nombre,
            direccion,
            ciudad
          )
        `)
        .eq('id', eventoId)
        .eq('activo', true)
        .single();

      if (error) {
        console.error('[DetalleEvento] Error loading event:', error);
        router.back();
        return;
      }

      if (!data) {
        console.error('[DetalleEvento] Event not found');
        router.back();
        return;
      }

      // Transform the data to match our interface
      const eventoData: EventoData = {
        id: data.id,
        titulo: data.titulo,
        descripcion: data.descripcion,
        fecha: data.fecha,
        hora: data.hora,
        precio: data.precio,
        imagen_url: data.imagen_url,
        local_id: data.local_id,
        provincia: data.provincia,
        destacado: data.destacado,
        local_nombre: data.locales?.nombre,
        local_direccion: data.locales?.direccion,
        local_ciudad: data.locales?.ciudad,
      };

      console.log('[DetalleEvento] Event loaded:', eventoData.titulo);
      setEvento(eventoData);
    } catch (error) {
      console.error('[DetalleEvento] Error:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string): string => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return fecha;
    }
  };

  const formatHora = (hora: string): string => {
    try {
      // hora comes in format "HH:MM:SS"
      const parts = hora.split(':');
      return `${parts[0]}:${parts[1]}`;
    } catch (error) {
      return hora;
    }
  };

  const getLocalAddress = (): string => {
    if (!evento) return '';
    
    let address = evento.local_direccion || '';
    if (evento.local_ciudad) {
      address += address ? `, ${evento.local_ciudad}` : evento.local_ciudad;
    }
    if (evento.provincia) {
      address += address ? `, ${evento.provincia}` : evento.provincia;
    }
    return address;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando evento...</Text>
        </View>
      </View>
    );
  }

  if (!evento) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Evento no encontrado</Text>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToListText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.imageContainer}>
          {evento.imagen_url ? (
            <Image source={{ uri: evento.imagen_url }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <IconSymbol name="photo" size={64} color={colors.textSecondary} />
            </View>
          )}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonCircle}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </View>
          </TouchableOpacity>
          {evento.destacado && (
            <View style={[commonStyles.badge, commonStyles.badgeDestacado, styles.badge]}>
              <Text style={commonStyles.badgeDestacadoText}>⭐ Destacado</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.titulo}>{evento.titulo}</Text>

          <View style={styles.infoRow}>
            <IconSymbol name="calendar" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{formatFecha(evento.fecha)}</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="clock" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{formatHora(evento.hora)}</Text>
          </View>

          {evento.local_nombre && (
            <View style={styles.infoRow}>
              <IconSymbol name="location" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoText}>{evento.local_nombre}</Text>
                {getLocalAddress() && (
                  <Text style={styles.infoSubtext}>{getLocalAddress()}</Text>
                )}
              </View>
            </View>
          )}

          {evento.precio !== null && evento.precio > 0 && (
            <View style={styles.infoRow}>
              <IconSymbol name="ticket" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoText}>Precio: {evento.precio}€</Text>
                <Text style={styles.infoSubtext}>
                  (Precio informativo - Consultar disponibilidad en el local)
                </Text>
              </View>
            </View>
          )}

          {evento.precio === 0 && (
            <View style={styles.infoRow}>
              <IconSymbol name="ticket" size={20} color={colors.primary} />
              <Text style={styles.infoText}>Entrada gratuita</Text>
            </View>
          )}

          {evento.descripcion && (
            <React.Fragment>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.descripcion}>{evento.descripcion}</Text>
            </React.Fragment>
          )}

          <View style={styles.divider} />

          <View style={styles.infoBox}>
            <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.infoBoxTitle}>Información importante</Text>
              <Text style={styles.infoBoxText}>
                Para más información sobre este evento, horarios y disponibilidad, 
                contacta directamente con el local.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 20,
  },
  backToListButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToListText: {
    color: colors.headerText,
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
  },
  imagePlaceholder: {
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
  },
  backButtonCircle: {
    backgroundColor: colors.cardBackground,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 50,
    right: 16,
  },
  content: {
    padding: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  infoSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  descripcion: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#0C4A6E',
    lineHeight: 20,
  },
});
