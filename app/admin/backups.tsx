
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';

interface Backup {
  id: string;
  fecha: string;
  tamano: string;
  tipo: 'manual' | 'automatico';
  estado: 'completado' | 'en_progreso' | 'error';
}

export default function BackupsScreen() {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([
    {
      id: '1',
      fecha: '2025-01-20 08:00',
      tamano: '2.5 GB',
      tipo: 'automatico',
      estado: 'completado',
    },
    {
      id: '2',
      fecha: '2025-01-19 08:00',
      tamano: '2.4 GB',
      tipo: 'automatico',
      estado: 'completado',
    },
    {
      id: '3',
      fecha: '2025-01-15 14:30',
      tamano: '2.3 GB',
      tipo: 'manual',
      estado: 'completado',
    },
  ]);

  const crearBackup = async () => {
    Alert.alert(
      'Crear Backup',
      '¿Deseas crear un backup manual de la base de datos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: async () => {
            setCreando(true);
            // Simular creación de backup
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const nuevoBackup: Backup = {
              id: Date.now().toString(),
              fecha: new Date().toLocaleString('es-ES'),
              tamano: '2.6 GB',
              tipo: 'manual',
              estado: 'completado',
            };
            
            setBackups(prev => [nuevoBackup, ...prev]);
            setCreando(false);
            Alert.alert('Éxito', 'Backup creado correctamente');
          },
        },
      ]
    );
  };

  const restaurarBackup = (backup: Backup) => {
    Alert.alert(
      'Restaurar Backup',
      `¿Deseas restaurar el backup del ${backup.fecha}?\n\n⚠️ Esta acción sobrescribirá los datos actuales.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Éxito', 'Backup restaurado correctamente');
          },
        },
      ]
    );
  };

  const eliminarBackup = (id: string) => {
    Alert.alert(
      'Eliminar Backup',
      '¿Estás seguro de eliminar este backup?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setBackups(prev => prev.filter(b => b.id !== id));
            Alert.alert('Éxito', 'Backup eliminado correctamente');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Backups</Text>
        <Text style={styles.headerSubtitle}>
          Crear y restaurar copias de seguridad
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={crearBackup}
          disabled={creando}
        >
          {creando ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <IconSymbol name="plus.circle.fill" size={24} color="white" />
              <Text style={styles.createButtonText}>Crear Backup Manual</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Backups Disponibles</Text>

        {backups.map(backup => (
          <View key={backup.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol
                name="externaldrive.fill"
                size={32}
                color={colors.primary}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{backup.fecha}</Text>
                <Text style={styles.cardSubtitle}>
                  {backup.tamano} • {backup.tipo === 'manual' ? 'Manual' : 'Automático'}
                </Text>
              </View>
              <View
                style={[
                  styles.estadoBadge,
                  { backgroundColor: backup.estado === 'completado' ? '#10B981' : '#EF4444' },
                ]}
              >
                <Text style={styles.estadoText}>
                  {backup.estado === 'completado' ? 'Completado' : 'Error'}
                </Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => restaurarBackup(backup)}
              >
                <IconSymbol name="arrow.clockwise" size={16} color="white" />
                <Text style={styles.actionButtonText}>Restaurar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => eliminarBackup(backup.id)}
              >
                <IconSymbol name="trash" size={16} color="white" />
                <Text style={styles.actionButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.infoCard}>
          <IconSymbol name="info.circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Backups Automáticos</Text>
            <Text style={styles.infoText}>
              Se crean backups automáticos diariamente a las 08:00. Los backups
              se conservan durante 30 días.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...commonStyles.shadow,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  estadoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonDanger: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    marginTop: 20,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
});
