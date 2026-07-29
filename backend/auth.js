// auth.js — Sistema de Autenticação JWT e Bcryptjs para Ébano
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'ebano_super_secret_key_98765';

// Middleware para verificar se o usuário está autenticado
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado: token ausente' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Acesso negado: token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
}

// Rota de Login (Autenticação)
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Buscar usuário no banco de dados
    const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email.trim().toLowerCase()]);
    if (!rows.length) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const user = rows[0];

    // Verificar senha com o hash do banco
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    // Gerar token JWT (expira em 2 horas)
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: { name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Função para garantir a existência de pelo menos um Administrador padrão
async function ensureDefaultAdmin() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM admin_users');
    const count = parseInt(rows[0].count);

    if (count === 0) {
      const defaultEmail = 'admin@ebanobrigadeiros.com.br';
      const defaultPassword = 'admin123';
      const passwordHash = bcrypt.hashSync(defaultPassword, 10);

      await pool.query(
        'INSERT INTO admin_users (name, email, password_hash) VALUES ($1, $2, $3)',
        ['Administrador Ébano', defaultEmail, passwordHash]
      );
      
      console.log('--------------------------------------------------');
      console.log('ADMINISTRADOR PADRÃO CRIADO NO BANCO DE DADOS:');
      console.log(`E-mail: ${defaultEmail}`);
      console.log(`Senha: ${defaultPassword}`);
      console.log('--------------------------------------------------');
    }
  } catch (err) {
    console.error('Erro ao verificar/criar usuário administrador padrão:', err.message);
  }
}

module.exports = {
  authenticateToken,
  login,
  ensureDefaultAdmin
};
