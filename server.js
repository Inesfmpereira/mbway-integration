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
          <p>Status: ${stripe ? '✅ MBWAY Ativo' : '⚠️ Configurando...'}</p>
          <button onclick="testar()">🇵🇹 Testar MB WAY</button>
        </div>
        
        <script>
          function testar()
            window.open('/checkout-direto?valor=25.00&produtos=Teste+MB+WAY&return=https://www.pe-na-areia.pt', '_blank');
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

    const { valor, produtos } = req.query;
    
    if (!valor) {
      return res.status(400).send('Valor é obrigatório');
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { 
            name: `Pé na Areia - ${produtos || 'Reserva'}`
          },
          unit_amount: Math.round(parseFloat(valor) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://www.pe-na-areia.pt/?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.pe-na-areia.pt/?pagamento=cancelado',
    });

    res.redirect(session.url);
    
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).send(`Erro: ${error.message}`);
  }
});

// Produtos específicos
app.get('/produto/passeio-barco', (req, res) => {
  res.redirect('/checkout-direto?valor=35.00&produtos=Passeio+de+Barco');
});

app.get('/produto/tour-grutas', (req, res) => {
  res.redirect('/checkout-direto?valor=45.00&produtos=Tour+Grutas');
});

// Página de checkout personalizada para Webnode
app.get('/checkout-personalizado', (req, res) => {
  const { valor, produtos, cliente, return: returnUrl } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Finalizar Pagamento - Pé na Areia</title>
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
                font-size: 2.5em;
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
                font-weight: 700;
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
                color: #2563eb;
            }
            .badges {
                margin-top: 20px;
                font-size: 0.9em;
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="checkout-container">
            <div class="logo">🏖️ Pé na Areia</div>
            <h2>Finalizar Reserva</h2>
            
            ${produtos ? `
                <div class="produtos">
                    <strong>📋 Serviço:</strong><br>
                    ${decodeURIComponent(produtos).replace(/\+/ ' ')}
                </div>
            ` : ''}
            
            <div class="valor">€${valor || '0.00'}</div>
            
            ${cliente ? `<p><strong>📧 Email:</strong> ${decodeURIComponent(cliente)}</p>` : ''}
            
            <button class="btn-mbway" onclick="processarPagamento()">
                📱 Pagarom MB WAY
            </button>
            
            <div class="loading" id="loading">
                <p>🔄 Processando pagamento seguro...</p>
            </div>
            
            <div class="badges">
                🔒 Pagamento 100% Seguro | 🇵🇹 MB WAY, Multibanco, Cartões
            </div>
            
            <a href="${returnUrl ||tps://www.pe-na-areia.pt'}" class="btn-voltar">← Voltar ao site</a>
        </div>
        
        <script>
            async function processarPagamento() {
                try {
                    document.getElementById('loading').style.display = 'block';
                    document.querySelector('.btn-mbway').style.display = 'none';
                    
                    const url = '/checkout-direto?valor=${valor}&produtos=${produtos}&cliente=${cliente}&return=${returnUrl}';
                    
                    window.location.href = url;
                    
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

module.exports = app;
