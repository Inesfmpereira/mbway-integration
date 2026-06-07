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

// API endpoint para sites externos (Webnode)
app.post('/checkout-api', async (req, res) => {
  try {
    // Permitir requests do seu domínio
    res.header('Access-Control-Allow-Origin', 'https://www.pe-na-areia.pt');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Stripe não configurado' });
    }

    const { produto, preco, success_url, cancel_url, cliente_email } = req.body;
    
    if (!produto || !preco) {
      return res.status(400).json({ error: 'Produto e preço são obrigatórios' });
    }

    console.log(`🏖️ API - Processndo: ${produto} - €${preco}`);

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { 
            name: `Pé na Areia - ${produto}`,
            description: 'Experiência no Algarve'
          },
          unit_amount: Math.round(preco * 100), // Converter para cêntimos
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: success_url || 'https://www.pe-na-areia.pt/obrigado?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancel_url || 'https://www.pe-na-areia.pt/',
      customer_email: cliente_email,
      billing_address_collection: 'auto',
    });

    console.log(`✅ API - Checkout criado: ${session.id}`);
    res.json({ 
      success: true, 
      url: session.url,
      session_id: session.id 
    });
    
  } catch (error) {
    console.error('❌ API - Erro:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para verificar status de pagamento
app.get('/payment-status/:session_id', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', 'https://www.pe-na-areia.pt');
    
    const session = await stripe.checkout.sessions.retrieve(req.params.session_id);
    
    res.json({
      status: session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total: session.amount_total / 100
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;

// Checkout personalizado para integração no checkout existente
app.get('/checkout-personalizado', async (req, res) => {
  const { valor, produtos, cliente, return_url } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Finalizar Pagamento - MB WAY</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #2563eb, #0ea5e9); 
                min-height: 100vh; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                margin: 0;
                padding: 20px;
            }
            .checkout-container {
                background: white;
                max-width: 500px;
                width: 100%;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                text-align: center;
            }
            .logo {
                font-size: 2.5em;
                margin-bottom: 10px;
            }
            .valor {
                font-size: 2em;
                color: #2563eb;
                font-weight: bold;
                margin: 20px 0;
            }
            .produtos {
                background: #f8fafc;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: left;
            }
            .btn-mbway {
                background: linear-gradient(135deg, #2563eb, #0ea5e9);
                color: white;
                border: none;
                padding: 18px 35px;
                border-radius: 50px;
                font-size: 1.2em;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                margin: 20px 0;
                box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
                transition: all 0.3s ease;
            }
            .btn-mbway:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 30px rgba(37, 99, 235, 0.4);
            }
            .btn-voltar {
                background: transparent;
                color: #64748b;
                border: 2px solid #e2e8f0;
                padding: 12px 25px;
                border-radius: 25px;
                text-decoration: none;
                display: inline-block;
                margin-top: 15px;
            }
            .loading {
                display: none;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="checkout-container">
            <div class="logo">🏖️ Pé na Areia</div>
            h2>Finalizar Pagamento</h2>
            
            ${produtos ? `
                <div class="produtos">
                    <strong>Produtos:</strong><br>
                    ${decodeURIComponent(produtos).replace(/\+/g, ' ')}
                </div>
            ` : ''}
            
            <div class="valor">€${valor || '0.00'}</div>
            
            <button class="btn-mbway" onclick="processarPagamento()">
                📱 Pagar com MB WAY
            </button>
            
            <div class="loading" id="loading">
                <p>🔄 Processando pagamento...</p>
            </div>
            
            <a href="${return_url| 'https://www.pe-na-areia.pt'}" class="btn-voltar">← Voltar ao site</a>
        </div>
        
        <script>
            async function processarPagamento() {
                try {
                    document.getElementById('loading').style.display = 'block';
                    document.querySelector('.btn-mbway').style.display = 'none';
                    
                    const response = await fetch('/checkout-direto?valor=${valor}&produtos=${produtos}&cliente=${cliente}&return=${return_url}');
                    
                    if (response.redirected) {
                        window.location.href = response.url;
                    }
                } catch (error) {
                    alert('Erro: ' + error.message);
                    document.getElementById('loading').style.display = 'none';
                    document.querySelector('.btn-mbway').style.display = 'block';
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Atualizar o checkout-direto para aceitar múltiplos parâmetros
app.get('/checkout-direto', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send('Stripe não configurado');
    }

    const { valor, produtos, cliente, return: returnUrl, produto, preco } = req.query;
    
    // Suporte para ambos os formatos (novo e antigo)
    const finalValor = valor || preco;
    const finalProdutos = produtos || produto;
    
    if (!finalValor) {
      return res.status(400).send('Valor é obrigatório');
    }

    console.log(`🏖️ Checkout: ${finalProdutos} - €${finalValor}`);

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          productdata: { 
            name: finalProdutos ? `Pé na Areia - ${decodeURIComponent(finalProdutos)}` : 'Pé na Areia - Compra',
            description: 'Experiência no Algarve'
          },
          unit_amount: Math.round(parseFloat(finalValor) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: returnUrl ? decodeURIComponent(returnUrl) + '?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}' : 'https://www.pe-na-areia.pt/?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: returnUrl ? decodeURIComponent(returnUrl) + '?pagamento=cancelado' : 'https://www.pe-na-areia.pt/?pagamento=cancelado',
      ...(cliente && { customer_email: decodeURIComponent(cliente) }),
      billing_address_collection: 'auto',
    });

    res.redirect(session.url);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).send(`Erro: ${error.message}`);
  }
});
