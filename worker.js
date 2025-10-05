// Cloudflare Worker for Stripe Checkout Session Creation
// Deploy this to: your-domain.workers.dev or custom route

export default {
  async fetch(request, env, ctx) {
    console.log('🚀 Worker received request:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers)
    });

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      console.log('✅ Handling CORS preflight request');
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only handle POST requests to /create-checkout-session
    if (request.method !== 'POST') {
      console.log('❌ Method not allowed:', request.method);
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      console.log('📋 Parsing request body...');
      // Parse request body
      const { line_items, customer_info, shipping_info, metadata } = await request.json();
      
      console.log('📊 Request data received:', {
        line_items_count: line_items?.length || 0,
        has_customer_info: !!customer_info,
        has_shipping_info: !!shipping_info,
        has_metadata: !!metadata
      });

      // Validate required fields
      if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
        console.log('❌ Invalid line_items:', line_items);
        return new Response(JSON.stringify({ error: 'Invalid line_items' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check environment variables
      console.log('🔑 Environment check:', {
        has_stripe_key: !!env.STRIPE_SECRET_KEY,
        stripe_key_length: env.STRIPE_SECRET_KEY?.length || 0,
        stripe_key_start: env.STRIPE_SECRET_KEY?.substring(0, 20) || 'undefined',
        stripe_key_end: env.STRIPE_SECRET_KEY?.substring(env.STRIPE_SECRET_KEY.length - 10) || 'undefined'
      });

      console.log('💳 Creating Stripe checkout session...');
      
      // Resolve frontend origin for redirect URLs (dev vs prod)
      const frontendOrigin = resolveFrontendOrigin(request, env);
      // Create Stripe checkout session with minimal address collection (none)
      const sessionParams = {
        'mode': 'payment',
        'success_url': `${frontendOrigin.replace(/\/$/, '')}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${frontendOrigin.replace(/\/$/, '')}/cancel.html`,
        ...flattenLineItems(line_items),
        // Intentionally not setting billing_address_collection or shipping_address_collection
        ...flattenMetadata(metadata || {}),
      };
      

      // Add customer email if provided
      if (customer_info?.email) {
        sessionParams['customer_email'] = customer_info.email;
      }
      
      const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(sessionParams),
      });

      console.log('📡 Stripe API response:', {
        status: stripeResponse.status,
        ok: stripeResponse.ok,
        statusText: stripeResponse.statusText
      });

      if (!stripeResponse.ok) {
        const errorText = await stripeResponse.text();
        console.log('❌ Stripe API error:', {
          status: stripeResponse.status,
          statusText: stripeResponse.statusText,
          errorText: errorText
        });
        return new Response(JSON.stringify({ error: 'Stripe API error', details: errorText }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const session = await stripeResponse.json();
      console.log('✅ Stripe session created successfully:', session.id);

      // Return session ID
      return new Response(JSON.stringify({ sessionId: session.id }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.log('💥 Worker error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};

// Helper function to get request origin
function getOrigin(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// Resolve the frontend origin for redirects. Prefer explicit env var, then request origin,
// then Referer header, and finally default to production site.
function resolveFrontendOrigin(request, env) {
  try {
    const prod = (env.ALLOWED_ORIGIN || 'https://www.ateliervelee.com').replace(/\/$/, '');
    const headers = request.headers;
    const origin = headers.get('Origin');
    const referer = headers.get('Referer');
    // Allow localhost during development
    const prefer = origin || referer || '';
    if (prefer) {
      try {
        const u = new URL(prefer);
        // Only trust http(s)
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          // If localhost or 127.0.0.1 or *.local, use it
          if (/^(localhost|127\.0\.0\.1|\[::1\]|.+\.local)$/i.test(u.hostname)) {
            return `${u.protocol}//${u.host}`;
          }
        }
      } catch {}
    }
    // Fallback to configured production origin
    return prod;
  } catch {
    return 'https://www.ateliervelee.com';
  }
}

// Helper function to flatten line items for URL encoding
function flattenLineItems(lineItems) {
  const params = {};
  
  lineItems.forEach((item, index) => {
    params[`line_items[${index}][price_data][currency]`] = item.price_data.currency;
    params[`line_items[${index}][price_data][product_data][name]`] = item.price_data.product_data.name;
    params[`line_items[${index}][price_data][unit_amount]`] = item.price_data.unit_amount;
    params[`line_items[${index}][quantity]`] = item.quantity;
    
    if (item.price_data.product_data.description) {
      params[`line_items[${index}][price_data][product_data][description]`] = item.price_data.product_data.description;
    }
    
    if (item.price_data.product_data.images && item.price_data.product_data.images.length > 0) {
      item.price_data.product_data.images.forEach((image, imgIndex) => {
        params[`line_items[${index}][price_data][product_data][images][${imgIndex}]`] = image;
      });
    }
  });
  
  return params;
}

// Note: Customer info is now handled by creating a Stripe customer first
// This allows proper prefilling of all fields in Stripe Checkout

// Helper function to flatten shipping info for URL encoding
function flattenShippingInfo(shippingInfo) {
  // No-op to avoid collecting shipping in Stripe Checkout
  return {};
}

// Helper function to flatten metadata for URL encoding
function flattenMetadata(metadata) {
  const params = {};
  Object.keys(metadata).forEach(key => {
    let value = metadata[key];
    
    // If customerData is too long, store only essential info
    if (key === 'customerData' && typeof value === 'string' && value.length > 400) {
      try {
        const data = JSON.parse(value);
        // Store only essential customer info to stay under 500 char limit
        const essentialData = {
          email: data.billing?.email || '',
          name: `${data.billing?.firstName || ''} ${data.billing?.lastName || ''}`.trim(),
          city: data.billing?.city || '',
          country: data.billing?.country || ''
        };
        value = JSON.stringify(essentialData);
      } catch (e) {
        // If parsing fails, truncate the string
        value = value.substring(0, 400);
      }
    }
    
    params[`metadata[${key}]`] = value;
  });
  return params;
} 