
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

interface InvoiceEmailRequest {
  invoiceId?: string;
  invoiceData?: any;
  recipientEmail: string;
  isTest?: boolean;
  isManual?: boolean;
}

interface TaxCalculation {
  baseImponible: number;
  ivaRate: number;
  ivaCuota: number;
  total: number;
  legalText: string;
  scenario: 'ES' | 'B2B_EU' | 'EXTRA_EU';
}

/**
 * ✅ SEND INVOICE EMAIL v60.0 - ENHANCED EMAIL VALIDATION
 * 
 * NEW IN v60.0:
 * - ✅ Enhanced email validation with comprehensive checks
 * - ✅ Better error messages for invalid email formats
 * - ✅ Trim whitespace from email addresses
 * - ✅ Regex pattern validation for email format
 * 
 * PREVIOUS (v59.0):
 * - ✅ REMOVED "Ver Factura" button completely from email template
 * - ✅ Invoice IS the email body - no external links needed
 * - ✅ Spanish fiscal regulations compliance
 * - ✅ Automatic tax calculation (21% IVA, 0% B2B EU, 0% Extra-EU)
 * - ✅ Data snapshotting for immutability
 * - ✅ Professional HTML invoice template (print-optimized)
 * - ✅ No PDF generation - invoice IS the email
 * - ✅ Dynamic configuration binding
 * - ✅ Legal texts for each tax scenario
 * - ✅ RGPD footer text
 */

// EU country codes for B2B validation
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

/**
 * Calculate Spanish taxes based on client location and VAT ID
 * Escenario A (España): 21% IVA
 * Escenario B (B2B UE): 0% IVA + Inversión del Sujeto Pasivo
 * Escenario C (Extracomunitario): 0% IVA + Exportación de servicios
 */
function calculateSpanishTaxes(baseAmount: number, clientData: any): TaxCalculation {
  const countryCode = (clientData.customer_country || clientData.country_code || 'ES').toUpperCase();
  const vatId = clientData.customer_tax_id || clientData.vat_id || '';
  const isEU = EU_COUNTRIES.includes(countryCode);
  
  console.log('[calculateSpanishTaxes] Calculating for:', { countryCode, vatId, isEU });
  
  // Escenario A: España - 21% IVA
  if (countryCode === 'ES' || countryCode === 'ESPAÑA') {
    const ivaRate = 21.0;
    const ivaCuota = Number((baseAmount * (ivaRate / 100)).toFixed(2));
    const total = Number((baseAmount + ivaCuota).toFixed(2));
    
    return {
      baseImponible: Number(baseAmount.toFixed(2)),
      ivaRate,
      ivaCuota,
      total,
      legalText: '',
      scenario: 'ES',
    };
  }
  
  // Escenario B: B2B UE - Inversión del Sujeto Pasivo
  if (isEU && vatId && vatId.trim().length > 0) {
    return {
      baseImponible: Number(baseAmount.toFixed(2)),
      ivaRate: 0,
      ivaCuota: 0,
      total: Number(baseAmount.toFixed(2)),
      legalText: 'Operación sujeta a inversión del sujeto pasivo conforme a la Directiva 2006/112/CE.',
      scenario: 'B2B_EU',
    };
  }
  
  // Escenario C: Extracomunitario - Exportación de servicios
  if (!isEU) {
    return {
      baseImponible: Number(baseAmount.toFixed(2)),
      ivaRate: 0,
      ivaCuota: 0,
      total: Number(baseAmount.toFixed(2)),
      legalText: 'Exportación de servicios exenta de IVA según Art. 21 de la Ley 37/1992.',
      scenario: 'EXTRA_EU',
    };
  }
  
  // Default: Apply Spanish VAT (for EU consumers without VAT ID)
  const ivaRate = 21.0;
  const ivaCuota = Number((baseAmount * (ivaRate / 100)).toFixed(2));
  const total = Number((baseAmount + ivaCuota).toFixed(2));
  
  return {
    baseImponible: Number(baseAmount.toFixed(2)),
    ivaRate,
    ivaCuota,
    total,
    legalText: '',
    scenario: 'ES',
  };
}

/**
 * Generate professional HTML invoice template
 * Optimized for email display and printing
 */
function generateInvoiceHTML(
  invoice: any,
  fiscalData: any,
  clientSnapshot: any,
  taxCalc: TaxCalculation
): string {
  const invoiceDate = new Date(invoice.issued_at || invoice.created_at).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  const items = invoice.items || [{ concept: `Suscripción - Plan ${invoice.plan_id || 'Premium'}`, price: invoice.subtotal }];
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoice.invoice_number}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; background: white; }
      .no-print { display: none !important; }
      .invoice-container { box-shadow: none !important; border: 1px solid #e5e7eb; }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f3f4f6;
      color: #111827;
      line-height: 1.6;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #14B8A6;
    }
    
    .company-info h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #14B8A6;
      font-weight: 700;
    }
    
    .company-info p {
      margin: 4px 0;
      font-size: 14px;
      color: #6b7280;
    }
    
    .invoice-title {
      text-align: right;
    }
    
    .invoice-title h2 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .invoice-title .invoice-number {
      font-size: 24px;
      color: #111827;
      font-weight: 700;
    }
    
    .invoice-title .invoice-date {
      margin-top: 8px;
      font-size: 14px;
      color: #6b7280;
    }
    
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .party-section h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #14B8A6;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .party-section p {
      margin: 4px 0;
      font-size: 14px;
      color: #374151;
    }
    
    .party-section .party-name {
      font-weight: 700;
      font-size: 16px;
      color: #111827;
      margin-bottom: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    thead {
      background-color: #f9fafb;
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    th:last-child {
      text-align: right;
    }
    
    td {
      padding: 12px;
      font-size: 14px;
      color: #374151;
      border-bottom: 1px solid #f3f4f6;
    }
    
    td:last-child {
      text-align: right;
      font-weight: 600;
    }
    
    .totals {
      margin-left: auto;
      width: 300px;
      margin-bottom: 30px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    
    .totals-row.subtotal {
      color: #6b7280;
    }
    
    .totals-row.tax {
      color: #6b7280;
    }
    
    .totals-row.total {
      border-top: 2px solid #14B8A6;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }
    
    .totals-row.total .amount {
      color: #14B8A6;
      font-size: 24px;
    }
    
    .legal-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin-bottom: 30px;
      border-radius: 4px;
    }
    
    .legal-notice p {
      margin: 0;
      font-size: 13px;
      color: #92400e;
      line-height: 1.6;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    
    .footer p {
      margin: 6px 0;
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.5;
    }
    
    .footer .rgpd {
      margin-top: 16px;
      font-size: 11px;
      color: #6b7280;
      line-height: 1.6;
    }
    
    @media screen and (max-width: 600px) {
      .invoice-container {
        padding: 20px;
      }
      
      .header {
        flex-direction: column;
        gap: 20px;
      }
      
      .invoice-title {
        text-align: left;
      }
      
      .parties {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .totals {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>${fiscalData.company_name || 'BarLive'}</h1>
        <p><strong>NIF:</strong> ${fiscalData.tax_id || ''}</p>
        <p>${fiscalData.address || ''}</p>
        <p>${fiscalData.postal_code || ''} ${fiscalData.city || ''}</p>
        <p>${fiscalData.country || 'España'}</p>
        ${fiscalData.email ? `<p><strong>Email:</strong> ${fiscalData.email}</p>` : ''}
        ${fiscalData.phone ? `<p><strong>Tel:</strong> ${fiscalData.phone}</p>` : ''}
      </div>
      
      <div class="invoice-title">
        <h2>Factura</h2>
        <div class="invoice-number">${invoice.invoice_number}</div>
        <div class="invoice-date">Fecha: ${invoiceDate}</div>
      </div>
    </div>
    
    <!-- Parties -->
    <div class="parties">
      <div class="party-section">
        <h3>Datos del Emisor</h3>
        <p class="party-name">${fiscalData.company_name || 'BarLive'}</p>
        <p><strong>NIF:</strong> ${fiscalData.tax_id || ''}</p>
        <p>${fiscalData.address || ''}</p>
        <p>${fiscalData.postal_code || ''} ${fiscalData.city || ''}</p>
      </div>
      
      <div class="party-section">
        <h3>Datos del Receptor</h3>
        <p class="party-name">${clientSnapshot.customer_name || invoice.customer_name}</p>
        ${clientSnapshot.customer_tax_id ? `<p><strong>NIF/CIF:</strong> ${clientSnapshot.customer_tax_id}</p>` : ''}
        ${clientSnapshot.customer_address ? `<p>${clientSnapshot.customer_address}</p>` : ''}
        ${clientSnapshot.customer_city ? `<p>${clientSnapshot.customer_postal_code || ''} ${clientSnapshot.customer_city}</p>` : ''}
        ${clientSnapshot.customer_country ? `<p>${clientSnapshot.customer_country}</p>` : ''}
        <p><strong>Email:</strong> ${clientSnapshot.customer_email || invoice.customer_email}</p>
      </div>
    </div>
    
    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th style="width: 100px;">Cantidad</th>
          <th style="width: 120px;">Precio Unit.</th>
          <th style="width: 120px;">Base Imponible</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item: any) => `
          <tr>
            <td>${item.concept || item.description || 'Servicio'}</td>
            <td>1</td>
            <td>${Number(item.price || 0).toFixed(2)} €</td>
            <td>${Number(item.price || 0).toFixed(2)} €</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals">
      <div class="totals-row subtotal">
        <span>Base Imponible:</span>
        <span>${taxCalc.baseImponible.toFixed(2)} €</span>
      </div>
      <div class="totals-row tax">
        <span>IVA (${taxCalc.ivaRate}%):</span>
        <span>${taxCalc.ivaCuota.toFixed(2)} €</span>
      </div>
      <div class="totals-row total">
        <span>TOTAL:</span>
        <span class="amount">${taxCalc.total.toFixed(2)} €</span>
      </div>
    </div>
    
    <!-- Legal Notice (if applicable) -->
    ${taxCalc.legalText ? `
      <div class="legal-notice">
        <p><strong>Nota Legal:</strong> ${taxCalc.legalText}</p>
      </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      ${fiscalData.bank_name || fiscalData.iban ? `
        <p><strong>Datos Bancarios:</strong></p>
        ${fiscalData.bank_name ? `<p>${fiscalData.bank_name}</p>` : ''}
        ${fiscalData.iban ? `<p>IBAN: ${fiscalData.iban}</p>` : ''}
      ` : ''}
      
      ${fiscalData.invoice_footer_text ? `
        <div class="rgpd">
          <p>${fiscalData.invoice_footer_text}</p>
        </div>
      ` : ''}
      
      <p style="margin-top: 20px;">Gracias por confiar en ${fiscalData.company_name || 'BarLive'}</p>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    console.log('[send-invoice-email v60.0] 📧 Starting invoice email send...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { invoiceId, invoiceData, recipientEmail, isTest = false, isManual = false }: InvoiceEmailRequest = await req.json();

    console.log('[send-invoice-email v60.0] 📋 Request details:', {
      invoiceId,
      recipientEmail,
      isTest,
      isManual,
    });

    // Enhanced email validation
    console.log('[send-invoice-email v60.0] 🔍 Validating recipient email:', recipientEmail);
    
    if (!recipientEmail) {
      throw new Error('Recipient email is required but was not provided.');
    }
    
    if (typeof recipientEmail !== 'string') {
      throw new Error(`Recipient email must be a string, got ${typeof recipientEmail}`);
    }
    
    const trimmedEmail = recipientEmail.trim();
    
    if (trimmedEmail === '') {
      throw new Error('Recipient email cannot be empty.');
    }
    
    if (!trimmedEmail.includes('@')) {
      throw new Error(`Invalid email format: "${trimmedEmail}" - must contain @`);
    }
    
    // More comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error(`Invalid email format: "${trimmedEmail}" - does not match email pattern`);
    }
    
    console.log('[send-invoice-email v60.0] ✅ Email validation passed:', trimmedEmail);

    let invoice: any;
    let fiscalData: any;
    let clientSnapshot: any;

    // Load fiscal data (real-time configuration)
    const { data: fiscalDataResult, error: fiscalError } = await supabase
      .from('company_fiscal_data')
      .select('*')
      .single();

    if (fiscalError || !fiscalDataResult) {
      console.error('[send-invoice-email v60.0] ❌ Fiscal data error:', fiscalError);
      throw new Error('Company fiscal data not configured');
    }

    fiscalData = fiscalDataResult;
    console.log('[send-invoice-email v60.0] ✅ Fiscal data loaded');

    // Load or use invoice data
    if (isTest && invoiceData) {
      invoice = invoiceData;
      clientSnapshot = {
        customer_name: invoice.customer_name,
        customer_email: trimmedEmail, // Use validated email
        customer_tax_id: invoice.customer_tax_id,
        customer_address: invoice.customer_address,
        customer_city: invoice.customer_city,
        customer_postal_code: invoice.customer_postal_code,
        customer_country: invoice.customer_country || 'España',
      };
      console.log('[send-invoice-email v60.0] ✅ Using test invoice data');
    } else if (invoiceId) {
      const tableName = isManual ? 'manual_invoices' : 'invoices';
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoiceResult) {
        console.error('[send-invoice-email v60.0] ❌ Invoice error:', invoiceError);
        throw new Error('Invoice not found');
      }

      invoice = invoiceResult;
      console.log('[send-invoice-email v60.0] ✅ Invoice loaded:', invoice.invoice_number);
      
      // Check if snapshot already exists (immutability)
      if (invoice.company_snapshot && invoice.client_snapshot) {
        console.log('[send-invoice-email v60.0] ✅ Using existing snapshots (immutable data)');
        fiscalData = invoice.company_snapshot;
        clientSnapshot = invoice.client_snapshot;
      } else {
        // Create snapshots for immutability
        console.log('[send-invoice-email v60.0] 📸 Creating data snapshots...');
        
        // Client snapshot from invoice data
        clientSnapshot = {
          customer_name: invoice.customer_name,
          customer_email: trimmedEmail, // Use validated email
          customer_tax_id: invoice.customer_tax_id,
          customer_address: invoice.customer_address,
          customer_city: invoice.customer_city,
          customer_postal_code: invoice.customer_postal_code,
          customer_country: invoice.customer_country || 'España',
        };
        
        // Company snapshot (current fiscal data)
        const companySnapshot = {
          company_name: fiscalData.company_name,
          tax_id: fiscalData.tax_id,
          address: fiscalData.address,
          city: fiscalData.city,
          postal_code: fiscalData.postal_code,
          country: fiscalData.country,
          phone: fiscalData.phone,
          email: fiscalData.email,
          website: fiscalData.website,
          logo_url: fiscalData.logo_url,
          bank_name: fiscalData.bank_name,
          iban: fiscalData.iban,
          swift_bic: fiscalData.swift_bic,
          invoice_footer_text: fiscalData.invoice_footer_text,
        };
        
        // Calculate Spanish taxes based on client data
        const baseAmount = invoice.subtotal || invoice.total / 1.21; // Fallback calculation
        const taxCalc = calculateSpanishTaxes(baseAmount, clientSnapshot);
        
        console.log('[send-invoice-email v60.0] 💰 Tax calculation:', taxCalc);
        
        // Save snapshots to database (immutability)
        await supabase
          .from(tableName)
          .update({
            company_snapshot: companySnapshot,
            client_snapshot: clientSnapshot,
            subtotal: taxCalc.baseImponible,
            tax_rate: taxCalc.ivaRate,
            tax_amount: taxCalc.ivaCuota,
            total: taxCalc.total,
            metadata: {
              ...invoice.metadata,
              tax_scenario: taxCalc.scenario,
              tax_legal_text: taxCalc.legalText,
              snapshot_created_at: new Date().toISOString(),
            }
          })
          .eq('id', invoiceId);
        
        console.log('[send-invoice-email v60.0] ✅ Snapshots saved to database');
      }
    } else {
      throw new Error('Either invoiceId or invoiceData must be provided');
    }

    // ✅ Create in-app notification as fallback
    console.log('[send-invoice-email v60.0] 📬 Creating in-app notification...');
    
    // Find user by email (use trimmed email)
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (userData) {
      // Create notification for the user
      const { error: notifError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: userData.id,
          tipo: 'sistema',
          titulo: `📄 Nueva Factura: ${invoice.invoice_number}`,
          mensaje: `Se ha generado una nueva factura por ${taxCalc.total.toFixed(2)}€. Puedes consultarla en tu email.`,
          imagen_url: null,
        });

      if (notifError) {
        console.error('[send-invoice-email v60.0] ⚠️ Error creating notification:', notifError);
      } else {
        console.log('[send-invoice-email v60.0] ✅ In-app notification created');
      }
    } else {
      console.log('[send-invoice-email v60.0] ℹ️ User not found in database, skipping notification');
    }

    // Calculate taxes if not already calculated
    const baseAmount = invoice.subtotal || invoice.total / 1.21;
    const taxCalc = calculateSpanishTaxes(baseAmount, clientSnapshot);
    
    console.log('[send-invoice-email v60.0] 💰 Final tax calculation:', taxCalc);
    
    // ✅ Generate professional HTML invoice (the invoice IS the email)
    console.log('[send-invoice-email v60.0] 📧 Generating HTML invoice...');
    const emailHTML = generateInvoiceHTML(invoice, fiscalData, clientSnapshot, taxCalc);
    
    // ✅ Send email via Resend API
    console.log('[send-invoice-email v60.0] 📧 Sending email via Resend API...');
    
    let emailSent = false;
    let emailError = null;
    
    try {

      // ✅ Use correct verified domain barliveapp.es
      console.log('[send-invoice-email v60.0] 📧 Calling Resend API with verified domain...');
      
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fiscalData.company_name || 'BarLive'} <noreply@barliveapp.es>`,
          to: [trimmedEmail], // Use validated email
          subject: `Factura ${invoice.invoice_number} - ${fiscalData.company_name || 'BarLive'}`,
          html: emailHTML,
        }),
      });

      const resendData = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error('[send-invoice-email v60.0] ❌ Resend API error:', resendData);
        emailError = resendData.message || 'Failed to send email via Resend';
      } else {
        console.log('[send-invoice-email v60.0] ✅ Email sent successfully via Resend:', resendData);
        emailSent = true;
      }
    } catch (error: any) {
      console.error('[send-invoice-email v60.0] ⚠️ Error sending email:', error);
      emailError = error.message;
      // Continue anyway - notification was created
    }

    // Update invoice metadata (only for real invoices, not tests)
    if (!isTest && invoiceId) {
      const tableName = isManual ? 'manual_invoices' : 'invoices';
      await supabase
        .from(tableName)
        .update({ 
          status: 'issued',
          metadata: {
            ...invoice.metadata,
            email_sent_at: new Date().toISOString(),
            email_method: emailSent ? 'resend_html' : 'notification_only',
            email_sent: emailSent,
            notification_created: true,
            email_error: emailError || null,
            tax_scenario: taxCalc.scenario,
            tax_legal_text: taxCalc.legalText,
          }
        })
        .eq('id', invoiceId);
      
      console.log('[send-invoice-email v60.0] ✅ Invoice metadata updated');
    }

    // Return success if either email was sent OR notification was created
    const responseMessage = emailSent 
      ? `Factura enviada correctamente a ${trimmedEmail}` 
      : `Notificación creada. ${emailError ? 'Error al enviar email: ' + emailError : 'Email no enviado.'}`;

    return new Response(
      JSON.stringify({ 
        success: emailSent || userData !== null, // Success if email sent OR notification created
        message: responseMessage,
        email_sent: emailSent,
        notification_created: userData !== null,
        email_error: emailError,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('[send-invoice-email v60.0] ❌ Error:', error);
    console.error('[send-invoice-email v60.0] ❌ Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send invoice email',
        details: error.stack || 'No stack trace available',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
