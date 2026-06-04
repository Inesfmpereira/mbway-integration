const express = require('express');
const app = express();

// Middleware para webhook DEVE vir ANTES do express.json()
app.use('/webhook', express.raw({type: 'application/json'}));

// Outros middlewares
app.use(express.static('public'));
app.use(express.json());

// Configurar Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe;
try {
  stripe = require('stripe')(stripeKey);
  console.log('✅ Stripe inicializado');
} catch (error) {
  console.error('❌ Erro Stripe:', error.message);
}

// Página inicial
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>MB WAY Test</title>
        <style>
          body { font-family: Arial; padding: 20px; text-align: center; }
          button { background: #5469d4; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
          button:hover { background: #4356c7; }
        </style>
      </head>
      <body>
        <h1>🇵🇹 Teste MB WAY</h1>
        <p>Produto: Teste - €20.00</p>
        <button onclick="pay()">Pagar com MB WAY</button>
        
        <script>         async function pay() {
            try {
              const res = await fetch('/checkout', { method: 'POST' });
              const data = await res.json();
              
              if (data.url) {
                window.location = data.url;
              } else {
                alert('Erro: ' + (data.error || 'Desconhecido'));
              }
            } catch (err) {
              alert('Erro: ' + err.message);
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Checkout
app.post('/checkout', async (req, res) => {
  try {
    if (!stripe) {
      throw new Error('Stripe não inicializado');
    }

    const baseUrl = req.headers.origin || \`https://\${req.headers.host}\`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'multibanco'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'Teste MB WAY' },
          unit_amount: 2000,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: \`\${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: \`\${baseUrl}/cancel\`,
    });

    console.log('✅ Sessão criada:', session.id);
    res.json({ url: session.url });
    
  } catch (error) {
    console.error('Erro checkout:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Webhook - SEM express.raw() aqui (já está definido acima)
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.log('⚠️ WEBHOOK_SECRET não configurado');
    return res.status(400).send('Webhook secret não configurado');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook verificado:', event.type);
  } catch (err) {
    console.log(\`❌ Webhook erro: \${err.message}\`);
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  // Processar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('🎉 Pagamento completo!', session.id);
      console.log('💰 Valor:', session.amount_total / 100, 'EUR');
      break;

    case 'payment_intent.cceeded':
      console.log('✅ Payment succeeded:', event.data.object.id);
      break;

    default:
      console.log(\`Evento: \${event.type}\`);
  }

  res.json({received: true});
});

// Páginas
app.get('/success', (req, res) => {
  res.send('<h1 style="color:green;">✅ Pagamento realizado com sucesso!</h1><a href="/">← Voltar</a>');
});

app.get('/cancel', (req, res) => {
  res.send('<h1 style="color:red;">❌ Pagamento cancelado</h1><a href="/">← Voltar</a>');
});

module.exports = app;
