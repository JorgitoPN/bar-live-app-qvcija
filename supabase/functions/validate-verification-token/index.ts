
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
    console.log('[ValidateVerificationToken] ═══════════════════════════════════════');
    console.log('[ValidateVerificationToken] 🔍 Starting token validation');
    console.log('[ValidateVerificationToken] 📡 Request method:', req.method);
    console.log('[ValidateVerificationToken] 📡 Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

    // Parse request body with detailed logging
    const rawBody = await req.text();
    console.log('[ValidateVerificationToken] 📦 Raw body:', rawBody);
    console.log('[ValidateVerificationToken] 📦 Raw body length:', rawBody.length);
    console.log('[ValidateVerificationToken] 📦 Raw body type:', typeof rawBody);

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
      console.log('[ValidateVerificationToken] 📦 Parsed body:', JSON.stringify(parsedBody, null, 2));
    } catch (parseError) {
      console.error('[ValidateVerificationToken] ❌ JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const { email, token } = parsedBody;

    console.log('[ValidateVerificationToken] 📧 Email:', email);
    console.log('[ValidateVerificationToken] 📧 Email type:', typeof email);
    console.log('[ValidateVerificationToken] 📧 Email is defined:', email !== undefined);
    console.log('[ValidateVerificationToken] 🔢 Token:', token);
    console.log('[ValidateVerificationToken] 🔢 Token type:', typeof token);
    console.log('[ValidateVerificationToken] 🔢 Token is defined:', token !== undefined);
    console.log('[ValidateVerificationToken] 🔢 Token is null:', token === null);
    console.log('[ValidateVerificationToken] 🔢 Token length:', token ? String(token).length : 'N/A');

    // Validate required fields with detailed error messages
    if (!email) {
      console.error('[ValidateVerificationToken] ❌ Email is missing or empty');
      return new Response(
        JSON.stringify({ valid: false, error: 'Email y token son obligatorios' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!token) {
      console.error('[ValidateVerificationToken] ❌ Token is missing or empty');
      console.error('[ValidateVerificationToken] ❌ Token value:', token);
      console.error('[ValidateVerificationToken] ❌ Token type:', typeof token);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Token inválido: ${token === undefined ? 'undefined' : token === null ? 'null' : 'empty'}` 
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Normalize and validate token format
    const normalizedToken = String(token).trim();
    console.log('[ValidateVerificationToken] 🔢 Normalized token:', normalizedToken);
    console.log('[ValidateVerificationToken] 🔢 Normalized token length:', normalizedToken.length);

    if (normalizedToken.length !== 6) {
      console.error('[ValidateVerificationToken] ❌ Token length is not 6:', normalizedToken.length);
      return new Response(
        JSON.stringify({ valid: false, error: 'El código debe tener 6 dígitos' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!/^\d{6}$/.test(normalizedToken)) {
      console.error('[ValidateVerificationToken] ❌ Token is not 6 digits:', normalizedToken);
      return new Response(
        JSON.stringify({ valid: false, error: 'El código debe contener solo números' }),
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
    console.log('[ValidateVerificationToken] 📧 Normalized email:', normalizedEmail);
    console.log('[ValidateVerificationToken] 🔍 Searching for token in database...');

    // Create Supabase Admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find the token in the database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('verification_tokens')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('token', normalizedToken)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('[ValidateVerificationToken] 🔍 Database query result:', {
      found: !!tokenData,
      error: tokenError?.message,
      tokenData: tokenData ? {
        email: tokenData.email,
        token: tokenData.token,
        used: tokenData.used,
        created_at: tokenData.created_at,
        expires_at: tokenData.expires_at,
      } : null,
    });

    if (tokenError || !tokenData) {
      console.error('[ValidateVerificationToken] ❌ Token not found or error:', tokenError);
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

    console.log('[ValidateVerificationToken] ⏰ Current time:', now.toISOString());
    console.log('[ValidateVerificationToken] ⏰ Token expires at:', expiresAt.toISOString());
    console.log('[ValidateVerificationToken] ⏰ Is expired:', now > expiresAt);

    if (now > expiresAt) {
      console.log('[ValidateVerificationToken] ❌ Token expired');
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

    console.log('[ValidateVerificationToken] ✅ Token is valid');
    console.log('[ValidateVerificationToken] ═══════════════════════════════════════');

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
    console.error('[ValidateVerificationToken] ❌ Unexpected error:', error);
    console.error('[ValidateVerificationToken] ❌ Error stack:', error.stack);
    console.error('[ValidateVerificationToken] ═══════════════════════════════════════');
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: error.message || 'Error interno del servidor',
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
