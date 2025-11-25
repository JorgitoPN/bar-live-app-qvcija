
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
/* eslint-enable import/no-unresolved */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
    const { email, code, type }: EmailRequest = await req.json();

    if (!email || !code || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Send email using Resend
    const emailSubject = type === 'verification' 
      ? 'Verifica tu correo electrónico - BarLive'
      : 'Restablece tu contraseña - BarLive';

    const emailBody = type === 'verification'
      ? `
        <h1>Verifica tu correo electrónico</h1>
        <p>Tu código de verificación es:</p>
        <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</h2>
        <p>Este código expirará en 10 minutos.</p>
        <p>Si no solicitaste este código, puedes ignorar este correo.</p>
      `
      : `
        <h1>Restablece tu contraseña</h1>
        <p>Tu código de restablecimiento es:</p>
        <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</h2>
        <p>Este código expirará en 10 minutos.</p>
        <p>Si no solicitaste este código, puedes ignorar este correo.</p>
      `;

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

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('[SendVerificationEmail] Resend API error:', errorData);
      throw new Error('Failed to send email');
    }

    const resendData = await resendResponse.json();
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
    console.error('[SendVerificationEmail] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
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
