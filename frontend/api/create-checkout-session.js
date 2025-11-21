const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// frontend/api/create-checkout-session.js - SIMPLIFIED VERSION
export default async function handler(req, res) {
  // Simple CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tier, userEmail } = req.body;

    if (!tier || !userEmail) {
      return res.status(400).json({ 
        error: 'Tier and email are required' 
      });
    }

    // Import stripe dynamically to avoid module issues
    const stripe = await import('stripe').then((module) => 
      module.default(process.env.STRIPE_SECRET_KEY)
    );

    const tierPrices = {
      'pro': 'price_1SVxLeGg8RUnSFObKobkPrcE',
      'enterprise': 'price_1SVxMEGg8RUnSFObB08Qfs7I'
    };

    const priceId = tierPrices[tier];
    
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
      customer_email: userEmail,
    });

    res.status(200).json({ sessionId: session.id });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ 
      error: 'Payment setup failed',
      details: error.message 
    });
  }
}
