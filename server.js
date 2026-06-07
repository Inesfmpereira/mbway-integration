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
        <title>MB WAY - Integração Completa</title>
        <style>
          body { font-family: Arial; padding: 20px; text-align: center; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          button { background: #5469d4; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 10px; }
          button:hover { background: #4356c7; }
          .success { color: #00d924; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🇵 <span class="success">MB WAY Integration ✅</span></h1>
          <p><strong>Status:</strong> <span class="success">Funcionando Perfeitamente!</span></p>
          <hr>
          <h3>💳 Teste de Pagamento</h3>
          p><strong>Produto:</strong> Integração MB WAY - €20.00</p>
          <button onclick="createCheckout()">🚀 Pagar com MB WAY</button>
          <br>
          <small>Suporta: MB WAY, Multibanco, Cards</small>
        /div>
        
        <script>
          async function createCheckout() {
            try {
              console.log('Iniciando checkout...');
              
              const response = await fetch('/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              
              const data = await response.json();
              
              if (data.url) {
                console.log('Redirecionando para checkout...');
                window.location.href = data.url;
              } else {
                alert('❌ Erro: ' + (data.error || 'Erro desconhecido'));
              }
            } catch (error) {
              alert('❌ Erro de conexão: ' + error.message);
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Criar checkout session - FUNCIONANDO PERFEITAMENTE
app.post('/create-checkout', async (req, res) => {
  try {
    console.log('🛒 Iniciando checkout MB WAY...');
    
    if (!stripe) {
      thrownew Error('Stripe não configurado');
    }

    const session = await stripe.checkout.sessions.create({
      // Métodos automáticos - inclui MB WAY se disponível
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: '🇵🇹 Integração MB WAY Completa'
          },
          it_amount: 2000 // €20.00
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: 'https://mbway-integration.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://mbway-integration.vercel.app/cancel'
    });

    console.log('✅ Checkout MB WAY criado:', session.id);
    res.json({ url: session.url });

  } catch (error) {
    console.error('❌ Erro no checkout:', error.message);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// Página de sucesso
app.get('/success', (req, res) => {
  const sessionId = req.query.session_id;
  res.send(`
    <html>
      <head>
        <title>Pagamento Realizado!</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; background: #f0f8f0; }
          .success-container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .success { color: #00d924; font-size: 48px; }
          a { background: #5469d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success">✅</div>
          <h1 style="color: #00d924;">Pagamento Realizado com Sucesso!</h1>
          <p><strong>Integração MB WAY funcionou perfeitamente!</strong></p>
          <p>Obrigado pelo seu pagamento.</p>
          <p><small>ID da Sessão: ${sessionId || 'N/A'}</small></p>
          <a href="/">🏠 Voltar ao Início</a>
        </div>
      </body>
    </html>
  `);
});

// Página de cancelamento
app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Pagamento Cancelado</title>
        <style>
          body { font-family: Arial; text-align: center; padding:50px; background: #fdf0f0; }
          .cancel-container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          a { background: #5469d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="cancel-container">
          <h1 style="color: #ff6b6b;">⚠️ Pagamento Cancelado</h1>
          <p>Não foi efetuado qualquer cobrança.</p>
          <p>Pode tentar novamente a qualquer momento!</p>
          <a href="/">🔄 Tentar Novamente</a>
        </div>
      </body>
    </html>
  `);
});

module.exports = app;
