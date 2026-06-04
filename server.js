const express = require('express');
const app = express();

// Middleware básico
app.use(express.static('public'));
app.use(express.json());

// Teste básico - sem Stripe
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Servidor funcionando!</h1>
        <p>Teste: ${new Date()}</p>
        <button onclick="test()">Testar Checkout</button>
        <script>
          function test() {
            fetch('/test')
              .then(r => r.text())
              .then(data => alert(data))
              .catch(err => alert('Erro: ' + err));
          }
        </script>
      </body>
    </html>
  `);
});

app.get('/test', (req, res) => {
  res.send('OK - Endpoint funcionando');
});

// Porta para Vercel
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Exportar para Vercel (importante!)
module.exports = app;
