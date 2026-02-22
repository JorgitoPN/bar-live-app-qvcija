
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

/**
 * ✅ SEND INVOICE EMAIL v56.0 - RESEND INTEGRATION
 * 
 * CRITICAL FIXES v56.0:
 * - ✅ Integrates with Resend API for actual email delivery
 * - ✅ Creates notification in database as fallback
 * - ✅ Professional HTML email template
 * - ✅ Proper error handling and logging
 * - ✅ Works for both test and real invoices
 */

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
    console.log('[send-invoice-email v56.0] 📧 Starting invoice email send...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { invoiceId, invoiceData, recipientEmail, isTest = false, isManual = false }: InvoiceEmailRequest = await req.json();

    console.log('[send-invoice-email v56.0] 📋 Request details:', {
      invoiceId,
      recipientEmail,
      isTest,
      isManual,
    });

    // Validate recipient email
    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new Error('Invalid recipient email address');
    }

    let invoice: any;
    let fiscalData: any;

    // Load fiscal data
    const { data: fiscalDataResult, error: fiscalError } = await supabase
      .from('company_fiscal_data')
      .select('*')
      .single();

    if (fiscalError || !fiscalDataResult) {
      console.error('[send-invoice-email v56.0] ❌ Fiscal data error:', fiscalError);
      throw new Error('Company fiscal data not configured');
    }

    fiscalData = fiscalDataResult;
    console.log('[send-invoice-email v56.0] ✅ Fiscal data loaded');

    // Load or use invoice data
    if (isTest && invoiceData) {
      invoice = invoiceData;
      console.log('[send-invoice-email v56.0] ✅ Using test invoice data');
    } else if (invoiceId) {
      const tableName = isManual ? 'manual_invoices' : 'invoices';
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoiceResult) {
        console.error('[send-invoice-email v56.0] ❌ Invoice error:', invoiceError);
        throw new Error('Invoice not found');
      }

      invoice = invoiceResult;
      console.log('[send-invoice-email v56.0] ✅ Invoice loaded:', invoice.invoice_number);
    } else {
      throw new Error('Either invoiceId or invoiceData must be provided');
    }

    // ✅ CRITICAL FIX v56.0: Create in-app notification as fallback
    console.log('[send-invoice-email v56.0] 📬 Creating in-app notification...');
    
    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('email', recipientEmail)
      .maybeSingle();

    if (userData) {
      // Create notification for the user
      const { error: notifError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: userData.id,
          tipo: 'sistema',
          titulo: `📄 Nueva Factura: ${invoice.invoice_number}`,
          mensaje: `Se ha generado una nueva factura por ${invoice.total}€. Puedes descargarla desde tu panel de gestión.`,
          imagen_url: null,
        });

      if (notifError) {
        console.error('[send-invoice-email v56.0] ⚠️ Error creating notification:', notifError);
      } else {
        console.log('[send-invoice-email v56.0] ✅ In-app notification created');
      }
    } else {
      console.log('[send-invoice-email v56.0] ℹ️ User not found in database, skipping notification');
    }

    // ✅ CRITICAL FIX v56.0: Use Resend API to send email
    console.log('[send-invoice-email v56.0] 📧 Sending email via Resend API...');
    
    let emailSent = false;
    let emailError = null;
    
    try {
      // Generate email HTML
      const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoice.invoice_number}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">BarLive</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Factura Generada</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 600;">Factura ${invoice.invoice_number}</h2>
              
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                Hola ${invoice.customer_name || 'Cliente'},
              </p>
              
              <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                Se ha generado una nueva factura para tu suscripción en BarLive.
              </p>
              
              <!-- Invoice Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Número de Factura:</td>
                        <td align="right" style="color: #111827; font-size: 14px; font-weight: 600; padding: 8px 0;">${invoice.invoice_number}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Fecha de Emisión:</td>
                        <td align="right" style="color: #111827; font-size: 14px; font-weight: 600; padding: 8px 0;">${new Date(invoice.issued_at || invoice.created_at).toLocaleDateString('es-ES')}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Subtotal:</td>
                        <td align="right" style="color: #111827; font-size: 14px; font-weight: 600; padding: 8px 0;">${Number(invoice.subtotal).toFixed(2)}€</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">IVA (${invoice.tax_rate}%):</td>
                        <td align="right" style="color: #111827; font-size: 14px; font-weight: 600; padding: 8px 0;">${Number(invoice.tax_amount).toFixed(2)}€</td>
                      </tr>
                      <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="color: #111827; font-size: 18px; font-weight: 700; padding: 15px 0 0 0;">Total:</td>
                        <td align="right" style="color: #14B8A6; font-size: 24px; font-weight: 700; padding: 15px 0 0 0;">${Number(invoice.total).toFixed(2)}€</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Puedes descargar tu factura desde el panel de gestión de BarLive o contactar con nuestro equipo de soporte si tienes alguna pregunta.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://barlive.es/gestion/mis-locales" style="display: inline-block; background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Ver Factura
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                ${fiscalData.company_name || 'BarLive'}
              </p>
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                ${fiscalData.address || ''} • ${fiscalData.city || ''} • ${fiscalData.postal_code || ''}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                CIF: ${fiscalData.tax_id || ''} • Email: ${fiscalData.email || 'info@barlive.es'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      // Send email using Resend API
      console.log('[send-invoice-email v56.0] 📧 Calling Resend API...');
      
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BarLive <noreply@barlive.es>',
          to: [recipientEmail],
          subject: `Factura ${invoice.invoice_number} - BarLive`,
          html: emailHTML,
        }),
      });

      const resendData = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error('[send-invoice-email v56.0] ❌ Resend API error:', resendData);
        emailError = resendData.message || 'Failed to send email via Resend';
      } else {
        console.log('[send-invoice-email v56.0] ✅ Email sent successfully via Resend:', resendData);
        emailSent = true;
      }
    } catch (error: any) {
      console.error('[send-invoice-email v56.0] ⚠️ Error sending email:', error);
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
            email_method: emailSent ? 'resend' : 'notification_only',
            email_sent: emailSent,
            notification_created: true,
            email_error: emailError || null,
          }
        })
        .eq('id', invoiceId);
      
      console.log('[send-invoice-email v56.0] ✅ Invoice metadata updated');
    }

    // Return success if either email was sent OR notification was created
    const responseMessage = emailSent 
      ? `Factura enviada correctamente a ${recipientEmail}` 
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
    console.error('[send-invoice-email v56.0] ❌ Error:', error);
    console.error('[send-invoice-email v56.0] ❌ Error stack:', error.stack);
    
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
