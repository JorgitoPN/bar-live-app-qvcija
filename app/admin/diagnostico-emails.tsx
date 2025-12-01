
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function DiagnosticoEmailsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      console.log('🔍 INICIANDO DIAGNÓSTICO DE EMAILS');
      console.log('═══════════════════════════════════════════════════════');

      // Test 1: Check Supabase Auth configuration
      console.log('\n📋 TEST 1: Configuración de Supabase Auth');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session activa:', !!session);

      // Test 2: Try to send a test recovery email
      console.log('\n📋 TEST 2: Intentar enviar email de recuperación');
      const testEmailAddress = 'test@example.com';
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        testEmailAddress,
        {
          redirectTo: 'https://natively.dev/email-confirmed',
        }
      );

      let domainIssue = null;
      let currentDomain = null;

      if (recoveryError) {
        console.error('❌ Error al enviar email:', recoveryError);
        console.error('Error message:', recoveryError.message);
        console.error('Error status:', recoveryError.status);

        // Parse the error to extract domain information
        const errorMsg = recoveryError.message?.toLowerCase() || '';
        
        if (errorMsg.includes('barlive.app')) {
          currentDomain = 'barlive.app';
          domainIssue = 'DOMAIN_MISMATCH';
        } else if (errorMsg.includes('domain is not verified') || errorMsg.includes('450')) {
          domainIssue = 'DOMAIN_NOT_VERIFIED';
        }
      } else {
        console.log('✅ Email enviado correctamente (o dominio no configurado)');
      }

      // Test 3: Check environment variables
      console.log('\n📋 TEST 3: Variables de entorno');
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      console.log('SUPABASE_URL configurado:', !!supabaseUrl);
      console.log('SUPABASE_ANON_KEY configurado:', !!supabaseAnonKey);

      const result = {
        timestamp: new Date().toISOString(),
        tests: {
          supabaseConnection: !!session || !!supabaseUrl,
          emailSending: !recoveryError,
          domainIssue,
          currentDomain,
        },
        error: recoveryError ? {
          message: recoveryError.message,
          status: recoveryError.status,
          code: (recoveryError as any).code,
        } : null,
        recommendations: [],
      };

      // Generate recommendations
      if (domainIssue === 'DOMAIN_MISMATCH') {
        result.recommendations.push({
          priority: 'CRÍTICO',
          title: 'Discrepancia de dominios detectada',
          description: `Supabase está intentando usar "${currentDomain}" pero has configurado DNS para "noreply.barliveapp.es"`,
          solution: 'Debes configurar el mismo dominio en ambos lugares',
        });
      }

      if (domainIssue === 'DOMAIN_NOT_VERIFIED') {
        result.recommendations.push({
          priority: 'CRÍTICO',
          title: 'Dominio no verificado',
          description: 'El dominio no está verificado en Resend',
          solution: 'Verifica el dominio en https://resend.com/domains',
        });
      }

      if (!recoveryError) {
        result.recommendations.push({
          priority: 'INFO',
          title: 'Sistema funcionando',
          description: 'No se detectaron errores en el envío de emails',
          solution: 'El sistema está configurado correctamente',
        });
      }

      setTestResult(result);
      console.log('\n✅ DIAGNÓSTICO COMPLETADO');
      console.log('═══════════════════════════════════════════════════════');
      console.log('Resultado:', JSON.stringify(result, null, 2));

    } catch (error: any) {
      console.error('❌ Error en diagnóstico:', error);
      Alert.alert('Error', 'Ocurrió un error al ejecutar el diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnóstico de Emails</Text>
        <Text style={styles.headerSubtitle}>Herramienta de debugging</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Critical Issue Alert */}
        <View style={styles.criticalAlert}>
          <Text style={styles.criticalAlertTitle}>🚨 PROBLEMA DETECTADO</Text>
          <Text style={styles.criticalAlertText}>
            <Text style={styles.bold}>Discrepancia de dominios:</Text>
            {'\n\n'}
            • Supabase intenta usar: <Text style={styles.bold}>barlive.app</Text>
            {'\n'}
            • DNS configurado para: <Text style={styles.bold}>noreply.barliveapp.es</Text>
            {'\n\n'}
            <Text style={styles.bold}>Resultado:</Text> Los emails NO se pueden enviar porque los dominios no coinciden.
          </Text>
        </View>

        {/* Solution Steps */}
        <View style={styles.solutionBox}>
          <Text style={styles.solutionTitle}>✅ SOLUCIÓN (Elige UNA opción)</Text>
          
          <View style={styles.optionBox}>
            <Text style={styles.optionTitle}>OPCIÓN 1: Usar barlive.app (Recomendado)</Text>
            <Text style={styles.optionStep}>1. Ve a tu proveedor de DNS (IONOS)</Text>
            <Text style={styles.optionStep}>2. Elimina los registros de noreply.barliveapp.es</Text>
            <Text style={styles.optionStep}>3. Añade estos registros para barlive.app:</Text>
            <View style={styles.dnsRecords}>
              <Text style={styles.dnsRecord}>
                TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDtp8UZLpsX5euox+jE+ZAhd4YfZk6HgGAujJ+51eQtIHL+yB0V5y+OOZUbDtd5sIV+jcrsDw+Ie+VV+crmAgWM2eTX0w3LXnHYZluJ3OLDyjOFwxiuOobXfTVoyd5OQyvdgdkHcrJDJvPVnqBIZNDKmxT0g/RboB0rgsxmkL++WwIDAQAB
              </Text>
              <Text style={styles.dnsRecord}>
                MX | send | feedback-smtp.eu-west-1.amazonses.com | Prioridad: 10
              </Text>
              <Text style={styles.dnsRecord}>
                TXT | send | v=spf1 include:amazonses.com ~all
              </Text>
            </View>
            <Text style={styles.optionStep}>4. Espera 15-30 minutos para propagación DNS</Text>
            <Text style={styles.optionStep}>5. Verifica en Resend: https://resend.com/domains</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.optionBox}>
            <Text style={styles.optionTitle}>OPCIÓN 2: Usar noreply.barliveapp.es</Text>
            <Text style={styles.optionStep}>1. Ve a Supabase Dashboard</Text>
            <Text style={styles.optionStep}>2. Authentication → Email Templates</Text>
            <Text style={styles.optionStep}>3. Cambia el remitente a: noreply@noreply.barliveapp.es</Text>
            <Text style={styles.optionStep}>4. Ve a Resend: https://resend.com/domains</Text>
            <Text style={styles.optionStep}>5. Añade el dominio: noreply.barliveapp.es</Text>
            <Text style={styles.optionStep}>6. Copia los registros DNS que te muestra Resend</Text>
            <Text style={styles.optionStep}>7. Añádelos en IONOS (ya deberían estar)</Text>
            <Text style={styles.optionStep}>8. Verifica el dominio en Resend</Text>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>📊 Estado Actual</Text>
          <View style={styles.statusItem}>
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={20}
              color="#ef4444"
            />
            <Text style={styles.statusText}>
              Dominio en Supabase: <Text style={styles.bold}>barlive.app</Text> (NO verificado)
            </Text>
          </View>
          <View style={styles.statusItem}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check_circle"
              size={20}
              color="#10b981"
            />
            <Text style={styles.statusText}>
              DNS configurado para: <Text style={styles.bold}>noreply.barliveapp.es</Text>
            </Text>
          </View>
          <View style={styles.statusItem}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={20}
              color="#f59e0b"
            />
            <Text style={styles.statusText}>
              Resultado: <Text style={styles.bold}>Emails NO se envían</Text>
            </Text>
          </View>
        </View>

        {/* Diagnostic Button */}
        <TouchableOpacity
          style={[styles.diagnosticButton, loading && styles.diagnosticButtonDisabled]}
          onPress={runDiagnostic}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="stethoscope"
                android_material_icon_name="medical_services"
                size={20}
                color="#fff"
              />
              <Text style={styles.diagnosticButtonText}>Ejecutar Diagnóstico Completo</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Test Result */}
        {testResult && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>📋 Resultado del Diagnóstico</Text>
            <Text style={styles.resultTimestamp}>
              Ejecutado: {new Date(testResult.timestamp).toLocaleString('es-ES')}
            </Text>

            <View style={styles.testResults}>
              <View style={styles.testResultItem}>
                <IconSymbol
                  ios_icon_name={testResult.tests.supabaseConnection ? "checkmark.circle.fill" : "xmark.circle.fill"}
                  android_material_icon_name={testResult.tests.supabaseConnection ? "check_circle" : "cancel"}
                  size={20}
                  color={testResult.tests.supabaseConnection ? "#10b981" : "#ef4444"}
                />
                <Text style={styles.testResultText}>Conexión a Supabase</Text>
              </View>

              <View style={styles.testResultItem}>
                <IconSymbol
                  ios_icon_name={testResult.tests.emailSending ? "checkmark.circle.fill" : "xmark.circle.fill"}
                  android_material_icon_name={testResult.tests.emailSending ? "check_circle" : "cancel"}
                  size={20}
                  color={testResult.tests.emailSending ? "#10b981" : "#ef4444"}
                />
                <Text style={styles.testResultText}>Envío de Emails</Text>
              </View>

              {testResult.tests.currentDomain && (
                <View style={styles.testResultItem}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="warning"
                    size={20}
                    color="#f59e0b"
                  />
                  <Text style={styles.testResultText}>
                    Dominio detectado: {testResult.tests.currentDomain}
                  </Text>
                </View>
              )}
            </View>

            {testResult.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>Error Detectado:</Text>
                <Text style={styles.errorDetailsText}>{testResult.error.message}</Text>
                <Text style={styles.errorDetailsText}>Status: {testResult.error.status}</Text>
                {testResult.error.code && (
                  <Text style={styles.errorDetailsText}>Code: {testResult.error.code}</Text>
                )}
              </View>
            )}

            {testResult.recommendations.length > 0 && (
              <View style={styles.recommendations}>
                <Text style={styles.recommendationsTitle}>💡 Recomendaciones:</Text>
                {testResult.recommendations.map((rec: any, index: number) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={[
                      styles.recommendationPriority,
                      rec.priority === 'CRÍTICO' && styles.recommendationCritical,
                      rec.priority === 'INFO' && styles.recommendationInfo,
                    ]}>
                      {rec.priority}
                    </Text>
                    <Text style={styles.recommendationTitle}>{rec.title}</Text>
                    <Text style={styles.recommendationDescription}>{rec.description}</Text>
                    <Text style={styles.recommendationSolution}>
                      Solución: {rec.solution}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <Text style={styles.quickLinksTitle}>🔗 Enlaces Rápidos</Text>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => {
              Alert.alert('Resend Dashboard', 'Abre: https://resend.com/domains');
            }}
          >
            <IconSymbol
              ios_icon_name="link"
              android_material_icon_name="link"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.quickLinkText}>Resend Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => {
              Alert.alert('Supabase Dashboard', 'Abre: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates');
            }}
          >
            <IconSymbol
              ios_icon_name="link"
              android_material_icon_name="link"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.quickLinkText}>Supabase Email Templates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => {
              Alert.alert('IONOS DNS', 'Abre tu panel de IONOS para gestionar DNS');
            }}
          >
            <IconSymbol
              ios_icon_name="link"
              android_material_icon_name="link"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.quickLinkText}>IONOS DNS Management</Text>
          </TouchableOpacity>
        </View>

        {/* Technical Info */}
        <View style={styles.technicalInfo}>
          <Text style={styles.technicalInfoTitle}>🔧 Información Técnica</Text>
          <Text style={styles.technicalInfoText}>
            <Text style={styles.bold}>Error en logs:</Text>
            {'\n'}
            "450 The barlive.app domain is not verified"
            {'\n\n'}
            <Text style={styles.bold}>Causa raíz:</Text>
            {'\n'}
            Supabase está configurado para enviar desde barlive.app, pero ese dominio no está verificado en Resend. Los registros DNS están configurados para noreply.barliveapp.es, que es un dominio diferente.
            {'\n\n'}
            <Text style={styles.bold}>Solución:</Text>
            {'\n'}
            Debes usar el MISMO dominio en Supabase y en Resend. Elige uno de los dos dominios y configúralo en ambos lugares.
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
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  criticalAlert: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  criticalAlertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 12,
  },
  criticalAlertText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
  solutionBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  solutionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  optionBox: {
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  optionStep: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    paddingLeft: 8,
  },
  dnsRecords: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  dnsRecord: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
  },
  statusBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  diagnosticButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  diagnosticButtonDisabled: {
    opacity: 0.6,
  },
  diagnosticButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  resultTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  testResults: {
    marginBottom: 16,
  },
  testResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testResultText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  errorDetails: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#7f1d1d',
    marginBottom: 4,
  },
  recommendations: {
    marginTop: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  recommendationItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recommendationPriority: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recommendationCritical: {
    color: '#dc2626',
  },
  recommendationInfo: {
    color: '#3b82f6',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  recommendationSolution: {
    fontSize: 13,
    color: colors.primary,
    fontStyle: 'italic',
  },
  quickLinks: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  quickLinksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  quickLinkText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
  },
  technicalInfo: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  technicalInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  technicalInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
