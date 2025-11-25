
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
/* eslint-enable import/no-unresolved */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface EmailRequest {
  email: string;
  code: string;
  type: 'verification' | 'password_reset';
}

serve(async (req) => {
  // Handle CORS
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
    // Check if API key is configured
    if (!RESEND_API_KEY) {
      console.error('[SendVerificationEmail] RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured. Please contact support.',
          details: 'RESEND_API_KEY is missing'
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

    const { email, code, type }: EmailRequest = await req.json();

    if (!email || !code || !type) {
      console.error('[SendVerificationEmail] Missing required fields:', { email: !!email, code: !!code, type: !!type });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('[SendVerificationEmail] Sending email to:', email, 'Type:', type);

    // Send email using Resend
    const emailSubject = type === 'verification' 
      ? 'Verifica tu correo electrónico - BarLive'
      : 'Restablece tu contraseña - BarLive';

    const emailBody = type === 'verification'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Verifica tu correo electrónico</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Tu código de verificación es:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #14B8A6; margin: 0;">${code}</h2>
            </div>
            <p style="font-size: 14px; color: #666;">Este código expirará en 10 minutos.</p>
            <p style="font-size: 14px; color: #666;">Si no solicitaste este código, puedes ignorar este correo.</p>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>© 2025 BarLive. Todos los derechos reservados.</p>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Restablece tu contraseña</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Tu código de restablecimiento es:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #14B8A6; margin: 0;">${code}</h2>
            </div>
            <p style="font-size: 14px; color: #666;">Este código expirará en 10 minutos.</p>
            <p style="font-size: 14px; color: #666;">Si no solicitaste este código, puedes ignorar este correo.</p>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>© 2025 BarLive. Todos los derechos reservados.</p>
          </div>
        </div>
      `;

    console.log('[SendVerificationEmail] Calling Resend API...');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BarLive <noreply@barlive.app>',
        to: [email],
        subject: emailSubject,
        html: emailBody,
      }),
    });

    const responseText = await resendResponse.text();
    console.log('[SendVerificationEmail] Resend API response status:', resendResponse.status);
    console.log('[SendVerificationEmail] Resend API response:', responseText);

    if (!resendResponse.ok) {
      console.error('[SendVerificationEmail] Resend API error:', {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        body: responseText,
      });

      // Parse error details
      let errorMessage = 'Failed to send email';
      let errorDetails = responseText;
      
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.name === 'validation_error') {
          errorDetails = 'Domain verification may be pending. Please check Resend dashboard.';
        }
      } catch (e) {
        console.error('[SendVerificationEmail] Could not parse error response:', e);
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorDetails,
          status: resendResponse.status,
        }),
        {
          status: resendResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const resendData = JSON.parse(responseText);
    console.log('[SendVerificationEmail] Email sent successfully:', resendData);

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[SendVerificationEmail] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
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
