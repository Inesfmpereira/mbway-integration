const express = require('express');
const app = express();

// Middleware
app.use('/webhook', express.raw({type: 'application/json'}));
app.use(express.static('public'));
app.use(express.json());

// Inicializar Stripe com variável de ambiente
let stripe;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe inicializado');
} catch (error) {
  console.error('❌ Erro ao inicializar Stripe:', error.message);
}

// Página inicial
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Pagamento MB WAY</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          button { background: #5469d4; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
          button:hover { background: #4356c7; }
        </style>
      </head>
      <body>
        <h1>Teste MB WAY - Funcionando! ✅</h1>
        <p>Produto: Teste - €20.00</p>
        <button onclick="createCheckout()">Pagar com MB WAY</button>
        
        <script>
          async function createCheckout() {
            try {
              const response = await fetch('/create-checkout-session', { method: 'POST' });
              const session = await response.json();
              
              if (session.url) {
                window.location = session.url;
              } else {
                alert('Erro: ' + session.error);
              }
            } catch (error) {
              alert('Erro ao criar sessão: ' + error.message);
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Criar sessão de checkout
app.post('/create-checkout-session', async (req, res) => {
  try {
    console.log('🛒 Criando sessão de checkout...');
    
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Produto Teste MBWAY',
          },
          unit_amount: 2000, // €20.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://mbway-integration.vercel.app/'}/success`,
      cancel_url: `${req.headers.origin || 'https://mbway-integration.vercel.app/'}/cancel`,
    });

    console.log('✅ Sessão criada:', session.id);
    res.json({url: session.url});
    
  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error.message);
    res.status(500).json({error: error.message});
  }
});

// Páginas de sucesso e cancelamento
app.get('/success', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: green;">✅ Pagamento realizado com sucesso!</h1>
        <p>Obrigado pela sua compra com MB WAY.</p>
        <a href="/">← Voltar ao início</a>
      </body>
    </html>
  `);
});

app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: red;">❌ Pagamento cancelado</h1>
        <p>Pode tentar novamente quando quiser.</p>
        <a href="/">← Voltar ao início</a>
      </body>
    </html>
  `);
});

// Webhook completo
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook verificado:', event.type);
  } catch (err) {
    console.log(`❌ Webhook erro: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('🎉 Pagamento completo!', session.id);
      console.log('💰 Valor:', session.amount_total / 100, 'EUR');
      console.log('📧 Cliente:', session.customer_details?.email);
      // Aqui você adica sua lógica de negócio
      break;

    case 'payment_intent.succeeded':
      console.log('✅ Payment Intent succeeded:', event.data.object.id);
      break;

    case 'payment_intent.payment_failed':
      console.log('❌ Payment failed:', event.data.object.id);
      break;

    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.json({received: true});
});
