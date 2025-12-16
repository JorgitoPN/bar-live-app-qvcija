
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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get request body
    const { amount, currency = 'eur', description, metadata = {} } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Cantidad inválida' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Stripe configuration
    const { data: stripeConfig, error: configError } = await supabaseClient
      .from('stripe_configuration')
      .select('*')
      .single();

    if (configError || !stripeConfig) {
      return new Response(
        JSON.stringify({ error: 'Stripe no está configurado. Por favor, usa el Asistente de Stripe.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;

    const { data: existingCustomer } = await supabaseClient
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (existingCustomer) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeConfig.secret_key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email || '',
          metadata: JSON.stringify({ user_id: user.id }),
        }),
      });

      if (!customerResponse.ok) {
        const error = await customerResponse.json();
        throw new Error(`Error creating customer: ${error.error?.message || 'Unknown error'}`);
      }

      const customer = await customerResponse.json();
      stripeCustomerId = customer.id;

      // Save customer to database
      await supabaseClient.from('stripe_customers').insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        email: user.email,
      });
    }

    // Create payment intent
    const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeConfig.secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: currency,
        customer: stripeCustomerId,
        description: description || 'Pago en Barlive',
        'metadata[user_id]': user.id,
        ...Object.entries(metadata).reduce((acc, [key, value]) => {
          acc[`metadata[${key}]`] = String(value);
          return acc;
        }, {} as Record<string, string>),
      }),
    });

    if (!paymentIntentResponse.ok) {
      const error = await paymentIntentResponse.json();
      throw new Error(`Error creating payment intent: ${error.error?.message || 'Unknown error'}`);
    }

    const paymentIntent = await paymentIntentResponse.json();

    // Save payment session
    await supabaseClient.from('payment_sessions').insert({
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: amount,
      currency: currency,
      status: 'pending',
      metadata: metadata,
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-payment-intent:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
