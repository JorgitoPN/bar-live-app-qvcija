
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface InvoiceEmailRequest {
  invoiceId?: string;
  invoiceData?: any;
  recipientEmail: string;
  isTest?: boolean;
  isManual?: boolean;
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
    console.log('[send-invoice-email] 📧 Starting invoice email send...');

    if (!RESEND_API_KEY) {
      console.error('[send-invoice-email] ❌ RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY not configured. Please configure it in Supabase Edge Function secrets.',
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { invoiceId, invoiceData, recipientEmail, isTest = false, isManual = false }: InvoiceEmailRequest = await req.json();

    console.log('[send-invoice-email] 📋 Invoice ID:', invoiceId);
    console.log('[send-invoice-email] 📧 Recipient:', recipientEmail);
    console.log('[send-invoice-email] 🧪 Is test:', isTest);
    console.log('[send-invoice-email] 📝 Is manual:', isManual);

    let invoice: any;
    let fiscalData: any;

    // Load fiscal data
    const { data: fiscalDataResult, error: fiscalError } = await supabase
      .from('company_fiscal_data')
      .select('*')
      .single();

    if (fiscalError || !fiscalDataResult) {
      throw new Error('Company fiscal data not configured');
    }

    fiscalData = fiscalDataResult;
    console.log('[send-invoice-email] ✅ Fiscal data loaded');

    // Load or use invoice data
    if (isTest && invoiceData) {
      invoice = invoiceData;
      console.log('[send-invoice-email] ✅ Using test invoice data');
    } else if (invoiceId) {
      const tableName = isManual ? 'manual_invoices' : 'invoices';
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoiceResult) {
        throw new Error('Invoice not found');
      }

      invoice = invoiceResult;
      console.log('[send-invoice-email] ✅ Invoice loaded:', invoice.invoice_number);
    } else {
      throw new Error('Either invoiceId or invoiceData must be provided');
    }

    // Generate email HTML
    const emailHtml = isManual 
      ? generateManualInvoiceEmailHtml(invoice, fiscalData, isTest)
      : generateInvoiceEmailHtml(invoice, fiscalData, isTest);

    const emailSubject = isTest 
      ? `[PRUEBA] Factura ${invoice.invoice_number} - Barlive`
      : `Factura ${invoice.invoice_number} - Barlive`;

    console.log('[send-invoice-email] 📤 Sending email via Resend...');

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Barlive <noreply@barlive.es>',
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const responseText = await emailResponse.text();
    console.log('[send-invoice-email] 📨 Resend response status:', emailResponse.status);
    console.log('[send-invoice-email] 📨 Resend response:', responseText);

    if (!emailResponse.ok) {
      console.error('[send-invoice-email] ❌ Resend error:', responseText);
      throw new Error(`Failed to send email: ${responseText}`);
    }

    const emailResult = JSON.parse(responseText);
    console.log('[send-invoice-email] ✅ Email sent successfully:', emailResult.id);

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
            email_id: emailResult.id,
          }
        })
        .eq('id', invoiceId);
      
      console.log('[send-invoice-email] ✅ Invoice metadata updated');
    }

    // Send copy to accounting email if configured
    if (!isTest && fiscalData.accounting_email && fiscalData.accounting_email.trim()) {
      console.log('[send-invoice-email] 📧 Sending copy to accounting email:', fiscalData.accounting_email);
      
      try {
        const accountingEmailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Barlive <noreply@barlive.es>',
            to: fiscalData.accounting_email,
            subject: `[COPIA GESTORÍA] ${emailSubject}`,
            html: emailHtml,
          }),
        });

        if (accountingEmailResponse.ok) {
          console.log('[send-invoice-email] ✅ Copy sent to accounting email');
        } else {
          console.error('[send-invoice-email] ⚠️ Failed to send copy to accounting email');
        }
      } catch (error) {
        console.error('[send-invoice-email] ⚠️ Error sending copy to accounting:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice email sent successfully',
        emailId: emailResult.id,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('[send-invoice-email] ❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send invoice email',
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

/**
 * Generate HTML email template for automatic invoices (subscriptions)
 */
function generateInvoiceEmailHtml(invoice: any, fiscalData: any, isTest: boolean = false): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      padding: 20px;
    }
    .email-wrapper {
      max-width: 800px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      padding: 40px 30px;
      color: #ffffff;
    }
    .email-header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .email-header p {
      font-size: 16px;
      opacity: 0.95;
    }
    .invoice-container {
      padding: 40px 30px;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 3px solid #3B82F6;
    }
    .company-info h2 {
      font-size: 24px;
      font-weight: 700;
      color: #3B82F6;
      margin-bottom: 12px;
    }
    .company-info p {
      font-size: 14px;
      color: #6b7280;
      margin: 4px 0;
      line-height: 1.5;
    }
    .invoice-number {
      text-align: right;
    }
    .invoice-number h3 {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .invoice-number .number {
      font-size: 28px;
      font-weight: 700;
      color: #3B82F6;
      margin-bottom: 8px;
    }
    .invoice-number p {
      font-size: 14px;
      color: #6b7280;
      margin: 4px 0;
    }
    .customer-section {
      background-color: #f9fafb;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 32px;
      border-left: 4px solid #3B82F6;
    }
    .customer-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .customer-section p {
      font-size: 15px;
      color: #1f2937;
      margin: 4px 0;
      line-height: 1.6;
    }
    .customer-section .customer-name {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }
    .invoice-table thead {
      background-color: #f9fafb;
    }
    .invoice-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .invoice-table th:last-child {
      text-align: right;
    }
    .invoice-table td {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 15px;
      color: #1f2937;
    }
    .invoice-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .invoice-table .item-description {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .invoice-table .item-details {
      font-size: 13px;
      color: #6b7280;
    }
    .totals-section {
      margin-top: 32px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      min-width: 350px;
    }
    .totals-table tr {
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-table td {
      padding: 12px 16px;
      font-size: 15px;
    }
    .totals-table td:first-child {
      color: #6b7280;
      font-weight: 500;
    }
    .totals-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: #1f2937;
    }
    .totals-table .total-row {
      border-top: 3px solid #3B82F6;
      border-bottom: none;
    }
    .totals-table .total-row td {
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
    }
    .totals-table .total-row td:first-child {
      color: #1f2937;
    }
    .totals-table .total-row td:last-child {
      color: #3B82F6;
    }
    .payment-info {
      margin-top: 40px;
      padding: 24px;
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      border-left: 4px solid #3B82F6;
      border-radius: 8px;
    }
    .payment-info h3 {
      font-size: 18px;
      font-weight: 700;
      color: #3B82F6;
      margin-bottom: 16px;
    }
    .payment-info p {
      font-size: 14px;
      color: #1f2937;
      margin: 8px 0;
      line-height: 1.6;
    }
    .payment-info strong {
      font-weight: 600;
      color: #374151;
    }
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
    }
    .footer p {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
      margin: 8px 0;
    }
    .footer .brand {
      font-size: 16px;
      font-weight: 700;
      color: #3B82F6;
      margin-top: 16px;
    }
    .test-banner {
      background-color: #FEF3C7;
      border: 2px solid #F59E0B;
      padding: 16px;
      margin: 20px 30px;
      border-radius: 8px;
      text-align: center;
    }
    .test-banner p {
      font-size: 14px;
      font-weight: 600;
      color: #92400E;
      margin: 0;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .invoice-container {
        padding: 24px 20px;
      }
      .invoice-header {
        flex-direction: column;
        gap: 24px;
      }
      .invoice-number {
        text-align: left;
      }
      .totals-table {
        min-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    ${isTest ? '<div class="test-banner"><p>⚠️ ESTA ES UNA FACTURA DE PRUEBA - NO VÁLIDA PARA EFECTOS FISCALES</p></div>' : ''}
    
    <div class="email-header">
      <h1>Factura Emitida</h1>
      <p>Gracias por tu confianza en Barlive</p>
    </div>

    <div class="invoice-container">
      <div class="invoice-header">
        <div class="company-info">
          <h2>${fiscalData.company_name}</h2>
          <p><strong>CIF:</strong> ${fiscalData.tax_id}</p>
          <p>${fiscalData.address}</p>
          <p>${fiscalData.postal_code} ${fiscalData.city}, ${fiscalData.country}</p>
          ${fiscalData.phone ? `<p><strong>Tel:</strong> ${fiscalData.phone}</p>` : ''}
          ${fiscalData.email ? `<p><strong>Email:</strong> ${fiscalData.email}</p>` : ''}
          ${fiscalData.website ? `<p><strong>Web:</strong> ${fiscalData.website}</p>` : ''}
        </div>
        <div class="invoice-number">
          <h3>Factura</h3>
          <div class="number">${invoice.invoice_number}</div>
          <p><strong>Fecha:</strong> ${new Date(invoice.issued_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          ${invoice.due_date ? `<p><strong>Vencimiento:</strong> ${new Date(invoice.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>` : ''}
        </div>
      </div>

      <div class="customer-section">
        <h3>Facturar a:</h3>
        <p class="customer-name">${invoice.customer_name}</p>
        ${invoice.customer_tax_id ? `<p><strong>CIF/NIF:</strong> ${invoice.customer_tax_id}</p>` : ''}
        <p>${invoice.customer_email}</p>
        ${invoice.customer_address ? `<p>${invoice.customer_address}</p>` : ''}
        ${invoice.customer_city ? `<p>${invoice.customer_postal_code} ${invoice.customer_city}, ${invoice.customer_country || 'España'}</p>` : ''}
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-description">Suscripción Barlive</div>
              <div class="item-details">Servicio de suscripción mensual</div>
            </td>
            <td>${invoice.subtotal.toFixed(2)} ${invoice.currency}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td>${invoice.subtotal.toFixed(2)} ${invoice.currency}</td>
          </tr>
          <tr>
            <td>IVA (${invoice.tax_rate}%):</td>
            <td>${invoice.tax_amount.toFixed(2)} ${invoice.currency}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL:</td>
            <td>${invoice.total.toFixed(2)} ${invoice.currency}</td>
          </tr>
        </table>
      </div>

      ${fiscalData.iban ? `
      <div class="payment-info">
        <h3>💳 Información de Pago</h3>
        ${fiscalData.bank_name ? `<p><strong>Banco:</strong> ${fiscalData.bank_name}</p>` : ''}
        <p><strong>IBAN:</strong> ${fiscalData.iban}</p>
        ${fiscalData.swift_bic ? `<p><strong>SWIFT/BIC:</strong> ${fiscalData.swift_bic}</p>` : ''}
        <p style="margin-top: 12px; font-size: 13px; color: #6b7280;">
          Por favor, incluye el número de factura <strong>${invoice.invoice_number}</strong> en el concepto de la transferencia.
        </p>
      </div>
      ` : ''}

      <div class="footer">
        ${fiscalData.invoice_footer_text ? `<p>${fiscalData.invoice_footer_text}</p>` : ''}
        <p class="brand">Barlive</p>
        <p>Tu guía de ocio nocturno</p>
        <p style="margin-top: 16px; font-size: 12px;">
          Este es un documento generado automáticamente.<br>
          Para cualquier consulta, contacta con nosotros en ${fiscalData.email || 'info@barlive.es'}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML email template for manual invoices
 */
function generateManualInvoiceEmailHtml(invoice: any, fiscalData: any, isTest: boolean = false): string {
  const items = invoice.items || [];
  const itemsHtml = items.map((item: any, index: number) => `
    <tr>
      <td>
        <div class="item-description">${item.concept}</div>
        <div class="item-details">Producto/Servicio ${index + 1}</div>
      </td>
      <td>${item.price.toFixed(2)} €</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      padding: 20px;
    }
    .email-wrapper {
      max-width: 800px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      padding: 40px 30px;
      color: #ffffff;
    }
    .email-header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .email-header p {
      font-size: 16px;
      opacity: 0.95;
    }
    .manual-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.25);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .invoice-container {
      padding: 40px 30px;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 3px solid #8B5CF6;
    }
    .company-info h2 {
      font-size: 24px;
      font-weight: 700;
      color: #8B5CF6;
      margin-bottom: 12px;
    }
    .company-info p {
      font-size: 14px;
      color: #6b7280;
      margin: 4px 0;
      line-height: 1.5;
    }
    .invoice-number {
      text-align: right;
    }
    .invoice-number h3 {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .invoice-number .number {
      font-size: 28px;
      font-weight: 700;
      color: #8B5CF6;
      margin-bottom: 8px;
    }
    .invoice-number p {
      font-size: 14px;
      color: #6b7280;
      margin: 4px 0;
    }
    .customer-section {
      background-color: #f9fafb;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 32px;
      border-left: 4px solid #8B5CF6;
    }
    .customer-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .customer-section p {
      font-size: 15px;
      color: #1f2937;
      margin: 4px 0;
      line-height: 1.6;
    }
    .customer-section .customer-name {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }
    .invoice-table thead {
      background-color: #f9fafb;
    }
    .invoice-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .invoice-table th:last-child {
      text-align: right;
    }
    .invoice-table td {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 15px;
      color: #1f2937;
    }
    .invoice-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .invoice-table .item-description {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .invoice-table .item-details {
      font-size: 13px;
      color: #6b7280;
    }
    .totals-section {
      margin-top: 32px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      min-width: 350px;
    }
    .totals-table tr {
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-table td {
      padding: 12px 16px;
      font-size: 15px;
    }
    .totals-table td:first-child {
      color: #6b7280;
      font-weight: 500;
    }
    .totals-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: #1f2937;
    }
    .totals-table .total-row {
      border-top: 3px solid #8B5CF6;
      border-bottom: none;
    }
    .totals-table .total-row td {
      padding: 16px;
      font-size: 20px;
      font-weight: 700;
    }
    .totals-table .total-row td:first-child {
      color: #1f2937;
    }
    .totals-table .total-row td:last-child {
      color: #8B5CF6;
    }
    .payment-info {
      margin-top: 40px;
      padding: 24px;
      background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
      border-left: 4px solid #8B5CF6;
      border-radius: 8px;
    }
    .payment-info h3 {
      font-size: 18px;
      font-weight: 700;
      color: #8B5CF6;
      margin-bottom: 16px;
    }
    .payment-info p {
      font-size: 14px;
      color: #1f2937;
      margin: 8px 0;
      line-height: 1.6;
    }
    .payment-info strong {
      font-weight: 600;
      color: #374151;
    }
    .notes-section {
      margin-top: 32px;
      padding: 20px;
      background-color: #fffbeb;
      border-left: 4px solid #F59E0B;
      border-radius: 8px;
    }
    .notes-section h3 {
      font-size: 16px;
      font-weight: 600;
      color: #92400E;
      margin-bottom: 8px;
    }
    .notes-section p {
      font-size: 14px;
      color: #78350F;
      line-height: 1.6;
    }
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
    }
    .footer p {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
      margin: 8px 0;
    }
    .footer .brand {
      font-size: 16px;
      font-weight: 700;
      color: #8B5CF6;
      margin-top: 16px;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .invoice-container {
        padding: 24px 20px;
      }
      .invoice-header {
        flex-direction: column;
        gap: 24px;
      }
      .invoice-number {
        text-align: left;
      }
      .totals-table {
        min-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <h1>Factura Emitida</h1>
      <p>Gracias por tu confianza en Barlive</p>
      <span class="manual-badge">✍️ Factura Manual</span>
    </div>

    <div class="invoice-container">
      <div class="invoice-header">
        <div class="company-info">
          <h2>${fiscalData.company_name}</h2>
          <p><strong>CIF:</strong> ${fiscalData.tax_id}</p>
          <p>${fiscalData.address}</p>
          <p>${fiscalData.postal_code} ${fiscalData.city}, ${fiscalData.country}</p>
          ${fiscalData.phone ? `<p><strong>Tel:</strong> ${fiscalData.phone}</p>` : ''}
          ${fiscalData.email ? `<p><strong>Email:</strong> ${fiscalData.email}</p>` : ''}
          ${fiscalData.website ? `<p><strong>Web:</strong> ${fiscalData.website}</p>` : ''}
        </div>
        <div class="invoice-number">
          <h3>Factura</h3>
          <div class="number">${invoice.invoice_number}</div>
          <p><strong>Fecha:</strong> ${new Date(invoice.issued_at || new Date()).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          ${invoice.due_date ? `<p><strong>Vencimiento:</strong> ${new Date(invoice.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>` : ''}
        </div>
      </div>

      <div class="customer-section">
        <h3>Facturar a:</h3>
        <p class="customer-name">${invoice.customer_name}</p>
        ${invoice.customer_tax_id ? `<p><strong>CIF/NIF:</strong> ${invoice.customer_tax_id}</p>` : ''}
        <p>${invoice.customer_email}</p>
        ${invoice.customer_address ? `<p>${invoice.customer_address}</p>` : ''}
        ${invoice.customer_city ? `<p>${invoice.customer_postal_code} ${invoice.customer_city}, ${invoice.customer_country || 'España'}</p>` : ''}
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td>${invoice.subtotal.toFixed(2)} ${invoice.currency}</td>
          </tr>
          <tr>
            <td>IVA (${invoice.tax_rate}%):</td>
            <td>${invoice.tax_amount.toFixed(2)} ${invoice.currency}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL:</td>
            <td>${invoice.total.toFixed(2)} ${invoice.currency}</td>
          </tr>
        </table>
      </div>

      ${fiscalData.iban ? `
      <div class="payment-info">
        <h3>💳 Información de Pago</h3>
        ${fiscalData.bank_name ? `<p><strong>Banco:</strong> ${fiscalData.bank_name}</p>` : ''}
        <p><strong>IBAN:</strong> ${fiscalData.iban}</p>
        ${fiscalData.swift_bic ? `<p><strong>SWIFT/BIC:</strong> ${fiscalData.swift_bic}</p>` : ''}
        <p style="margin-top: 12px; font-size: 13px; color: #6b7280;">
          Por favor, incluye el número de factura <strong>${invoice.invoice_number}</strong> en el concepto de la transferencia.
        </p>
      </div>
      ` : ''}

      ${invoice.notes ? `
      <div class="notes-section">
        <h3>📝 Notas</h3>
        <p>${invoice.notes}</p>
      </div>
      ` : ''}

      <div class="footer">
        ${fiscalData.invoice_footer_text ? `<p>${fiscalData.invoice_footer_text}</p>` : ''}
        <p class="brand">Barlive</p>
        <p>Tu guía de ocio nocturno</p>
        <p style="margin-top: 16px; font-size: 12px;">
          Este es un documento generado automáticamente.<br>
          Para cualquier consulta, contacta con nosotros en ${fiscalData.email || 'info@barlive.es'}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
