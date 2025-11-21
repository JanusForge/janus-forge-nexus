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
    const { tier, userId, userEmail } = req.body;

    if (!tier || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Tier and user email are required'
      });
    }

const tierPrices = {
  'pro': 'price_1SVxLeGg8RUnSFObKobkPrcE', // Pro tier - $29/month
  'enterprise': 'price_1SVxMEGg8RUnSFObB08Qfs7I' // Enterprise tier - $99/month
};

    const priceId = tierPrices[tier];
    
    if (!priceId) {
      return res.status(400).json({
        error: 'Invalid tier',
        message: 'The selected tier is not available'
      });
    }

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
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
      customer_email: userEmail,
      metadata: {
        userId: userId || 'unknown',
        tier: tier
      }
    });

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Stripe API error:', error);
    
    if (error.type === 'StripeCardError') {
      return res.status(402).json({
        error: 'Card error',
        message: error.message
      });
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
    } else {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Unable to create checkout session'
      });
    }
  }
}
