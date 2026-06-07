const express = require('express');
const app = express();

app.use(express.static('public'));
app.use(express.json());

// Teste básico
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Teste</title></head>
      <body>
        <h1>✅ Servidor funcionando!</h1>
        <p>Teste: ${new Date()}</p>
      </body>
    </html>
  `);
});

module.exports = app;
