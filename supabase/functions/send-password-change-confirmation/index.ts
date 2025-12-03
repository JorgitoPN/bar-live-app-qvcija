
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email }: RequestBody = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[PasswordChangeConfirmation] Enviando correo a:', email);

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Barlive <noreply@barliveapp.es>',
        to: [email],
        subject: '✅ Tu contraseña ha sido actualizada - Barlive',
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contraseña Actualizada - Barlive</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🔒 Barlive
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Confirmación de cambio de contraseña
              </p>
            </td>
          </tr>

          <!-- Success icon -->
          <tr>
            <td style="padding: 40px 30px 20px 30px; text-align: center;">
              <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="font-size: 48px; color: #ffffff;">✓</span>
              </div>
              <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: bold;">
                ¡Contraseña actualizada!
              </h2>
              <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 24px;">
                Tu contraseña ha sido cambiada correctamente.
              </p>
            </td>
          </tr>

          <!-- Info box -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 0;">
                    <p style="margin: 0 0 12px 0; color: #1f2937; font-size: 15px; font-weight: 600;">
                      📋 Detalles del cambio:
                    </p>
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                      <strong>Cuenta:</strong> ${email}
                    </p>
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                      <strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      <strong>Dispositivo:</strong> Navegador web
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security warning -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
                <tr>
                  <td style="padding: 0;">
                    <p style="margin: 0 0 12px 0; color: #92400e; font-size: 15px; font-weight: 600;">
                      ⚠️ ¿No fuiste tú?
                    </p>
                    <p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px; line-height: 20px;">
                      Si no realizaste este cambio, tu cuenta podría estar comprometida. Por favor, toma las siguientes acciones inmediatamente:
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 20px;">
                      <li style="margin-bottom: 8px;">Restablece tu contraseña nuevamente</li>
                      <li style="margin-bottom: 8px;">Revisa la actividad reciente de tu cuenta</li>
                      <li style="margin-bottom: 0;">Contacta con nuestro equipo de soporte</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next steps -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                📱 Próximos pasos:
              </h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #667eea; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 12px;">1</span>
                    <span style="color: #4b5563; font-size: 14px;">Abre la app Barlive en tu dispositivo</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #667eea; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 12px;">2</span>
                    <span style="color: #4b5563; font-size: 14px;">Inicia sesión con tu nueva contraseña</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #667eea; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 12px;">3</span>
                    <span style="color: #4b5563; font-size: 14px;">¡Disfruta de Barlive con total seguridad!</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support section -->
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                ¿Necesitas ayuda? Estamos aquí para ti
              </p>
              <a href="mailto:soporte@barliveapp.es" style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                Contactar Soporte
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
              <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Barlive. Todos los derechos reservados.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="https://barliveapp.es/legal/privacidad" style="color: #667eea; text-decoration: none;">Política de Privacidad</a> • 
                <a href="https://barliveapp.es/legal/terminos" style="color: #667eea; text-decoration: none;">Términos de Servicio</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[PasswordChangeConfirmation] Error de Resend:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log('[PasswordChangeConfirmation] ✅ Correo enviado:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[PasswordChangeConfirmation] ❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
