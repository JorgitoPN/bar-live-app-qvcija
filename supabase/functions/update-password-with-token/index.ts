
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
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email, token, and newPassword are required' }),
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
    console.log('[UpdatePasswordWithToken] Processing password update for:', normalizedEmail);

    // Create Supabase Admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Validate token first
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
      console.error('[UpdatePasswordWithToken] Token not found or error:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido o no encontrado' }),
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
      console.log('[UpdatePasswordWithToken] Token expired');
      return new Response(
        JSON.stringify({ success: false, error: 'El código ha expirado' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('[UpdatePasswordWithToken] Error fetching users:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al buscar usuario' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const user = userData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      console.error('[UpdatePasswordWithToken] User not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Usuario no encontrado' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Update user password using Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('[UpdatePasswordWithToken] Error updating password:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al actualizar contraseña' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Mark token as used
    const { error: markUsedError } = await supabaseAdmin
      .from('password_tokens')
      .update({ 
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id);

    if (markUsedError) {
      console.error('[UpdatePasswordWithToken] Error marking token as used:', markUsedError);
      // Don't fail the request if we can't mark the token as used
    }

    console.log('[UpdatePasswordWithToken] ✅ Password updated successfully');

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
    console.error('[UpdatePasswordWithToken] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
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
