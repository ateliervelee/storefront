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

    const url = new URL(request.url);
    const pathname = url.pathname || '/';

    // Stripe webhook (POST /stripe-webhook) – preferred for server-side email on payment success
    if (pathname.endsWith('/stripe-webhook')) {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      try {
        const secret = env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });
        const raw = await request.text();
        const sig = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature') || '';
        const valid = await verifyStripeSignature(raw, sig, secret);
        if (!valid) {
          return new Response('Invalid signature', { status: 400 });
        }
        const event = JSON.parse(raw || '{}');
        if (event && event.type === 'checkout.session.completed') {
          const session = event.data && event.data.object ? event.data.object : {};
          const toEmail = session.customer_details?.email || session.customer_email || '';
          const orderId = (session.metadata && session.metadata.orderId) || session.id;
          if (toEmail) {
            const fromEmail = (env.MAIL_FROM || 'info@ateliervelee.com');
            const fromName = (env.MAIL_FROM_NAME || 'Atelier Veleé');
            const subject = `Potvrda narudžbe ${orderId ? '#' + orderId : ''}`;
            const text = `Hvala Vam na vašoj kupnji. Vaša narudžba ${orderId ? '#' + orderId : ''} je zaprimljena i obraditi će se u najkraćem mogućem roku.`;
            const html = `<p>Hvala Vam na vašoj kupnji.</p><p>Vaša narudžba <strong>${orderId ? '#' + orderId : ''}</strong> je zaprimljena i obraditi će se u najkraćem mogućem roku.</p>`;
            const ok = await sendMail({ toEmail, fromEmail, fromName, subject, text, html });
            if (!ok) {
              // Let Stripe retry if email send failed
              return new Response('Mail failed', { status: 500 });
            }
          }
        }
        return new Response('ok', { status: 200 });
      } catch (e) {
        console.log('Webhook error', e);
        return new Response('Error', { status: 500 });
      }
    }

    // Only handle POST requests to root for session creation
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

// Utility JSON response with CORS
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Send email via MailChannels
async function sendMail({ toEmail, fromEmail, fromName, subject, text, html }) {
  try {
    const payload = {
      personalizations: [ { to: [ { email: toEmail } ] } ],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [
        { type: 'text/plain', value: text || '' },
        { type: 'text/html', value: html || '' }
      ]
    };
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.text();
      console.log('MailChannels error', res.status, body);
      return false;
    }
    return true;
  } catch (e) {
    console.log('Mail send error', e);
    return false;
  }
}

// Verify Stripe webhook signature (HMAC SHA-256)
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  try {
    // Header format: t=timestamp,v1=signature[,v1=...] 
    const parts = Object.fromEntries(signatureHeader.split(',').map(kv => kv.split('=')));
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    const payload = `${t}.${rawBody}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const digestHex = [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, '0')).join('');
    return timingSafeEqual(digestHex, v1);
  } catch (e) {
    return false;
  }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) {
    res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return res === 0;
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