
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[HomeScreen] Rendering - loading:', loading, 'user:', user?.id);
  }, [loading, user]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>BarLive</Text>
          <Text style={styles.subtitle}>Descubre los mejores locales</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Bienvenido</Text>
          <Text style={styles.text}>
            Inicia sesión para acceder a todas las funciones de BarLive.
          </Text>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => {
              console.log('[HomeScreen] Navigating to login');
              router.push('/auth/login');
            }}
          >
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show home screen for authenticated users
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BarLive</Text>
        <Text style={styles.subtitle}>Bienvenido, {user.nombre}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Inicio</Text>
        <Text style={styles.text}>
          La aplicación se ha restaurado correctamente. Aquí puedes ver los locales destacados y eventos.
        </Text>
      </View>
    </ScrollView>
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
    color: colors.textSecondary,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
