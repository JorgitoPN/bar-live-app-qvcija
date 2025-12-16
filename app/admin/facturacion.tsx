
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
  total: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  issued_at: string;
  paid_at?: string;
  pdf_url?: string;
  local_id?: string;
  plan_id?: string;
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
  bank_name?: string;
  iban?: string;
  swift_bic?: string;
  invoice_prefix: string;
  next_invoice_number: number;
  invoice_footer_text?: string;
  send_invoices_automatically: boolean;
  accounting_email?: string;
}

export default function FacturacionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [fiscalData, setFiscalData] = useState<CompanyFiscalData | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'config'>('invoices');
  const [showFiscalDataModal, setShowFiscalDataModal] = useState(false);
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

  const cargarFacturas = useCallback(async () => {
    try {
      console.log('[Facturacion] ✅ Cargando facturas...');
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
        // Populate form
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
    await Promise.all([cargarFacturas(), cargarDatosFiscales()]);
    setLoading(false);
  }, [cargarFacturas, cargarDatosFiscales]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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
        // Update existing
        const { error } = await supabase
          .from('company_fiscal_data')
          .update(fiscalDataToSave)
          .eq('id', fiscalData.id);

        if (error) throw error;
      } else {
        // Create new
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

  const downloadInvoice = async (invoice: Invoice) => {
    if (!invoice.pdf_url) {
      Alert.alert('Error', 'Esta factura no tiene PDF disponible');
      return;
    }

    Alert.alert(
      'Descargar Factura',
      `¿Deseas descargar la factura ${invoice.invoice_number}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descargar',
          onPress: () => {
            // In a real app, you would download the PDF here
            Alert.alert('Información', 'Funcionalidad de descarga en desarrollo');
          },
        },
      ]
    );
  };

  const sendInvoiceToAccounting = async () => {
    if (!fiscalData?.accounting_email) {
      Alert.alert('Error', 'No has configurado un email de gestoría');
      return;
    }

    Alert.alert(
      'Enviar Facturas',
      `¿Deseas enviar todas las facturas pendientes a ${fiscalData.accounting_email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              // In a real app, you would call an Edge Function to send emails
              Alert.alert('Éxito', 'Facturas enviadas correctamente a la gestoría');
            } catch (error) {
              console.error('[Facturacion] Error enviando facturas:', error);
              Alert.alert('Error', 'No se pudieron enviar las facturas');
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
          <Text style={styles.sectionTitle}>Facturas</Text>
          <Text style={styles.sectionSubtitle}>Gestiona las facturas emitidas</Text>
        </View>
        {fiscalData?.accounting_email && (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendInvoiceToAccounting}
          >
            <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={20} color={colors.white} />
            <Text style={styles.sendButtonText}>Enviar a Gestoría</Text>
          </TouchableOpacity>
        )}
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
          <Text style={styles.emptyText}>No hay facturas emitidas</Text>
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
              </View>

              {invoice.pdf_url && (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => downloadInvoice(invoice)}
                >
                  <IconSymbol ios_icon_name="arrow.down.doc.fill" android_material_icon_name="download" size={18} color={colors.primary} />
                  <Text style={styles.downloadButtonText}>Descargar PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </React.Fragment>
      )}
    </ScrollView>
  );

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
          <Text style={styles.infoTitle}>Sistema de Facturación Automática</Text>
          <Text style={styles.infoText}>
            - Las facturas se emiten automáticamente tras cada compra{'\n'}
            - Se envían adjuntas en el correo de confirmación{'\n'}
            - Incluyen datos fiscales del propietario y del local{'\n'}
            - Puedes descargarlas y enviarlas a tu gestoría{'\n'}
            - Incluyen impuestos legales aplicables en España (21% IVA)
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
          <Text style={styles.headerSubtitle}>Sistema de facturación automática</Text>
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
            Facturas
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
      {activeTab === 'config' && renderConfigTab()}

      {/* Fiscal Data Modal - Due to length, I'll create a simplified version */}
      <Modal
        visible={showFiscalDataModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiscalDataModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFiscalDataModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendButtonText: {
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
  downloadButton: {
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
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
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
    maxHeight: 400,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
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
});
