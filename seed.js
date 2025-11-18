// seed.js
const db = require('./db');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
    console.log("🌱 Plantando usuário ADMIN...");
    const senhaAdmin = await bcrypt.hash('admin123', 10);
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO usuarios (tipo, email, senha_hash, nome_completo, isAdmin) 
                VALUES (?, ?, ?, ?, ?)`, ['ADMIN', 'admin@pintare.com', senhaAdmin, 'Administrador do Sistema', 1],
            (err) => {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        console.log('ℹ️ Usuário Admin já existe.');
                        resolve();
                    } else {
                        console.error('Erro ao criar admin:', err.message);
                        reject(err);
                    }
                } else {
                    console.log('✅ Usuário ADMIN criado com sucesso (email: admin@pintare.com / senha: admin123)');
                    resolve();
                }
            }
        );
    });
}

function seedProdutos() {
    console.log("🌱 Plantando produtos de exemplo...");

    const produtos = [
        // Mais Vendidos
        {
            nome: 'Airless Spray Gun',
            descricao_curta: 'Pistola de alta pressão.',
            categoria: 'Pistola Airless',
            tags: 'mais_vendido,airless,pistola',
            destaque: 1,
            imagem: 'src/img/SLG-140-P.png'
        },
        {
            nome: 'Pressure Pot 10L',
            descricao_curta: 'Tanque de pressão de 10 litros.',
            categoria: 'Tanque de Pressão',
            tags: 'mais_vendido,tanque',
            destaque: 1,
            imagem: 'src/img/JGa-504.png' // A imagem que você cadastrou
        },
        {
            nome: 'Electrostatic Paint Gun',
            descricao_curta: 'Pistola eletrostática.',
            categoria: 'Pistola Eletrostática',
            tags: 'mais_vendido,eletrostatica,pistola',
            destaque: 1,
            imagem: 'src/img/ADV-P522.png'
        },
        // Alta Produtividade
        {
            nome: 'Pistola Alta Produtividade HP-3',
            descricao_curta: 'Ideal para grandes volumes.',
            categoria: 'Pistola de Pressão',
            tags: 'alta_produtividade,pistola',
            imagem: 'src/img/HP-3.png'
        },
        // HVLP
        {
            nome: 'Pistola HVLP 200',
            descricao_curta: 'Economia de tinta e menor névoa.',
            categoria: 'Pistola de Gravidade',
            tags: 'hvlp,lancamento,pistola',
            imagem: 'src/img/HVLP-200.png'
        }
    ];

    const sqlProduto = `INSERT INTO produtos (nome, descricao_curta, categoria, tags, destaque) VALUES (?, ?, ?, ?, ?)`;
    const sqlImagem = `INSERT INTO produto_imagens (produto_id, imagem_url, ordem) VALUES (?, ?, 0)`;

    // db.serialize garante que as coisas rodem em ordem
    db.serialize(() => {
        produtos.forEach(prod => {
            // 1. Insere o Produto
            db.run(sqlProduto, [prod.nome, prod.descricao_curta, prod.categoria, prod.tags, prod.destaque || 0], function(err) {
                if (err) {
                    if (!err.message.includes('UNIQUE constraint failed')) { // Ignora se o produto já existir
                        console.error(`Erro ao inserir ${prod.nome}:`, err.message);
                    }
                    return;
                }

                const produtoId = this.lastID; // Pega o ID

                // 2. Insere a Imagem principal
                db.run(sqlImagem, [produtoId, prod.imagem], (imgErr) => {
                    if (imgErr) {
                        console.error(`Erro ao inserir imagem para ${prod.nome}:`, imgErr.message);
                    }
                });
            });
        });
        console.log('✅ Produtos de exemplo sendo inseridos.');
    });
}

// Roda as funções em ordem
async function runSeed() {
    await seedAdmin(); // Espera o admin ser criado
    seedProdutos(); // Roda o plantio de produtos

    setTimeout(() => {
        console.log('🌳 Plantio concluído! (Pode fechar com Ctrl+C)');
    }, 1500); // Dá um tempo para o SQLite terminar
}

runSeed();