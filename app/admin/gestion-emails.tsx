
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';

export default function GestionEmailsScreen() {
  const router = useRouter();

  const plantillas = [
    {
      id: 'bienvenida',
      nombre: 'Email de Bienvenida',
      descripcion: 'Enviado al registrarse un nuevo usuario',
      asunto: '¡Bienvenido a BarLive!',
      contenido: 'Hola {{nombre}}, bienvenido a BarLive...',
    },
    {
      id: 'verificacion',
      nombre: 'Verificación de Email',
      descripcion: 'Enviado para verificar el correo electrónico',
      asunto: 'Verifica tu email en BarLive',
      contenido: 'Hola {{nombre}}, verifica tu email haciendo clic aquí...',
    },
    {
      id: 'recuperacion',
      nombre: 'Recuperación de Contraseña',
      descripcion: 'Enviado al solicitar recuperar contraseña',
      asunto: 'Recupera tu contraseña de BarLive',
      contenido: 'Hola {{nombre}}, haz clic aquí para recuperar tu contraseña...',
    },
    {
      id: 'evento',
      nombre: 'Notificación de Evento',
      descripcion: 'Enviado cuando hay un nuevo evento',
      asunto: 'Nuevo evento en {{local}}',
      contenido: 'Hola {{nombre}}, hay un nuevo evento en {{local}}...',
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Emails</Text>
        <Text style={styles.headerSubtitle}>
          Plantillas y configuración de correos
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {plantillas.map((plantilla) => (
          <View key={plantilla.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol name="envelope.fill" size={24} color={colors.primary} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{plantilla.nombre}</Text>
                <Text style={styles.cardDescription}>{plantilla.descripcion}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Asunto:</Text>
              <Text style={styles.detailValue}>{plantilla.asunto}</Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                Alert.alert('Editar Plantilla', `Editando: ${plantilla.nombre}`);
              }}
            >
              <IconSymbol name="pencil" size={16} color="white" />
              <Text style={styles.editButtonText}>Editar Plantilla</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.infoCard}>
          <IconSymbol name="info.circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Variables Disponibles</Text>
            <Text style={styles.infoText}>
              - nombre - Nombre del usuario{'\n'}
              - email - Email del usuario{'\n'}
              - local - Nombre del local{'\n'}
              - fecha - Fecha actual
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
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
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
    lineHeight: 20,
  },
});
