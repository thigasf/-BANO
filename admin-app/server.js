// server.js — Servidor estático para o painel de administração Ébano
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Servir os arquivos estáticos desta própria pasta
app.use(express.static(__dirname));

// Rota fallback para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Painel de Administração Ébano rodando em http://localhost:${PORT}`);
});
