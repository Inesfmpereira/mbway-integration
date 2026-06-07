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
          }
          button:hover { background: #4356c7; }
          .status { color: green; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🇵🇹 MBAY Integration</h1>
          <p class="status">Status: ${stripe ? '✅ Stripe OK' : '⚠️ Stripe não configurado'}</p>
          <hr>
          <h3>Produto Teste</h3>
          <p><strong>Preço:</strong> €20.00</p>
          <button onclick="checkout()" ${!stripe ? 'disabled' : ''}>
            💳 Pagar com MB WAY
          /button>
        </div>
        
        <script>
          async function checkout() {
            try {
              const res = await fetch('/checkout', { method: 'POST' });
              const data = await res.json();
              
              if (data.url) {
                window.location = data.url;
              } else {
                alert('Erro: ' + data.error);
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

// Checkout endpoint
app.post('/checkout', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe não configurado' });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'Teste MB WAY' },
          unit_amount: 2000,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://mbway-integration.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://mbway-integration.vercel.app/cancel',
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Páginas de resultado
app.get('/success', (req, res) => {
  res.send(`
    <div style="text-align:center;padding:50px;font-family:Arial;">
      <h1 style="color:green;">✅ Sucesso!</h1>
      <p>Pagamento MB WAY realizado!</p>
      <a href="/">← Voltar</a>
    </div>
  `);
});

app.get('/cancel', (req, res) => {
  res.send(`
    <div style="text-align:center;padding:50px;font-family:Arial;">
      <h1 style="color:orange;">⚠️ Cancelado</h1>
      <p>Pagamento cancelado.</p>
      <a href="/">← Voltar</a>
    </div>
  `);
});

module.exports = app;
