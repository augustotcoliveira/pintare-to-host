const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cria (ou abre) o arquivo do banco de dados na raiz do projeto
const dbPath = path.resolve(__dirname, 'pintare.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criação das tabelas (se não existirem)
db.serialize(() => {
    // Tabela de Usuários (serve para PF, PJ e Admin)
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL, -- 'PF', 'PJ', 'ADMIN'
        email TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        nome_completo TEXT, -- Usado para PF e Nome do Responsável PJ
        cpf TEXT,           -- PF e Responsável PJ
        rg TEXT,
        razao_social TEXT,  -- Apenas PJ
        nome_fantasia TEXT, -- Apenas PJ
        cnpj TEXT,          -- Apenas PJ
        inscricao_estadual TEXT, -- Apenas PJ
        celular TEXT,
        telefone TEXT,
        data_nascimento TEXT,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        isAdmin BOOLEAN DEFAULT 0
    )`);

    // Tabela de Produtos
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao_curta TEXT,
        descricao_longa TEXT,
        categoria TEXT, -- ex: 'pistola', 'tanque', 'acessorio'
        tags TEXT,       -- ex: 'mais_vendido,lancamento'
        destaque BOOLEAN DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS produto_imagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        imagem_url TEXT NOT NULL,
        ordem INTEGER DEFAULT 0, -- Para sabermos qual é a imagem principal
        FOREIGN KEY(produto_id) REFERENCES produtos(id) ON DELETE CASCADE
    )`);

    // Tabela de Orçamentos (Pedidos)
    db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Enviado', 'Finalizado'
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )`);

    // Tabela de Itens do Orçamento
    db.run(`CREATE TABLE IF NOT EXISTS itens_orcamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orcamento_id INTEGER NOT NULL,
        produto_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        FOREIGN KEY(orcamento_id) REFERENCES orcamentos(id),
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    )`);
});

module.exports = db;