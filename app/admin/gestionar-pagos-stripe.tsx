
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Transaction {
  id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  locales: {
    nombre: string;
  };
  planes_suscripcion: {
    nombre: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  currency: string;
  status: string;
  issued_at: string;
  customer_name: string;
  locales: {
    nombre: string;
  };
}

interface CompanyFiscalData {
  id: string;
  company_name: string;
  tax_id: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string | null;
  email: string | null;
  send_invoices_automatically: boolean;
  accounting_email: string | null;
}

interface StripeConfig {
  id: string;
  publishable_key: string | null;
  secret_key: string | null;
  webhook_secret: string | null;
  test_mode: boolean;
}

export default function GestionarPagosStripeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyData, setCompanyData] = useState<CompanyFiscalData | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices' | 'settings' | 'stripe'>('transactions');
  
  // Company settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingCompanyData, setEditingCompanyData] = useState<CompanyFiscalData | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Stripe settings modal
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [editingStripeConfig, setEditingStripeConfig] = useState<StripeConfig | null>(null);
  const [savingStripe, setSavingStripe] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Statistics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTransactions(),
        loadInvoices(),
        loadCompanyData(),
        loadStripeConfig(),
        loadStatistics(),
      ]);
    } catch (error) {
      console.error('[GestionarPagosStripe] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          locales (nombre),
          planes_suscripcion (nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('[GestionarPagosStripe] Error loading transactions:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          locales (nombre)
        `)
        .order('issued_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('[GestionarPagosStripe] Error loading invoices:', error);
    }
  };

  const loadCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('company_fiscal_data')
        .select('*')
        .single();

      if (error) throw error;
      setCompanyData(data);
    } catch (error) {
      console.error('[GestionarPagosStripe] Error loading company data:', error);
    }
  };

  const loadStripeConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('stripe_configuration')
        .select('*')
        .single();

      if (error) throw error;
      setStripeConfig(data);
    } catch (error) {
      console.error('[GestionarPagosStripe] Error loading Stripe config:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      // Total revenue
      const { data: totalData } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'succeeded');

      if (totalData) {
        const total = totalData.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        setTotalRevenue(total);
      }

      // Monthly revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyData } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', startOfMonth.toISOString());

      if (monthlyData) {
        const monthly = monthlyData.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        setMonthlyRevenue(monthly);
      }

      // Pending invoices
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'issued');

      setPendingInvoices(count || 0);
    } catch (error) {
      console.error('[GestionarPagosStripe] Error loading statistics:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditCompanyData = () => {
    if (companyData) {
      setEditingCompanyData({ ...companyData });
      setShowSettingsModal(true);
    }
  };

  const handleSaveCompanyData = async () => {
    if (!editingCompanyData) return;

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('company_fiscal_data')
        .update({
          company_name: editingCompanyData.company_name,
          tax_id: editingCompanyData.tax_id,
          address: editingCompanyData.address,
          city: editingCompanyData.city,
          postal_code: editingCompanyData.postal_code,
          country: editingCompanyData.country,
          phone: editingCompanyData.phone,
          email: editingCompanyData.email,
          send_invoices_automatically: editingCompanyData.send_invoices_automatically,
          accounting_email: editingCompanyData.accounting_email,
        })
        .eq('id', editingCompanyData.id);

      if (error) throw error;

      Alert.alert('Éxito', 'Datos fiscales actualizados correctamente');
      setShowSettingsModal(false);
      await loadCompanyData();
    } catch (error) {
      console.error('[GestionarPagosStripe] Error saving company data:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos fiscales');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleEditStripeConfig = () => {
    if (stripeConfig) {
      setEditingStripeConfig({ ...stripeConfig });
      setShowStripeModal(true);
    }
  };

  const handleTestStripeConnection = async () => {
    if (!editingStripeConfig?.secret_key) {
      Alert.alert('Error', 'Por favor, introduce la Secret Key de Stripe');
      return;
    }

    setTestingConnection(true);
    try {
      // Test the Stripe connection by making a simple API call
      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: {
          'Authorization': `Bearer ${editingStripeConfig.secret_key}`,
        },
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Conexión con Stripe establecida correctamente ✓');
      } else {
        const error = await response.json();
        Alert.alert('Error', `No se pudo conectar con Stripe: ${error.error?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('[GestionarPagosStripe] Error testing Stripe connection:', error);
      Alert.alert('Error', 'No se pudo probar la conexión con Stripe');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveStripeConfig = async () => {
    if (!editingStripeConfig) return;

    setSavingStripe(true);
    try {
      const { error } = await supabase
        .from('stripe_configuration')
        .update({
          publishable_key: editingStripeConfig.publishable_key,
          secret_key: editingStripeConfig.secret_key,
          webhook_secret: editingStripeConfig.webhook_secret,
          test_mode: editingStripeConfig.test_mode,
        })
        .eq('id', editingStripeConfig.id);

      if (error) throw error;

      Alert.alert('Éxito', 'Configuración de Stripe actualizada correctamente');
      setShowStripeModal(false);
      await loadStripeConfig();
    } catch (error) {
      console.error('[GestionarPagosStripe] Error saving Stripe config:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración de Stripe');
    } finally {
      setSavingStripe(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    Alert.alert('Descargar Factura', 'La funcionalidad de descarga de facturas estará disponible próximamente.');
  };

  const handleSendInvoiceToAccounting = async (invoiceId: string) => {
    if (!companyData?.accounting_email) {
      Alert.alert('Error', 'No hay un correo de gestoría configurado. Por favor, configúralo en Ajustes.');
      return;
    }

    Alert.alert(
      'Enviar Factura',
      `¿Deseas enviar esta factura a ${companyData.accounting_email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('send-invoice-email', {
                body: { invoiceId, recipientEmail: companyData.accounting_email },
              });

              if (error) throw error;
              Alert.alert('Éxito', 'Factura enviada correctamente a la gestoría');
            } catch (error) {
              console.error('[GestionarPagosStripe] Error sending invoice:', error);
              Alert.alert('Error', 'No se pudo enviar la factura');
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      succeeded: { color: '#10B981', text: 'Exitoso' },
      pending: { color: '#F59E0B', text: 'Pendiente' },
      failed: { color: '#EF4444', text: 'Fallido' },
      refunded: { color: '#6B7280', text: 'Reembolsado' },
      issued: { color: '#3B82F6', text: 'Emitida' },
      paid: { color: '#10B981', text: 'Pagada' },
      cancelled: { color: '#EF4444', text: 'Cancelada' },
    };

    const badge = badges[status] || badges.pending;

    return (
      <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const renderTransactionsTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <IconSymbol ios_icon_name="dollarsign.circle.fill" android_material_icon_name="payments" size={32} color={colors.primary} />
          <Text style={styles.statValue}>€{totalRevenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Ingresos Totales</Text>
        </View>
        <View style={styles.statCard}>
          <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar_today" size={32} color={colors.primary} />
          <Text style={styles.statValue}>€{monthlyRevenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Este Mes</Text>
        </View>
        <View style={styles.statCard}>
          <IconSymbol ios_icon_name="doc.text.fill" android_material_icon_name="description" size={32} color={colors.primary} />
          <Text style={styles.statValue}>{pendingInvoices}</Text>
          <Text style={styles.statLabel}>Facturas Pendientes</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="creditcard" android_material_icon_name="payment" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay transacciones registradas</Text>
        </View>
      ) : (
        <React.Fragment>
          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionHeaderLeft}>
                  <Text style={styles.transactionLocalName}>{transaction.locales?.nombre || 'N/A'}</Text>
                  <Text style={styles.transactionPlanName}>
                    {transaction.planes_suscripcion?.nombre || 'N/A'}
                  </Text>
                </View>
                {getStatusBadge(transaction.status)}
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionAmount}>
                  €{parseFloat(transaction.amount.toString()).toFixed(2)} {transaction.currency}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={styles.transactionId} numberOfLines={1}>
                ID: {transaction.stripe_payment_intent_id}
              </Text>
            </View>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  );

  const renderInvoicesTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.sectionTitle}>Facturas</Text>
      {invoices.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="doc.text" android_material_icon_name="description" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay facturas registradas</Text>
        </View>
      ) : (
        <React.Fragment>
          {invoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceHeaderLeft}>
                  <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                  <Text style={styles.invoiceCustomer}>{invoice.customer_name}</Text>
                  <Text style={styles.invoiceLocal}>{invoice.locales?.nombre || 'N/A'}</Text>
                </View>
                {getStatusBadge(invoice.status)}
              </View>
              <View style={styles.invoiceDetails}>
                <Text style={styles.invoiceAmount}>
                  €{parseFloat(invoice.total.toString()).toFixed(2)} {invoice.currency}
                </Text>
                <Text style={styles.invoiceDate}>
                  {new Date(invoice.issued_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.invoiceActions}>
                <TouchableOpacity
                  style={styles.invoiceActionButton}
                  onPress={() => handleDownloadInvoice(invoice.id)}
                >
                  <IconSymbol ios_icon_name="arrow.down.circle.fill" android_material_icon_name="download" size={20} color={colors.primary} />
                  <Text style={styles.invoiceActionText}>Descargar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.invoiceActionButton}
                  onPress={() => handleSendInvoiceToAccounting(invoice.id)}
                >
                  <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={20} color={colors.primary} />
                  <Text style={styles.invoiceActionText}>Enviar a Gestoría</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.sectionTitle}>Datos Fiscales de Barlive</Text>
      {companyData && (
        <View style={styles.companyDataCard}>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Nombre de la Empresa</Text>
            <Text style={styles.companyDataValue}>{companyData.company_name}</Text>
          </View>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>CIF</Text>
            <Text style={styles.companyDataValue}>{companyData.tax_id}</Text>
          </View>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Dirección</Text>
            <Text style={styles.companyDataValue}>{companyData.address}</Text>
          </View>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Ciudad</Text>
            <Text style={styles.companyDataValue}>{companyData.city}</Text>
          </View>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Código Postal</Text>
            <Text style={styles.companyDataValue}>{companyData.postal_code}</Text>
          </View>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>País</Text>
            <Text style={styles.companyDataValue}>{companyData.country}</Text>
          </View>
          {companyData.phone && (
            <View style={styles.companyDataRow}>
              <Text style={styles.companyDataLabel}>Teléfono</Text>
              <Text style={styles.companyDataValue}>{companyData.phone}</Text>
            </View>
          )}
          {companyData.email && (
            <View style={styles.companyDataRow}>
              <Text style={styles.companyDataLabel}>Email</Text>
              <Text style={styles.companyDataValue}>{companyData.email}</Text>
            </View>
          )}
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Envío Automático de Facturas</Text>
            <Text style={styles.companyDataValue}>
              {companyData.send_invoices_automatically ? 'Activado' : 'Desactivado'}
            </Text>
          </View>
          {companyData.accounting_email && (
            <View style={styles.companyDataRow}>
              <Text style={styles.companyDataLabel}>Email de Gestoría</Text>
              <Text style={styles.companyDataValue}>{companyData.accounting_email}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditCompanyData}
          >
            <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={20} color={colors.white} />
            <Text style={styles.editButtonText}>Editar Datos Fiscales</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoBox}>
        <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Los datos fiscales se utilizan para generar las facturas automáticamente. Asegúrate de que toda la información sea correcta y esté actualizada.
        </Text>
      </View>
    </ScrollView>
  );

  const renderStripeTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <Text style={styles.sectionTitle}>Configuración de Stripe</Text>
      
      {stripeConfig && (
        <View style={styles.companyDataCard}>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Modo de Prueba</Text>
            <Text style={styles.companyDataValue}>
              {stripeConfig.test_mode ? 'Activado' : 'Desactivado'}
            </Text>
          </View>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Publishable Key</Text>
            <Text style={styles.companyDataValue} numberOfLines={1}>
              {stripeConfig.publishable_key ? '••••••••' + stripeConfig.publishable_key.slice(-8) : 'No configurado'}
            </Text>
          </View>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Secret Key</Text>
            <Text style={styles.companyDataValue} numberOfLines={1}>
              {stripeConfig.secret_key ? '••••••••' + stripeConfig.secret_key.slice(-8) : 'No configurado'}
            </Text>
          </View>
          <View style={styles.companyDataRow}>
            <Text style={styles.companyDataLabel}>Webhook Secret</Text>
            <Text style={styles.companyDataValue} numberOfLines={1}>
              {stripeConfig.webhook_secret ? '••••••••' + stripeConfig.webhook_secret.slice(-8) : 'No configurado'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditStripeConfig}
          >
            <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={20} color={colors.white} />
            <Text style={styles.editButtonText}>Editar Configuración</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoBox}>
        <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Para obtener tus claves de Stripe, visita el Dashboard de Stripe en stripe.com. Asegúrate de usar las claves correctas según el modo (prueba o producción).
        </Text>
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.badgeDestacado + '15', borderColor: colors.badgeDestacado + '30' }]}>
        <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={20} color={colors.badgeDestacado} />
        <Text style={styles.infoText}>
          <Text style={{ fontWeight: 'bold' }}>Importante:</Text> Nunca compartas tus claves secretas de Stripe. Mantenlas seguras y cámbialas regularmente.
        </Text>
      </View>

      <View style={[styles.infoBox, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' + '30' }]}>
        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
        <Text style={styles.infoText}>
          <Text style={{ fontWeight: 'bold' }}>Webhook URL:</Text>{'\n'}
          https://{Deno.env.get('SUPABASE_URL')?.replace('https://', '')}/functions/v1/stripe-webhook
        </Text>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestión de Pagos Stripe</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Pagos Stripe</Text>
        <TouchableOpacity onPress={loadData}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <IconSymbol
            ios_icon_name="creditcard.fill"
            android_material_icon_name="payment"
            size={20}
            color={activeTab === 'transactions' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
            Transacciones
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.tabActive]}
          onPress={() => setActiveTab('invoices')}
        >
          <IconSymbol
            ios_icon_name="doc.text.fill"
            android_material_icon_name="description"
            size={20}
            color={activeTab === 'invoices' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>
            Facturas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stripe' && styles.tabActive]}
          onPress={() => setActiveTab('stripe')}
        >
          <IconSymbol
            ios_icon_name="creditcard"
            android_material_icon_name="credit_card"
            size={20}
            color={activeTab === 'stripe' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'stripe' && styles.tabTextActive]}>
            Stripe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <IconSymbol
            ios_icon_name="gear"
            android_material_icon_name="settings"
            size={20}
            color={activeTab === 'settings' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'transactions' && renderTransactionsTab()}
      {activeTab === 'invoices' && renderInvoicesTab()}
      {activeTab === 'stripe' && renderStripeTab()}
      {activeTab === 'settings' && renderSettingsTab()}

      {/* Company Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Datos Fiscales</Text>
                <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalBodyContent}
              >
                {editingCompanyData && (
                  <React.Fragment>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Nombre de la Empresa *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Barlive"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.company_name}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, company_name: text })}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>CIF *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="B12345678"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.tax_id}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, tax_id: text })}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Dirección *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Calle Ejemplo, 123"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.address}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, address: text })}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Ciudad *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Madrid"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.city}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, city: text })}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Código Postal *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="28001"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.postal_code}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, postal_code: text })}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>País *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="España"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.country}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, country: text })}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Teléfono</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="+34 123 456 789"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.phone || ''}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, phone: text })}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Email</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="facturacion@barlive.app"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.email || ''}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, email: text })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Email de Gestoría</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="gestoria@ejemplo.com"
                        placeholderTextColor={colors.textSecondary}
                        value={editingCompanyData.accounting_email || ''}
                        onChangeText={(text) => setEditingCompanyData({ ...editingCompanyData, accounting_email: text })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Envío Automático de Facturas</Text>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>
                          {editingCompanyData.send_invoices_automatically ? 'Activado' : 'Desactivado'}
                        </Text>
                        <Switch
                          value={editingCompanyData.send_invoices_automatically}
                          onValueChange={(value) => setEditingCompanyData({
                            ...editingCompanyData,
                            send_invoices_automatically: value
                          })}
                          trackColor={{ false: colors.border, true: colors.primary }}
                          thumbColor={colors.white}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={handleSaveCompanyData}
                      disabled={savingSettings}
                    >
                      {savingSettings ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <React.Fragment>
                          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="white" />
                          <Text style={styles.confirmButtonText}>Guardar Cambios</Text>
                        </React.Fragment>
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stripe Configuration Modal */}
      <Modal
        visible={showStripeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStripeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configurar Stripe</Text>
                <TouchableOpacity onPress={() => setShowStripeModal(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalBodyContent}
              >
                {editingStripeConfig && (
                  <React.Fragment>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Modo de Prueba</Text>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>
                          {editingStripeConfig.test_mode ? 'Activado' : 'Desactivado'}
                        </Text>
                        <Switch
                          value={editingStripeConfig.test_mode}
                          onValueChange={(value) => setEditingStripeConfig({
                            ...editingStripeConfig,
                            test_mode: value
                          })}
                          trackColor={{ false: colors.border, true: colors.primary }}
                          thumbColor={colors.white}
                        />
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Publishable Key *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="pk_test_..."
                        placeholderTextColor={colors.textSecondary}
                        value={editingStripeConfig.publishable_key || ''}
                        onChangeText={(text) => setEditingStripeConfig({ ...editingStripeConfig, publishable_key: text })}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Secret Key *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="sk_test_..."
                        placeholderTextColor={colors.textSecondary}
                        value={editingStripeConfig.secret_key || ''}
                        onChangeText={(text) => setEditingStripeConfig({ ...editingStripeConfig, secret_key: text })}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Webhook Secret</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="whsec_..."
                        placeholderTextColor={colors.textSecondary}
                        value={editingStripeConfig.webhook_secret || ''}
                        onChangeText={(text) => setEditingStripeConfig({ ...editingStripeConfig, webhook_secret: text })}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.confirmButton, { backgroundColor: '#10B981', marginTop: 16 }]}
                      onPress={handleTestStripeConnection}
                      disabled={testingConnection}
                    >
                      {testingConnection ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <React.Fragment>
                          <IconSymbol ios_icon_name="checkmark.shield.fill" android_material_icon_name="verified" size={20} color="white" />
                          <Text style={styles.confirmButtonText}>Probar Conexión</Text>
                        </React.Fragment>
                      )}
                    </TouchableOpacity>

                    <View style={[styles.infoBox, { marginTop: 16 }]}>
                      <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
                      <Text style={styles.infoText}>
                        Obtén tus claves desde el Dashboard de Stripe. Usa claves de prueba (test) para desarrollo y claves de producción (live) para producción.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={handleSaveStripeConfig}
                      disabled={savingStripe}
                    >
                      {savingStripe ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <React.Fragment>
                          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="white" />
                          <Text style={styles.confirmButtonText}>Guardar Configuración</Text>
                        </React.Fragment>
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  tabContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...commonStyles.shadow,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...commonStyles.shadow,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionHeaderLeft: {
    flex: 1,
  },
  transactionLocalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  transactionPlanName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  transactionDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  transactionId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  invoiceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...commonStyles.shadow,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceHeaderLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  invoiceCustomer: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  invoiceLocal: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  invoiceDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  invoiceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '15',
    paddingVertical: 10,
    borderRadius: 8,
  },
  invoiceActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  companyDataCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...commonStyles.shadow,
  },
  companyDataRow: {
    marginBottom: 16,
  },
  companyDataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  companyDataValue: {
    fontSize: 16,
    color: colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    maxHeight: '80%',
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
