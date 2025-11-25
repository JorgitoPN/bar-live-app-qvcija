
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface EmailRequest {
  email: string;
  code: string;
  nombre?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { email, code, nombre } = await req.json() as EmailRequest;

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Send Email] Sending verification email to:', email);

    // If Resend API key is configured, use Resend
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'BarLive <noreply@barlive.app>',
          to: [email],
          subject: 'Verifica tu cuenta de BarLive',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                  .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: white; padding: 20px; border-radius: 8px; margin: 20px 0; color: #14B8A6; }
                  .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Verifica tu cuenta</h1>
                  </div>
                  <div class="content">
                    <h2>Hola${nombre ? ` ${nombre}` : ''},</h2>
                    <p>Gracias por registrarte en BarLive. Para completar tu registro, por favor ingresa el siguiente código de verificación:</p>
                    <div class="code">${code}</div>
                    <p>Este código expirará en 10 minutos.</p>
                    <p>Si no creaste una cuenta en BarLive, puedes ignorar este email.</p>
                  </div>
                  <div class="footer">
                    <p>© 2025 BarLive. Todos los derechos reservados.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error('[Send Email] Resend API error:', error);
        throw new Error(`Failed to send email: ${error}`);
      }

      const data = await res.json();
      console.log('[Send Email] Email sent successfully via Resend:', data);

      return new Response(
        JSON.stringify({ success: true, data }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } else {
      // Fallback: Use Supabase Auth email (if configured)
      console.log('[Send Email] No Resend API key found, using Supabase Auth email');
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase credentials not configured');
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Store the verification code in the database
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          verification_code: code,
          verification_code_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .eq('email', email);

      if (updateError) {
        console.error('[Send Email] Error updating user:', updateError);
        throw updateError;
      }

      console.log('[Send Email] Verification code stored in database');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verification code stored. Please configure Resend API for email delivery.' 
        }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } catch (error) {
    console.error('[Send Email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
