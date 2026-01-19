
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { isSupabaseConfigured, getSupabaseConfigMessage } from '@/utils/supabase';

export default function ConfiguracionSupabaseScreen() {
  const router = useRouter();
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const isConfigured = isSupabaseConfigured();

  const handleCopyInstructions = () => {
    Clipboard.setString(getSupabaseConfigMessage());
    Alert.alert('Copiado', 'Instrucciones copiadas al portapapeles');
  };

  const handleTestConnection = () => {
    if (isConfigured) {
      Alert.alert('Éxito', 'Supabase está configurado correctamente');
    } else {
      Alert.alert('No configurado', getSupabaseConfigMessage());
    }
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
        <Text style={styles.headerTitle}>Configuración Supabase</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={[styles.statusCard, isConfigured ? styles.statusSuccess : styles.statusWarning]}>
          <IconSymbol
            name={isConfigured ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
            size={48}
            color={isConfigured ? '#10B981' : '#F59E0B'}
          />
          <Text style={styles.statusTitle}>
            {isConfigured ? 'Supabase Configurado' : 'Supabase No Configurado'}
          </Text>
          <Text style={styles.statusDescription}>
            {isConfigured
              ? 'Tu aplicación está conectada a Supabase y lista para usar todas las funcionalidades.'
              : 'Configura Supabase para habilitar autenticación, base de datos y almacenamiento.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Instrucciones de Configuración</Text>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionStep}>1. Crea un proyecto en Supabase</Text>
            <Text style={styles.instructionText}>
              Ve a https://supabase.com y crea una cuenta gratuita. Luego crea un nuevo proyecto.
            </Text>

            <Text style={styles.instructionStep}>2. Obtén tus credenciales</Text>
            <Text style={styles.instructionText}>
              En tu proyecto de Supabase, ve a Settings → API y copia:
            </Text>
            <Text style={styles.instructionBullet}>• Project URL</Text>
            <Text style={styles.instructionBullet}>• anon/public key</Text>

            <Text style={styles.instructionStep}>3. Configura las variables de entorno</Text>
            <Text style={styles.instructionText}>
              Crea un archivo .env en la raíz del proyecto con:
            </Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>EXPO_PUBLIC_SUPABASE_URL=tu-url</Text>
              <Text style={styles.codeText}>EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-key</Text>
            </View>

            <Text style={styles.instructionStep}>4. Reinicia el servidor</Text>
            <Text style={styles.instructionText}>
              Detén el servidor de desarrollo y vuelve a iniciarlo para que las variables de entorno se carguen.
            </Text>
          </View>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopyInstructions}>
            <IconSymbol name="doc.on.doc" size={20} color={colors.headerText} />
            <Text style={styles.copyButtonText}>Copiar Instrucciones</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Configuración de Base de Datos</Text>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionText}>
              Una vez configurado Supabase, necesitas crear las siguientes tablas:
            </Text>
            <Text style={styles.instructionBullet}>• usuarios</Text>
            <Text style={styles.instructionBullet}>• locales</Text>
            <Text style={styles.instructionBullet}>• eventos</Text>
            <Text style={styles.instructionBullet}>• empleos</Text>
            <Text style={styles.instructionBullet}>• publicaciones</Text>
            <Text style={styles.instructionBullet}>• historias</Text>
            
            <Text style={[styles.instructionText, { marginTop: 12 }]}>
              Puedes encontrar los scripts SQL en la documentación del proyecto.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Configuración de Autenticación</Text>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionText}>
              Para habilitar Google Sign-In:
            </Text>
            <Text style={styles.instructionBullet}>
              1. Ve a Authentication → Providers en Supabase
            </Text>
            <Text style={styles.instructionBullet}>
              2. Habilita Google como proveedor
            </Text>
            <Text style={styles.instructionBullet}>
              3. Configura las credenciales de Google OAuth
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.testButton} onPress={handleTestConnection}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.testGradient}
          >
            <IconSymbol name="checkmark.circle" size={20} color={colors.headerText} />
            <Text style={styles.testButtonText}>Probar Conexión</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.helpCard}>
          <IconSymbol name="questionmark.circle" size={24} color={colors.primary} />
          <Text style={styles.helpText}>
            ¿Necesitas ayuda? Visita la documentación de Supabase en https://supabase.com/docs
          </Text>
        </View>
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
    padding: 16,
  },
  statusCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    ...commonStyles.cardShadow,
  },
  statusSuccess: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  statusWarning: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  instructionsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    ...commonStyles.cardShadow,
  },
  instructionStep: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  instructionBullet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: 12,
  },
  codeBlock: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#10B981',
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
    marginLeft: 8,
  },
  testButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  testGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
    marginLeft: 8,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.primary}20`,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 20,
  },
});
