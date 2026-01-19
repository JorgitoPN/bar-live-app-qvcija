
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
  const [modoDesarrollo, setModoDesarrollo] = useState(false);
  
  // Configuración de contenido
  const [moderacionAutomatica, setModeracionAutomatica] = useState(true);
  const [comentariosActivos, setComentariosActivos] = useState(true);
  const [publicacionesActivas, setPublicacionesActivas] = useState(true);
  const [historiasActivas, setHistoriasActivas] = useState(true);
  
  // Configuración de notificaciones
  const [notificacionesEmail, setNotificacionesEmail] = useState(true);
  const [notificacionesPush, setNotificacionesPush] = useState(true);
  const [notificacionesInApp, setNotificacionesInApp] = useState(true);
  
  // Configuración de funcionalidades
  const [chatActivo, setChatActivo] = useState(true);
  const [salaVirtualActiva, setSalaVirtualActiva] = useState(true);
  const [eventosActivos, setEventosActivos] = useState(true);
  const [empleoActivo, setEmpleoActivo] = useState(true);

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

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Modo Desarrollo</Text>
                <Text style={styles.settingDescription}>
                  Activar funciones de desarrollo y debugging
                </Text>
              </View>
              <Switch
                value={modoDesarrollo}
                onValueChange={setModoDesarrollo}
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

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Publicaciones Activas</Text>
                <Text style={styles.settingDescription}>
                  Permitir crear nuevas publicaciones
                </Text>
              </View>
              <Switch
                value={publicacionesActivas}
                onValueChange={setPublicacionesActivas}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Historias Activas</Text>
                <Text style={styles.settingDescription}>
                  Permitir crear y ver historias
                </Text>
              </View>
              <Switch
                value={historiasActivas}
                onValueChange={setHistoriasActivas}
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

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Notificaciones In-App</Text>
                <Text style={styles.settingDescription}>
                  Mostrar notificaciones dentro de la aplicación
                </Text>
              </View>
              <Switch
                value={notificacionesInApp}
                onValueChange={setNotificacionesInApp}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>
        </View>

        {/* Funcionalidades */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Funcionalidades</Text>
          
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Chat Activo</Text>
                <Text style={styles.settingDescription}>
                  Permitir mensajería entre usuarios
                </Text>
              </View>
              <Switch
                value={chatActivo}
                onValueChange={setChatActivo}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Sala Virtual Activa</Text>
                <Text style={styles.settingDescription}>
                  Permitir acceso a salas virtuales de locales
                </Text>
              </View>
              <Switch
                value={salaVirtualActiva}
                onValueChange={setSalaVirtualActiva}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Eventos Activos</Text>
                <Text style={styles.settingDescription}>
                  Permitir crear y gestionar eventos
                </Text>
              </View>
              <Switch
                value={eventosActivos}
                onValueChange={setEventosActivos}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Empleo Activo</Text>
                <Text style={styles.settingDescription}>
                  Permitir publicar y buscar ofertas de empleo
                </Text>
              </View>
              <Switch
                value={empleoActivo}
                onValueChange={setEmpleoActivo}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
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
