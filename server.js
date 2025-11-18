require('dotenv').config();
const { enviarEmailOrcamento } = require('./emailService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const db = require('./db'); // Importa nossa conexão com o banco

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares (pré-configurações)
app.use(cors()); // Libera acesso externo (do front-end)
app.use(express.json()); // Permite que o servidor entenda JSON enviado no corpo das requisições

// Rota de teste inicial
app.get('/', (req, res) => {
    res.json({ message: 'Backend Pintare está operacional!' });
});

// --- ROTAS DE PRODUTOS (Públicas) ---

// 1. Pegar TODOS os produtos (para o catálogo completo)
app.get('/api/produtos', async(req, res) => {
    try {
        // --- Paginação ---
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 9;
        const offset = (pagina - 1) * limite;

        // --- Filtros ---
        // Esperamos filtros como: ?categorias=Filtro%20A,Filtro%20B&tags=Marca%20A
        const categorias = req.query.categorias ? req.query.categorias.split(',') : [];
        const tags = req.query.tags ? req.query.tags.split(',') : [];
        const searchTerm = req.query.search;

        let whereClauses = []; // Array para guardar as cláusulas (ex: "p.categoria IN (?)")
        let params = []; // Array para guardar os valores (ex: ["Pistola de Gravidade"])

        // Adiciona filtro de Categoria (ex: "Pistola de Gravidade", "Filtro de Linha")
        if (categorias.length > 0) {
            // Cria placeholders (?) para cada categoria
            const catPlaceholders = categorias.map(() => '?').join(',');
            whereClauses.push(`p.categoria IN (${catPlaceholders})`);
            params.push(...categorias);
        }

        // Adiciona filtro de Tags (ex: "Marca A", "hvlp")
        if (tags.length > 0) {
            // Cria "p.tags LIKE ?" para cada tag
            const tagClauses = tags.map(() => 'p.tags LIKE ?');
            // Junta com AND (ex: "... LIKE ? AND ... LIKE ?")
            whereClauses.push(`( ${tagClauses.join(' AND ')} )`);
            // Adiciona os valores com % (ex: ["%Marca A%", "%hvlp%"])
            params.push(...tags.map(tag => `%${tag}%`));
        }

        if (searchTerm) {
            // Procura no nome OU na descrição curta
            whereClauses.push(`(p.nome LIKE ? OR p.descricao_curta LIKE ?)`);
            params.push(`%${searchTerm}%`);
            params.push(`%${searchTerm}%`);
        }

        // Constrói a string WHERE final
        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 1. NÚMERO TOTAL (com os mesmos filtros)
        const totalSql = `SELECT COUNT(*) as total FROM produtos p ${whereClause}`;
        // Passamos os parâmetros do filtro (ex: ["Pistola de Gravidade"])
        const totalRow = await dbGetAsync(totalSql, params);
        const totalProdutos = totalRow.total;
        const totalPaginas = Math.ceil(totalProdutos / limite);

        // 2. BUSCA DOS PRODUTOS (com os mesmos filtros + paginação)
        const sql = `
            SELECT p.*, pi.imagem_url AS imagem_url
            FROM produtos p
            LEFT JOIN produto_imagens pi ON p.id = pi.produto_id AND pi.ordem = 0
            ${whereClause}
            ORDER BY p.id DESC
            LIMIT ?
            OFFSET ?
        `;

        // Adiciona os parâmetros de paginação (limite, offset) NO FINAL
        const queryParams = [...params, limite, offset];
        const rows = await dbAllAsync(sql, queryParams);

        // 3. Retorna tudo
        res.json({
            produtos: rows,
            paginaAtual: pagina,
            totalPaginas: totalPaginas,
            totalProdutos: totalProdutos
        });

    } catch (err) {
        console.error("Erro na busca de produtos:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// (NOVA ROTA) - Pegar todas as opções de filtros
app.get('/api/filtros', async(req, res) => {
    try {
        // 1. Pega todas as CATEGORIAS únicas
        const sqlCategorias = `
            SELECT DISTINCT categoria 
            FROM produtos 
            WHERE categoria IS NOT NULL AND categoria != '' 
            ORDER BY categoria ASC
        `;
        const categoriasRows = await dbAllAsync(sqlCategorias, []);
        const categorias = categoriasRows.map(row => row.categoria);

        // 2. Pega todas as TAGS (este é mais complexo)
        const sqlTags = `SELECT tags FROM produtos WHERE tags IS NOT NULL AND tags != ''`;
        const tagsRows = await dbAllAsync(sqlTags, []);

        const tagSet = new Set(); // Usamos um Set para garantir que sejam únicas

        tagsRows.forEach(row => {
            const tags = row.tags.split(','); // "tag1,tag2,tag3"
            tags.forEach(tag => {
                const tagLimpa = tag.trim(); // Limpa espaços
                if (tagLimpa) {
                    tagSet.add(tagLimpa);
                }
            });
        });

        const tags = Array.from(tagSet).sort(); // Converte de volta para um array ordenado

        // 3. Retorna o JSON
        res.json({
            categorias: categorias,
            tags: tags
        });

    } catch (err) {
        console.error("Erro ao buscar filtros:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Pegar produtos para a HOME (filtrados por tags)
// Exemplo de uso: /api/produtos/home?tag=mais_vendido
app.get('/api/produtos/home', (req, res) => {
    const tag = req.query.tag;
    if (!tag) {
        return res.status(400).json({ error: 'É necessário informar uma tag (ex: ?tag=mais_vendido)' });
    }

    const sql = `
        SELECT p.*, pi.imagem_url AS imagem_url
        FROM produtos p
        LEFT JOIN produto_imagens pi ON p.id = pi.produto_id AND pi.ordem = 0
        WHERE p.tags LIKE ?
    `;
    const params = [`%${tag}%`];

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ produtos: rows });
    });
});

// 3. Pegar UM produto específico (para a página de detalhes)
app.get('/api/produtos/:id', (req, res) => {
    const sqlProduto = 'SELECT * FROM produtos WHERE id = ?';
    const sqlImagens = 'SELECT * FROM produto_imagens WHERE produto_id = ? ORDER BY ordem ASC';
    const params = [req.params.id];

    // Precisamos de duas buscas
    db.get(sqlProduto, params, (err, produto) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!produto) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        // Agora busca as imagens
        db.all(sqlImagens, params, (imgErr, imagens) => {
            if (imgErr) {
                // Se falhar a busca de imagens, ainda retorna o produto
                console.error("Erro ao buscar imagens:", imgErr);
                produto.imagens = []; // Envia array vazio
                res.json({ produto: produto });
                return;
            }

            // Combina os resultados
            produto.imagens = imagens; // Adiciona o array de imagens ao objeto do produto
            res.json({ produto: produto });
        });
    });
});

// 1. REGISTRO DE NOVO USUÁRIO (PF ou PJ)
app.post('/api/auth/registrar', async(req, res) => {
    // Extrai os campos do corpo da requisição
    const { tipo, email, senha, ...dados } = req.body;

    // Validação básica
    if (!email || !senha || !tipo) {
        return res.status(400).json({ message: 'Email, senha e tipo são obrigatórios.' });
    }

    try {
        // Criptografa a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Prepara os parâmetros, garantindo que undefined vire null
        // Isso evita erros de SQL se um campo opcional não for enviado
        const paramsBase = {
            nome_completo: dados.nome_completo || null,
            cpf: dados.cpf || null,
            rg: dados.rg || null, // <-- RG AQUI
            razao_social: dados.razao_social || null,
            nome_fantasia: dados.nome_fantasia || null,
            cnpj: dados.cnpj || null,
            inscricao_estadual: dados.inscricao_estadual || null,
            celular: dados.celular || null,
            telefone: dados.telefone || null,
            data_nascimento: dados.nascimento || null
        };

        let sql = '';
        let params = [];

        if (tipo === 'PF') {
            sql = `INSERT INTO usuarios (tipo, email, senha_hash, nome_completo, cpf, rg, celular, telefone, data_nascimento) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [
                tipo, email, senhaHash,
                paramsBase.nome_completo, paramsBase.cpf, paramsBase.rg,
                paramsBase.celular, paramsBase.telefone, paramsBase.data_nascimento
            ];
        } else if (tipo === 'PJ') {
            sql = `INSERT INTO usuarios (tipo, email, senha_hash, nome_completo, cpf, razao_social, nome_fantasia, cnpj, inscricao_estadual, celular, telefone, data_nascimento) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [
                tipo, email, senhaHash,
                paramsBase.nome_completo, paramsBase.cpf, // Responsável
                paramsBase.razao_social, paramsBase.nome_fantasia, paramsBase.cnpj, paramsBase.inscricao_estadual,
                paramsBase.celular, paramsBase.telefone, paramsBase.data_nascimento
            ];
        } else {
            return res.status(400).json({ message: 'Tipo de usuário inválido.' });
        }

        db.run(sql, params, function(err) {
            if (err) {
                console.error("Erro SQL Registro:", err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ message: 'Este email já está cadastrado.' });
                }
                return res.status(500).json({ message: 'Erro ao registrar usuário.', error: err.message });
            }
            res.status(201).json({ message: 'Usuário registrado com sucesso!', id: this.lastID });
        });

    } catch (error) {
        console.error("Erro Server Registro:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// 2. LOGIN (PF, PJ ou Admin)
app.post('/api/auth/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const sql = 'SELECT * FROM usuarios WHERE email = ?';

    db.get(sql, [email], async(err, usuario) => {
        if (err) {
            return res.status(500).json({ message: 'Erro no servidor.', error: err.message });
        }

        // Usuário não encontrado
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Compara a senha enviada com a senha criptografada no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Se a senha estiver correta, GERAR O TOKEN (o "crachá")
        const payload = {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome_completo || usuario.nome_fantasia,
            isAdmin: !!usuario.isAdmin // Converte 0/1 para false/true
        };

        // Assina o token com nosso segredo e define a expiração (24h)
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, { expiresIn: '24h' } // Exatamente como você pediu!
        );

        // Envia o token e os dados básicos do usuário para o front-end
        res.json({
            message: 'Login bem-sucedido!',
            token: token,
            user: payload
        });
    });
});

// 3. OBTER DADOS (GET /api/auth/me)
app.get('/api/auth/me', verificarToken, (req, res) => {
    const userId = req.user.id;
    // Selecionamos campos específicos para não enviar a senhaHash
    const sql = 'SELECT id, tipo, email, nome_completo, cpf, rg, razao_social, nome_fantasia, cnpj, inscricao_estadual, celular, telefone, data_nascimento, isAdmin FROM usuarios WHERE id = ?';

    db.get(sql, [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Erro ao buscar perfil.', error: err.message });
        }
        if (!row) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json({ user: row });
    });
});

// 4. ATUALIZAR DADOS (PUT /api/auth/me)
app.put('/api/auth/me', verificarToken, (req, res) => {
    const userId = req.user.id;
    const dados = req.body;

    // ATENÇÃO: Esta query NÂO inclui 'senha_hash' nem 'email'.
    // Isso garante que a senha e o login nunca quebram aqui.
    const sql = `UPDATE usuarios SET 
                 nome_completo = ?, 
                 celular = ?, 
                 telefone = ?,
                 nome_fantasia = ? 
                 WHERE id = ?`;

    // Para PJ, o 'nome_completo' é usado para o Nome do Responsável no nosso design.
    // Para PF, é o nome da pessoa.
    const params = [
        dados.nome_completo,
        dados.celular,
        dados.telefone,
        dados.nome_fantasia, // Será salvo se for PJ, ignorado visualmente se for PF
        userId
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error("Erro Update Perfil:", err.message);
            return res.status(500).json({ message: 'Erro ao atualizar perfil.', error: err.message });
        }
        res.json({ message: 'Perfil atualizado com sucesso!' });
    });
});

// Esta função vai "parar" requisições que precisam de login
// e verificar se o token (crachá) é válido.
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // O token vem no formato "Bearer [token]"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    // Verifica se o token é válido e se não expirou
    jwt.verify(token, process.env.JWT_SECRET, (err, dadosDoToken) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
            }
            return res.status(403).json({ message: 'Token inválido.' });
        }

        // Se o token for válido, salvamos os dados dele na requisição
        // para as próximas rotas saberem quem é o usuário.
        req.user = dadosDoToken;
        next(); // Permite que a requisição continue
    });
}

// --- O "SEGURANÇA" (Middleware de Verificação de ADMIN) ---
// Este SÓ DEVE ser usado DEPOIS do verificarToken
function verificarAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado. Rota exclusiva para administradores.' });
    }
    // Se req.user.isAdmin for true, continue
    next();
}

// --- ROTAS PROTEGIDAS (Exemplos) ---
// Rotas que SÓ funcionam se o usuário estiver logado (enviar o token)

// Rota de teste para verificar se o token funciona
app.get('/api/perfil', verificarToken, (req, res) => {
    // Graças ao middleware, 'req.user' agora contém os dados do token
    res.json({
        message: 'Você está vendo uma rota protegida!',
        usuarioLogado: req.user
    });
});

// Rota para checar se o usuário é ADMIN
app.get('/api/admin/check', verificarToken, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado. Somente administradores.' });
    }
    res.json({ message: 'Olá, Admin!', admin: req.user });
});

// --- ROTAS DE ADMIN (CRUD de Produtos) ---
// Todas as rotas aqui são protegidas e exigem login de admin

// 1. CRIAR um novo produto
app.post('/api/admin/produtos', [verificarToken, verificarAdmin], (req, res) => {
    // Agora esperamos um array 'imagens' no body
    const { nome, descricao_curta, descricao_longa, categoria, tags, destaque, imagens } = req.body;

    const sqlProduto = `INSERT INTO produtos (nome, descricao_curta, descricao_longa, categoria, tags, destaque) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
    const sqlImagem = `INSERT INTO produto_imagens (produto_id, imagem_url, ordem) VALUES (?, ?, ?)`;

    // db.serialize garante que os comandos rodem em ordem
    db.serialize(() => {
        // Inicia a transação
        db.run('BEGIN TRANSACTION');

        // 1. Insere o produto
        db.run(sqlProduto, [nome, descricao_curta, descricao_longa, categoria, tags, !!destaque], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Erro ao criar produto', error: err.message });
            }

            const produtoId = this.lastID; // Pega o ID do produto que acabamos de criar

            // 2. Insere as imagens
            if (imagens && imagens.length > 0) {
                const imgStmt = db.prepare(sqlImagem);
                let ordem = 0;
                for (const url of imagens) {
                    if (url) { // Só insere se a URL não estiver vazia
                        imgStmt.run(produtoId, url, ordem, (imgErr) => {
                            if (imgErr) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ message: 'Erro ao salvar imagem', error: imgErr.message });
                            }
                        });
                        ordem++;
                    }
                }
                imgStmt.finalize();
            }

            // 3. Finaliza a transação
            db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                    return res.status(500).json({ message: 'Erro ao finalizar transação', error: commitErr.message });
                }
                res.status(201).json({ message: 'Produto e imagens criados com sucesso!', id: produtoId });
            });
        });
    });
});

// 2. ATUALIZAR um produto
app.put('/api/admin/produtos/:id', [verificarToken, verificarAdmin], (req, res) => {
    const { id } = req.params;
    const { nome, descricao_curta, descricao_longa, categoria, tags, destaque, imagens } = req.body;

    const sqlUpdateProduto = `UPDATE produtos SET 
                                nome = ?, descricao_curta = ?, descricao_longa = ?, 
                                categoria = ?, tags = ?, destaque = ? 
                              WHERE id = ?`;
    const sqlDeleteImagens = `DELETE FROM produto_imagens WHERE produto_id = ?`;
    const sqlInsertImagem = `INSERT INTO produto_imagens (produto_id, imagem_url, ordem) VALUES (?, ?, ?)`;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Atualiza os dados do produto
        db.run(sqlUpdateProduto, [nome, descricao_curta, descricao_longa, categoria, tags, !!destaque, id], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Erro ao atualizar produto', error: err.message });
            }

            // 2. Deleta as imagens antigas
            db.run(sqlDeleteImagens, [id], (deleteErr) => {
                if (deleteErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: 'Erro ao limpar imagens antigas', error: deleteErr.message });
                }

                // 3. Insere as novas imagens
                if (imagens && imagens.length > 0) {
                    const imgStmt = db.prepare(sqlInsertImagem);
                    let ordem = 0;
                    for (const url of imagens) {
                        if (url) { // Só insere se a URL não estiver vazia
                            imgStmt.run(id, url, ordem, (imgErr) => {
                                if (imgErr) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ message: 'Erro ao salvar nova imagem', error: imgErr.message });
                                }
                            });
                            ordem++;
                        }
                    }
                    imgStmt.finalize();
                }

                // 4. Finaliza a transação
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        return res.status(500).json({ message: 'Erro ao finalizar transação', error: commitErr.message });
                    }
                    res.json({ message: 'Produto atualizado com sucesso!' });
                });
            });
        });
    });
});

// 3. DELETAR um produto
app.get('/api/produtos/:id', (req, res) => {
    const sqlProduto = 'SELECT * FROM produtos WHERE id = ?';
    const sqlImagens = 'SELECT * FROM produto_imagens WHERE produto_id = ? ORDER BY ordem ASC';
    const params = [req.params.id];

    // Precisamos de duas buscas
    db.get(sqlProduto, params, (err, produto) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!produto) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        // Agora busca as imagens
        db.all(sqlImagens, params, (imgErr, imagens) => {
            if (imgErr) {
                return res.status(500).json({ error: imgErr.message });
            }

            // Combina os resultados
            produto.imagens = imagens; // Adiciona o array de imagens ao objeto do produto
            res.json({ produto: produto });
        });
    });
});

// --- ROTA DE ORÇAMENTO (Protegida) ---

// Recebe o carrinho [ {id: 1, quantity: 2}, ... ]
app.post('/api/orcamentos', [verificarToken], (req, res) => {
    const usuarioId = req.user.id; // Pegamos do token
    const itensDoCarrinho = req.body.itens; // Esperamos um array

    if (!itensDoCarrinho || itensDoCarrinho.length === 0) {
        return res.status(400).json({ message: 'O carrinho está vazio.' });
    }

    const sqlCriarOrcamento = `INSERT INTO orcamentos (usuario_id, status) VALUES (?, 'Pendente')`;
    const sqlAdicionarItem = `INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade) VALUES (?, ?, ?)`;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Cria o orçamento "pai"
        db.run(sqlCriarOrcamento, [usuarioId], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Erro ao criar orçamento.', error: err.message });
            }

            const orcamentoId = this.lastID;
            const stmt = db.prepare(sqlAdicionarItem);

            // 2. Adiciona os itens
            for (const item of itensDoCarrinho) {
                stmt.run(orcamentoId, item.id, item.quantity);
            }
            stmt.finalize();

            // 3. Finaliza a transação
            db.run('COMMIT', async(commitErr) => {
                if (commitErr) {
                    return res.status(500).json({ message: 'Erro ao finalizar transação.', error: commitErr.message });
                }

                // 4. Se tudo deu certo, buscamos os dados para enviar o e-mail
                // (Esta parte é complexa, mas necessária para o PDF)
                try {
                    const orcamentoSalvo = await dbGetAsync('SELECT * FROM orcamentos WHERE id = ?', [orcamentoId]);
                    const usuario = await dbGetAsync('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);

                    // Precisamos dos nomes dos produtos
                    const sqlItens = `SELECT i.quantidade, p.nome as produto_nome 
                                      FROM itens_orcamento i 
                                      JOIN produtos p ON i.produto_id = p.id 
                                      WHERE i.orcamento_id = ?`;

                    const itensSalvos = await dbAllAsync(sqlItens, [orcamentoId]);

                    // 5. Envia o e-mail (sem travar a resposta do usuário)
                    enviarEmailOrcamento(orcamentoSalvo, itensSalvos, usuario);

                    res.status(201).json({
                        message: 'Orçamento solicitado com sucesso!',
                        orcamentoId: orcamentoId
                    });

                } catch (asyncErr) {
                    // Se o envio do e-mail falhar, o orçamento ainda foi salvo.
                    console.error('Erro na etapa assíncrona (e-mail):', asyncErr);
                    res.status(201).json({
                        message: 'Orçamento salvo, mas houve falha ao enviar o e-mail.',
                        orcamentoId: orcamentoId
                    });
                }
            });
        });
    });
});

// Funções utilitárias (ADICIONE NO FINAL DO SEU server.js)
// Precisamos de versões "Promise" do db.get e db.all
function dbGetAsync(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

function dbAllAsync(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});