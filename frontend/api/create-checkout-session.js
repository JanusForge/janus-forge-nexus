// frontend/api/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported' 
    });
  }

  try {
    const { tier, userEmail, userId } = req.body;

    // Validate required fields
    if (!tier || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Tier and user email are required'
      });
    }

    // Your Stripe price IDs
    const tierPrices = {
      'pro': 'price_1SVxLeGg8RUnSFObKobkPrcE', // Pro - $29/month
      'enterprise': 'price_1SVxMEGg8RUnSFObB08Qfs7I' // Enterprise - $99/month
    };

    const priceId = tierPrices[tier];
    
    if (!priceId) {
      return res.status(400).json({
        error: 'Invalid tier',
        message: 'The selected tier is not available'
      });
    }

    console.log('Creating Stripe checkout session for:', { tier, userEmail, priceId });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      customer_email: userEmail,
      metadata: {
        userId: userId || 'unknown',
        tier: tier
      }
    });

    console.log('Stripe session created:', session.id);

    // Return the checkout URL
    res.status(200).json({ 
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Stripe API error:', error);
    
    // Detailed error handling
    res.status(500).json({
      error: 'Payment processing failed',
      message: error.message,
      type: error.type || 'Unknown error'
    });
  }
}
