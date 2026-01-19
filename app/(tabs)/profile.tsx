
import React from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { useTheme } from "@react-navigation/native";

export default function ProfileScreen() {
  console.log('ProfileScreen rendered');
  const theme = useTheme();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Perfil 👤
        </Text>
        <Text style={[styles.subtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
          Gestiona tu cuenta
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Información de la cuenta
        </Text>
        <Text style={[styles.infoText, { color: theme.dark ? '#98989D' : '#666' }]}>
          Aquí podrás ver y editar tu información personal
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.infoText, { color: theme.dark ? '#98989D' : '#666' }]}>
          La aplicación se está cargando correctamente. 
          Si ves este mensaje, significa que la navegación funciona bien.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
