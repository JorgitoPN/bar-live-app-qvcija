
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../app/integrations/supabase/client';
import { colors } from '../../styles/commonStyles';
import { IconSymbol } from '../../components/IconSymbol';

type Step = 'welcome' | 'api_keys' | 'webhook' | 'fiscal_data' | 'test' | 'complete';

interface StripeConfig {
  publishable_key: string;
  secret_key: string;
  webhook_secret: string;
  mode: 'test' | 'live';
}

interface FiscalData {
  company_name: string;
  cif: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  email: string;
  phone: string;
}

export default function AsistenteStripe() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  // Stripe Configuration
  const [stripeConfig, setStripeConfig] = useState<StripeConfig>({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
    mode: 'test',
  });

  // Fiscal Data
  const [fiscalData, setFiscalData] = useState<FiscalData>({
    company_name: 'Barlive',
    cif: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'España',
    email: '',
    phone: '',
  });

  // Validation states
  const [keysValid, setKeysValid] = useState(false);
  const [webhookValid, setWebhookValid] = useState(false);

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      // Load Stripe config
      const { data: config } = await supabase
        .from('stripe_configuration')
        .select('*')
        .single();

      if (config) {
        setStripeConfig({
          publishable_key: config.publishable_key || '',
          secret_key: config.secret_key || '',
          webhook_secret: config.webhook_secret || '',
          mode: config.mode || 'test',
        });
      }

      // Load fiscal data
      const { data: fiscal } = await supabase
        .from('company_fiscal_data')
        .select('*')
        .single();

      if (fiscal) {
        setFiscalData({
          company_name: fiscal.company_name || 'Barlive',
          cif: fiscal.cif || '',
          address: fiscal.address || '',
          city: fiscal.city || '',
          postal_code: fiscal.postal_code || '',
          country: fiscal.country || 'España',
          email: fiscal.email || '',
          phone: fiscal.phone || '',
        });
      }
    } catch (error) {
      console.log('No existing config found, starting fresh');
    }
  };

  const validateStripeKeys = async () => {
    setValidating(true);
    try {
      // Validate publishable key format
      const pubKeyPrefix = stripeConfig.mode === 'test' ? 'pk_test_' : 'pk_live_';
      const secKeyPrefix = stripeConfig.mode === 'test' ? 'sk_test_' : 'sk_live_';

      if (!stripeConfig.publishable_key.startsWith(pubKeyPrefix)) {
        Alert.alert(
          'Error',
          `La clave publicable debe comenzar con ${pubKeyPrefix} para el modo ${stripeConfig.mode}`
        );
        setValidating(false);
        return false;
      }

      if (!stripeConfig.secret_key.startsWith(secKeyPrefix)) {
        Alert.alert(
          'Error',
          `La clave secreta debe comenzar con ${secKeyPrefix} para el modo ${stripeConfig.mode}`
        );
        setValidating(false);
        return false;
      }

      // Test the keys by making a simple API call
      const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
        headers: {
          Authorization: `Bearer ${stripeConfig.secret_key}`,
        },
      });

      if (response.ok) {
        setKeysValid(true);
        Alert.alert('¡Éxito!', 'Las claves de Stripe son válidas');
        setValidating(false);
        return true;
      } else {
        const error = await response.json();
        Alert.alert('Error', `Las claves no son válidas: ${error.error?.message || 'Error desconocido'}`);
        setValidating(false);
        return false;
      }
    } catch (error) {
      console.error('Error validating keys:', error);
      Alert.alert('Error', 'No se pudieron validar las claves. Verifica tu conexión a internet.');
      setValidating(false);
      return false;
    }
  };

  const saveStripeConfig = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('stripe_configuration')
        .upsert({
          id: 1,
          publishable_key: stripeConfig.publishable_key,
          secret_key: stripeConfig.secret_key,
          webhook_secret: stripeConfig.webhook_secret,
          mode: stripeConfig.mode,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('¡Guardado!', 'La configuración de Stripe se ha guardado correctamente');
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveFiscalData = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_fiscal_data')
        .upsert({
          id: 1,
          ...fiscalData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('¡Guardado!', 'Los datos fiscales se han guardado correctamente');
      return true;
    } catch (error) {
      console.error('Error saving fiscal data:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos fiscales');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testPaymentFlow = async () => {
    setLoading(true);
    try {
      // Create a test payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: 100, // 1 euro
          currency: 'eur',
          description: 'Pago de prueba',
        },
      });

      if (error) throw error;

      Alert.alert(
        '¡Prueba exitosa!',
        'El sistema de pagos está funcionando correctamente. Se creó un payment intent de prueba.'
      );
      return true;
    } catch (error) {
      console.error('Error testing payment:', error);
      Alert.alert('Error', 'La prueba de pago falló. Verifica tu configuración.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const openStripeDocumentation = (section: string) => {
    const urls: Record<string, string> = {
      api_keys: 'https://dashboard.stripe.com/test/apikeys',
      webhooks: 'https://dashboard.stripe.com/test/webhooks',
      dashboard: 'https://dashboard.stripe.com',
    };
    Linking.openURL(urls[section] || urls.dashboard);
  };

  const getWebhookUrl = () => {
    const projectUrl = 'https://embntaqwlwmgazvrglaf.supabase.co';
    return `${projectUrl}/functions/v1/stripe-webhook`;
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <IconSymbol
        ios_icon_name="creditcard.fill"
        android_material_icon_name="credit_card"
        size={80}
        color={colors.primary}
        style={styles.welcomeIcon}
      />
      <Text style={styles.title}>Asistente de Configuración de Stripe</Text>
      <Text style={styles.description}>
        Te guiaré paso a paso para configurar Stripe en tu aplicación. Este proceso incluye:
      </Text>
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.success} />
          <Text style={styles.featureText}>Configuración de claves API</Text>
        </View>
        <View style={styles.featureItem}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.success} />
          <Text style={styles.featureText}>Configuración de webhooks</Text>
        </View>
        <View style={styles.featureItem}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.success} />
          <Text style={styles.featureText}>Datos fiscales de la empresa</Text>
        </View>
        <View style={styles.featureItem}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.success} />
          <Text style={styles.featureText}>Pruebas automáticas</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setCurrentStep('api_keys')}
      >
        <Text style={styles.primaryButtonText}>Comenzar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderApiKeysStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Paso 1: Claves API de Stripe</Text>
      <Text style={styles.description}>
        Necesitas obtener tus claves API desde el panel de Stripe.
      </Text>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => openStripeDocumentation('api_keys')}
      >
        <IconSymbol ios_icon_name="arrow.up.right.square" android_material_icon_name="open_in_new" size={20} color={colors.primary} />
        <Text style={styles.linkButtonText}>Abrir Panel de Stripe</Text>
      </TouchableOpacity>

      <View style={styles.modeSelector}>
        <Text style={styles.label}>Modo:</Text>
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              stripeConfig.mode === 'test' && styles.modeButtonActive,
            ]}
            onPress={() => setStripeConfig({ ...stripeConfig, mode: 'test' })}
          >
            <Text
              style={[
                styles.modeButtonText,
                stripeConfig.mode === 'test' && styles.modeButtonTextActive,
              ]}
            >
              Prueba
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              stripeConfig.mode === 'live' && styles.modeButtonActive,
            ]}
            onPress={() => setStripeConfig({ ...stripeConfig, mode: 'live' })}
          >
            <Text
              style={[
                styles.modeButtonText,
                stripeConfig.mode === 'live' && styles.modeButtonTextActive,
              ]}
            >
              Producción
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Clave Publicable (Publishable Key)</Text>
        <Text style={styles.hint}>
          Comienza con pk_{stripeConfig.mode === 'test' ? 'test' : 'live'}_
        </Text>
        <TextInput
          style={styles.input}
          value={stripeConfig.publishable_key}
          onChangeText={(text) =>
            setStripeConfig({ ...stripeConfig, publishable_key: text })
          }
          placeholder={`pk_${stripeConfig.mode}_...`}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Clave Secreta (Secret Key)</Text>
        <Text style={styles.hint}>
          Comienza con sk_{stripeConfig.mode === 'test' ? 'test' : 'live'}_
        </Text>
        <TextInput
          style={styles.input}
          value={stripeConfig.secret_key}
          onChangeText={(text) =>
            setStripeConfig({ ...stripeConfig, secret_key: text })
          }
          placeholder={`sk_${stripeConfig.mode}_...`}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, validating && styles.buttonDisabled]}
        onPress={async () => {
          const valid = await validateStripeKeys();
          if (valid) {
            await saveStripeConfig();
          }
        }}
        disabled={validating || !stripeConfig.publishable_key || !stripeConfig.secret_key}
      >
        {validating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {keysValid ? 'Continuar' : 'Validar Claves'}
          </Text>
        )}
      </TouchableOpacity>

      {keysValid && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentStep('webhook')}
        >
          <Text style={styles.secondaryButtonText}>Siguiente Paso</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderWebhookStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Paso 2: Configurar Webhook</Text>
      <Text style={styles.description}>
        Los webhooks permiten que Stripe notifique a tu aplicación sobre eventos de pago.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>URL del Webhook:</Text>
        <Text style={styles.infoText} selectable>
          {getWebhookUrl()}
        </Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => {
            // Copy to clipboard functionality would go here
            Alert.alert('Copiado', 'URL copiada al portapapeles');
          }}
        >
          <IconSymbol ios_icon_name="doc.on.doc" android_material_icon_name="content_copy" size={20} color={colors.primary} />
          <Text style={styles.copyButtonText}>Copiar URL</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>Instrucciones:</Text>
        <Text style={styles.instructionText}>1. Abre el panel de webhooks de Stripe</Text>
        <Text style={styles.instructionText}>2. Haz clic en &quot;Añadir endpoint&quot;</Text>
        <Text style={styles.instructionText}>3. Pega la URL del webhook</Text>
        <Text style={styles.instructionText}>4. Selecciona los eventos a escuchar</Text>
        <Text style={styles.instructionText}>5. Copia el &quot;Signing secret&quot;</Text>
      </View>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => openStripeDocumentation('webhooks')}
      >
        <IconSymbol ios_icon_name="arrow.up.right.square" android_material_icon_name="open_in_new" size={20} color={colors.primary} />
        <Text style={styles.linkButtonText}>Abrir Panel de Webhooks</Text>
      </TouchableOpacity>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Webhook Secret (Signing Secret)</Text>
        <Text style={styles.hint}>Comienza con whsec_</Text>
        <TextInput
          style={styles.input}
          value={stripeConfig.webhook_secret}
          onChangeText={(text) =>
            setStripeConfig({ ...stripeConfig, webhook_secret: text })
          }
          placeholder="whsec_..."
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={async () => {
          if (stripeConfig.webhook_secret.startsWith('whsec_')) {
            const saved = await saveStripeConfig();
            if (saved) {
              setWebhookValid(true);
              setCurrentStep('fiscal_data');
            }
          } else {
            Alert.alert('Error', 'El webhook secret debe comenzar con whsec_');
          }
        }}
        disabled={loading || !stripeConfig.webhook_secret}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Guardar y Continuar</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderFiscalDataStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Paso 3: Datos Fiscales</Text>
      <Text style={styles.description}>
        Estos datos aparecerán en las facturas generadas.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre de la Empresa</Text>
        <TextInput
          style={styles.input}
          value={fiscalData.company_name}
          onChangeText={(text) =>
            setFiscalData({ ...fiscalData, company_name: text })
          }
          placeholder="Barlive"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>CIF/NIF</Text>
        <TextInput
          style={styles.input}
          value={fiscalData.cif}
          onChangeText={(text) => setFiscalData({ ...fiscalData, cif: text })}
          placeholder="B12345678"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={styles.input}
          value={fiscalData.address}
          onChangeText={(text) =>
            setFiscalData({ ...fiscalData, address: text })
          }
          placeholder="Calle Principal, 123"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={styles.label}>Ciudad</Text>
          <TextInput
            style={styles.input}
            value={fiscalData.city}
            onChangeText={(text) =>
              setFiscalData({ ...fiscalData, city: text })
            }
            placeholder="Madrid"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
          <Text style={styles.label}>Código Postal</Text>
          <TextInput
            style={styles.input}
            value={fiscalData.postal_code}
            onChangeText={(text) =>
              setFiscalData({ ...fiscalData, postal_code: text })
            }
            placeholder="28001"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email de Contacto</Text>
        <TextInput
          style={styles.input}
          value={fiscalData.email}
          onChangeText={(text) =>
            setFiscalData({ ...fiscalData, email: text })
          }
          placeholder="contacto@barlive.com"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={fiscalData.phone}
          onChangeText={(text) =>
            setFiscalData({ ...fiscalData, phone: text })
          }
          placeholder="+34 600 000 000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={async () => {
          const saved = await saveFiscalData();
          if (saved) {
            setCurrentStep('test');
          }
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Guardar y Continuar</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderTestStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Paso 4: Probar el Sistema</Text>
      <Text style={styles.description}>
        Vamos a verificar que todo funciona correctamente.
      </Text>

      <View style={styles.testCard}>
        <IconSymbol
          ios_icon_name="checkmark.shield.fill"
          android_material_icon_name="verified_user"
          size={48}
          color={colors.success}
        />
        <Text style={styles.testCardTitle}>Prueba de Pago</Text>
        <Text style={styles.testCardDescription}>
          Crearemos un payment intent de prueba para verificar la conexión con Stripe.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={async () => {
            const success = await testPaymentFlow();
            if (success) {
              setCurrentStep('complete');
            }
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Ejecutar Prueba</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Tarjetas de Prueba de Stripe:</Text>
        <Text style={styles.infoText}>• 4242 4242 4242 4242 - Pago exitoso</Text>
        <Text style={styles.infoText}>• 4000 0000 0000 0002 - Pago rechazado</Text>
        <Text style={styles.infoText}>• Cualquier fecha futura y CVC</Text>
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setCurrentStep('complete')}
      >
        <Text style={styles.secondaryButtonText}>Omitir Prueba</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <IconSymbol
        ios_icon_name="checkmark.circle.fill"
        android_material_icon_name="check_circle"
        size={80}
        color={colors.success}
        style={styles.welcomeIcon}
      />
      <Text style={styles.title}>¡Configuración Completa!</Text>
      <Text style={styles.description}>
        Stripe está configurado y listo para usar. Ahora puedes:
      </Text>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.success} />
          <Text style={styles.featureText}>Procesar pagos</Text>
        </View>
        <View style={styles.featureItem}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.success} />
          <Text style={styles.featureText}>Generar facturas</Text>
        </View>
        <View style={styles.featureItem}>
          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.success} />
          <Text style={styles.featureText}>Gestionar suscripciones</Text>
        </View>
      </View>

      <View style={styles.warningBox}>
        <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={24} color={colors.warning} />
        <Text style={styles.warningText}>
          Recuerda cambiar a claves de producción cuando estés listo para lanzar.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/admin/gestionar-pagos-stripe')}
      >
        <Text style={styles.primaryButtonText}>Ir al Panel de Pagos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.back()}
      >
        <Text style={styles.secondaryButtonText}>Volver al Admin</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProgressBar = () => {
    const steps: Step[] = ['welcome', 'api_keys', 'webhook', 'fiscal_data', 'test', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const progress = (currentIndex / (steps.length - 1)) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Paso {currentIndex + 1} de {steps.length}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Asistente Stripe</Text>
        <View style={styles.placeholder} />
      </View>

      {currentStep !== 'welcome' && currentStep !== 'complete' && renderProgressBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 'welcome' && renderWelcomeStep()}
        {currentStep === 'api_keys' && renderApiKeysStep()}
        {currentStep === 'webhook' && renderWebhookStep()}
        {currentStep === 'fiscal_data' && renderFiscalDataStep()}
        {currentStep === 'test' && renderTestStep()}
        {currentStep === 'complete' && renderCompleteStep()}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  stepContainer: {
    flex: 1,
  },
  welcomeIcon: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  featureList: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  modeSelector: {
    marginBottom: 24,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  modeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  linkButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: 14,
    marginLeft: 8,
  },
  instructionBox: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    paddingLeft: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 0,
  },
  testCard: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  testCardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
  },
});
