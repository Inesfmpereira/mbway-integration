const express = require('express');
const app = express();

// Middleware básico
app.use(express.static('public'));
app.use(express.json());

// Configurar Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe;

if (stripeKey) {
  stripe = require('stripe')(stripeKey);
  console.log('✅ Stripe OK');
} else {
  console.error('❌ Stripe key missing');
}

// Página inicial
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>MB WAY Teste</title>
        <style>
          body { font-family: Arial; padding: 20px; text-align: center; }
          button { background: #5469d4; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 10px; }
          button:hover { background: #4356c7; }
        </style>
      </head>
      <body>
        <h1>🇵🇹 MBAY Integration</h1>
        <p><strong>Produto:</strong> Teste MB WAY - €20.00</p>
        <button onclick="createCheckout()">💳 Pagar Agora</button>
        
        <script>
          async function createCheckout() {
            try {
              console.log('Criando checkout...');
              
              const response = await fetch('/create-checkout', {                 method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              
              const data = await response.json();
              
              if (data.url) {
                window.location.href = data.url;
              } else {
                alert('Erro: ' + (data.error || 'Erro desconhecido'));
              }
            } catch (error) {
              alert('Erro de conexão: ' + error.message);
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Criar checkout session
app.post('/create-checkout', async (req, res) => {
  try {
    console.log('📝 Iniciando checkout...');    
    if (!stripe) {
      throw new Error('Stripe não configurado');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'multibanco'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Produto Teste MB WAY'
          },
          unit_amount: 2000 // €20.00
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: 'https://mbway-integration.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://mbway-integration.vercel.app/cancel'
    });

    console.log('✅ Checkout criado:', session.id);
    res.json({ url: session.url });

  } catch (error) {
    console.error('❌ Erro no checkout:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Erro ao criar sessão de pagamento'
    });
  }
});

// Páginas de resultado
app.get('/success', (req, res) => {
  const sessionId = req.query.session_id;
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: green;">✅ Pagamento Realizado!</h1>
        <p>Obrigado pelo seu pagamento com MB WAY.</p>
        <p><small>ID: ${sessionId || 'N/A'}</small></p>
        <a href="/" style="background: #5469d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">← Voltar ao Início</a>
      </body>
    </html>
  `);
});

app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: orange;">⚠️ Pagamento Cancelado</h1>
        <p>Pode tentar novamente a qualquer momento.</p>
        <a href="/" style="background: #5469d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">← Tentar Novamente</a>
      </body>
    </html>
  `);
});

// Webhook básico (SEM processamento por enquanto)
app.post('/webhook', (req, res) => {
  console.log('📨 Webhook recebido');
  res.json({ received: true });
});

// Health check
app.get('/health', (req, res) => {  res.json({
    status: 'OK',
    stripe: !!stripe,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
