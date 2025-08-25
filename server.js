const express = require('express');

// Debug logging for environment variables
const stripeKey = process.env.STRIPE_SECRET_KEY;
const allowedOrigin = process.env.ALLOWED_ORIGIN;

console.log('🔑 Environment Debug:');
console.log('- Stripe Key exists:', !!process.env.STRIPE_SECRET_KEY);
if (stripeKey) {
    console.log('- Key length:', stripeKey.length);
    console.log('- Key starts with:', stripeKey.substring(0, 20) + '...');
    console.log('- Key ends with:', '...' + stripeKey.substring(stripeKey.length - 10));
} else {
    console.log('- ❌ No STRIPE_SECRET_KEY environment variable set!');
}

console.log('- Allowed Origin:', allowedOrigin || 'Not set (will use localhost:8000)');

const stripe = require('stripe')(stripeKey);
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Create Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { line_items, customer_info, shipping_info, metadata } = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: line_items,
            success_url: `${req.headers.origin || process.env.ALLOWED_ORIGIN || 'http://localhost:8000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || process.env.ALLOWED_ORIGIN || 'http://localhost:8000'}/cancel.html`,
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['HR']
            },
            customer_email: customer_info?.email,
            customer_details: customer_info ? {
                name: customer_info.name,
                email: customer_info.email,
                phone: customer_info.phone,
                address: customer_info.address
            } : undefined,
            metadata: metadata
        });

        res.json({ sessionId: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('💳 Stripe integration ready!');
    console.log('⚠️  Make sure to set your STRIPE_SECRET_KEY environment variable');
}); 