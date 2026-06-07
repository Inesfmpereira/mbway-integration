const express = require('express');
const app = express();

app.use(express.json());

// Configurar Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe;

if (stripeKey) {
  try {
    stripe = require('stripe')(stripeKey);
    console.log('✅ Stripe configurado');
  } catch (error) {
    console.log('❌ Erro Stripe:', error.message);
  }
}

// Página principal
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>MB WAY Integration</title>
        <style>
          body { 
            font-family: Arial; 
            padding: 20px; 
            text-align: center; 
            background: #f5f7fa;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          button {
            background: #5469d4;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
          }
          button:hover { background: #4356c7; }
          button:disabled { background: #ccc; cursor: not-allowed; }
          .status { color: green; font-weight: bold; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🇵🇹 MB WAY Integration</h1>
          <p class="status">Status: ${stripe ? '✅ Stripe OK' : '<span class="error">⚠️ Stripe não configurado</span>'}</p>
          <hr>
          <h3>💰 Produto Teste3>
          <p><strong>Preço:</strong> €20.00</p>
          <p><small>Suporta: MB WAY, Multibanco, Cards</small></p>
          <button onclick="checkout()" ${!stripe ? 'disabled title="Stripe não configurado"' : ''}>
            🚀 Pagar com MB WAY
          </button>
          ${!stripe ? '<p class="error">Configure STRIPE_SECRET_KEY no Vercel</p>' : ''}
        </div>
        
        <script>
          async function checkout() {
            try {
              console.log('Iniciando checkout...');
              const res = await fetch('/checkout', {                 method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              
              const data = await res.json();
              
              if (data.url) {
                console.log('Redirecionando...');
                window.location.href = data.url;
              } else {
                alert('❌ Erro: ' + data.error);
              }
            } catch (err) {
              alert('❌ Erro de conexão: ' + err.message);
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
      return res.status(500).json({ error: 'Stripenão configurado' });
    }

    const session = await stripe.checkout.sessions.create({
      // Não especificar payment_method_types para usar automático (inclui MB WAY)
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { 
            name: 'Teste MB WAY Integration'
          },
          unit_amount: 2000, // €20.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://mbway-integration.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://mbway-integration.vercel.app/cancel',
      billing_address_collection: 'auto', // Para melhor detecção de localização
    });

    console.log('✅ Checkout criado:', session.id);
    res.json({ url: session.url });
    
  } catch (error) {
    console.error('❌ Erro no checkout:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Páginas de resultado
app.get('/success', (req, res) => {
  const sessionId = req.query.session_id;
  res.send(`
    <html>
      <head><title>Pagamento Realizado</title></head>
      <body style="text-align:center;padding:50px;font-family:Arial;background:#f0f8f0;">
        <div style="max-width:500px;margin:0 auto;background:white;padding:30px;border-radius:10px;">
          <h1 style="color:green;">✅ Pagamento Realizado!</h1>
          <p><strong>Integração MB WAY funcionou perfeitamente!</strong></p>
          <p>Obrigado pelo seu pagamento.</p>
          <p><small>Sessão: ${sessionId || 'N/A'}</small></p>
          <a href="/" style="background:#5469d4;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">🏠 Voltar</a>
        </div>
      </body>
    </html>
  `);
});

app.get('/cancel', (req, res)=> {
  res.send(`
    <html>
      <head><title>Pagamento Cancelado</title></head>
      <body style="text-align:center;padding:50px;font-family:Arial;background:#fdf0f0;">
        <div style="max-width:500px;margin:0 auto;background:white;padding:30px;border-radius:10px;">
          <h1 style="color:orange;">⚠️ Pagamento Cancelado</h1>
          <p>Não foi efetuada qualquer cobrança.</p>
          <p>Pode tentar novamente!</p>
          <a href="/" style="background:#5469d4;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">🔄 Tentar Novamente</a>
        </div>
      </body>
    </html>
  `);
});

// Testeendpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API funcionando',
    stripe_configured: !!stripe,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
