const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conecta ao banco existente
const dbPath = path.resolve(__dirname, 'pintare.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
        return;
    }
    console.log('Conectado ao banco de dados para migração.');
});

function migrarBanco() {
    console.log("Iniciando migração...");

    // Comando SQL para adicionar a coluna
    const sqlAddRG = "ALTER TABLE usuarios ADD COLUMN rg TEXT";

    db.run(sqlAddRG, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("ℹ️ A coluna 'rg' já existe. Nenhuma alteração necessária.");
            } else {
                console.error("❌ Erro ao adicionar coluna 'rg':", err.message);
            }
        } else {
            console.log("✅ Coluna 'rg' adicionada com sucesso à tabela 'usuarios'!");
        }

        // Encerra a conexão
        db.close();
    });
}

migrarBanco();