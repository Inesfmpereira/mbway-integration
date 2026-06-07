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
        <title>Pé na Areia - MB WAY</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; background: #f0f9ff; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; }
          button { background: #2563eb; color: white; padding: 15px 30px; border: none; border-radius: 50px; font-size: 16px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏖️ Pé na Areia</h1>
          <p>tatus: ${stripe ? '✅ MB WAY Ativo' : '⚠️ Configurando...'}</p>
          <button onclick="testar()">🇵🇹 Testar MB WAY</button>
        </div>
        
        <script>
          function testar() {
            window.open('/checkout-direto?valor=250&produtos=Teste+MB+WAY&return=https://www.pe-na-areia.pt', '_blank');
          }
        </script>
      </body>
    </html>
  `);
});

// Checkout direto simples
app.get('/checkout-direto', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send('Stripe não configurado');
    }

    const { valor, produtos, cliente, return: returnUrl } = req.query;
    
    if (!valor) {
      return res.status(400).send('Valor é obrigatório');
    }

    console.log(`Processando: ${produtos} - €${valor}`);

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { 
            name: produtos ? `Pé na Areia - ${decodeURIComponent(produtos).replace(/\+/g, ' ')}` : 'Pé na Areia - Reserva'
          },
          unit_amount: Math.round(parseFloat(valor) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: returnUrl ? `${decodeURIComponent(returnUrl)}?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}` : 'https://www.pe-na-areia.pt?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: returnUrl ? `${decodeURIComponent(returnUrl)}?pagamento=cancelado` : 'https://www.pe-na-areia.pt?pagamento=cancelado',
      ...(cliente && { customer_email: decodeURIComponent(cliente) }),
    });

    console.log(`✅ Sessão criada: ${session.id}`);
    res.redirect(session.url);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).send(`Erro: ${error.message}`);
  }
});

// Links diretos para produtos
app.get('/produto/passeio-barco', (req, res) => {
  res.redirect('/checkout-direto?valor=35.00&produtos=Passeio+de+Barco&return=https://www.pe-na-areia.pt');
});

app.get('/produto/tour-grutas', (req, res) => {
  res.redirect('/checkout-direto?valor=45.00&produtos=Tour+Grutas&return=https://www.pe-na-areia.pt');
});

app.get('/produto/experiencia-premium', (req, res) => {
  res.redirect('/checkout-direto?valor=65.00&produtos=Experiência+Premium&return=https://www.pe-na-areia.pt');
});

module.exports = app;
