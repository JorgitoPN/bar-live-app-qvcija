
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const mockSolicitud = {
  id: '1',
  nombre: 'Juan Pérez',
  email: 'juan@example.com',
  telefono: '+34 600 000 000',
  nombreLocal: 'Bar Central',
  direccionLocal: 'Calle Mayor 45, Madrid',
  tipoLocal: 'bar',
  descripcion: 'Bar de copas en el centro de Madrid con música en vivo los fines de semana.',
  documento: 'https://example.com/documento.pdf',
  fecha: '2024-01-15',
  estado: 'pendiente',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
};

export default function AdminVerFichaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleAprobar = () => {
    Alert.alert(
      'Aprobar Solicitud',
      '¿Estás seguro de que quieres aprobar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: () => {
            console.log('Aprobar solicitud:', mockSolicitud.id);
            Alert.alert('Éxito', 'Solicitud aprobada correctamente', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  };

  const handleRechazar = () => {
    Alert.alert(
      'Rechazar Solicitud',
      '¿Estás seguro de que quieres rechazar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => {
            console.log('Rechazar solicitud:', mockSolicitud.id);
            Alert.alert('Solicitud rechazada', '', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ficha de Solicitud</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: mockSolicitud.avatar }} style={styles.avatar} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{mockSolicitud.nombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{mockSolicitud.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Teléfono:</Text>
            <Text style={styles.value}>{mockSolicitud.telefono}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Local</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{mockSolicitud.nombreLocal}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Tipo:</Text>
            <Text style={styles.value}>
              {mockSolicitud.tipoLocal.charAt(0).toUpperCase() +
                mockSolicitud.tipoLocal.slice(1)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Dirección:</Text>
            <Text style={styles.value}>{mockSolicitud.direccionLocal}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Descripción:</Text>
            <Text style={styles.value}>{mockSolicitud.descripcion}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documentación</Text>
          <TouchableOpacity style={styles.documentButton}>
            <IconSymbol name="doc.text" size={24} color={colors.primary} />
            <Text style={styles.documentText}>Ver documento adjunto</Text>
            <IconSymbol name="arrow.down.circle" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fecha de Solicitud</Text>
          <Text style={styles.value}>
            {new Date(mockSolicitud.fecha).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {mockSolicitud.estado === 'pendiente' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.aprobarButton} onPress={handleAprobar}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.actionGradient}
              >
                <IconSymbol name="checkmark.circle" size={24} color={colors.headerText} />
                <Text style={styles.actionText}>Aprobar</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rechazarButton} onPress={handleRechazar}>
              <View style={styles.rechazarContent}>
                <IconSymbol name="xmark.circle" size={24} color={colors.badgeNuevo} />
                <Text style={styles.rechazarText}>Rechazar</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  section: {
    backgroundColor: colors.cardBackground,
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  documentText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  aprobarButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  rechazarButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.badgeNuevo,
    overflow: 'hidden',
  },
  rechazarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  rechazarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.badgeNuevo,
  },
});
