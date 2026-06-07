const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use('/webhook', express.raw({type: 'application/json'}));
app.use(express.json());
app.use(express.static('public'));

const endpointSecret = process.env.WEBHOOK_SECRET;

// Endpoint para receber webhooks
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook verificado com sucesso');
  } catch (err) {
    console.log(`❌ Erro na verificação do webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('🎉 PAGAMENTO COMPLETADO!');
      console.log(`ID da sessão: ${session.id}`;
      console.log(`Cliente: ${session.customer_details.email}`);
      console.log(`Valor: €${session.amount_total / 100}`);
      console.log(`Método de pagamento: ${session.payment_method_types.join(', ')}`);
      
      // Aqui você pode adicionar sua lógica de negócio
      processarPagamentoCompleto(session);
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('💰 Payment Intent succeeded:', paymentIntent.id);
      console.log(`Valor: €${paymentIntent.amount / 100}`);
      break;

    case 'payment_intentpayment_failed':
      const failedPayment = event.data.object;
      console.log('⚠️  Payment failed:', failedPayment.id);
      console.log('Motivo:', failedPayment.last_payment_error?.message);
      
      // Notificar sobre falha de pagamento
      processarPagamentoFalhado(failedPayment);
      break;

    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  // Sempre responder com 200 para confirmar recebimento
  res.json({received: true});
});

// Função para processar pagamentos completos
function processarPagamentoCompleto(session) {
  console.log('🔄 Processando pagamento completo...');
  
  // Aqui adicone sua lógica:
  
  // 1. Enviar email de confirmação
  console.log(`📧 Enviando email para: ${session.customer_details.email}`);
  
  // 2. Atualizar base de dados
  console.log(`💾 Atualizando BD Pedido: ${session.id} = PAGO`);
  
  // 3. Ativar produto/serviço
  console.log('🚀 Ativando acesso ao produto/serviço');
  
  // 4. Log para histórico
  console.log(` Pagamento registrado: ${new Date().toISOString()}`);
}

// Função para processar pagamentos falhados
function processarPagamentoFalhado(paymentIntent) {
  console.log('🔄 Processando pagamento falhado...');
  
  // . Log do erro
  console.log(`❌ Falha: ${paymentIntent.last_payment_error?.message}`);
  
  // 2. Notificar administrador (email, slack, etc)
  console.log('📧 Notificando administrador sobre falha');
  
  // 3. Atualizar estado do pedido
  console.log(' Marcando pedido como falhou no pagamento');
}

// Endpoint para criar checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    console.log('🛒 Criando nova sessão de checkout...');
    
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Produto Exemplo',
            description: 'Descrição do produto',
          },
          unit_amount: 2000 // €20.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://pe-na-areia.pt/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://pe-na-areia.pt/cancel.html',
      automatic_tax: {enabled: false}, // Configure conforme necessário
      billing_address_collection: 'auto',
      customer_creation: 'always', // Criar sempre um customer
    });

    console.log(`✅ Sessão criada: ${session.id}`);
    res.json({url: session.url});
    
  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error.message);
    res.status(500).json({error: error.message});
  }
});

// Endpoint para verificar status da sessão
app.get('/session-status', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    
    res.send({
      status: session.status,
      customer_email: session.customer_details?.email,
      payment_status: session.payment_status
    });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Endpoint de saúde para verificar se servidor está funcionando
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    stripe_connected: true
  });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Webhook endpoint: /webhook`);
  console.log(`💳 Checkout endpoint: /create-checkout-session`);
});
