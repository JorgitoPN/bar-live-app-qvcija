
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
/* eslint-enable import/no-unresolved */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface EmailRequest {
  email: string;
  code: string;
  type: 'verification' | 'password_reset' | 'password_confirmation';
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
    console.log('[SendVerificationEmail] === REQUEST STARTED ===');
    
    // Check if API key is configured
    if (!RESEND_API_KEY) {
      console.error('[SendVerificationEmail] ❌ RESEND_API_KEY is not configured');
      console.error('[SendVerificationEmail] Please configure RESEND_API_KEY in Supabase Dashboard → Edge Functions → Secrets');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          details: 'RESEND_API_KEY is missing. Please contact support.',
          troubleshooting: 'Admin: Configure RESEND_API_KEY in Supabase Dashboard → Edge Functions → Secrets'
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

    console.log('[SendVerificationEmail] ✅ RESEND_API_KEY is configured');

    const { email, code, type }: EmailRequest = await req.json();

    if (!email || !type) {
      console.error('[SendVerificationEmail] ❌ Missing required fields:', { email: !!email, type: !!type });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and type are required' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('[SendVerificationEmail] 📧 Preparing email for:', email, '| Type:', type);

    // Send email using Resend
    let emailSubject = '';
    let emailBody = '';

    if (type === 'verification') {
      emailSubject = 'Verifica tu correo electrónico - BarLive';
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Verifica tu correo electrónico</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hola,</p>
            <p style="font-size: 16px; color: #333;">Gracias por registrarte en BarLive. Para completar tu registro, ingresa el siguiente código de verificación en la aplicación:</p>
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
    } else if (type === 'password_reset') {
      emailSubject = 'Restablece tu contraseña - BarLive';
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Restablece tu contraseña</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hola,</p>
            <p style="font-size: 16px; color: #333;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en BarLive.</p>
            <p style="font-size: 16px; color: #333;">Ingresa este código en la aplicación:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #14B8A6; margin: 0;">${code}</h2>
            </div>
            <p style="font-size: 14px; color: #666;">Este código expirará en 10 minutos.</p>
            <p style="font-size: 14px; color: #666;">Si no solicitaste este cambio, tu cuenta está segura y puedes ignorar este correo.</p>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>Saludos,</p>
            <p>El equipo de BarLive</p>
            <p style="margin-top: 20px;">© 2025 BarLive. Todos los derechos reservados.</p>
          </div>
        </div>
      `;
    } else if (type === 'password_confirmation') {
      emailSubject = '¡Contraseña configurada exitosamente! - BarLive';
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">¡Contraseña configurada!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; background: #10B981; color: white; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 30px;">✓</div>
            </div>
            <h2 style="font-size: 20px; color: #333; text-align: center; margin-bottom: 20px;">Tu contraseña ha sido configurada exitosamente</h2>
            <p style="font-size: 16px; color: #333;">Hola,</p>
            <p style="font-size: 16px; color: #333;">Tu cuenta de BarLive ha sido migrada exitosamente al nuevo sistema de autenticación (Auth 3.0).</p>
            <p style="font-size: 16px; color: #333;">Ahora puedes iniciar sesión con:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="font-size: 14px; color: #666; margin: 5px 0;"><strong>Correo:</strong> ${email}</p>
              <p style="font-size: 14px; color: #666; margin: 5px 0;"><strong>Contraseña:</strong> La que acabas de configurar</p>
            </div>
            <p style="font-size: 14px; color: #666;">Todos tus datos, roles y configuraciones se han mantenido intactos.</p>
            <p style="font-size: 14px; color: #666;">Si no realizaste este cambio, por favor contacta con nuestro soporte inmediatamente.</p>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>© 2025 BarLive. Todos los derechos reservados.</p>
          </div>
        </div>
      `;
    }

    console.log('[SendVerificationEmail] 🚀 Calling Resend API...');

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
    console.log('[SendVerificationEmail] 📊 Resend API response status:', resendResponse.status);
    console.log('[SendVerificationEmail] 📊 Resend API response body:', responseText);

    if (!resendResponse.ok) {
      console.error('[SendVerificationEmail] ❌ Resend API error:', {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        body: responseText,
      });

      // Parse error details
      let errorMessage = 'Failed to send email';
      let errorDetails = responseText;
      let troubleshooting = '';
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('[SendVerificationEmail] 📋 Parsed error data:', errorData);
        
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        // Provide specific troubleshooting based on error
        if (resendResponse.status === 403) {
          troubleshooting = 'Domain "barlive.app" may not be verified in Resend. Please verify the domain in Resend Dashboard → Domains.';
          errorDetails = 'Domain verification required. Admin: Check Resend Dashboard.';
        } else if (resendResponse.status === 401) {
          troubleshooting = 'RESEND_API_KEY may be invalid or expired. Please check the API key in Resend Dashboard.';
          errorDetails = 'Invalid API key. Admin: Update RESEND_API_KEY in Supabase Secrets.';
        } else if (errorData.name === 'validation_error') {
          troubleshooting = 'Email validation failed. Check email format and domain configuration.';
          errorDetails = errorData.message || 'Validation error';
        }
      } catch (e) {
        console.error('[SendVerificationEmail] ⚠️ Could not parse error response:', e);
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorDetails,
          troubleshooting: troubleshooting,
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
    console.log('[SendVerificationEmail] ✅ Email sent successfully! Message ID:', resendData.id);

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
    console.error('[SendVerificationEmail] ❌ Unexpected error:', error);
    console.error('[SendVerificationEmail] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
        troubleshooting: 'An unexpected error occurred. Please check Edge Function logs for details.',
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
