
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';

export default function ConfiguracionGeneralScreen() {
  const router = useRouter();
  
  // Configuración general
  const [mantenimiento, setMantenimiento] = useState(false);
  const [registroAbierto, setRegistroAbierto] = useState(true);
  const [verificacionEmail, setVerificacionEmail] = useState(true);
  
  // Configuración de contenido
  const [moderacionAutomatica, setModeracionAutomatica] = useState(true);
  const [comentariosActivos, setComentariosActivos] = useState(true);
  
  // Configuración de notificaciones
  const [notificacionesEmail, setNotificacionesEmail] = useState(true);
  const [notificacionesPush, setNotificacionesPush] = useState(true);
  
  // Límites y restricciones
  const [maxFotosPorLocal, setMaxFotosPorLocal] = useState('10');
  const [maxEventosPorMes, setMaxEventosPorMes] = useState('5');

  const guardarConfiguracion = () => {
    Alert.alert(
      'Guardar Configuración',
      '¿Deseas guardar los cambios realizados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: () => {
            // Aquí iría la lógica para guardar en Supabase
            Alert.alert('Éxito', 'Configuración guardada correctamente');
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
        <Text style={styles.headerTitle}>Configuración General</Text>
        <Text style={styles.headerSubtitle}>
          Ajustes del sistema y aplicación
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sistema */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Sistema</Text>
          
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Modo Mantenimiento</Text>
                <Text style={styles.settingDescription}>
                  Desactiva temporalmente la app para mantenimiento
                </Text>
              </View>
              <Switch
                value={mantenimiento}
                onValueChange={setMantenimiento}
                trackColor={{ false: colors.border, true: '#EF4444' }}
                thumbColor="white"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Registro Abierto</Text>
                <Text style={styles.settingDescription}>
                  Permitir nuevos registros de usuarios
                </Text>
              </View>
              <Switch
                value={registroAbierto}
                onValueChange={setRegistroAbierto}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Verificación de Email</Text>
                <Text style={styles.settingDescription}>
                  Requerir verificación de email al registrarse
                </Text>
              </View>
              <Switch
                value={verificacionEmail}
                onValueChange={setVerificacionEmail}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>
        </View>

        {/* Contenido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Contenido</Text>
          
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Moderación Automática</Text>
                <Text style={styles.settingDescription}>
                  Filtrar contenido inapropiado automáticamente
                </Text>
              </View>
              <Switch
                value={moderacionAutomatica}
                onValueChange={setModeracionAutomatica}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Comentarios Activos</Text>
                <Text style={styles.settingDescription}>
                  Permitir comentarios en publicaciones
                </Text>
              </View>
              <Switch
                value={comentariosActivos}
                onValueChange={setComentariosActivos}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>
        </View>

        {/* Notificaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>
          
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Notificaciones por Email</Text>
                <Text style={styles.settingDescription}>
                  Enviar notificaciones importantes por correo
                </Text>
              </View>
              <Switch
                value={notificacionesEmail}
                onValueChange={setNotificacionesEmail}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Notificaciones Push</Text>
                <Text style={styles.settingDescription}>
                  Enviar notificaciones push a dispositivos móviles
                </Text>
              </View>
              <Switch
                value={notificacionesPush}
                onValueChange={setNotificacionesPush}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>
        </View>

        {/* Límites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Límites y Restricciones</Text>
          
          <View style={styles.card}>
            <Text style={styles.label}>Máximo de Fotos por Local</Text>
            <TextInput
              style={styles.input}
              value={maxFotosPorLocal}
              onChangeText={setMaxFotosPorLocal}
              keyboardType="number-pad"
              placeholder="10"
            />
            <Text style={styles.helperText}>
              Número máximo de fotos que puede subir un propietario
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Máximo de Eventos por Mes</Text>
            <TextInput
              style={styles.input}
              value={maxEventosPorMes}
              onChangeText={setMaxEventosPorMes}
              keyboardType="number-pad"
              placeholder="5"
            />
            <Text style={styles.helperText}>
              Número máximo de eventos que puede crear un local al mes
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={guardarConfiguracion}
        >
          <IconSymbol name="checkmark.circle.fill" size={20} color="white" />
          <Text style={styles.saveButtonText}>Guardar Configuración</Text>
        </TouchableOpacity>

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
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    ...commonStyles.shadow,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    ...commonStyles.shadow,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
