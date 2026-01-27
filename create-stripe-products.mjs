import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  try {
    // Create Voice product
    const voiceProduct = await stripe.products.create({
      name: 'Voice Plan',
      description: 'Unlimited conversations with voice input/output',
    });
    
    const voicePrice = await stripe.prices.create({
      product: voiceProduct.id,
      unit_amount: 1200, // $12.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    
    console.log('✅ Voice Plan Created:');
    console.log('   Product ID:', voiceProduct.id);
    console.log('   Price ID:', voicePrice.id);
    console.log('');
    
    // Create Phone product
    const phoneProduct = await stripe.products.create({
      name: 'Phone Plan',
      description: 'Everything in Voice + call from any phone + SMS support',
    });
    
    const phonePrice = await stripe.prices.create({
      product: phoneProduct.id,
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    
    console.log('✅ Phone Plan Created:');
    console.log('   Product ID:', phoneProduct.id);
    console.log('   Price ID:', phonePrice.id);
    console.log('');
    
    console.log('🎉 All products created successfully!');
    console.log('');
    console.log('Next step: Update Home.tsx with these price IDs:');
    console.log(`  Voice: "${voicePrice.id}"`);
    console.log(`  Phone: "${phonePrice.id}"`);
    
  } catch (error) {
    console.error('❌ Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();
