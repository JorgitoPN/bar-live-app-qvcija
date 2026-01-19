
import React from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { useTheme } from "@react-navigation/native";

export default function HomeScreen() {
  console.log('HomeScreen rendered');
  const theme = useTheme();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          ¡Bienvenido a BarLive! 🎉
        </Text>
        <Text style={[styles.subtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
          Tu app está lista para usar
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Características principales:
        </Text>
        <View style={styles.featureList}>
          <Text style={[styles.feature, { color: theme.dark ? '#98989D' : '#666' }]}>
            • Descubre locales cercanos
          </Text>
          <Text style={[styles.feature, { color: theme.dark ? '#98989D' : '#666' }]}>
            • Eventos en tiempo real
          </Text>
          <Text style={[styles.feature, { color: theme.dark ? '#98989D' : '#666' }]}>
            • Red social integrada
          </Text>
          <Text style={[styles.feature, { color: theme.dark ? '#98989D' : '#666' }]}>
            • Momentos y historias
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.infoText, { color: theme.dark ? '#98989D' : '#666' }]}>
          La aplicación se está cargando correctamente. 
          Si ves este mensaje, significa que todo funciona bien.
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
  featureList: {
    gap: 12,
  },
  feature: {
    fontSize: 16,
    lineHeight: 24,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
