
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    console.log('[Perfil] Signing out...');
    await signOut();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Nombre:</Text>
        <Text style={styles.value}>{user?.nombre || 'Usuario'}</Text>

        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || 'No disponible'}</Text>

        <Text style={styles.label}>Rol:</Text>
        <Text style={styles.value}>{user?.rol_app || 'cliente'}</Text>

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  content: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.error || '#ff3b30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
