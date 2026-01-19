
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState(true);
  const [notificacionesLikes, setNotificacionesLikes] = useState(true);
  const [notificacionesComentarios, setNotificacionesComentarios] = useState(true);
  const [notificacionesSeguidos, setNotificacionesSeguidos] = useState(true);
  const [modoOscuro, setModoOscuro] = useState(false);

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            console.log('Cerrar sesión');
            router.replace('/auth/login-popup');
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
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <TouchableOpacity
            style={styles.option}
            onPress={() => router.push('/editar/perfil')}
          >
            <IconSymbol name="person.circle" size={24} color={colors.text} />
            <Text style={styles.optionText}>Editar Perfil</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.option}>
            <IconSymbol name="lock" size={24} color={colors.text} />
            <Text style={styles.optionText}>Privacidad</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.option}>
            <IconSymbol name="shield" size={24} color={colors.text} />
            <Text style={styles.optionText}>Seguridad</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          <View style={styles.option}>
            <IconSymbol name="bell" size={24} color={colors.text} />
            <Text style={styles.optionText}>Notificaciones</Text>
            <Switch
              value={notificaciones}
              onValueChange={setNotificaciones}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>
          {notificaciones && (
            <>
              <View style={[styles.option, styles.subOption]}>
                <Text style={styles.optionText}>Likes</Text>
                <Switch
                  value={notificacionesLikes}
                  onValueChange={setNotificacionesLikes}
                  trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  thumbColor={colors.headerText}
                />
              </View>
              <View style={[styles.option, styles.subOption]}>
                <Text style={styles.optionText}>Comentarios</Text>
                <Switch
                  value={notificacionesComentarios}
                  onValueChange={setNotificacionesComentarios}
                  trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  thumbColor={colors.headerText}
                />
              </View>
              <View style={[styles.option, styles.subOption]}>
                <Text style={styles.optionText}>Nuevos seguidores</Text>
                <Switch
                  value={notificacionesSeguidos}
                  onValueChange={setNotificacionesSeguidos}
                  trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  thumbColor={colors.headerText}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          <View style={styles.option}>
            <IconSymbol name="moon" size={24} color={colors.text} />
            <Text style={styles.optionText}>Modo Oscuro</Text>
            <Switch
              value={modoOscuro}
              onValueChange={setModoOscuro}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <TouchableOpacity style={styles.option}>
            <IconSymbol name="questionmark.circle" size={24} color={colors.text} />
            <Text style={styles.optionText}>Ayuda</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.option}>
            <IconSymbol name="info.circle" size={24} color={colors.text} />
            <Text style={styles.optionText}>Acerca de</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.option}>
            <IconSymbol name="doc.text" size={24} color={colors.text} />
            <Text style={styles.optionText}>Términos y Condiciones</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleCerrarSesion}
        >
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
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
  section: {
    marginTop: 20,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 12,
  },
  subOption: {
    paddingLeft: 52,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  logoutButton: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.badgeNuevo,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
});
