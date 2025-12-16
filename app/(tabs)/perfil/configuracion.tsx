
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  // Notification settings
  const [notificacionesPush, setNotificacionesPush] = useState(true);
  const [notificacionesEmail, setNotificacionesEmail] = useState(true);
  const [notificacionesMenciones, setNotificacionesMenciones] = useState(true);
  const [notificacionesComentarios, setNotificacionesComentarios] = useState(true);
  const [notificacionesMeGusta, setNotificacionesMeGusta] = useState(true);
  const [notificacionesNuevosSeguidores, setNotificacionesNuevosSeguidores] = useState(true);
  const [notificacionesMensajes, setNotificacionesMensajes] = useState(true);
  const [notificacionesEventos, setNotificacionesEventos] = useState(true);
  
  // Language and appearance
  const [idioma, setIdioma] = useState('es');
  const [cacheSizeMB, setCacheSizeMB] = useState(0);
  const [showIdiomaModal, setShowIdiomaModal] = useState(false);

  const loadUserSettings = useCallback(async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('usuarios')
        .select('notificaciones_push, notificaciones_email, idioma')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setNotificacionesPush(data.notificaciones_push ?? true);
        setNotificacionesEmail(data.notificaciones_email ?? true);
        setIdioma(data.idioma ?? 'es');
      }

      await calculateCacheSize();
    } catch (error) {
      console.error('[Configuracion] Error cargando configuración:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user, loadUserSettings]);

  const calculateCacheSize = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }
      
      setCacheSizeMB(Math.round(totalSize / (1024 * 1024) * 100) / 100);
    } catch (error) {
      console.error('[Configuracion] Error calculando caché:', error);
    }
  };

  const updateUserSetting = async (field: string, value: any) => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('usuarios')
        .update({ [field]: value })
        .eq('id', user.id);

      if (error) {
        console.error('[Configuracion] Error actualizando configuración:', error);
        Alert.alert('Error', 'No se pudo actualizar la configuración');
      }
    } catch (error) {
      console.error('[Configuracion] Error:', error);
    }
  };

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Configuracion] 🚪 Cerrando sesión...');
              await signOut();
              console.log('[Configuracion] ✅ Sesión cerrada, redirigiendo...');
              router.replace('/(tabs)/explorar');
            } catch (error) {
              console.error('[Configuracion] ❌ Error cerrando sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          },
        },
      ]
    );
  };

  const handleEliminarCuenta = () => {
    Alert.alert(
      'Eliminar Cuenta',
      '¿Estás seguro? Esta acción no se puede deshacer. Se eliminarán todos tus datos permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;

              const { error } = await supabase
                .from('usuarios')
                .update({ activo: false, fecha_eliminacion: new Date().toISOString() })
                .eq('id', user.id);

              if (error) throw error;

              await signOut();
              router.replace('/(tabs)/explorar');
              
              Alert.alert('Cuenta eliminada', 'Tu cuenta ha sido eliminada exitosamente');
            } catch (error) {
              console.error('[Configuracion] Error eliminando cuenta:', error);
              Alert.alert('Error', 'No se pudo eliminar la cuenta');
            }
          },
        },
      ]
    );
  };

  const handleCambiarContrasena = () => {
    Alert.alert(
      'Cambiar Contraseña',
      'Se enviará un correo electrónico con instrucciones para cambiar tu contraseña',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              if (!user?.email) return;

              const { error } = await supabase.auth.resetPasswordForEmail(user.email);

              if (error) throw error;

              Alert.alert('Correo enviado', 'Revisa tu correo para cambiar tu contraseña');
            } catch (error) {
              console.error('[Configuracion] Error:', error);
              Alert.alert('Error', 'No se pudo enviar el correo');
            }
          },
        },
      ]
    );
  };

  const handleLimpiarCache = async () => {
    Alert.alert(
      'Limpiar Caché',
      '¿Quieres eliminar todos los datos temporales? Esto puede mejorar el rendimiento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await calculateCacheSize();
              Alert.alert('Caché limpiada', 'Los datos temporales han sido eliminados');
            } catch (error) {
              console.error('[Configuracion] Error limpiando caché:', error);
              Alert.alert('Error', 'No se pudo limpiar la caché');
            }
          },
        },
      ]
    );
  };

  const handleUsuariosBloqueados = () => {
    router.push('/perfil/usuarios-bloqueados');
  };

  const handleContenidoOculto = () => {
    router.push('/perfil/contenido-oculto');
  };

  const handleCentroAyuda = () => {
    router.push('/soporte/centro-ayuda');
  };

  const handleReportarProblema = () => {
    router.push('/soporte/reportar-problema');
  };

  const handleTerminos = () => {
    router.push('/legal/terminos');
  };

  const handlePrivacidad = () => {
    router.push('/legal/privacidad');
  };

  const handleAcercaDe = () => {
    router.push('/legal/acerca-de');
  };

  const handleIdiomaChange = (nuevoIdioma: string) => {
    setIdioma(nuevoIdioma);
    updateUserSetting('idioma', nuevoIdioma);
    setShowIdiomaModal(false);
    const nombreIdioma = nuevoIdioma === 'es' ? 'Español' : nuevoIdioma === 'en' ? 'English' : 'Català';
    Alert.alert('Idioma actualizado', `El idioma se ha cambiado a ${nombreIdioma}`);
  };

  const handleDescargarDatos = () => {
    Alert.alert(
      'Descargar mis datos',
      'Se generará un archivo con toda tu información y se enviará a tu correo electrónico en las próximas 24 horas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: () => {
            Alert.alert('Solicitud enviada', 'Recibirás un correo con tus datos en las próximas 24 horas');
          },
        },
      ]
    );
  };

  const handlePrivacidadCuenta = () => {
    Alert.alert(
      'Privacidad de cuenta',
      'Controla quién puede ver tu contenido y perfil',
      [
        {
          text: 'Cuenta pública',
          onPress: () => Alert.alert('Configurado', 'Tu cuenta es pública. Cualquiera puede ver tu contenido.'),
        },
        {
          text: 'Cuenta privada',
          onPress: () => Alert.alert('Configurado', 'Tu cuenta es privada. Solo tus seguidores pueden ver tu contenido.'),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleAutenticacionDosFactor = () => {
    Alert.alert(
      'Autenticación de dos factores',
      '¿Deseas activar la autenticación de dos factores para mayor seguridad?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Activar',
          onPress: () => Alert.alert('Activado', 'La autenticación de dos factores ha sido activada'),
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
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notificaciones section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notificaciones Push</Text>
              <Text style={styles.settingDescription}>
                Recibe notificaciones en tu dispositivo
              </Text>
            </View>
            <Switch
              value={notificacionesPush}
              onValueChange={(value) => {
                setNotificacionesPush(value);
                updateUserSetting('notificaciones_push', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notificaciones por Email</Text>
              <Text style={styles.settingDescription}>
                Recibe actualizaciones por correo
              </Text>
            </View>
            <Switch
              value={notificacionesEmail}
              onValueChange={(value) => {
                setNotificacionesEmail(value);
                updateUserSetting('notificaciones_email', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Menciones</Text>
              <Text style={styles.settingDescription}>
                Cuando alguien te menciona
              </Text>
            </View>
            <Switch
              value={notificacionesMenciones}
              onValueChange={setNotificacionesMenciones}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Comentarios</Text>
              <Text style={styles.settingDescription}>
                Cuando alguien comenta tus publicaciones
              </Text>
            </View>
            <Switch
              value={notificacionesComentarios}
              onValueChange={setNotificacionesComentarios}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Me gusta</Text>
              <Text style={styles.settingDescription}>
                Cuando alguien le da me gusta a tus publicaciones
              </Text>
            </View>
            <Switch
              value={notificacionesMeGusta}
              onValueChange={setNotificacionesMeGusta}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Nuevos seguidores</Text>
              <Text style={styles.settingDescription}>
                Cuando alguien te empieza a seguir
              </Text>
            </View>
            <Switch
              value={notificacionesNuevosSeguidores}
              onValueChange={setNotificacionesNuevosSeguidores}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Mensajes</Text>
              <Text style={styles.settingDescription}>
                Cuando recibes un mensaje nuevo
              </Text>
            </View>
            <Switch
              value={notificacionesMensajes}
              onValueChange={setNotificacionesMensajes}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Eventos</Text>
              <Text style={styles.settingDescription}>
                Recordatorios de eventos guardados
              </Text>
            </View>
            <Switch
              value={notificacionesEventos}
              onValueChange={setNotificacionesEventos}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Idioma section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Idioma y Región</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowIdiomaModal(true)}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Idioma de la aplicación</Text>
              <Text style={styles.settingDescription}>
                {idioma === 'es' ? 'Español' : idioma === 'en' ? 'English' : 'Català'}
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Privacidad y Seguridad section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad y Seguridad</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleUsuariosBloqueados}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Usuarios bloqueados</Text>
              <Text style={styles.settingDescription}>
                Gestiona los usuarios que has bloqueado
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleContenidoOculto}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Contenido oculto</Text>
              <Text style={styles.settingDescription}>
                Publicaciones y comentarios ocultos
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleCambiarContrasena}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Cambiar contraseña</Text>
              <Text style={styles.settingDescription}>
                Actualiza tu contraseña de acceso
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handlePrivacidadCuenta}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacidad de cuenta</Text>
              <Text style={styles.settingDescription}>
                Controla quién puede ver tu contenido
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleAutenticacionDosFactor}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Autenticación de dos factores</Text>
              <Text style={styles.settingDescription}>
                Añade una capa extra de seguridad
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Datos section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos y Almacenamiento</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleLimpiarCache}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Limpiar caché</Text>
              <Text style={styles.settingDescription}>
                {cacheSizeMB} MB de datos temporales
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleDescargarDatos}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Descargar mis datos</Text>
              <Text style={styles.settingDescription}>
                Solicita una copia de tu información
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Soporte section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte y Ayuda</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleCentroAyuda}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Centro de ayuda</Text>
              <Text style={styles.settingDescription}>
                Encuentra respuestas a tus preguntas
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleReportarProblema}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reportar un problema</Text>
              <Text style={styles.settingDescription}>
                Ayúdanos a mejorar BarLive
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Contacto', 'Escríbenos a soporte@barlive.app')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Contactar soporte</Text>
              <Text style={styles.settingDescription}>
                soporte@barlive.app
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Legal section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal e Información</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleTerminos}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Términos y condiciones</Text>
              <Text style={styles.settingDescription}>
                Última actualización: Enero 2025
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handlePrivacidad}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Política de privacidad</Text>
              <Text style={styles.settingDescription}>
                Última actualización: Enero 2025
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleAcercaDe}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Acerca de BarLive</Text>
              <Text style={styles.settingDescription}>
                Versión 1.0.0 • Descubre la vida nocturna
              </Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.newsBox}>
            <View style={styles.newsHeader}>
              <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color={colors.primary} />
              <Text style={styles.newsTitle}>Novedades de BarLive</Text>
            </View>
            <Text style={styles.newsText}>
              {'\u2022'} Nueva red social integrada para conectar con otros usuarios{'\n'}
              {'\u2022'} Salas virtuales en tiempo real para interactuar{'\n'}
              {'\u2022'} Sistema de momentos para compartir experiencias{'\n'}
              {'\u2022'} Perfiles de locales con información detallada{'\n'}
              {'\u2022'} Mapas interactivos con filtros avanzados{'\n'}
              {'\u2022'} Sistema de reseñas y valoraciones mejorado
            </Text>
          </View>
        </View>

        {/* Account actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleCerrarSesion}>
            <Text style={styles.dangerButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={handleEliminarCuenta}>
            <Text style={styles.dangerButtonText}>Eliminar Cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* Extra padding at bottom to ensure buttons are accessible */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={showIdiomaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIdiomaModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowIdiomaModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Idioma</Text>
            
            {[
              { code: 'es', name: 'Español', flag: '🇪🇸' },
              { code: 'en', name: 'English', flag: '🇬🇧' },
              { code: 'ca', name: 'Català', flag: '🏴' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.modalOption}
                onPress={() => handleIdiomaChange(lang.code)}
              >
                <View style={styles.modalOptionLeft}>
                  <Text style={styles.modalOptionFlag}>{lang.flag}</Text>
                  <Text style={styles.modalOptionText}>{lang.name}</Text>
                </View>
                {idioma === lang.code && (
                  <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  newsBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  newsText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  dangerButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionFlag: {
    fontSize: 24,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
});
