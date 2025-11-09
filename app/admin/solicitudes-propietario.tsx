
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';

const mockSolicitudes = [
  {
    id: '1',
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    nombreLocal: 'Bar Central',
    fecha: '2024-01-15',
    estado: 'pendiente',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
  },
  {
    id: '2',
    nombre: 'María López',
    email: 'maria@example.com',
    nombreLocal: 'Restaurante La Plaza',
    fecha: '2024-01-14',
    estado: 'pendiente',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  },
  {
    id: '3',
    nombre: 'Carlos García',
    email: 'carlos@example.com',
    nombreLocal: 'Discoteca Noche',
    fecha: '2024-01-13',
    estado: 'aprobada',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  },
];

export default function AdminSolicitudesPropietarioScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>(
    'todas'
  );

  const solicitudesFiltradas =
    filtro === 'todas'
      ? mockSolicitudes
      : mockSolicitudes.filter((s) => s.estado === filtro);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitudes</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.filters}>
        {['todas', 'pendiente', 'aprobada', 'rechazada'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filtro === f && styles.filterButtonActive]}
            onPress={() => setFiltro(f as any)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtro === f && styles.filterButtonTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {solicitudesFiltradas.map((solicitud) => (
          <TouchableOpacity
            key={solicitud.id}
            style={[commonStyles.card, commonStyles.cardShadow, styles.solicitudCard]}
            onPress={() => router.push(`/admin/ver-ficha?id=${solicitud.id}`)}
          >
            <Image source={{ uri: solicitud.avatar }} style={styles.avatar} />
            <View style={styles.solicitudInfo}>
              <Text style={styles.nombre}>{solicitud.nombre}</Text>
              <Text style={styles.email}>{solicitud.email}</Text>
              <Text style={styles.local}>{solicitud.nombreLocal}</Text>
              <Text style={styles.fecha}>
                {new Date(solicitud.fecha).toLocaleDateString('es-ES')}
              </Text>
            </View>
            <View
              style={[
                styles.estadoBadge,
                solicitud.estado === 'pendiente' && styles.estadoPendiente,
                solicitud.estado === 'aprobada' && styles.estadoAprobada,
                solicitud.estado === 'rechazada' && styles.estadoRechazada,
              ]}
            >
              <Text style={styles.estadoText}>
                {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
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
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.headerText,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  solicitudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  solicitudInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  local: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  fecha: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  estadoBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  estadoPendiente: {
    backgroundColor: colors.badgeDestacado,
  },
  estadoAprobada: {
    backgroundColor: '#10B981',
  },
  estadoRechazada: {
    backgroundColor: colors.badgeNuevo,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
});
