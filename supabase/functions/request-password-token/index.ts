
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
    console.log('[RequestPasswordToken] ═══════════════════════════════════════');
    console.log('[RequestPasswordToken] 🚀 Starting password reset request');
    
    // Check if RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error('[RequestPasswordToken] ❌ RESEND_API_KEY is not configured!');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const { email } = await req.json();

    if (!email) {
      console.error('[RequestPasswordToken] ❌ No email provided');
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
    console.log('[RequestPasswordToken] 📧 Email:', normalizedEmail);

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
      console.error('[RequestPasswordToken] ❌ Error fetching users:', userError);
    }

    const userExists = userData?.users?.some(u => u.email?.toLowerCase() === normalizedEmail);
    console.log('[RequestPasswordToken] 👤 User exists:', userExists);

    if (!userExists) {
      console.log('[RequestPasswordToken] ⚠️ User not found, but returning success for security');
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
    console.log('[RequestPasswordToken] 🔑 Generated token:', token);

    // Store token in database with 1-hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    console.log('[RequestPasswordToken] 💾 Storing token in database...');
    const { error: insertError } = await supabaseAdmin
      .from('password_tokens')
      .insert({
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('[RequestPasswordToken] ❌ Error storing token:', insertError);
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

    console.log('[RequestPasswordToken] ✅ Token stored successfully');

    // Send email with token using Resend
    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de restablecimiento de contraseña - Barlive</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🔐 Barlive</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; font-weight: 600;">Solicitud de restablecimiento de contraseña</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 30px 20px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: bold;">Hola 👋</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Barlive.
              </p>
            </td>
          </tr>

          <!-- Token Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                Copia y pega este código en la BarLive:
              </p>
              
              <!-- Token Display Box -->
              <div style="background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); border-radius: 12px; padding: 30px; margin: 0 0 20px 0; text-align: center;">
                <div style="font-size: 56px; font-weight: bold; color: #ffffff; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  ${token}
                </div>
              </div>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 15px; font-weight: 600;">
                  🔒 Nota de seguridad
                </p>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                  Este código expirará en <strong>1 hora</strong> por razones de seguridad. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                </p>
              </div>
            </td>
          </tr>

          <!-- Warning Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
                <p style="margin: 0 0 15px 0; color: #991b1b; font-size: 15px; font-weight: 600;">
                  ⚠️ ¿No fuiste tú?
                </p>
                <p style="margin: 0 0 15px 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">
                  Si no solicitaste restablecer tu contraseña, es posible que alguien esté intentando acceder a tu cuenta.
                </p>
                <p style="margin: 0 0 8px 0; color: #7f1d1d; font-size: 14px; font-weight: 600;">
                  Recomendaciones:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 14px; line-height: 1.8;">
                  <li>Ignora este correo</li>
                  <li>Cambia tu contraseña inmediatamente</li>
                  <li>Contacta con soporte si sospechas actividad inusual</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                ¿Necesitas ayuda? Estamos aquí para ti
              </p>
              <a href="mailto:soporte@barliveapp.es" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Contactar Soporte
              </a>
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; font-weight: 600;">
                © ${new Date().getFullYear()} Barlive. Todos los derechos reservados.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                <a href="https://barliveapp.es/privacidad" style="color: #14b8a6; text-decoration: none; margin: 0 8px;">Política de Privacidad</a>
                •
                <a href="https://barliveapp.es/terminos" style="color: #14b8a6; text-decoration: none; margin: 0 8px;">Términos de Servicio</a>
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

    console.log('[RequestPasswordToken] 📧 Sending email via Resend...');
    console.log('[RequestPasswordToken] 📧 From: Barlive <noreply@barliveapp.es>');
    console.log('[RequestPasswordToken] 📧 To:', normalizedEmail);

    const emailPayload = {
      from: 'Barlive <noreply@barliveapp.es>',
      to: [normalizedEmail],
      subject: '🔐 Código de Recuperación de Contraseña - Barlive',
      html: emailHtml,
    };

    console.log('[RequestPasswordToken] 📦 Email payload prepared');

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('[RequestPasswordToken] 📬 Resend API response status:', emailResponse.status);

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[RequestPasswordToken] ❌ Resend API error response:', errorText);
      console.error('[RequestPasswordToken] ❌ Response status:', emailResponse.status);
      console.error('[RequestPasswordToken] ❌ Response headers:', JSON.stringify(Object.fromEntries(emailResponse.headers.entries())));
      
      // Parse error details if possible
      try {
        const errorJson = JSON.parse(errorText);
        console.error('[RequestPasswordToken] ❌ Parsed error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('[RequestPasswordToken] ❌ Could not parse error as JSON');
      }

      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: errorText,
          status: emailResponse.status
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

    const emailResult = await emailResponse.json();
    console.log('[RequestPasswordToken] ✅ Email sent successfully!');
    console.log('[RequestPasswordToken] 📧 Resend response:', JSON.stringify(emailResult, null, 2));
    console.log('[RequestPasswordToken] ═══════════════════════════════════════');

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
    console.error('[RequestPasswordToken] ═══════════════════════════════════════');
    console.error('[RequestPasswordToken] ❌ UNEXPECTED ERROR:', error);
    console.error('[RequestPasswordToken] ❌ Error message:', error.message);
    console.error('[RequestPasswordToken] ❌ Error stack:', error.stack);
    console.error('[RequestPasswordToken] ═══════════════════════════════════════');
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        type: error.name || 'UnknownError'
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
