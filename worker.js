// Cloudflare Worker for Stripe Checkout Session Creation
// Deploy this to: your-domain.workers.dev or custom route

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
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
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Parse request body
      const { line_items, customer_info, shipping_info, metadata } = await request.json();

      // Validate required fields
      if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid line_items' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create Stripe checkout session
      const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'mode': 'payment',
          'success_url': `https://www.ateliervelee.com/success.html?session_id={CHECKOUT_SESSION_ID}`,
          'cancel_url': `https://www.ateliervelee.com/cancel.html`,
          'billing_address_collection': 'required',
          'shipping_address_collection[allowed_countries][0]': 'HR',
          'customer_email': customer_info?.email || '',
          ...flattenLineItems(line_items),
          ...flattenCustomerInfo(customer_info || {}),
          ...flattenShippingInfo(shipping_info || {}),
          ...flattenMetadata(metadata || {}),
        }),
      });

      if (!stripeResponse.ok) {
        return new Response(JSON.stringify({ error: 'Stripe API error' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const session = await stripeResponse.json();

      // Return session ID
      return new Response(JSON.stringify({ sessionId: session.id }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
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

// Helper function to flatten customer info for URL encoding
function flattenCustomerInfo(customerInfo) {
  const params = {};
  
  if (customerInfo.name) {
    params['customer_details[name]'] = customerInfo.name;
  }
  
  if (customerInfo.email) {
    params['customer_details[email]'] = customerInfo.email;
  }
  
  if (customerInfo.phone) {
    params['customer_details[phone]'] = customerInfo.phone;
  }
  
  if (customerInfo.address) {
    if (customerInfo.address.line1) {
      params['customer_details[address][line1]'] = customerInfo.address.line1;
    }
    if (customerInfo.address.line2) {
      params['customer_details[address][line2]'] = customerInfo.address.line2;
    }
    if (customerInfo.address.city) {
      params['customer_details[address][city]'] = customerInfo.address.city;
    }
    if (customerInfo.address.postal_code) {
      params['customer_details[address][postal_code]'] = customerInfo.address.postal_code;
    }
    if (customerInfo.address.country) {
      params['customer_details[address][country]'] = customerInfo.address.country;
    }
  }
  
  return params;
}

// Helper function to flatten shipping info for URL encoding
function flattenShippingInfo(shippingInfo) {
  const params = {};
  
  if (shippingInfo.line1) {
    params['shipping_address_collection[allowed_countries][0]'] = 'HR';
    params['shipping_options[0][shipping_rate_data][type]'] = 'fixed_amount';
    params['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] = '0';
    params['shipping_options[0][shipping_rate_data][fixed_amount][currency]'] = 'eur';
    params['shipping_options[0][shipping_rate_data][display_name]'] = 'Free shipping';
  }
  
  return params;
}

// Helper function to flatten metadata for URL encoding
function flattenMetadata(metadata) {
  const params = {};
  Object.keys(metadata).forEach(key => {
    params[`metadata[${key}]`] = metadata[key];
  });
  return params;
} 