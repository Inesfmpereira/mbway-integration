const express = require('express');
const app = express();

// Middleware básico
app.use(express.static('public'));
app.use(express.json());

// Configurar Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe;

if (stripeKey) {
  try {
    stripe = require('stripe')(stripeKey);
    console.log('✅ Stripe OK');
  } catch (error) {
    console.error('❌ Stripe erro:', error.message);
  }
} else {
  console.error('❌ STRIPE_SECRET_KEY não encontrada');
}

// Página inicial
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>MB WAY Test</title>
        <style>
          body { font-family: Arial; padding: 20px; text-align: center; background: #f5f5f5; }
          .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          button { background: #5469d4; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; }
          button:hover { background: #4356c7; }
          .price { font-size: 24px; font-weight: bold; color: #333; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🇵🇹 Pagamento MB WAY</h1>
          <div class="price">€20.00</div>
          <p>Produto de teste</p>
          utton onclick="pay()">Pagar Agora</button>
        </div>
        
        <script>
          async function pay() {
            try {
              document.querySelector('button').textContent = 'Processando...';
              
              const res = await fetch('/checkout', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              
              const data = await res.json();
              
              if (data.url) {
                window.location.href = data.url;
              } else {
                alert('Erro: ' + (data.error || 'Erro desconhecido'));
                document.querySelector('button').textContent = 'Pagar Agora';
              }
            } catch (err) {
              alert('Erro de rede: ' + err.message);
              document.querySelector('button').textContent = 'Pagar Agora';
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Checkout endpoint
app.post('/checkout', async (req, res) => {
  try {
    console.log('🛒 Iniciando checkout...');
    
    if (!stripe) {
      throw new Error('Stripe não inicializao - verifique STRIPE_SECRET_KEY');
    }

    const baseUrl = req.headers.origin || `https://${req.headers.host}`;
    console.log('🔗 Base URL:', baseUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'multibanco'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { 
            name: Produto Teste MB WAY',
            description: 'Teste de integração'
          },
          unit_amount: 2000, // €20.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
    });

    console.log('✅ Checkout sessão criada:', session.id);
    res.json({ url: session.url });
    
  } catch (error) {
    console.error('❌ Erro no checkout:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      type: error.type 
    });
  }
});

// Páginas de resultado
app.get('/success', (req, res) => {
  const sessionId = req.query.session_id;
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px; background: #f0f8f0;">
        <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px;">
          <h1 style="color: #28a745;">✅ Pagamento Realizado!</h1>
          <p>Obrigado pela sua compra com MB WAY.</p>
          <p style="font-size: 12px; color: #666;">ID: ${sessionId}</p>
          <a href="/" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">← Voltar ao início</a>
        </div>
      </body>
    </html>
  `);
});

app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px; background: #fdf2f2;">
        <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px;">
          <h1 style="color: #dc3545;">❌ Pagamento Cancelado</h1>
          <p>Não foi efetuado qualquer pagamento.</p>
          <a href="/" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">← Tentar novamente</a>
        </div>
      </body>
    </html>
  `);
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
