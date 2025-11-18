// js/auth.js

// ==========================================================
// FUNÇÕES GLOBAIS DO MODAL
// ==========================================================

/**
 * Abre o modal e mostra a aba correta.
 * Esta função é chamada pelo app.js (botões do header).
 */
function openModal(tab = 'login') {
    const modalEl = document.getElementById('auth-modal');
    if (modalEl) {
        modalEl.classList.remove('hidden');
    }
    // Chama a função interna para estilizar e mostrar a aba correta
    showTab(tab);
}

/**
 * Fecha o modal.
 * Esta função é chamada pelo app.js e por listeners internos.
 */
function closeModal() {
    const modalEl = document.getElementById('auth-modal');
    if (modalEl) {
        modalEl.classList.add('hidden');
    }
    // Limpa mensagens de erro
    const authMessage = document.getElementById('auth-message');
    if (authMessage) {
        authMessage.classList.add('hidden');
        authMessage.textContent = '';
    }
}

/**
 * (Refatorado) Mostra a aba correta e estiliza os botões.
 * Agora é global neste arquivo.
 */
function showTab(tabName) {
    const formLoginContainer = document.getElementById('form-login-container');
    const formRegisterContainer = document.getElementById('form-register-container');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (!formLoginContainer || !formRegisterContainer || !tabLogin || !tabRegister) {
        // console.error("Elementos das abas do modal não encontrados.");
        return;
    }

    if (tabName === 'login') {
        formLoginContainer.classList.remove('hidden');
        formRegisterContainer.classList.add('hidden');
        tabLogin.classList.add('border-primary', 'text-primary');
        tabLogin.classList.remove('border-transparent', 'text-gray-500');
        tabRegister.classList.add('border-transparent', 'text-gray-500');
        tabRegister.classList.remove('border-primary', 'text-primary');
    } else {
        formLoginContainer.classList.add('hidden');
        formRegisterContainer.classList.remove('hidden');
        tabRegister.classList.add('border-primary', 'text-primary');
        tabRegister.classList.remove('border-transparent', 'text-gray-500');
        tabLogin.classList.add('border-transparent', 'text-gray-500');
        tabLogin.classList.remove('border-primary', 'text-primary');
    }
    showAuthMessage('', 'info', true); // Limpa mensagens
}

/**
 * (Refatorado) Mostra a mensagem de erro/sucesso.
 * Agora é global neste arquivo.
 */
function showAuthMessage(message, type = 'error', hide = false) {
    const authMessage = document.getElementById('auth-message');
    if (!authMessage) return;
    if (hide || !message) {
        authMessage.classList.add('hidden');
        authMessage.textContent = '';
        return;
    }
    authMessage.textContent = message;
    authMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');

    if (type === 'error') {
        authMessage.classList.add('bg-red-100', 'text-red-700');
    } else { // success
        authMessage.classList.add('bg-green-100', 'text-green-700');
    }
}

/**
 * (Refatorado) Alterna os campos PF/PJ.
 * Agora é global neste arquivo.
 */
function toggleRegistrationFields() {
    const tipoContaSelect = document.getElementById('tipo-conta');
    const camposPf = document.getElementById('campos-pf');
    const camposPj = document.getElementById('campos-pj');

    if (!tipoContaSelect || !camposPf || !camposPj) return;
    const tipo = tipoContaSelect.value;

    const inputsPf = camposPf.querySelectorAll('input');
    const inputsPj = camposPj.querySelectorAll('input');

    if (tipo === 'PF') {
        camposPf.classList.remove('hidden');
        camposPj.classList.add('hidden');
        inputsPf.forEach(input => input.disabled = false);
        inputsPj.forEach(input => input.disabled = true);

        // Garante que o RG esteja ativo
        const inputRg = document.getElementById('reg-rg');
        if (inputRg) inputRg.disabled = false;

        // Desabilita campos de PJ com mesmo 'name' para não dar conflito no FormData
        document.getElementById('reg-nome_completo-pj').disabled = true;
        document.getElementById('reg-cpf-pj').disabled = true;
        document.getElementById('reg-nascimento-pj').disabled = true;

        document.getElementById('reg-nome_completo-pf').disabled = false;
        document.getElementById('reg-cpf-pf').disabled = false;
        document.getElementById('reg-nascimento-pf').disabled = false;

    } else { // 'PJ'
        camposPf.classList.add('hidden');
        camposPj.classList.remove('hidden');
        inputsPf.forEach(input => input.disabled = true);
        inputsPj.forEach(input => input.disabled = false);

        // Garante que o RG esteja desativado (PJ não tem RG)
        const inputRg = document.getElementById('reg-rg');
        if (inputRg) inputRg.disabled = true;

        // Inverte a lógica dos campos duplicados
        document.getElementById('reg-nome_completo-pj').disabled = false;
        document.getElementById('reg-cpf-pj').disabled = false;
        document.getElementById('reg-nascimento-pj').disabled = false;

        document.getElementById('reg-nome_completo-pf').disabled = true;
        document.getElementById('reg-cpf-pf').disabled = true;
        document.getElementById('reg-nascimento-pf').disabled = true;
    }
}


// ==========================================================
// FUNÇÃO DE INICIALIZAÇÃO
// ==========================================================

/**
 * Esta função é chamada pelo app.js DEPOIS que o HTML do modal for carregado
 * Sua única função é anexar os listeners internos do modal.
 */
function initAuthModal() {

    // --- Seletores do DOM (Agora é seguro chamá-los) ---
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tipoContaSelect = document.getElementById('tipo-conta');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // --- Listeners de Submissão ---
    if (formLogin) formLogin.addEventListener('submit', handleLogin);
    if (formRegister) formRegister.addEventListener('submit', handleRegister);

    // --- Listeners de UI Interna ---
    if (tipoContaSelect) {
        tipoContaSelect.addEventListener('change', toggleRegistrationFields);
        toggleRegistrationFields(); // Roda uma vez para configurar o estado inicial
    }
    if (tabLogin) tabLogin.onclick = () => showTab('login');
    if (tabRegister) tabRegister.onclick = () => showTab('register');
    if (modalOverlay) modalOverlay.onclick = closeModal;
    if (modalCloseBtn) modalCloseBtn.onclick = closeModal;
}

// ==========================================================
// FUNÇÕES DE AÇÃO (Handlers)
// ==========================================================

/**
 * Lida com o envio do formulário de Login
 */
async function handleLogin(e) {
    e.preventDefault();
    const formLogin = document.getElementById('form-login');
    const formData = new FormData(formLogin);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            closeModal();
            window.location.reload();
        } else {
            showAuthMessage(result.message || 'Erro ao fazer login.', 'error');
        }
    } catch (err) {
        showAuthMessage('Não foi possível conectar ao servidor.', 'error');
    }
}

/**
 * Lida com o envio do formulário de Registro
 */
async function handleRegister(e) {
    e.preventDefault();
    const formRegister = document.getElementById('form-register');
    const formData = new FormData(formRegister);
    const data = {};
    formData.forEach((value, key) => {
        const inputs = formRegister.querySelectorAll(`[name="${key}"]`);
        let isEnabled = false;
        inputs.forEach(inp => {
            if (!inp.disabled) isEnabled = true;
        });
        if (isEnabled && value) {
            data[key] = value;
        }
    });

    try {
        const response = await fetch(`${API_URL}/auth/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            showAuthMessage('Usuário registrado com sucesso! Faça o login para continuar.', 'success');
            showTab('login');
        } else {
            showAuthMessage(result.message || 'Erro ao registrar.', 'error');
        }
    } catch (err) {
        showAuthMessage('Não foi possível conectar ao servidor.', 'error');
    }
}
