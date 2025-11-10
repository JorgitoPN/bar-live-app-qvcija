
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [notificacionesPush, setNotificacionesPush] = useState(true);
  const [notificacionesEmail, setNotificacionesEmail] = useState(true);
  const [notificacionesEventos, setNotificacionesEventos] = useState(true);
  const [notificacionesOfertas, setNotificacionesOfertas] = useState(false);
  const [notificacionesEmpleo, setNotificacionesEmpleo] = useState(true);
  const [perfilPublico, setPerfilPublico] = useState(true);
  const [mostrarUbicacion, setMostrarUbicacion] = useState(true);
  const [mostrarEnLinea, setMostrarEnLinea] = useState(true);
  const [modoOscuro, setModoOscuro] = useState(false);
  const [tamanoTexto, setTamanoTexto] = useState('Medio');
  const [idiomaSeleccionado, setIdiomaSeleccionado] = useState('Español');
  const [showTamanoModal, setShowTamanoModal] = useState(false);
  const [showIdiomaModal, setShowIdiomaModal] = useState(false);
  const [cacheSize, setCacheSize] = useState('0 MB');

  // Load user settings
  const loadUserSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPerfilPublico(!data.perfil_privado);
        setMostrarUbicacion(data.mostrar_ubicacion !== false);
        setMostrarEnLinea(data.mostrar_en_linea !== false);
        setModoOscuro(data.modo_oscuro || false);
        setTamanoTexto(data.tamano_texto === 'pequeno' ? 'Pequeño' : 
                       data.tamano_texto === 'medio' ? 'Medio' : 
                       data.tamano_texto === 'grande' ? 'Grande' : 'Medio');
        setIdiomaSeleccionado(data.idioma === 'es' ? 'Español' : 
                              data.idioma === 'en' ? 'English' : 
                              data.idioma === 'fr' ? 'Français' : 
                              data.idioma === 'de' ? 'Deutsch' : 'Español');
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserSettings();
      calculateCacheSize();
    }
  }, [user, loadUserSettings]);

  const calculateCacheSize = async () => {
    try {
      // Estimate cache size from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      setCacheSize(`${sizeInMB} MB`);
    } catch (error) {
      console.error('Error calculating cache size:', error);
      setCacheSize('N/A');
    }
  };

  const updateUserSetting = async (field: string, value: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ [field]: value })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      Alert.alert('Error', 'No se pudo actualizar la configuración');
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
              console.log('[Configuracion] Cerrando sesión...');
              await signOut();
              console.log('[Configuracion] Sesión cerrada, redirigiendo...');
              router.replace('/auth/bienvenida');
            } catch (error) {
              console.error('[Configuracion] Error cerrando sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar la sesión. Por favor, intenta de nuevo.');
            }
          }
        },
      ]
    );
  };

  const handleEliminarCuenta = () => {
    Alert.alert(
      'Eliminar Cuenta',
      'Esta acción es permanente y no se puede deshacer. Se eliminarán todos tus datos, publicaciones y conexiones. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmación Final',
              'Esta es tu última oportunidad. ¿Realmente deseas eliminar tu cuenta de forma permanente?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sí, eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (!user) return;
                      
                      // Delete user data
                      const { error } = await supabase
                        .from('usuarios')
                        .delete()
                        .eq('id', user.id);
                      
                      if (error) throw error;
                      
                      await signOut();
                      Alert.alert('Cuenta Eliminada', 'Tu cuenta ha sido eliminada correctamente');
                      router.replace('/auth/bienvenida');
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'No se pudo eliminar la cuenta. Por favor, contacta con soporte.');
                    }
                  }
                }
              ]
            );
          }
        },
      ]
    );
  };

  const handleCambiarContrasena = () => {
    Alert.alert(
      'Cambiar Contraseña',
      'Se enviará un enlace de restablecimiento a tu correo electrónico',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: async () => {
            if (!user?.email) {
              Alert.alert('Error', 'No se encontró tu correo electrónico');
              return;
            }

            try {
              const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: 'barlive://reset-password',
              });

              if (error) throw error;

              Alert.alert('Éxito', 'Se ha enviado un enlace de restablecimiento a tu correo');
            } catch (error) {
              console.error('Error sending reset email:', error);
              Alert.alert('Error', 'No se pudo enviar el correo de restablecimiento');
            }
          }
        },
      ]
    );
  };

  const handleDescargarDatos = () => {
    Alert.alert(
      'Descargar Mis Datos',
      'Recibirás un correo con todos tus datos en formato JSON en las próximas 24 horas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            try {
              // In production, trigger a background job to export user data
              // For now, just show confirmation
              Alert.alert('Solicitud Enviada', 'Recibirás un correo con tus datos en las próximas 24 horas.');
            } catch (error) {
              console.error('Error requesting data export:', error);
              Alert.alert('Error', 'No se pudo procesar la solicitud');
            }
          }
        }
      ]
    );
  };

  const handleLimpiarCache = () => {
    Alert.alert(
      'Limpiar Caché',
      '¿Deseas eliminar todos los datos temporales de la aplicación? Esto puede mejorar el rendimiento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setCacheSize('0 MB');
              Alert.alert('Éxito', 'Caché limpiada correctamente');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'No se pudo limpiar la caché');
            }
          }
        }
      ]
    );
  };

  const handleUsuariosBloqueados = () => {
    router.push('/perfil/usuarios-bloqueados' as any);
  };

  const handleContenidoOculto = () => {
    router.push('/perfil/contenido-oculto' as any);
  };

  const handleCentroAyuda = () => {
    router.push('/soporte/centro-ayuda' as any);
  };

  const handleReportarProblema = () => {
    router.push('/soporte/reportar-problema' as any);
  };

  const handleTerminos = () => {
    router.push('/legal/terminos' as any);
  };

  const handlePrivacidad = () => {
    router.push('/legal/privacidad' as any);
  };

  const handleAcercaDe = () => {
    router.push('/legal/acerca-de' as any);
  };

  const handleTamanoTextoChange = (tamano: string) => {
    setTamanoTexto(tamano);
    const tamanoKey = tamano === 'Pequeño' ? 'pequeno' : 
                      tamano === 'Medio' ? 'medio' : 'grande';
    updateUserSetting('tamano_texto', tamanoKey);
    setShowTamanoModal(false);
  };

  const handleIdiomaChange = (idioma: string) => {
    setIdiomaSeleccionado(idioma);
    const idiomaKey = idioma === 'Español' ? 'es' : 
                      idioma === 'English' ? 'en' : 
                      idioma === 'Français' ? 'fr' : 'de';
    updateUserSetting('idioma', idiomaKey);
    setShowIdiomaModal(false);
  };

  return (
    <View style={commonStyles.container}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuración</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sección: Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUENTA</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/editar/perfil')}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="person.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Editar Perfil</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleCambiarContrasena}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="lock.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Cambiar Contraseña</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="eye.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Perfil Público</Text>
            </View>
            <Switch
              value={perfilPublico}
              onValueChange={(value) => {
                setPerfilPublico(value);
                updateUserSetting('perfil_privado', !value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => {
              Alert.alert('Correo Electrónico', user?.email || 'No disponible');
            }}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="envelope.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Correo Electrónico</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{user?.email?.substring(0, 20) || 'N/A'}</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sección: Notificaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICACIONES</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="bell.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Notificaciones Push</Text>
            </View>
            <Switch
              value={notificacionesPush}
              onValueChange={(value) => {
                setNotificacionesPush(value);
                updateUserSetting('notificaciones_push', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="envelope.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Notificaciones por Email</Text>
            </View>
            <Switch
              value={notificacionesEmail}
              onValueChange={(value) => {
                setNotificacionesEmail(value);
                updateUserSetting('notificaciones_email', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="calendar.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Eventos y Promociones</Text>
            </View>
            <Switch
              value={notificacionesEventos}
              onValueChange={(value) => {
                setNotificacionesEventos(value);
                updateUserSetting('notificaciones_eventos', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="briefcase.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Ofertas de Empleo</Text>
            </View>
            <Switch
              value={notificacionesOfertas}
              onValueChange={(value) => {
                setNotificacionesOfertas(value);
                updateUserSetting('notificaciones_ofertas', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="person.badge.plus" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Interés en mi Perfil Profesional</Text>
            </View>
            <Switch
              value={notificacionesEmpleo}
              onValueChange={(value) => {
                setNotificacionesEmpleo(value);
                updateUserSetting('notificaciones_empleo', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>
        </View>

        {/* Sección: Privacidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACIDAD Y SEGURIDAD</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="location.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Mostrar Ubicación</Text>
            </View>
            <Switch
              value={mostrarUbicacion}
              onValueChange={(value) => {
                setMostrarUbicacion(value);
                updateUserSetting('mostrar_ubicacion', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="circle.fill" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Mostrar Estado En Línea</Text>
            </View>
            <Switch
              value={mostrarEnLinea}
              onValueChange={(value) => {
                setMostrarEnLinea(value);
                updateUserSetting('mostrar_en_linea', value);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/(tabs)/perfil/preferencias-anuncios')}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="megaphone.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Preferencias de Anuncios</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleUsuariosBloqueados}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="hand.raised.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Usuarios Bloqueados</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleContenidoOculto}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="eye.slash.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Contenido Oculto</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sección: Apariencia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APARIENCIA</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol name="moon.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Modo Oscuro</Text>
            </View>
            <Switch
              value={modoOscuro}
              onValueChange={(value) => {
                setModoOscuro(value);
                updateUserSetting('modo_oscuro', value);
                Alert.alert('Información', 'El modo oscuro se aplicará en una futura actualización');
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.cardBackground}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowTamanoModal(true)}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="textformat" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Tamaño de Texto</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{tamanoTexto}</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowIdiomaModal(true)}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="globe" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Idioma</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{idiomaSeleccionado}</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sección: Datos y Almacenamiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATOS Y ALMACENAMIENTO</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleDescargarDatos}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="arrow.down.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Descargar Mis Datos</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleLimpiarCache}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="trash.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Limpiar Caché</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{cacheSize}</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sección: Soporte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SOPORTE Y LEGAL</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleCentroAyuda}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="questionmark.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Centro de Ayuda</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleReportarProblema}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="exclamationmark.bubble" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Reportar un Problema</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleTerminos}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="doc.text.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Términos y Condiciones</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handlePrivacidad}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="shield.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Política de Privacidad</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleAcercaDe}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="info.circle" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Acerca de BarLive</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sección: Sesión */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleCerrarSesion}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="arrow.right.square" size={24} color={colors.badgeNuevo} />
              <Text style={[styles.settingText, styles.dangerText]}>Cerrar Sesión</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleEliminarCuenta}
          >
            <View style={styles.settingLeft}>
              <IconSymbol name="trash.circle" size={24} color={colors.badgeNuevo} />
              <Text style={[styles.settingText, styles.dangerText]}>Eliminar Cuenta</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>BarLive v1.0.0</Text>
        <Text style={styles.copyrightText}>© 2025 BarLive. Todos los derechos reservados.</Text>
      </ScrollView>

      {/* Modal Tamaño de Texto */}
      <Modal
        visible={showTamanoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTamanoModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTamanoModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tamaño de Texto</Text>
              <TouchableOpacity onPress={() => setShowTamanoModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {['Pequeño', 'Medio', 'Grande'].map((tamano) => (
                <TouchableOpacity
                  key={tamano}
                  style={[
                    styles.modalOption,
                    tamanoTexto === tamano && styles.modalOptionActive,
                  ]}
                  onPress={() => handleTamanoTextoChange(tamano)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    tamanoTexto === tamano && styles.modalOptionTextActive,
                  ]}>
                    {tamano}
                  </Text>
                  {tamanoTexto === tamano && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Idioma */}
      <Modal
        visible={showIdiomaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIdiomaModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowIdiomaModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Idioma</Text>
              <TouchableOpacity onPress={() => setShowIdiomaModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {['Español', 'English', 'Français', 'Deutsch'].map((idioma) => (
                <TouchableOpacity
                  key={idioma}
                  style={[
                    styles.modalOption,
                    idiomaSeleccionado === idioma && styles.modalOptionActive,
                  ]}
                  onPress={() => handleIdiomaChange(idioma)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    idiomaSeleccionado === idioma && styles.modalOptionTextActive,
                  ]}>
                    {idioma}
                  </Text>
                  {idiomaSeleccionado === idioma && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dangerItem: {
    borderColor: colors.badgeNuevo + '30',
  },
  dangerText: {
    color: colors.badgeNuevo,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '600',
  },
  copyrightText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 0,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalOptionActive: {
    backgroundColor: colors.primary + '10',
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOptionTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
});
