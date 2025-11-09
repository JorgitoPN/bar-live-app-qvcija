
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

export default function CrearLocalScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [web, setWeb] = useState('');

  const tipos = ['cafe', 'restaurante', 'bar', 'pub', 'discoteca'];

  const handleSubmit = () => {
    if (!nombre || !tipo || !direccion || !ciudad || !provincia) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }
    console.log('Crear local:', {
      nombre,
      tipo,
      descripcion,
      direccion,
      ciudad,
      provincia,
      telefono,
      web,
    });
    Alert.alert('Éxito', 'Local creado correctamente', [
      { text: 'OK', onPress: () => router.back() },
    ]);
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
        <Text style={styles.headerTitle}>Crear Local</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Información Básica</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del local"
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tipo *</Text>
            <View style={styles.tipoButtons}>
              {tipos.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tipoButton, tipo === t && styles.tipoButtonActive]}
                  onPress={() => setTipo(t)}
                >
                  <Text
                    style={[
                      styles.tipoButtonText,
                      tipo === t && styles.tipoButtonTextActive,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe tu local..."
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={4}
            />
          </View>

          <Text style={styles.sectionTitle}>Ubicación</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Dirección *</Text>
            <TextInput
              style={styles.input}
              placeholder="Calle, número"
              value={direccion}
              onChangeText={setDireccion}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ciudad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ciudad"
              value={ciudad}
              onChangeText={setCiudad}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Provincia *</Text>
            <TextInput
              style={styles.input}
              placeholder="Provincia"
              value={provincia}
              onChangeText={setProvincia}
            />
          </View>

          <Text style={styles.sectionTitle}>Contacto</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="+34 600 000 000"
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Sitio Web</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              value={web}
              onChangeText={setWeb}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>Crear Local</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tipoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tipoButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tipoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tipoButtonTextActive: {
    color: colors.headerText,
  },
  submitButton: {
    marginTop: 30,
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
