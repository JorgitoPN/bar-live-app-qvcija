
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    // Create Supabase client with service role key for admin operations
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

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('[DeleteAccount] Error verifying user:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token or user not found' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[DeleteAccount] 🗑️ Starting account deletion for user:', user.id);

    // Step 1: Mark user as inactive and set deletion date in usuarios table
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({
        activo: false,
        fecha_eliminacion: new Date().toISOString(),
        email: `deleted_${user.id}@deleted.local`, // Change email to free it up
        username: null, // Free up username
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[DeleteAccount] Error updating usuarios table:', updateError);
      throw new Error('Failed to update user profile');
    }

    console.log('[DeleteAccount] ✅ Updated usuarios table');

    // Step 2: Delete user from auth.users table (this will cascade delete related data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[DeleteAccount] Error deleting auth user:', deleteError);
      throw new Error('Failed to delete authentication record');
    }

    console.log('[DeleteAccount] ✅ Deleted auth.users record');

    // Step 3: Clean up any remaining data (optional - most should cascade)
    // Delete posts, comments, likes, etc. if needed
    // Note: With proper foreign key constraints, most data should cascade delete

    console.log('[DeleteAccount] ✅ Account deletion completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[DeleteAccount] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while deleting the account',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
