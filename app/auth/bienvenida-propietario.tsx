
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { markPropietarioMessageSeen } from '@/utils/auth';

export default function BienvenidaPropietarioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const userName = params.userName as string || 'Usuario';
  
  const [loading, setLoading] = useState(false);

  const handleReclamarLocal = async () => {
    setLoading(true);
    try {
      // Mark message as seen
      await markPropietarioMessageSeen(userId);
      
      // Navigate to claim local screen
      router.replace({
        pathname: '/solicitudes/solicitar-rol-propietario',
        params: { tipo: 'reclamar' }
      });
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Hubo un problema. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarLocal = async () => {
    setLoading(true);
    try {
      // Mark message as seen
      await markPropietarioMessageSeen(userId);
      
      // Navigate to register new local screen
      router.replace({
        pathname: '/solicitudes/solicitar-rol-propietario',
        params: { tipo: 'nuevo' }
      });
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Hubo un problema. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = async () => {
    setLoading(true);
    try {
      // Mark message as seen
      await markPropietarioMessageSeen(userId);
      
      // Navigate to main app
      router.replace('/(tabs)/explorar');
    } catch (error) {
      console.error('Error:', error);
      // Even if there's an error, let them continue
      router.replace('/(tabs)/explorar');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#14B8A6', '#06B6D4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <IconSymbol name="checkmark.circle.fill" size={64} color="#FFFFFF" />
        <Text style={styles.headerTitle}>¡Bienvenido a BarLive!</Text>
        <Text style={styles.headerSubtitle}>{userName}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu cuenta ha sido creada</Text>
          <Text style={styles.sectionText}>
            Ahora eres parte de la comunidad BarLive como <Text style={styles.bold}>cliente</Text>.
            Puedes explorar locales, eventos, ofertas de empleo y mucho más.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.iconRow}>
            <IconSymbol name="building.2.fill" size={32} color={colors.primary} />
            <Text style={styles.sectionTitle}>¿Tienes un local?</Text>
          </View>
          <Text style={styles.sectionText}>
            Si eres propietario de un bar, restaurante, discoteca o cualquier local de ocio,
            puedes convertirte en <Text style={styles.bold}>propietario</Text> en BarLive y acceder a:
          </Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Gestión completa de tu local</Text>
            </View>
            <View style={styles.benefitItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Publicar eventos y promociones</Text>
            </View>
            <View style={styles.benefitItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Ofertas de empleo</Text>
            </View>
            <View style={styles.benefitItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Estadísticas y análisis</Text>
            </View>
            <View style={styles.benefitItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Red social para tu negocio</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleReclamarLocal}
            disabled={loading}
          >
            <LinearGradient
              colors={['#14B8A6', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <IconSymbol name="building.2" size={24} color="#FFFFFF" />
              <Text style={styles.buttonTextPrimary}>Reclamar un local existente</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleRegistrarLocal}
            disabled={loading}
          >
            <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
            <Text style={styles.buttonTextSecondary}>Registrar un nuevo local</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonTertiary]}
            onPress={handleContinuar}
            disabled={loading}
          >
            <Text style={styles.buttonTextTertiary}>Continuar como cliente</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Puedes cambiar tu rol más tarde desde tu perfil
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bold: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  benefitsList: {
    marginTop: 16,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  buttonsContainer: {
    marginTop: 32,
    gap: 12,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonPrimary: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  buttonTertiary: {
    backgroundColor: 'transparent',
    padding: 16,
    alignItems: 'center',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonTextTertiary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footerNote: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
});
