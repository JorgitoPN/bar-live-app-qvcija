
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

export default function LocalPerfilRedirect() {
  const router = useRouter();
  
  React.useEffect(() => {
    router.replace('/(tabs)/perfil/local');
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirigiendo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
  },
});
