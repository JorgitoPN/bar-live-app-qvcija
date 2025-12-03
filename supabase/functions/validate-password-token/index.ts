
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
/* eslint-enable import/no-unresolved */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const { email, token } = await req.json();

    if (!email || !token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Email and token are required' }),
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
    console.log('[ValidatePasswordToken] Validating token for:', normalizedEmail);

    // Create Supabase Admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find the token in the database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_tokens')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('token', token)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      console.error('[ValidatePasswordToken] Token not found or error:', tokenError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Token inválido o no encontrado' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      console.log('[ValidatePasswordToken] Token expired');
      return new Response(
        JSON.stringify({ valid: false, error: 'El código ha expirado' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('[ValidatePasswordToken] ✅ Token is valid');

    return new Response(
      JSON.stringify({ valid: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[ValidatePasswordToken] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false,
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
