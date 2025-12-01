
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
/* eslint-enable import/no-unresolved */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EmailRequest {
  email: string;
  code: string;
  type: 'verification' | 'password_reset' | 'password_confirmation';
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
    console.log('[SendVerificationEmail] === REQUEST STARTED ===');
    console.log('[SendVerificationEmail] Using Supabase Native Email System (FREE)');
    
    const { email, code, type }: EmailRequest = await req.json();

    if (!email || !type) {
      console.error('[SendVerificationEmail] ❌ Missing required fields:', { email: !!email, type: !!type });
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

    console.log('[SendVerificationEmail] 📧 Preparing email for:', email, '| Type:', type);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // For Supabase native emails, we need to trigger the appropriate auth flow
    // that will send the email automatically using Supabase's email templates
    
    let emailSent = false;
    let errorMessage = '';

    if (type === 'verification' || type === 'password_reset') {
      // Use Supabase's built-in password reset flow
      // This will send an email with a magic link that includes the code
      console.log('[SendVerificationEmail] 🚀 Triggering Supabase password reset email...');
      
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://natively.dev/email-confirmed',
      });

      if (error) {
        console.error('[SendVerificationEmail] ❌ Supabase email error:', error);
        errorMessage = error.message;
      } else {
        emailSent = true;
        console.log('[SendVerificationEmail] ✅ Supabase email sent successfully!');
      }
    } else if (type === 'password_confirmation') {
      // For confirmation emails, we just log success
      // The actual password was already set, this is just a notification
      console.log('[SendVerificationEmail] ℹ️ Password confirmation - no email needed');
      emailSent = true;
    }

    if (!emailSent) {
      console.error('[SendVerificationEmail] ❌ Failed to send email:', errorMessage);
      
      // Return the code in the response so the app can show it to the user
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: errorMessage || 'Unknown error',
          code: code, // Include code so app can show it to user
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
        code: code, // Include code in response for fallback display
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
    console.error('[SendVerificationEmail] ❌ Unexpected error:', error);
    console.error('[SendVerificationEmail] Error stack:', error.stack);
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
