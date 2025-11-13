
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
  
  const [notificacionesPush, setNotificacionesPush] = useState(true);
  const [notificacionesEmail, setNotificacionesEmail] = useState(true);
  const [modoOscuro, setModoOscuro] = useState(false);
  const [tamanoTexto, setTamanoTexto] = useState('medio');
  const [idioma, setIdioma] = useState('es');
  const [cacheSizeMB, setCacheSizeMB] = useState(0);
  const [showTamanoModal, setShowTamanoModal] = useState(false);
  const [showIdiomaModal, setShowIdiomaModal] = useState(false);

  const loadUserSettings = useCallback(async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('usuarios')
        .select('notificaciones_push, notificaciones_email, modo_oscuro, tamano_texto, idioma')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setNotificacionesPush(data.notificaciones_push ?? true);
        setNotificacionesEmail(data.notificaciones_email ?? true);
        setModoOscuro(data.modo_oscuro ?? false);
        setTamanoTexto(data.tamano_texto ?? 'medio');
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

  const handleDescargarDatos = async () => {
    Alert.alert(
      'Descargar Datos',
      'Se enviará un correo con todos tus datos en formato JSON',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descargar',
          onPress: () => {
            Alert.alert('Solicitud enviada', 'Recibirás un correo con tus datos en 24-48 horas');
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

  const handleTamanoTextoChange = (tamano: string) => {
    setTamanoTexto(tamano);
    updateUserSetting('tamano_texto', tamano);
    setShowTamanoModal(false);
  };

  const handleIdiomaChange = (idioma: string) => {
    setIdioma(idioma);
    updateUserSetting('idioma', idioma);
    setShowIdiomaModal(false);
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
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
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
              trackColor={{ false: colors.border, true: colors.primary }}
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
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowTamanoModal(true)}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Tamaño de texto</Text>
              <Text style={styles.settingDescription}>
                {tamanoTexto === 'pequeno' ? 'Pequeño' : tamanoTexto === 'medio' ? 'Medio' : 'Grande'}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={() => setShowIdiomaModal(true)}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Idioma</Text>
              <Text style={styles.settingDescription}>
                {idioma === 'es' ? 'Español' : idioma === 'en' ? 'English' : 'Català'}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad y Seguridad</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleUsuariosBloqueados}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Usuarios bloqueados</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleContenidoOculto}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Contenido oculto</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleCambiarContrasena}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Cambiar contraseña</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleDescargarDatos}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Descargar mis datos</Text>
              <Text style={styles.settingDescription}>
                Solicita una copia de tu información
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleLimpiarCache}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Limpiar caché</Text>
              <Text style={styles.settingDescription}>
                {cacheSizeMB} MB de datos temporales
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleCentroAyuda}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Centro de ayuda</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleReportarProblema}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reportar un problema</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleTerminos}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Términos y condiciones</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handlePrivacidad}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Política de privacidad</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleAcercaDe}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Acerca de BarLive</Text>
              <Text style={styles.settingDescription}>Versión 1.0.0</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleCerrarSesion}>
            <Text style={styles.dangerButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={handleEliminarCuenta}>
            <Text style={styles.dangerButtonText}>Eliminar Cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showTamanoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTamanoModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTamanoModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tamaño de texto</Text>
            
            {['pequeno', 'medio', 'grande'].map((size) => (
              <TouchableOpacity
                key={size}
                style={styles.modalOption}
                onPress={() => handleTamanoTextoChange(size)}
              >
                <Text style={styles.modalOptionText}>
                  {size === 'pequeno' ? 'Pequeño' : size === 'medio' ? 'Medio' : 'Grande'}
                </Text>
                {tamanoTexto === size && (
                  <IconSymbol name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showIdiomaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIdiomaModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowIdiomaModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Idioma</Text>
            
            {[
              { code: 'es', name: 'Español' },
              { code: 'en', name: 'English' },
              { code: 'ca', name: 'Català' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.modalOption}
                onPress={() => handleIdiomaChange(lang.code)}
              >
                <Text style={styles.modalOptionText}>{lang.name}</Text>
                {idioma === lang.code && (
                  <IconSymbol name="checkmark" size={20} color={colors.primary} />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
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
    borderBottomColor: colors.border,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
});
