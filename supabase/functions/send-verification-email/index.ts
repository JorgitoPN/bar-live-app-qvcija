
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[SendVerificationEmail] === REQUEST STARTED ===');
    console.log('[SendVerificationEmail] Using Supabase Native Email System (FREE)');

    // Get request body
    const { email, code, type = 'password_reset' } = await req.json();

    if (!email) {
      console.error('[SendVerificationEmail] ❌ Email is required');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[SendVerificationEmail] 📧 Preparing email for:', email, '| Type:', type);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user from auth.users
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (authUserError || !authUser) {
      console.error('[SendVerificationEmail] ❌ User not found in auth.users:', authUserError);
      
      // Return success with fallback code
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User not found in auth system. Please use the verification code provided.',
          fallback: true,
          code: code,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[SendVerificationEmail] ✅ User found in auth.users:', authUser.user.id);

    // Use Supabase's native password reset email
    // This will send an email with a magic link that redirects to the specified URL
    console.log('[SendVerificationEmail] 🚀 Triggering Supabase password reset email...');
    
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://natively.dev/email-confirmed',
    });

    if (resetError) {
      console.error('[SendVerificationEmail] ❌ Error sending Supabase email:', resetError);
      
      // Return success with fallback code
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email service temporarily unavailable. Please use the verification code provided.',
          fallback: true,
          code: code,
          error: resetError.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[SendVerificationEmail] ✅ Supabase email sent successfully!');
    console.log('[SendVerificationEmail] 📬 Email sent to:', email);
    console.log('[SendVerificationEmail] 🔗 Redirect URL: https://natively.dev/email-confirmed');

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification email sent successfully',
        fallback: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[SendVerificationEmail] ❌ Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
