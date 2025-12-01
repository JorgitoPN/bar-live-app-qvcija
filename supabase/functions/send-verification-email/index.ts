
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
/* eslint-enable import/no-unresolved */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EmailRequest {
  email: string;
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
    console.log('[SendVerificationEmail v4.0] === REQUEST STARTED ===');
    console.log('[SendVerificationEmail v4.0] Using Supabase Native Email System (FREE)');
    
    const { email, type }: EmailRequest = await req.json();

    if (!email || !type) {
      console.error('[SendVerificationEmail v4.0] ❌ Missing required fields:', { email: !!email, type: !!type });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and type are required' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('[SendVerificationEmail v4.0] 📧 Preparing email for:', email, '| Type:', type);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // For Supabase native emails, we use the built-in auth flows
    // that automatically send emails using Supabase's email templates
    
    let emailSent = false;
    let errorMessage = '';

    if (type === 'verification') {
      // Resend signup confirmation email
      console.log('[SendVerificationEmail v4.0] 🚀 Triggering Supabase signup confirmation email...');
      
      const { error } = await supabaseAdmin.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
        },
      });

      if (error) {
        console.error('[SendVerificationEmail v4.0] ❌ Supabase email error:', error);
        errorMessage = error.message;
      } else {
        emailSent = true;
        console.log('[SendVerificationEmail v4.0] ✅ Supabase verification email sent successfully!');
      }
    } else if (type === 'password_reset') {
      // Send password reset email
      console.log('[SendVerificationEmail v4.0] 🚀 Triggering Supabase password reset email...');
      
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://natively.dev/email-confirmed',
      });

      if (error) {
        console.error('[SendVerificationEmail v4.0] ❌ Supabase email error:', error);
        errorMessage = error.message;
      } else {
        emailSent = true;
        console.log('[SendVerificationEmail v4.0] ✅ Supabase password reset email sent successfully!');
      }
    }

    if (!emailSent) {
      console.error('[SendVerificationEmail v4.0] ❌ Failed to send email:', errorMessage);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: errorMessage || 'Unknown error',
          troubleshooting: 'Email could not be sent. Please check your email configuration in Supabase Dashboard → Authentication → Email Templates',
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully using Supabase native email system',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[SendVerificationEmail v4.0] ❌ Unexpected error:', error);
    console.error('[SendVerificationEmail v4.0] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
        troubleshooting: 'An unexpected error occurred. Please check Edge Function logs for details.',
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
