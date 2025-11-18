Pintare Equipamentos - Plataforma de Orçamentos

Sistema web completo para catálogo de produtos industriais e gestão de orçamentos, desenvolvido para a Pintare Equipamentos. O sistema substitui o modelo de e-commerce tradicional por um fluxo de cotação B2B personalizado.

🚀 Tecnologias Utilizadas

Front-end

HTML5 & JavaScript (ES6+): Arquitetura baseada em componentes (app.js) para renderização dinâmica de Header, Footer e Modais.

Tailwind CSS: Framework utilitário para estilização responsiva e moderna.

SPA-like Experience: Navegação fluida e carregamento dinâmico de conteúdo sem refresh desnecessário.

Back-end

Node.js & Express: API RESTful robusta para servir dados e gerenciar lógica de negócios.

SQLite: Banco de dados relacional leve e eficiente (arquivo local), ideal para portabilidade.

Autenticação JWT: Sistema seguro de login/cadastro com JSON Web Tokens.

Nodemailer & PDFKit: Geração automática de PDFs de orçamento e envio por e-mail.

🛠️ Funcionalidades Principais

Para o Cliente

Catálogo Dinâmico: Paginação, filtros por Categoria/Tag e Barra de Pesquisa global.

Carrinho de Orçamento: Gestão de itens no LocalStorage (persiste mesmo fechando o navegador).

Checkout Híbrido:

Envio formal do pedido via sistema (gera PDF e e-mail).

Redirecionamento inteligente para WhatsApp com mensagem pré-formatada e número do pedido.

Área do Cliente: Login e Cadastro (PF/PJ) com validação de campos.

Para o Administrador

Painel de Controle: Acesso exclusivo via rota protegida.

Gestão de Produtos (CRUD): Adicionar, editar e remover produtos.

Gestão de Imagens: Suporte a múltiplas imagens por produto via URLs externas.

📦 Como Rodar o Projeto

1. Iniciar o Back-end (API)

No terminal, na pasta raiz do projeto:

npm install
npm run dev


O servidor iniciará em http://localhost:3000

2. Iniciar o Front-end

Utilize o Live Server (VS Code) ou http-server para servir os arquivos HTML.
Acesse via http://127.0.0.1:5500 (ou porta correspondente)

🔐 Credenciais de Acesso (Demo)

Administrador:

Email: admin@pintare.com

Senha: admin123