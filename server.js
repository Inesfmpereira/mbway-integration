const express = require('express');
const app = express();

// Middleware para webhook (deve estar no início do arquivo, após express())
app.use('/webhook', express.raw({type: 'application/json'}));

// Webhook endpoint (substitua o atual)
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.WEBHOOK_SECRET;

  console.log('📨 Webhook recebido...');

  if (!endpointSecret) {
    console.log('⚠ WEBHOOK_SECRET não configurado');
    return res.status(200).json({received: true});
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook verificado:', event.type);
  } catch (err) {
    console.log(`❌ Webhook erro: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processar diferentes tipos de eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('🎉 PAGAMENTO COMPLETADO!');
      console.log(`💰 Valor: €${session.amount_total / 0}`);
      console.log(`📧 Cliente: ${session.customer_details?.email || 'N/A'}`);
      console.log(`🆔 Sessão: ${session.id}`);
      
      // Aquvocê pode adicionar:
      // - Enviar email de confirmação
      // - Salvar na base de dados  
      // - Ativar produto/serviço
      // - Notificar outros sistemas
      
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('✅ Pagamento bem-sucedido:', paymentIntent.id);
      console.log(`💳 Método: ${paymentIntent.payment_method_types.join(', ')}`);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.bject;
      console.log('❌ Pagamento falhado:', failedPayment.id);
      console.log(`🔍 Motivo: ${failedPayment.last_payment_error?.message || 'N/A'}`);      break;

    default:
      console.log(`📋 Evento recebido: ${event.type}`);
  }

  // Sempre responder 200 para confirmar recebimento
  res.json({received: true});
});

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
  // Deixar vazio para métodos automáticos baseados na localização
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
  success_url: 'https://SEU-URL.vercel.app/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://SEU-URL.vercel.app/cancel'
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
