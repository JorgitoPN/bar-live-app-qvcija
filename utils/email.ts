
import { supabase, isSupabaseConfigured } from './supabase';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTemplate {
  type: 'welcome' | 'verification' | 'password-reset' | 'event-reminder' | 'new-follower' | 'new-comment';
  data: Record<string, any>;
}

// Email templates
const emailTemplates = {
  welcome: (data: { nombre: string }) => ({
    subject: '¡Bienvenido a BarLive! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenido a BarLive!</h1>
            </div>
            <div class="content">
              <h2>Hola ${data.nombre},</h2>
              <p>¡Gracias por unirte a BarLive! Estamos emocionados de tenerte con nosotros.</p>
              <p>Con BarLive puedes:</p>
              <ul>
                <li>🗺️ Descubrir los mejores locales cerca de ti</li>
                <li>🎉 Encontrar eventos increíbles</li>
                <li>📱 Conectar con otros amantes de la vida nocturna</li>
                <li>💼 Encontrar oportunidades de empleo en hostelería</li>
              </ul>
              <p>¡Comienza a explorar ahora!</p>
              <a href="barlive://explorar" class="button">Explorar Locales</a>
            </div>
            <div class="footer">
              <p>© 2025 BarLive. Todos los derechos reservados.</p>
              <p>Si no creaste esta cuenta, puedes ignorar este email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `¡Bienvenido a BarLive, ${data.nombre}! Gracias por unirte a nuestra comunidad.`,
  }),

  verification: (data: { nombre: string; verificationUrl: string }) => ({
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
            .button { display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verifica tu cuenta</h1>
            </div>
            <div class="content">
              <h2>Hola ${data.nombre},</h2>
              <p>Para completar tu registro en BarLive, por favor verifica tu dirección de email haciendo clic en el botón de abajo:</p>
              <a href="${data.verificationUrl}" class="button">Verificar Email</a>
              <p>Si no creaste una cuenta en BarLive, puedes ignorar este email.</p>
              <p>Este enlace expirará en 24 horas.</p>
            </div>
            <div class="footer">
              <p>© 2025 BarLive. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hola ${data.nombre}, verifica tu cuenta de BarLive visitando: ${data.verificationUrl}`,
  }),

  'password-reset': (data: { nombre: string; resetUrl: string }) => ({
    subject: 'Restablece tu contraseña de BarLive',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Restablece tu contraseña</h1>
            </div>
            <div class="content">
              <h2>Hola ${data.nombre},</h2>
              <p>Recibimos una solicitud para restablecer tu contraseña de BarLive.</p>
              <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
              <a href="${data.resetUrl}" class="button">Restablecer Contraseña</a>
              <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura.</p>
              <p>Este enlace expirará en 1 hora.</p>
            </div>
            <div class="footer">
              <p>© 2025 BarLive. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hola ${data.nombre}, restablece tu contraseña de BarLive visitando: ${data.resetUrl}`,
  }),

  'event-reminder': (data: { nombre: string; eventoNombre: string; fecha: string; hora: string; localNombre: string }) => ({
    subject: `Recordatorio: ${data.eventoNombre} es mañana 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡No te lo pierdas! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hola ${data.nombre},</h2>
              <p>Te recordamos que mañana tienes un evento:</p>
              <div class="event-details">
                <h3>${data.eventoNombre}</h3>
                <p><strong>📍 Local:</strong> ${data.localNombre}</p>
                <p><strong>📅 Fecha:</strong> ${data.fecha}</p>
                <p><strong>🕐 Hora:</strong> ${data.hora}</p>
              </div>
              <p>¡Prepárate para una noche increíble!</p>
              <a href="barlive://eventos/${data.eventoNombre}" class="button">Ver Detalles del Evento</a>
            </div>
            <div class="footer">
              <p>© 2025 BarLive. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hola ${data.nombre}, recordatorio: ${data.eventoNombre} es mañana a las ${data.hora} en ${data.localNombre}.`,
  }),

  'new-follower': (data: { nombre: string; followerNombre: string }) => ({
    subject: `${data.followerNombre} comenzó a seguirte en BarLive`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Nuevo seguidor! 👥</h1>
            </div>
            <div class="content">
              <h2>Hola ${data.nombre},</h2>
              <p><strong>${data.followerNombre}</strong> comenzó a seguirte en BarLive.</p>
              <p>¡Tu comunidad está creciendo!</p>
              <a href="barlive://perfil" class="button">Ver Perfil</a>
            </div>
            <div class="footer">
              <p>© 2025 BarLive. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hola ${data.nombre}, ${data.followerNombre} comenzó a seguirte en BarLive.`,
  }),

  'new-comment': (data: { nombre: string; commenterNombre: string; comentario: string; postId: string }) => ({
    subject: `${data.commenterNombre} comentó tu publicación`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .comment { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14B8A6; }
            .button { display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nuevo comentario 💬</h1>
            </div>
            <div class="content">
              <h2>Hola ${data.nombre},</h2>
              <p><strong>${data.commenterNombre}</strong> comentó tu publicación:</p>
              <div class="comment">
                <p>"${data.comentario}"</p>
              </div>
              <a href="barlive://post/${data.postId}" class="button">Ver Publicación</a>
            </div>
            <div class="footer">
              <p>© 2025 BarLive. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hola ${data.nombre}, ${data.commenterNombre} comentó: "${data.comentario}"`,
  }),
};

// Send email using Supabase Edge Function
export const sendEmail = async (emailData: EmailData): Promise<{ error: string | null }> => {
  try {
    if (!isSupabaseConfigured()) {
      console.log('Supabase no configurado, email simulado:', emailData);
      return { error: null };
    }

    // Call Supabase Edge Function to send email
    const { error } = await supabase.functions.invoke('send-email', {
      body: emailData,
    });

    if (error) {
      console.error('Error enviando email:', error);
      return { error: error.message };
    }

    console.log('Email enviado correctamente a:', emailData.to);
    return { error: null };
  } catch (error: any) {
    console.error('Error en sendEmail:', error);
    return { error: error.message || 'Error al enviar email' };
  }
};

// Send email from template
export const sendEmailFromTemplate = async (
  to: string,
  template: EmailTemplate
): Promise<{ error: string | null }> => {
  try {
    const templateFunction = emailTemplates[template.type];
    if (!templateFunction) {
      return { error: `Template ${template.type} no encontrado` };
    }

    const { subject, html, text } = templateFunction(template.data);

    return await sendEmail({
      to,
      subject,
      html,
      text,
    });
  } catch (error: any) {
    console.error('Error en sendEmailFromTemplate:', error);
    return { error: error.message || 'Error al enviar email desde template' };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (to: string, nombre: string): Promise<void> => {
  await sendEmailFromTemplate(to, {
    type: 'welcome',
    data: { nombre },
  });
};

// Send verification email
export const sendVerificationEmail = async (
  to: string,
  nombre: string,
  verificationUrl: string
): Promise<void> => {
  await sendEmailFromTemplate(to, {
    type: 'verification',
    data: { nombre, verificationUrl },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  to: string,
  nombre: string,
  resetUrl: string
): Promise<void> => {
  await sendEmailFromTemplate(to, {
    type: 'password-reset',
    data: { nombre, resetUrl },
  });
};

// Send event reminder email
export const sendEventReminderEmail = async (
  to: string,
  nombre: string,
  eventoNombre: string,
  fecha: string,
  hora: string,
  localNombre: string
): Promise<void> => {
  await sendEmailFromTemplate(to, {
    type: 'event-reminder',
    data: { nombre, eventoNombre, fecha, hora, localNombre },
  });
};
