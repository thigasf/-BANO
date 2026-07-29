// db.js — Conexão com o Supabase (Ébano Brigadeiros)
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'aws-0-us-east-2.pooler.supabase.com',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'postgres',
  user:     process.env.DB_USER     || 'postgres.enomevvkqiuwrjvotrgx',
  password: process.env.DB_PASS     || '2YEzlw77r7hBnnsa',
  ssl:      false,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err);
});

module.exports = pool;
