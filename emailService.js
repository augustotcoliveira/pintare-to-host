// emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

// 1. Configura o "transportador" de e-mail
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// 2. Função para gerar o PDF
function buildPdf(orcamento, itens, usuario) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- Conteúdo do PDF ---
        doc.fontSize(20).font('Helvetica-Bold').text(`Orçamento #${orcamento.id}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font('Helvetica').text(`Cliente: ${usuario.nome_completo || usuario.razao_social}`);
        doc.text(`Email: ${usuario.email}`);
        doc.text(`Data: ${new Date(orcamento.data_criacao).toLocaleDateString('pt-BR')}`);
        doc.moveDown();

        doc.fontSize(14).font('Helvetica-Bold').text('Itens Solicitados:');
        doc.moveDown(0.5);

        // Cabeçalho da Tabela
        doc.font('Helvetica-Bold').text('Qtd.', 50, doc.y);
        doc.text('Produto', 100, doc.y);
        doc.moveDown(0.5);
        doc.lineCap('butt').moveTo(50, doc.y).lineTo(550, doc.y).stroke();

        // Itens
        doc.font('Helvetica');
        itens.forEach(item => {
            doc.moveDown(0.5);
            doc.text(item.quantidade, 50, doc.y);
            doc.text(item.produto_nome, 100, doc.y);
        });

        doc.end();
    });
}

// 3. Função principal para enviar o orçamento
async function enviarEmailOrcamento(orcamento, itens, usuario) {
    try {
        console.log('Gerando PDF...');
        const pdfBuffer = await buildPdf(orcamento, itens, usuario);

        const mailOptions = {
            from: 'sistema@pintare.com',
            to: process.env.MAIL_ADMIN, // O e-mail do admin
            replyTo: usuario.email, // Para o admin poder "Responder" direto para o cliente
            subject: `Novo Orçamento Recebido - Pedido #${orcamento.id}`,
            html: `
                <p>Um novo pedido de orçamento foi recebido.</p>
                <p><strong>Cliente:</strong> ${usuario.nome_completo || usuario.razao_social}</p>
                <p><strong>Email:</strong> ${usuario.email}</p>
                <p>O PDF com os detalhes está anexo.</p>
            `,
            attachments: [{
                filename: `orcamento_${orcamento.id}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        };

        console.log('Enviando e-mail...');
        await transporter.sendMail(mailOptions);
        console.log('E-mail enviado com sucesso!');

    } catch (error) {
        console.error('Erro ao enviar e-mail de orçamento:', error);
    }
}

module.exports = { enviarEmailOrcamento };