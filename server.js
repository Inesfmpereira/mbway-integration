const express = require('express');
const stripe = require('stripe')('pk_live_51Szg46LxPLC7ky4NcNXvDm2YWstp53JOzllNRdKjbOlKVyitB2oaeeylnFChkwJLWViKfolWtOmOoY3g6J5n94Eg00dw2KEWfx'); // Use a chave live

const app = express();

// Para webhooks - deve vir ANTES de express.json()
app.use('/webhook', express.raw({type: 'application/json'}));
app.use(express.json());
app.use(express.static('public'));

const endpointSecret = 'whsec_vIHW8We9KoB1dx6O2yXGH4yRdsvhTIpx'; // Cole o signing secret aqui

// Endpoint para webhooks
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Webhook verificado com sucesso');
  } catch (err) {
    console.log(`Erro na verificação do webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('💰 Pagamento completado!', session.id);
      console.log('Cliente:', session.customer_details.email);
      console.log('Valor:', session.amount_total / 100, session.currency.toUpperCase());
      
      / Aqui pode adicionar lógica para:
      // - Enviar email de confirmação
      // - Atualizar base de dados
      // - Enviar produto/ativar serviço
      handleSuccessfulPayment(session);
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('❌ Payment failed:', failedPayment.id);
      console.log('Motivo:', failedPayment.last_payment_error?.message);
      break;

    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.json({received: true});
});

// Função para lidar com pagamentos bem-sucedidos
function handleSuccessfulPayment(session) {
  // Adicione aqui a sua lógica de negócio:
  
  // Exemplo: Enviar email
  console.log(`Enviar email de confirmação para: ${session.customer_details.email}`);
  
  // Exemplo: Atualizar base de dados
  console.log(`Atualizar pedido: ${session.id} como pago`);
  
  // Exemplo: Ativar produto/serviço
  console.log('Ativar acesso ao produto/serviço');
}

// Seu endpoint existente para criar checkout
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Produto Exemplo',
          },
          unit_amount: 2000,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://www.pe-na-areia.pt/success.html', // Altere para seu domínio
      cancel_url: 'https://www.pe-na-areia.pt/cancel.html',   // Altere para seu domínio
    });

    res.json({url: session.url});
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({error: error.message});
  }
});

app.listen(4242, () => console.log('Servidor rodando em http://localhost:4242'));
