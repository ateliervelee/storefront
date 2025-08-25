# 🚀 Cloudflare Pages + Workers Setup Guide

## Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare
```bash
wrangler login
```

## Step 3: Deploy the Worker
```bash
wrangler deploy
```

## Step 4: Set Environment Variables
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: **Workers & Pages** → **Your Worker** → **Settings** → **Variables**
3. Add environment variable:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: `sk_test_YOUR_ACTUAL_SECRET_KEY_HERE`
   - **Type**: Secret (encrypted)

## Step 5: Get Your Worker URL
After deployment, you'll get a URL like:
```
https://atelier-velee-payments.YOUR_SUBDOMAIN.workers.dev
```

## Step 6: Update Frontend Code
Update `checkout.js` line with your actual Worker URL:
```javascript
const workerUrl = process.env.NODE_ENV === 'production' 
    ? 'https://atelier-velee-payments.YOUR_ACTUAL_SUBDOMAIN.workers.dev'
    : '/create-checkout-session';
```

## Step 7: Deploy to Cloudflare Pages
1. Push your code to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Connect your GitHub repository
4. Set build settings:
   - **Build command**: (leave empty for static site)
   - **Build output directory**: `/` (root directory)
5. Deploy!

## Optional: Custom Route (Advanced)
To use your own domain for the API:
1. Uncomment route in `wrangler.toml`
2. Update pattern to your domain
3. Deploy again

## 💰 Free Plan Limits
- **Workers**: 100,000 requests/day
- **Pages**: Unlimited static requests
- **Perfect for**: Small to medium e-commerce sites

## 🔧 Testing
1. Local development: Use Node.js server (`npm start`)
2. Production: Cloudflare Workers + Pages
3. Both use same Stripe integration!

## 🚨 Security Notes
- Never commit `STRIPE_SECRET_KEY` to Git
- Use Cloudflare's secret variables
- Worker automatically handles CORS
- All payments processed securely by Stripe 