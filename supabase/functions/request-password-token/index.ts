
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
/* eslint-enable import/no-unresolved */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log('[RequestPasswordToken] Processing request for:', normalizedEmail);

    // Create Supabase Admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists (don't reveal this to the client for security)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('[RequestPasswordToken] Error fetching users:', userError);
    }

    const userExists = userData?.users?.some(u => u.email?.toLowerCase() === normalizedEmail);

    if (!userExists) {
      console.log('[RequestPasswordToken] User not found, but returning success for security');
      // Return success anyway to not reveal if email exists
      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Generate 6-digit token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('[RequestPasswordToken] Generated token:', token);

    // Store token in database with 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    
    const { error: insertError } = await supabaseAdmin
      .from('password_tokens')
      .insert({
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('[RequestPasswordToken] Error storing token:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate token' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Send email with token using Resend
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Recuperación - Barlive</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Barlive</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Recuperación de Contraseña</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 50px 30px; text-align: center;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: bold;">Tu Código de Recuperación</h2>
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Introduce este código en la app Barlive para restablecer tu contraseña:
              </p>
              
              <!-- Token Display -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin: 0 0 30px 0;">
                <div style="font-size: 48px; font-weight: bold; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${token}
                </div>
              </div>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Este código expira en <strong>15 minutos</strong>.
              </p>

              <!-- Security Notice -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 8px; padding: 20px; margin: 30px 0 0 0; text-align: left;">
                <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">
                  🔒 Aviso de Seguridad
                </p>
                <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.5;">
                  Si no solicitaste este código, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Barlive. Todos los derechos reservados.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Este es un correo automático, por favor no respondas a este mensaje.
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

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Barlive <noreply@barliveapp.es>',
        to: [normalizedEmail],
        subject: 'Código de Recuperación de Contraseña - Barlive',
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[RequestPasswordToken] Error sending email:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('[RequestPasswordToken] ✅ Token sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[RequestPasswordToken] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
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
