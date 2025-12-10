
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
    console.log('[RequestPasswordToken] 🚀 Iniciando solicitud de token de contraseña');
    console.log('[RequestPasswordToken] 📅 Marca de tiempo:', new Date().toISOString());
    
    // Check environment variables
    console.log('[RequestPasswordToken] 🔍 Comprobando variables de entorno...');
    console.log('[RequestPasswordToken] SUPABASE_URL:', SUPABASE_URL ? '✅ Establecer' : '❌ No establecer');
    console.log('[RequestPasswordToken] SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Establecer' : '❌ No establecer');
    console.log('[RequestPasswordToken] RESEND_API_KEY:', RESEND_API_KEY ? '✅ Establecer' : '❌ No establecer');
    
    if (RESEND_API_KEY) {
      const keyPrefix = RESEND_API_KEY.substring(0, 10);
      console.log('[RequestPasswordToken] 📧 RESEND_API_KEY (primeros 10 caracteres):', keyPrefix + '...');
      
      // Validate API key format
      if (!RESEND_API_KEY.startsWith('re_')) {
        console.error('[RequestPasswordToken] ⚠️ ADVERTENCIA: La clave API de Resend no comienza con "re_"');
        console.error('[RequestPasswordToken] ⚠️ Esto podría indicar una clave API inválida o incorrecta');
      }
    }
    
    // Check if RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error('[RequestPasswordToken] ❌ RESEND_API_KEY no está configurado!');
      return new Response(
        JSON.stringify({ error: 'Servicio de correo electrónico no configurado' }),
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
      console.error('[RequestPasswordToken] ❌ No se proporcionó correo electrónico');
      return new Response(
        JSON.stringify({ error: 'El correo electrónico es obligatorio' }),
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
    console.log('[RequestPasswordToken] 📧 Correo electrónico:', normalizedEmail);

    // Create Supabase Admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists (don't reveal this to the client for security)
    console.log('[RequestPasswordToken] 🔍 Comprobando si el usuario existe...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('[RequestPasswordToken] ❌ Error al obtener usuarios:', userError);
    }

    const userExists = userData?.users?.some(u => u.email?.toLowerCase() === normalizedEmail);
    console.log('[RequestPasswordToken] 👤 El usuario existe:', userExists ? 'verdadero' : 'falso');

    if (!userExists) {
      console.log('[RequestPasswordToken] ⚠️ Usuario no encontrado, pero devolviendo éxito por seguridad');
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
    console.log('[RequestPasswordToken] 🔑 Token generado:', token);

    // Store token in database with 1-hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    console.log('[RequestPasswordToken] ⏰ El token vence el:', expiresAt);
    
    console.log('[RequestPasswordToken] 💾 Almacenando token en la base de datos...');
    const { error: insertError } = await supabaseAdmin
      .from('password_tokens')
      .insert({
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('[RequestPasswordToken] ❌ Error al almacenar el token:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error al generar el token' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('[RequestPasswordToken] ✅ Token almacenado en la base de datos');

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

    console.log('[RequestPasswordToken] 📧 Enviando correo electrónico a través de Reenviar...');
    console.log('[RequestPasswordToken] 📧 De: BarLive <noreply@barliveapp.es>');
    console.log('[RequestPasswordToken] 📧 Para:', normalizedEmail);

    const emailPayload = {
      from: 'BarLive <noreply@barliveapp.es>',
      to: [normalizedEmail],
      subject: '🔐 Código de Recuperación de Contraseña - Barlive',
      html: emailHtml,
    };

    console.log('[RequestPasswordToken] 📦 Carga útil de correo electrónico preparada');

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('[RequestPasswordToken] 📧 Estado de respuesta de API de reenvío:', emailResponse.status);

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[RequestPasswordToken] ❌ Error de API de reenvío');
      console.error('[RequestPasswordToken] ❌ Estado:', emailResponse.status);
      console.error('[RequestPasswordToken] 📧 Reenviar el cuerpo de la respuesta de la API:', errorText);
      
      // Parse error details if possible
      let parsedError = null;
      try {
        parsedError = JSON.parse(errorText);
        console.error('[RequestPasswordToken] ❌ Error analizado:', JSON.stringify(parsedError, null, 2));
        
        // Provide specific error messages
        if (emailResponse.status === 401) {
          console.error('[RequestPasswordToken] ❌ ERROR 401: La clave API de Resend no es válida o ha expirado');
          console.error('[RequestPasswordToken] ❌ SOLUCIÓN: Actualiza RESEND_API_KEY en Supabase Dashboard → Project Settings → Edge Functions → Secrets');
          console.error('[RequestPasswordToken] ❌ Obtén una nueva clave API de: https://resend.com/api-keys');
        } else if (emailResponse.status === 403) {
          console.error('[RequestPasswordToken] ❌ ERROR 403: El dominio no está verificado o no tienes permisos');
          console.error('[RequestPasswordToken] ❌ SOLUCIÓN: Verifica el dominio barliveapp.es en Resend Dashboard');
        } else if (emailResponse.status === 422) {
          console.error('[RequestPasswordToken] ❌ ERROR 422: Datos de correo electrónico inválidos');
          console.error('[RequestPasswordToken] ❌ Detalles:', parsedError);
        }
      } catch (e) {
        console.error('[RequestPasswordToken] ❌ No se pudo analizar el error como JSON');
      }

      // Return user-friendly error
      let userMessage = 'Error al enviar el correo electrónico';
      if (emailResponse.status === 401) {
        userMessage = 'Error de configuración del servicio de correo. Por favor, contacta con soporte.';
      } else if (emailResponse.status === 403) {
        userMessage = 'Error de verificación del dominio. Por favor, contacta con soporte.';
      }

      return new Response(
        JSON.stringify({ 
          error: userMessage,
          details: parsedError || errorText,
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
    console.log('[RequestPasswordToken] ✅ ¡Correo electrónico enviado con éxito!');
    console.log('[RequestPasswordToken] 📧 Respuesta de reenvío:', JSON.stringify(emailResult, null, 2));
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
    console.error('[RequestPasswordToken] ❌ ERROR INESPERADO:', error);
    console.error('[RequestPasswordToken] ❌ Mensaje de error:', error.message);
    console.error('[RequestPasswordToken] ❌ Pila de errores:', error.stack);
    console.error('[RequestPasswordToken] ═══════════════════════════════════════');
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
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
