
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
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_tax_id?: string;
  customer_address?: string;
  customer_city?: string;
  customer_postal_code?: string;
  customer_country?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  issued_at: string;
  due_date?: string;
  paid_at?: string;
  pdf_url?: string;
  local_id?: string;
  plan_id?: string;
  metadata?: any;
}

interface ManualInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_tax_id?: string;
  customer_address?: string;
  customer_city?: string;
  customer_postal_code?: string;
  customer_country?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  issued_at?: string;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
}

interface InvoiceItem {
  concept: string;
  price: number;
}

interface CompanyFiscalData {
  id: string;
  company_name: string;
  tax_id: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  bank_name?: string;
  iban?: string;
  swift_bic?: string;
  invoice_prefix: string;
  next_invoice_number: number;
  invoice_footer_text?: string;
  send_invoices_automatically: boolean;
  accounting_email?: string;
  legal_terms?: string;
  privacy_policy?: string;
  contact_info?: any;
  barlive_info?: any;
}

const SPAIN_VAT_RATE = 21.0; // IVA estándar en España

export default function FacturacionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [manualInvoices, setManualInvoices] = useState<ManualInvoice[]>([]);
  const [fiscalData, setFiscalData] = useState<CompanyFiscalData | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'manual' | 'config'>('invoices');
  const [showFiscalDataModal, setShowFiscalDataModal] = useState(false);
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState(false);
  const [savingFiscalData, setSavingFiscalData] = useState(false);

  // Fiscal data form state
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('España');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('BL');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('1');
  const [invoiceFooterText, setInvoiceFooterText] = useState('');
  const [sendAutomatically, setSendAutomatically] = useState(true);
  const [accountingEmail, setAccountingEmail] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | ManualInvoice | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  // Manual invoice form state
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerEmail, setManualCustomerEmail] = useState('');
  const [manualCustomerTaxId, setManualCustomerTaxId] = useState('');
  const [manualCustomerAddress, setManualCustomerAddress] = useState('');
  const [manualCustomerCity, setManualCustomerCity] = useState('');
  const [manualCustomerPostalCode, setManualCustomerPostalCode] = useState('');
  const [manualItems, setManualItems] = useState<InvoiceItem[]>([{ concept: '', price: 0 }]);
  const [manualNotes, setManualNotes] = useState('');
  const [savingManualInvoice, setSavingManualInvoice] = useState(false);

  const cargarFacturas = useCallback(async () => {
    try {
      console.log('[Facturacion] ✅ Cargando facturas automáticas...');
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('issued_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Facturacion] ❌ Error cargando facturas:', error);
        throw error;
      }

      console.log('[Facturacion] ✅ Facturas cargadas:', data?.length || 0);
      setInvoices(data || []);
    } catch (error) {
      console.error('[Facturacion] Error cargando facturas:', error);
      Alert.alert('Error', 'No se pudieron cargar las facturas');
    }
  }, []);

  const cargarFacturasManuales = useCallback(async () => {
    try {
      console.log('[Facturacion] ✅ Cargando facturas manuales...');
      const { data, error } = await supabase
        .from('manual_invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Facturacion] ❌ Error cargando facturas manuales:', error);
        throw error;
      }

      console.log('[Facturacion] ✅ Facturas manuales cargadas:', data?.length || 0);
      setManualInvoices(data || []);
    } catch (error) {
      console.error('[Facturacion] Error cargando facturas manuales:', error);
    }
  }, []);

  const cargarDatosFiscales = useCallback(async () => {
    try {
      console.log('[Facturacion] ✅ Cargando datos fiscales...');
      const { data, error } = await supabase
        .from('company_fiscal_data')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Facturacion] ❌ Error cargando datos fiscales:', error);
        throw error;
      }

      if (data) {
        console.log('[Facturacion] ✅ Datos fiscales cargados');
        setFiscalData(data);
        setCompanyName(data.company_name || '');
        setTaxId(data.tax_id || '');
        setAddress(data.address || '');
        setCity(data.city || '');
        setPostalCode(data.postal_code || '');
        setCountry(data.country || 'España');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setBankName(data.bank_name || '');
        setIban(data.iban || '');
        setSwiftBic(data.swift_bic || '');
        setInvoicePrefix(data.invoice_prefix || 'BL');
        setNextInvoiceNumber(data.next_invoice_number?.toString() || '1');
        setInvoiceFooterText(data.invoice_footer_text || '');
        setSendAutomatically(data.send_invoices_automatically ?? true);
        setAccountingEmail(data.accounting_email || '');
      } else {
        console.log('[Facturacion] ℹ️ No hay datos fiscales configurados');
      }
    } catch (error) {
      console.error('[Facturacion] Error cargando datos fiscales:', error);
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([cargarFacturas(), cargarFacturasManuales(), cargarDatosFiscales()]);
    setLoading(false);
  }, [cargarFacturas, cargarFacturasManuales, cargarDatosFiscales]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const calculateManualInvoiceTotals = useCallback(() => {
    const subtotal = manualItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const taxAmount = subtotal * (SPAIN_VAT_RATE / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }, [manualItems]);

  const handleSaveFiscalData = async () => {
    if (!companyName.trim() || !taxId.trim() || !address.trim() || !city.trim() || !postalCode.trim()) {
      Alert.alert('Error', 'Los campos obligatorios deben estar completos');
      return;
    }

    setSavingFiscalData(true);
    try {
      const fiscalDataToSave = {
        company_name: companyName.trim(),
        tax_id: taxId.trim(),
        address: address.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        country: country.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        bank_name: bankName.trim() || null,
        iban: iban.trim() || null,
        swift_bic: swiftBic.trim() || null,
        invoice_prefix: invoicePrefix.trim() || 'BL',
        next_invoice_number: parseInt(nextInvoiceNumber) || 1,
        invoice_footer_text: invoiceFooterText.trim() || null,
        send_invoices_automatically: sendAutomatically,
        accounting_email: accountingEmail.trim() || null,
      };

      if (fiscalData) {
        const { error } = await supabase
          .from('company_fiscal_data')
          .update(fiscalDataToSave)
          .eq('id', fiscalData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_fiscal_data')
          .insert(fiscalDataToSave);

        if (error) throw error;
      }

      Alert.alert('Éxito', 'Datos fiscales guardados correctamente');
      setShowFiscalDataModal(false);
      await cargarDatosFiscales();
    } catch (error) {
      console.error('[Facturacion] Error guardando datos fiscales:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos fiscales');
    } finally {
      setSavingFiscalData(false);
    }
  };

  const handleCreateManualInvoice = async () => {
    if (!fiscalData) {
      Alert.alert('Error', 'Configura primero los datos fiscales');
      return;
    }

    if (!manualCustomerName.trim() || !manualCustomerEmail.trim()) {
      Alert.alert('Error', 'El nombre y email del cliente son obligatorios');
      return;
    }

    const validItems = manualItems.filter(item => item.concept.trim() && item.price > 0);
    if (validItems.length === 0) {
      Alert.alert('Error', 'Añade al menos un producto/concepto con precio');
      return;
    }

    setSavingManualInvoice(true);
    try {
      const { subtotal, taxAmount, total } = calculateManualInvoiceTotals();
      
      // Generate invoice number
      const invoiceNumber = `${fiscalData.invoice_prefix}${String(fiscalData.next_invoice_number).padStart(6, '0')}`;

      const { data: newInvoice, error } = await supabase
        .from('manual_invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_name: manualCustomerName.trim(),
          customer_email: manualCustomerEmail.trim(),
          customer_tax_id: manualCustomerTaxId.trim() || null,
          customer_address: manualCustomerAddress.trim() || null,
          customer_city: manualCustomerCity.trim() || null,
          customer_postal_code: manualCustomerPostalCode.trim() || null,
          customer_country: 'España',
          items: validItems,
          subtotal,
          tax_rate: SPAIN_VAT_RATE,
          tax_amount: taxAmount,
          total,
          currency: 'EUR',
          status: 'issued',
          issued_at: new Date().toISOString(),
          notes: manualNotes.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update next invoice number
      await supabase
        .from('company_fiscal_data')
        .update({ next_invoice_number: fiscalData.next_invoice_number + 1 })
        .eq('id', fiscalData.id);

      Alert.alert(
        '✅ Factura Creada',
        `Factura ${invoiceNumber} creada correctamente.\n\n¿Deseas enviarla por email al cliente?`,
        [
          { text: 'Ahora No', style: 'cancel' },
          {
            text: 'Enviar Email',
            onPress: async () => {
              try {
                const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invoice-email', {
                  body: {
                    invoiceId: newInvoice.id,
                    recipientEmail: manualCustomerEmail.trim(),
                    isTest: false,
                    isManual: true,
                  },
                });

                if (emailError || !emailData.success) {
                  Alert.alert('Advertencia', 'Factura creada pero el email no se pudo enviar');
                } else {
                  Alert.alert('✅ Email Enviado', 'La factura ha sido enviada al cliente');
                }
              } catch (error) {
                console.error('[Facturacion] Error enviando email:', error);
              }
            },
          },
        ]
      );

      setShowManualInvoiceModal(false);
      resetManualInvoiceForm();
      await Promise.all([cargarFacturasManuales(), cargarDatosFiscales()]);
    } catch (error) {
      console.error('[Facturacion] Error creando factura manual:', error);
      Alert.alert('Error', 'No se pudo crear la factura');
    } finally {
      setSavingManualInvoice(false);
    }
  };

  const resetManualInvoiceForm = () => {
    setManualCustomerName('');
    setManualCustomerEmail('');
    setManualCustomerTaxId('');
    setManualCustomerAddress('');
    setManualCustomerCity('');
    setManualCustomerPostalCode('');
    setManualItems([{ concept: '', price: 0 }]);
    setManualNotes('');
  };

  const addManualInvoiceItem = () => {
    setManualItems([...manualItems, { concept: '', price: 0 }]);
  };

  const removeManualInvoiceItem = (index: number) => {
    if (manualItems.length > 1) {
      setManualItems(manualItems.filter((_, i) => i !== index));
    }
  };

  const updateManualInvoiceItem = (index: number, field: 'concept' | 'price', value: string | number) => {
    const newItems = [...manualItems];
    if (field === 'concept') {
      newItems[index].concept = value as string;
    } else {
      newItems[index].price = typeof value === 'string' ? parseFloat(value) || 0 : value;
    }
    setManualItems(newItems);
  };

  const handlePreviewInvoice = (invoice: Invoice | ManualInvoice) => {
    setPreviewInvoice(invoice);
    setShowPreviewModal(true);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      Alert.alert('Error', 'Ingresa un email válido');
      return;
    }

    if (!fiscalData) {
      Alert.alert('Error', 'Configura primero los datos fiscales');
      return;
    }

    setSendingTestEmail(true);
    try {
      // Create a test invoice
      const testInvoiceData = {
        invoice_number: `${fiscalData.invoice_prefix}TEST001`,
        customer_name: 'Cliente de Prueba',
        customer_email: testEmail.trim(),
        customer_tax_id: 'B12345678',
        customer_address: 'Calle de Prueba, 123',
        customer_city: 'Madrid',
        customer_postal_code: '28001',
        customer_country: 'España',
        subtotal: 100.00,
        tax_rate: SPAIN_VAT_RATE,
        tax_amount: 21.00,
        total: 121.00,
        currency: 'EUR',
        status: 'issued' as const,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      
      console.log('[Facturacion] 📧 Sending test email to:', testEmail);
      
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceData: testInvoiceData,
          recipientEmail: testEmail.trim(),
          isTest: true,
        },
      });

      console.log('[Facturacion] 📧 Response:', data);

      if (error) {
        console.error('[Facturacion] ❌ Supabase function error:', error);
        throw error;
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || data?.message || 'Failed to send email';
        console.error('[Facturacion] ❌ Function returned error:', errorMsg);
        
        // Show detailed error message
        if (data?.email_sent === false && data?.notification_created) {
          Alert.alert(
            '⚠️ Email No Enviado',
            `No se pudo enviar el email, pero se creó una notificación en la app.\n\nError: ${data.email_error || 'Desconocido'}\n\nPor favor, verifica la configuración de Resend.`,
            [{ text: 'OK' }]
          );
        } else {
          throw new Error(errorMsg);
        }
        return;
      }

      // Success!
      const successMessage = data.email_sent 
        ? `✅ Email enviado correctamente a ${testEmail}\n\n${data.notification_created ? 'También se creó una notificación en la app.' : ''}`
        : `⚠️ Se creó una notificación en la app, pero el email no se pudo enviar.\n\nError: ${data.email_error || 'Desconocido'}`;

      Alert.alert(
        data.email_sent ? '✅ Email de Prueba Enviado' : '⚠️ Notificación Creada',
        successMessage,
        [{ text: 'OK' }]
      );
      
      if (data.email_sent) {
        setTestEmail('');
      }
    } catch (error: any) {
      console.error('[Facturacion] ❌ Error enviando email de prueba:', error);
      Alert.alert(
        'Error',
        `No se pudo enviar el email de prueba.\n\nDetalles: ${error.message || 'Error desconocido'}\n\nPor favor, verifica:\n- Configuración de Resend\n- Dominio verificado\n- API Key válida`,
        [{ text: 'OK' }]
      );
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSendInvoiceEmail = async (invoice: Invoice | ManualInvoice, isManual: boolean = false) => {
    if (!fiscalData) {
      Alert.alert('Error', 'Configura primero los datos fiscales');
      return;
    }

    Alert.alert(
      'Enviar Factura',
      `¿Deseas enviar la factura ${invoice.invoice_number} a ${invoice.customer_email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setSendingInvoiceId(invoice.id);
            try {
              console.log('[Facturacion] 📧 Sending invoice email:', invoice.invoice_number);
              
              const { data, error } = await supabase.functions.invoke('send-invoice-email', {
                body: {
                  invoiceId: invoice.id,
                  recipientEmail: invoice.customer_email,
                  isTest: false,
                  isManual,
                },
              });

              console.log('[Facturacion] 📧 Response:', data);

              if (error) {
                console.error('[Facturacion] ❌ Supabase function error:', error);
                throw error;
              }

              if (!data || !data.success) {
                const errorMsg = data?.error || data?.message || 'Failed to send email';
                console.error('[Facturacion] ❌ Function returned error:', errorMsg);
                
                // Show detailed error message
                if (data?.email_sent === false && data?.notification_created) {
                  Alert.alert(
                    '⚠️ Email No Enviado',
                    `No se pudo enviar el email, pero se creó una notificación en la app para el cliente.\n\nError: ${data.email_error || 'Desconocido'}\n\nPor favor, verifica la configuración de Resend.`,
                    [{ text: 'OK' }]
                  );
                } else {
                  throw new Error(errorMsg);
                }
                await cargarDatos();
                return;
              }

              // Success!
              const successMessage = data.email_sent 
                ? `Email enviado correctamente a ${invoice.customer_email}\n\n${data.notification_created ? 'También se creó una notificación en la app.' : ''}`
                : `Se creó una notificación en la app, pero el email no se pudo enviar.\n\nError: ${data.email_error || 'Desconocido'}`;

              Alert.alert(
                data.email_sent ? '✅ Factura Enviada' : '⚠️ Notificación Creada',
                successMessage,
                [{ text: 'OK' }]
              );
              
              await cargarDatos();
            } catch (error: any) {
              console.error('[Facturacion] ❌ Error enviando factura:', error);
              Alert.alert(
                'Error',
                `No se pudo enviar la factura.\n\nDetalles: ${error.message || 'Error desconocido'}\n\nPor favor, verifica:\n- Configuración de Resend\n- Dominio verificado\n- API Key válida`,
                [{ text: 'OK' }]
              );
            } finally {
              setSendingInvoiceId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      draft: { color: '#6B7280', text: 'Borrador' },
      issued: { color: '#F59E0B', text: 'Emitida' },
      paid: { color: '#10B981', text: 'Pagada' },
      cancelled: { color: '#EF4444', text: 'Cancelada' },
    };

    const badge = badges[status] || badges.draft;

    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const renderInvoicesTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Facturas Automáticas</Text>
          <Text style={styles.sectionSubtitle}>Generadas tras compras de suscripciones</Text>
        </View>
      </View>

      {!fiscalData && (
        <View style={styles.warningCard}>
          <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={24} color="#F59E0B" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Datos Fiscales No Configurados</Text>
            <Text style={styles.warningText}>
              Configura los datos fiscales de tu empresa para poder emitir facturas correctamente.
            </Text>
            <TouchableOpacity
              style={styles.warningButton}
              onPress={() => {
                setActiveTab('config');
                setShowFiscalDataModal(true);
              }}
            >
              <Text style={styles.warningButtonText}>Configurar Ahora</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {invoices.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="doc.text" android_material_icon_name="description" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay facturas automáticas emitidas</Text>
        </View>
      ) : (
        <React.Fragment>
          {invoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceHeaderLeft}>
                  <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                  <Text style={styles.invoiceCustomer}>{invoice.customer_name}</Text>
                  <Text style={styles.invoiceEmail}>{invoice.customer_email}</Text>
                </View>
                <View style={styles.invoiceHeaderRight}>
                  {getStatusBadge(invoice.status)}
                  <Text style={styles.invoiceAmount}>
                    {invoice.total.toFixed(2)} {invoice.currency}
                  </Text>
                </View>
              </View>

              <View style={styles.invoiceDates}>
                <View style={styles.invoiceDateItem}>
                  <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={16} color={colors.textSecondary} />
                  <Text style={styles.invoiceDate}>
                    Emitida: {new Date(invoice.issued_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                {invoice.paid_at && (
                  <View style={styles.invoiceDateItem}>
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color="#10B981" />
                    <Text style={styles.invoiceDate}>
                      Pagada: {new Date(invoice.paid_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                )}
                {invoice.metadata?.email_sent_at && (
                  <View style={styles.invoiceDateItem}>
                    <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={16} color={colors.primary} />
                    <Text style={styles.invoiceDate}>
                      Enviada: {new Date(invoice.metadata.email_sent_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.invoiceActions}>
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={() => handlePreviewInvoice(invoice)}
                >
                  <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
                  <Text style={styles.previewButtonText}>Vista Previa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendEmailButton, sendingInvoiceId === invoice.id && styles.sendEmailButtonDisabled]}
                  onPress={() => handleSendInvoiceEmail(invoice, false)}
                  disabled={sendingInvoiceId === invoice.id}
                >
                  {sendingInvoiceId === invoice.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={18} color={colors.white} />
                      <Text style={styles.sendEmailButtonText}>Enviar Email</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  );

  const renderManualTab = () => {
    const { subtotal, taxAmount, total } = calculateManualInvoiceTotals();

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Facturas Manuales</Text>
            <Text style={styles.sectionSubtitle}>Crea facturas personalizadas</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              if (!fiscalData) {
                Alert.alert('Error', 'Configura primero los datos fiscales en la pestaña Configuración');
                return;
              }
              resetManualInvoiceForm();
              setShowManualInvoiceModal(true);
            }}
          >
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
            <Text style={styles.createButtonText}>Nueva Factura</Text>
          </TouchableOpacity>
        </View>

        {manualInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="doc.text.fill" android_material_icon_name="description" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No hay facturas manuales creadas</Text>
            <Text style={styles.emptySubtext}>Crea facturas personalizadas cuando lo necesites</Text>
          </View>
        ) : (
          <React.Fragment>
            {manualInvoices.map((invoice) => (
              <View key={invoice.id} style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceHeaderLeft}>
                    <View style={styles.manualBadgeRow}>
                      <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                      <View style={styles.manualBadge}>
                        <IconSymbol ios_icon_name="hand.raised.fill" android_material_icon_name="back_hand" size={10} color="#8B5CF6" />
                        <Text style={styles.manualBadgeText}>Manual</Text>
                      </View>
                    </View>
                    <Text style={styles.invoiceCustomer}>{invoice.customer_name}</Text>
                    <Text style={styles.invoiceEmail}>{invoice.customer_email}</Text>
                  </View>
                  <View style={styles.invoiceHeaderRight}>
                    {getStatusBadge(invoice.status)}
                    <Text style={styles.invoiceAmount}>
                      {invoice.total.toFixed(2)} {invoice.currency}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceItemsList}>
                  {(invoice.items as InvoiceItem[]).map((item, index) => (
                    <View key={index} style={styles.invoiceItemRow}>
                      <Text style={styles.invoiceItemConcept}>{item.concept}</Text>
                      <Text style={styles.invoiceItemPrice}>{item.price.toFixed(2)} €</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.invoiceActions}>
                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={() => handlePreviewInvoice(invoice)}
                  >
                    <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
                    <Text style={styles.previewButtonText}>Vista Previa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sendEmailButton, sendingInvoiceId === invoice.id && styles.sendEmailButtonDisabled]}
                    onPress={() => handleSendInvoiceEmail(invoice, true)}
                    disabled={sendingInvoiceId === invoice.id}
                  >
                    {sendingInvoiceId === invoice.id ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={18} color={colors.white} />
                        <Text style={styles.sendEmailButtonText}>Enviar Email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </React.Fragment>
        )}

        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Facturas Manuales</Text>
            <Text style={styles.infoText}>
              - Crea facturas personalizadas cuando lo necesites{'\n'}
              - Los datos de la empresa se toman automáticamente{'\n'}
              - Solo editas el producto/concepto y el precio{'\n'}
              - El sistema calcula automáticamente IVA (21%) y total{'\n'}
              - Puedes enviarlas por email al cliente{'\n'}
              - Diseño profesional y elegante
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderConfigTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Configuración de Facturación</Text>
          <Text style={styles.sectionSubtitle}>Datos fiscales y opciones</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowFiscalDataModal(true)}
        >
          <IconSymbol ios_icon_name="pencil.circle.fill" android_material_icon_name="edit" size={20} color={colors.white} />
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      {/* Test Email Section */}
      <View style={styles.testEmailSection}>
        <Text style={styles.testEmailTitle}>Enviar Factura de Prueba</Text>
        <Text style={styles.testEmailSubtitle}>Prueba el sistema de envío de facturas por email</Text>
        
        <View style={styles.testEmailForm}>
          <TextInput
            style={styles.testEmailInput}
            value={testEmail}
            onChangeText={setTestEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.sendTestButton, (sendingTestEmail || !fiscalData) && styles.sendTestButtonDisabled]}
            onPress={handleSendTestEmail}
            disabled={sendingTestEmail || !fiscalData}
          >
            {sendingTestEmail ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={18} color={colors.white} />
                <Text style={styles.sendTestButtonText}>Enviar Prueba</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {fiscalData ? (
        <View style={styles.configCard}>
          <View style={styles.configSection}>
            <Text style={styles.configSectionTitle}>Datos de la Empresa</Text>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Nombre:</Text>
              <Text style={styles.configValue}>{fiscalData.company_name}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>CIF/NIF:</Text>
              <Text style={styles.configValue}>{fiscalData.tax_id}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Dirección:</Text>
              <Text style={styles.configValue}>{fiscalData.address}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Ciudad:</Text>
              <Text style={styles.configValue}>{fiscalData.city}, {fiscalData.postal_code}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>País:</Text>
              <Text style={styles.configValue}>{fiscalData.country}</Text>
            </View>
          </View>

          {(fiscalData.phone || fiscalData.email || fiscalData.website) && (
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Contacto</Text>
              {fiscalData.phone && (
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Teléfono:</Text>
                  <Text style={styles.configValue}>{fiscalData.phone}</Text>
                </View>
              )}
              {fiscalData.email && (
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Email:</Text>
                  <Text style={styles.configValue}>{fiscalData.email}</Text>
                </View>
              )}
              {fiscalData.website && (
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Web:</Text>
                  <Text style={styles.configValue}>{fiscalData.website}</Text>
                </View>
              )}
            </View>
          )}

          {(fiscalData.bank_name || fiscalData.iban) && (
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Datos Bancarios</Text>
              {fiscalData.bank_name && (
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Banco:</Text>
                  <Text style={styles.configValue}>{fiscalData.bank_name}</Text>
                </View>
              )}
              {fiscalData.iban && (
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>IBAN:</Text>
                  <Text style={styles.configValue}>{fiscalData.iban}</Text>
                </View>
              )}
              {fiscalData.swift_bic && (
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>SWIFT/BIC:</Text>
                  <Text style={styles.configValue}>{fiscalData.swift_bic}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.configSection}>
            <Text style={styles.configSectionTitle}>Configuración de Facturas</Text>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Prefijo:</Text>
              <Text style={styles.configValue}>{fiscalData.invoice_prefix}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Próximo Número:</Text>
              <Text style={styles.configValue}>{fiscalData.next_invoice_number}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Envío Automático:</Text>
              <Text style={styles.configValue}>{fiscalData.send_invoices_automatically ? 'Sí' : 'No'}</Text>
            </View>
            {fiscalData.accounting_email && (
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Email Gestoría:</Text>
                <Text style={styles.configValue}>{fiscalData.accounting_email}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol ios_icon_name="doc.text.fill" android_material_icon_name="description" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay datos fiscales configurados</Text>
          <TouchableOpacity
            style={styles.configureButton}
            onPress={() => setShowFiscalDataModal(true)}
          >
            <Text style={styles.configureButtonText}>Configurar Ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoCard}>
        <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Sistema de Facturación</Text>
          <Text style={styles.infoText}>
            - Las facturas automáticas se emiten tras cada compra{'\n'}
            - Puedes crear facturas manuales cuando lo necesites{'\n'}
            - Todas incluyen IVA del 21% (España){'\n'}
            - Puedes enviarlas por email a clientes y gestoría{'\n'}
            - Diseño profesional y elegante
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Facturación</Text>
          </View>
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
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Facturación</Text>
          <Text style={styles.headerSubtitle}>Sistema de facturación</Text>
        </View>
        <TouchableOpacity onPress={cargarDatos}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabs}>
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
            Automáticas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
          onPress={() => setActiveTab('manual')}
        >
          <IconSymbol
            ios_icon_name="pencil.and.list.clipboard"
            android_material_icon_name="edit_note"
            size={20}
            color={activeTab === 'manual' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
            Manuales
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'config' && styles.tabActive]}
          onPress={() => setActiveTab('config')}
        >
          <IconSymbol
            ios_icon_name="gearshape.fill"
            android_material_icon_name="settings"
            size={20}
            color={activeTab === 'config' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'config' && styles.tabTextActive]}>
            Configuración
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'invoices' && renderInvoicesTab()}
      {activeTab === 'manual' && renderManualTab()}
      {activeTab === 'config' && renderConfigTab()}

      {/* Manual Invoice Creation Modal */}
      <Modal
        visible={showManualInvoiceModal}
        transparent={Platform.OS === 'android' ? false : true}
        animationType="slide"
        presentationStyle={Platform.OS === 'android' ? 'fullScreen' : 'pageSheet'}
        onRequestClose={() => setShowManualInvoiceModal(false)}
      >
        <Pressable style={[styles.modalOverlay, Platform.OS === 'android' && styles.modalOverlayAndroid]} onPress={() => setShowManualInvoiceModal(false)}>
          <Pressable style={[styles.largeModalContent, Platform.OS === 'android' && styles.largeModalContentAndroid]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Factura Manual</Text>
              <TouchableOpacity onPress={() => setShowManualInvoiceModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.formSectionTitle}>Datos del Cliente</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre del Cliente *</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualCustomerName}
                  onChangeText={setManualCustomerName}
                  placeholder="Nombre completo o empresa"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email del Cliente *</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualCustomerEmail}
                  onChangeText={setManualCustomerEmail}
                  placeholder="cliente@ejemplo.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>CIF/NIF (opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualCustomerTaxId}
                  onChangeText={setManualCustomerTaxId}
                  placeholder="B12345678"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dirección (opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualCustomerAddress}
                  onChangeText={setManualCustomerAddress}
                  placeholder="Calle Principal, 123"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 2 }]}>
                  <Text style={styles.formLabel}>Ciudad</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualCustomerCity}
                    onChangeText={setManualCustomerCity}
                    placeholder="Madrid"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>C.P.</Text>
                  <TextInput
                    style={styles.formInput}
                    value={manualCustomerPostalCode}
                    onChangeText={setManualCustomerPostalCode}
                    placeholder="28001"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={styles.formSectionTitle}>Productos/Servicios</Text>
              
              {manualItems.map((item, index) => (
                <View key={index} style={styles.invoiceItemForm}>
                  <View style={styles.invoiceItemFormHeader}>
                    <Text style={styles.invoiceItemFormTitle}>Ítem {index + 1}</Text>
                    {manualItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeManualInvoiceItem(index)}>
                        <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Concepto/Producto *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={item.concept}
                      onChangeText={(text) => updateManualInvoiceItem(index, 'concept', text)}
                      placeholder="Ej: Suscripción Premium - Enero 2025"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Precio (sin IVA) *</Text>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={styles.priceInput}
                        value={item.price > 0 ? item.price.toString() : ''}
                        onChangeText={(text) => updateManualInvoiceItem(index, 'price', text)}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <Text style={styles.currencyLabel}>€</Text>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addItemButton} onPress={addManualInvoiceItem}>
                <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.primary} />
                <Text style={styles.addItemButtonText}>Añadir Producto/Servicio</Text>
              </TouchableOpacity>

              <View style={styles.totalsPreview}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal:</Text>
                  <Text style={styles.totalValue}>{calculateManualInvoiceTotals().subtotal.toFixed(2)} €</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>IVA (21%):</Text>
                  <Text style={styles.totalValue}>{calculateManualInvoiceTotals().taxAmount.toFixed(2)} €</Text>
                </View>
                <View style={[styles.totalRow, styles.totalRowFinal]}>
                  <Text style={styles.totalLabelFinal}>TOTAL:</Text>
                  <Text style={styles.totalValueFinal}>{calculateManualInvoiceTotals().total.toFixed(2)} €</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notas (opcional)</Text>
                <TextInput
                  style={styles.textArea}
                  value={manualNotes}
                  onChangeText={setManualNotes}
                  placeholder="Notas adicionales para la factura..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, savingManualInvoice && styles.modalPrimaryButtonDisabled]}
              onPress={handleCreateManualInvoice}
              disabled={savingManualInvoice}
            >
              {savingManualInvoice ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                  <Text style={styles.modalPrimaryButtonText}>Crear Factura</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowManualInvoiceModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={Platform.OS === 'android' ? false : true}
        animationType="slide"
        presentationStyle={Platform.OS === 'android' ? 'fullScreen' : 'pageSheet'}
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <Pressable style={[styles.modalOverlay, Platform.OS === 'android' && styles.modalOverlayAndroid]} onPress={() => setShowPreviewModal(false)}>
          <Pressable style={[styles.previewModalContent, Platform.OS === 'android' && styles.previewModalContentAndroid]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vista Previa de Factura</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {previewInvoice && (
              <ScrollView style={styles.previewScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.previewInvoice}>
                  {/* Header with logo */}
                  <View style={styles.previewHeader}>
                    <View>
                      <Text style={styles.previewCompanyName}>{fiscalData?.company_name || 'Barlive'}</Text>
                      <Text style={styles.previewCompanyDetails}>
                        {fiscalData?.tax_id}{'\n'}
                        {fiscalData?.address}{'\n'}
                        {fiscalData?.postal_code} {fiscalData?.city}
                      </Text>
                    </View>
                    <View style={styles.previewInvoiceNumber}>
                      <Text style={styles.previewInvoiceNumberLabel}>FACTURA</Text>
                      <Text style={styles.previewInvoiceNumberValue}>{previewInvoice.invoice_number}</Text>
                    </View>
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionTitle}>Facturar a:</Text>
                    <Text style={styles.previewCustomerInfo}>
                      {previewInvoice.customer_name}{'\n'}
                      {previewInvoice.customer_email}{'\n'}
                      {previewInvoice.customer_tax_id && `${previewInvoice.customer_tax_id}\n`}
                      {previewInvoice.customer_address && `${previewInvoice.customer_address}\n`}
                      {previewInvoice.customer_city && `${previewInvoice.customer_postal_code} ${previewInvoice.customer_city}`}
                    </Text>
                  </View>

                  <View style={styles.previewSection}>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Fecha de emisión:</Text>
                      <Text style={styles.previewValue}>
                        {new Date((previewInvoice as any).issued_at || previewInvoice.created_at).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.previewTable}>
                    <View style={styles.previewTableHeader}>
                      <Text style={[styles.previewTableHeaderText, { flex: 2 }]}>Descripción</Text>
                      <Text style={[styles.previewTableHeaderText, { flex: 1, textAlign: 'right' }]}>Importe</Text>
                    </View>
                    {'items' in previewInvoice && previewInvoice.items ? (
                      <React.Fragment>
                        {(previewInvoice.items as InvoiceItem[]).map((item, index) => (
                          <View key={index} style={styles.previewTableRow}>
                            <Text style={[styles.previewTableCell, { flex: 2 }]}>
                              {item.concept}
                            </Text>
                            <Text style={[styles.previewTableCell, { flex: 1, textAlign: 'right' }]}>
                              {item.price.toFixed(2)} €
                            </Text>
                          </View>
                        ))}
                      </React.Fragment>
                    ) : (
                      <View style={styles.previewTableRow}>
                        <Text style={[styles.previewTableCell, { flex: 2 }]}>
                          Suscripción - Plan {(previewInvoice as Invoice).plan_id || 'N/A'}
                        </Text>
                        <Text style={[styles.previewTableCell, { flex: 1, textAlign: 'right' }]}>
                          {previewInvoice.subtotal.toFixed(2)} {previewInvoice.currency}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.previewTotals}>
                    <View style={styles.previewTotalRow}>
                      <Text style={styles.previewTotalLabel}>Subtotal:</Text>
                      <Text style={styles.previewTotalValue}>
                        {previewInvoice.subtotal.toFixed(2)} {previewInvoice.currency}
                      </Text>
                    </View>
                    <View style={styles.previewTotalRow}>
                      <Text style={styles.previewTotalLabel}>IVA ({previewInvoice.tax_rate}%):</Text>
                      <Text style={styles.previewTotalValue}>
                        {previewInvoice.tax_amount.toFixed(2)} {previewInvoice.currency}
                      </Text>
                    </View>
                    <View style={[styles.previewTotalRow, styles.previewTotalRowFinal]}>
                      <Text style={styles.previewTotalLabelFinal}>TOTAL:</Text>
                      <Text style={styles.previewTotalValueFinal}>
                        {previewInvoice.total.toFixed(2)} {previewInvoice.currency}
                      </Text>
                    </View>
                  </View>

                  {fiscalData?.invoice_footer_text && (
                    <View style={styles.previewFooter}>
                      <Text style={styles.previewFooterText}>{fiscalData.invoice_footer_text}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowPreviewModal(false)}>
              <Text style={styles.modalCancelText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fiscal Data Modal */}
      <Modal
        visible={showFiscalDataModal}
        transparent={Platform.OS === 'android' ? false : true}
        animationType="slide"
        presentationStyle={Platform.OS === 'android' ? 'fullScreen' : 'pageSheet'}
        onRequestClose={() => setShowFiscalDataModal(false)}
      >
        <Pressable style={[styles.modalOverlay, Platform.OS === 'android' && styles.modalOverlayAndroid]} onPress={() => setShowFiscalDataModal(false)}>
          <Pressable style={[styles.modalContent, Platform.OS === 'android' && styles.modalContentAndroid]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Datos Fiscales</Text>
              <TouchableOpacity onPress={() => setShowFiscalDataModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre de la Empresa *</Text>
                <TextInput
                  style={styles.formInput}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Barlive S.L."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>CIF/NIF *</Text>
                <TextInput
                  style={styles.formInput}
                  value={taxId}
                  onChangeText={setTaxId}
                  placeholder="B12345678"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dirección *</Text>
                <TextInput
                  style={styles.formInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Calle Principal, 123"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ciudad *</Text>
                <TextInput
                  style={styles.formInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Madrid"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Código Postal *</Text>
                <TextInput
                  style={styles.formInput}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="28001"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email de Gestoría</Text>
                <TextInput
                  style={styles.formInput}
                  value={accountingEmail}
                  onChangeText={setAccountingEmail}
                  placeholder="gestoria@example.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Envío Automático de Facturas</Text>
                  <Switch
                    value={sendAutomatically}
                    onValueChange={setSendAutomatically}
                    trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
                    thumbColor={sendAutomatically ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text style={styles.switchHelp}>
                  Las facturas se enviarán automáticamente tras cada compra
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalPrimaryButton, savingFiscalData && styles.modalPrimaryButtonDisabled]}
              onPress={handleSaveFiscalData}
              disabled={savingFiscalData}
            >
              {savingFiscalData ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                  <Text style={styles.modalPrimaryButtonText}>Guardar Datos</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowFiscalDataModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
    fontSize: 14,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 12,
  },
  warningButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  warningButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  invoiceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  invoiceHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  manualBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  manualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B5CF6' + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5CF6',
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
  invoiceEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  invoiceDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  invoiceDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  invoiceItemsList: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  invoiceItemConcept: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  invoiceItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  sendEmailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendEmailButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  sendEmailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  configCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  configSection: {
    marginBottom: 20,
  },
  configSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  configItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 120,
  },
  configValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
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
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  configureButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  configureButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlayAndroid: {
    backgroundColor: colors.background,
    padding: 0,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalContentAndroid: {
    flex: 1,
    borderRadius: 0,
    maxWidth: '100%',
    maxHeight: '100%',
  },
  largeModalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
  },
  largeModalContentAndroid: {
    flex: 1,
    borderRadius: 0,
    maxWidth: '100%',
    maxHeight: '100%',
  },
  previewModalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 700,
    maxHeight: '90%',
  },
  previewModalContentAndroid: {
    flex: 1,
    borderRadius: 0,
    maxWidth: '100%',
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  modalScrollView: {
    maxHeight: 500,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  textArea: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 80,
  },
  invoiceItemForm: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  invoiceItemFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceItemFormTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingRight: 16,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginBottom: 20,
  },
  addItemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  totalsPreview: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRowFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalLabelFinal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  switchHelp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  testEmailSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  testEmailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  testEmailSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  testEmailForm: {
    flexDirection: 'row',
    gap: 12,
  },
  testEmailInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sendTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendTestButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  sendTestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  previewScrollView: {
    maxHeight: 600,
    marginBottom: 16,
  },
  previewInvoice: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  previewCompanyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  previewCompanyDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  previewInvoiceNumber: {
    alignItems: 'flex-end',
  },
  previewInvoiceNumberLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  previewInvoiceNumberValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  previewCustomerInfo: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  previewValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  previewTable: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  previewTableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  previewTableRow: {
    flexDirection: 'row',
    padding: 12,
  },
  previewTableCell: {
    fontSize: 13,
    color: colors.text,
  },
  previewTotals: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  previewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewTotalRowFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  previewTotalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  previewTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  previewTotalLabelFinal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  previewTotalValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  previewFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  previewFooterText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
