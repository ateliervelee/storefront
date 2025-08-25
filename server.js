const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51RzZOKLtKPQT2y5pNEED_YOUR_SECRET_KEY_HERE');
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
            success_url: `${req.headers.origin || 'http://localhost:8000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'http://localhost:8000'}/cancel.html`,
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