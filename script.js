const WORKER_URL = 'https://rootai.bonjour7858.workers.dev/';

// ÉTAT GLOBAL DE L'APPLICATION
let state = {
    currentPage: 'chat',
    user: JSON.parse(localStorage.getItem('rootify_user')) || { email: 'invité@rootify.com', role: 'user', isVip: false },
    currentChatId: null,
    chats: JSON.parse(localStorage.getItem('rootify_chats')) || {},
    supportMsgs: JSON.parse(localStorage.getItem('rootify_support_msgs')) || []
};

// INITIALISATION
document.addEventListener("DOMContentLoaded", () => {
    const route = window.location.hash.replace('#', '') || 'chat';
    navigateTo(route, false);

    window.addEventListener('popstate', () => {
        const hashRoute = window.location.hash.replace('#', '') || 'chat';
        navigateTo(hashRoute, false);
    });

    renderSupportWidget();
    updateNavUI();
});

// ROUTEUR DYNAMIQUE
function navigateTo(pageId, updateHistory = true) {
    if (pageId === 'admin' && state.user.role !== 'admin') {
        openAdminPinModal();
        return;
    }

    state.currentPage = pageId;
    if (updateHistory) window.location.hash = pageId;

    updateNavUI();
    renderViewport();
}

function updateNavUI() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === state.currentPage);
    });

    const authLink = document.getElementById('link-auth');
    const adminLink = document.getElementById('link-admin');

    if (authLink) authLink.textContent = state.user.email.includes('invité') ? 'Connexion' : state.user.email;
    if (adminLink) {
        if (state.user.role === 'admin') adminLink.classList.remove('hidden');
        else adminLink.classList.add('hidden');
    }
}

function renderViewport() {
    const viewport = document.getElementById('app-viewport');
    viewport.className = 'container page-view';

    switch (state.currentPage) {
        case 'chat':
            viewport.innerHTML = renderChatPage();
            bindChatEvents();
            if (!state.currentChatId || !state.chats[state.currentChatId]) startNewChat();
            else loadChat(state.currentChatId);
            break;

        case 'image':
            viewport.innerHTML = renderImagePage();
            bindImageEvents();
            break;

        case 'premium':
            viewport.innerHTML = renderPremiumPage();
            break;

        case 'auth':
            viewport.innerHTML = renderAuthPage();
            break;

        case 'admin':
            viewport.innerHTML = renderAdminPage();
            renderAdminSupportList();
            break;

        default:
            viewport.innerHTML = renderChatPage();
            bindChatEvents();
            break;
    }
}

/* ================= RENDU DES PAGES ================= */

function renderChatPage() {
    return `
        <div class="hero-header">
            <span class="badge-tag">REJOIGNEZ ROOTIFY</span>
            <h1>L'Assistant IA nouvelle génération !</h1>
            <p>Discutez avec une IA rapide disposant d'une mémoire de conversation continue.</p>
        </div>

        <div class="chat-layout">
            <aside class="chat-sidebar">
                <button onclick="startNewChat()" class="btn-main-orange full-width">+ Nouvelle conversation</button>
                <h3 style="margin-top:15px; font-size:0.9rem; color:#aaa;">Historique</h3>
                <div id="chat-history-list" class="history-list"></div>
            </aside>

            <div class="chat-main">
                <div class="root-mascot">
                    <span class="avatar" style="font-size:1.5rem;">🤖</span>
                    <div>
                        <strong>Rootify Stream AI</strong> <span class="online-dot">● En ligne</span>
                        <p id="root-status" style="font-size:0.8rem; color:#aaa;">« Posez-moi vos questions, je garde le contexte ! »</p>
                    </div>
                </div>

                <div id="chat-box" class="chat-box"></div>

                <div class="chat-input-area">
                    <input type="text" id="user-input" placeholder="Posez une question...">
                    <button onclick="sendMessage()" class="btn-main-orange">Générer</button>
                </div>
            </div>
        </div>
    `;
}

function renderImagePage() {
    return `
        <div class="card center-content" style="max-width: 700px; margin: 0 auto;">
            <h2>Générateur d'Images IA 🎨</h2>
            <p style="margin-bottom: 15px; color:#aaa;">Décrivez l'image que vous souhaitez créer :</p>
            <div class="input-group">
                <input type="text" id="img-prompt-input" placeholder="Ex: Un paysage cyberpunk sous la pluie, 8k...">
                <button onclick="triggerImageGen()" class="btn-main-orange full-width" style="margin-top: 15px;">Générer l'image</button>
            </div>
            <div id="image-result" class="image-result-box" style="margin-top: 20px; text-align: center; min-height: 220px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#18181c; border-radius:10px; border:1px dashed #333;">
                <p style="color:#666;">Votre création apparaîtra ici...</p>
            </div>
        </div>
    `;
}

function renderPremiumPage() {
    return `
        <div class="pricing-card">
            <h2>Pass VIP & Support ⭐</h2>
            <div class="price">3€ <span>/ mois</span></div>
            <ul>
                <li>✅ Réponses IA instantanées en streaming</li>
                <li>✅ Mémoire contextuelle illimitée</li>
                <li>✅ Rendu d'images Haute Définition</li>
            </ul>
            <div class="action-buttons-group">
                <button class="btn-main-orange full-width" onclick="openCheckoutModal()">Tester le Pass VIP</button>
            </div>
        </div>
    `;
}

function renderAuthPage() {
    return `
        <div class="card" style="max-width:400px; margin: 40px auto;">
            <h2>Connexion / Inscription</h2>
            <form onsubmit="handleAuth(event)" style="margin-top:15px;">
                <input type="email" id="auth-email" placeholder="Adresse e-mail" required style="margin-bottom:15px;">
                <button type="submit" class="btn-main-orange full-width">Se connecter</button>
            </form>
        </div>
    `;
}

function renderAdminPage() {
    return `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>Panneau d'Administration 👑</h2>
                <button onclick="logoutAdmin()" class="btn-danger" style="font-size:0.8rem;">Déconnexion</button>
            </div>
            
            <div style="margin-top:20px; background:#1a1a1e; padding:15px; border-radius:8px; border:1px solid #2d2d35;">
                <p><strong>Statut :</strong> <span style="color:#10b981;">● Connecté en tant qu'Administrateur</span></p>
                <button onclick="clearAllData()" class="btn-danger" style="margin-top:15px;">Vider la mémoire locale</button>
            </div>

            <hr style="border:0; border-top:1px solid #242429; margin: 25px 0;">

            <h3>📩 Support Client Direct</h3>
            <div id="admin-support-list" class="admin-support-container" style="margin-top:15px;"></div>
        </div>
    `;
}

/* ================= CHAT IA AVEC MÉMOIRE & STREAMING ================= */

function bindChatEvents() {
    const input = document.getElementById('user-input');
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
}

function bindImageEvents() {
    const input = document.getElementById('img-prompt-input');
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') triggerImageGen(); });
}

function startNewChat() {
    state.currentChatId = Date.now().toString();
    state.chats[state.currentChatId] = { title: 'Nouvelle conversation', messages: [] };
    saveState();
    renderChatHistoryList();
    const box = document.getElementById('chat-box');
    if (box) box.innerHTML = '';
    addBotMessageUI("Bonjour ! Je suis l'IA Rootify. Posez-moi une question !");
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    // Affiche et enregistre le message utilisateur
    addUserMessageUI(text);
    saveChatMessage('user', text);
    input.value = '';

    if (state.chats[state.currentChatId].messages.length <= 2) {
        state.chats[state.currentChatId].title = text.substring(0, 18) + '...';
        saveState();
        renderChatHistoryList();
    }

    // Préparation du conteneur de réponse pour le streaming
    const botMsgDiv = createBotMessageBubble();
    let accumulatedResponse = "";

    // CONTEXTE COMPLET / MÉMOIRE DE LA CONVERSATION
    const conversationHistory = [
        { role: "system", content: "Tu es Rootify, un assistant IA très intelligent, poli et précis. Tu te souviens parfaitement de toute la discussion en cours." }
    ];

    state.chats[state.currentChatId].messages.forEach(msg => {
        conversationHistory.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.text
        });
    });

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory })
        });

        if (!response.ok) throw new Error("Erreur serveur");

        // LECTURE DU FLUX EN STREAMING
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                    try {
                        const parsed = JSON.parse(line.replace("data: ", ""));
                        const content = parsed.choices[0]?.delta?.content || "";
                        accumulatedResponse += content;
                        botMsgDiv.textContent = accumulatedResponse;
                        
                        const chatBox = document.getElementById('chat-box');
                        chatBox.scrollTop = chatBox.scrollHeight;
                    } catch (e) {
                        // Ignorer les fragments incomplets
                    }
                }
            }
        }

        // Sauvegarde de la réponse complète
        saveChatMessage('bot', accumulatedResponse);

    } catch (error) {
        botMsgDiv.textContent = "❌ Impossible de contacter le serveur IA.";
    }
}

function createBotMessageBubble() {
    const box = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.className = 'message bot';
    msg.textContent = '...';
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
    return msg;
}

function addUserMessageUI(text) {
    const box = document.getElementById('chat-box');
    if (!box) return;
    const msg = document.createElement('div');
    msg.className = 'message user';
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}

function addBotMessageUI(text) {
    const msg = createBotMessageBubble();
    msg.textContent = text;
}

function saveChatMessage(role, text) {
    if (!state.chats[state.currentChatId]) return;
    state.chats[state.currentChatId].messages.push({ role, text });
    saveState();
}

function loadChat(id) {
    state.currentChatId = id;
    const box = document.getElementById('chat-box');
    if (!box) return;
    box.innerHTML = '';

    if (state.chats[id]) {
        state.chats[id].messages.forEach(m => {
            if (m.role === 'user') addUserMessageUI(m.text);
            else addBotMessageUI(m.text);
        });
    }
    renderChatHistoryList();
}

function renderChatHistoryList() {
    const list = document.getElementById('chat-history-list');
    if (!list) return;
    list.innerHTML = '';

    Object.keys(state.chats).reverse().forEach(id => {
        const item = document.createElement('div');
        item.className = `history-item ${id === state.currentChatId ? 'active' : ''}`;
        item.innerHTML = `
            <span onclick="loadChat('${id}')">💬 ${state.chats[id].title}</span>
            <button class="btn-danger" onclick="deleteChat('${id}', event)">✕</button>
        `;
        list.appendChild(item);
    });
}

function deleteChat(id, e) {
    e.stopPropagation();
    delete state.chats[id];
    saveState();
    if (state.currentChatId === id) startNewChat();
    else renderChatHistoryList();
}

/* ================= GENERATION D'IMAGE IA (AVEC FALLBACK) ================= */

function triggerImageGen() {
    const promptInput = document.getElementById('img-prompt-input');
    const prompt = promptInput ? promptInput.value.trim() : '';
    const resBox = document.getElementById('image-result');
    if (!prompt) return alert("Veuillez saisir une description !");

    resBox.innerHTML = `
        <div style="padding: 20px;">
            <p style="color:#ff5500; font-weight:bold; font-size:1.1rem; margin-bottom:8px;">🎨 Création de votre image...</p>
            <p style="color:#888; font-size:0.85rem;">Génération via le moteur HD</p>
        </div>
    `;

    const cleanPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=800&height=500&seed=${seed}&nologo=true&model=turbo`;

    const img = new Image();
    img.src = imageUrl;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "450px";
    img.style.borderRadius = "12px";
    img.style.border = "2px solid #ff5500";

    img.onload = () => {
        resBox.innerHTML = '';
        resBox.appendChild(img);
    };

    img.onerror = () => {
        resBox.innerHTML = `<p style="color:#dc2626;"> Erreur de génération. Recommencez avec un prompt plus simple.</p>`;
    };
}

/* ================= SUPPORT & SECURISATION ADMIN ================= */

function openAdminPinModal() {
    if (state.user.role === 'admin') {
        navigateTo('admin');
    } else {
        const modal = document.getElementById('admin-pin-modal');
        if (modal) modal.classList.add('show');
    }
}

function closeAdminPinModal() {
    const modal = document.getElementById('admin-pin-modal');
    if (modal) modal.classList.remove('show');
}

async function verifyAdminPin() {
    const pinInput = document.getElementById('admin-pin-input').value.trim();

    try {
        // Validation du PIN côté serveur (Worker)
        const response = await fetch(`${WORKER_URL}verify-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pinInput })
        });

        const data = await response.json();

        if (data.success) {
            state.user = { email: 'admin@rootify.com', role: 'admin', isVip: true, token: data.token };
            saveState();
            closeAdminPinModal();
            navigateTo('admin');
            alert("🔓 Authentification Administrateur réussie !");
        } else {
            alert("❌ PIN Incorrect.");
        }
    } catch (e) {
        alert("Erreur de communication avec le serveur d'authentification.");
    }
}

function logoutAdmin() {
    state.user = { email: 'invité@rootify.com', role: 'user', isVip: false };
    saveState();
    navigateTo('chat');
}

function toggleSupportWidget() {
    const win = document.getElementById('support-window');
    win.classList.toggle('show');
}

function sendWidgetMessage() {
    const input = document.getElementById('widget-input');
    const text = input.value.trim();
    if (!text) return;

    state.supportMsgs.push({ id: Date.now(), text, time: new Date().toLocaleTimeString(), sender: 'user' });
    saveState();

    renderSupportWidget();
    input.value = '';
    if (state.currentPage === 'admin') renderAdminSupportList();
}

function renderSupportWidget() {
    const box = document.getElementById('widget-chat-box');
    if (!box) return;
    box.innerHTML = '';

    if (state.supportMsgs.length === 0) {
        box.innerHTML = '<div class="support-msg bot-msg">Bonjour ! L\'équipe Support est à votre écoute.</div>';
        return;
    }

    state.supportMsgs.forEach(msg => {
        const div = document.createElement('div');
        div.className = `support-msg ${msg.sender === 'user' ? 'user-msg' : 'bot-msg'}`;
        div.textContent = msg.text;
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

function renderAdminSupportList() {
    const container = document.getElementById('admin-support-list');
    if (!container) return;

    const userMsgs = state.supportMsgs.filter(m => m.sender === 'user');
    if (userMsgs.length === 0) {
        container.innerHTML = '<p style="color:#666; font-size:0.85rem;">Aucun message client pour le moment.</p>';
        return;
    }

    container.innerHTML = '';
    userMsgs.slice().reverse().forEach(msg => {
        const card = document.createElement('div');
        card.className = 'admin-support-card';
        card.innerHTML = `
            <div>
                <strong style="color:#ff5500;">Client:</strong> "${msg.text}"
                <div style="color:#aaa; font-size:0.75rem;">${msg.time}</div>
            </div>
            <div class="admin-reply-box" style="margin-top:8px;">
                <input type="text" id="reply-input-${msg.id}" placeholder="Votre réponse..." />
                <button class="btn-main-orange" onclick="replyToSupport(${msg.id})">Répondre</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function replyToSupport(id) {
    const input = document.getElementById(`reply-input-${id}`);
    const text = input ? input.value.trim() : '';
    if (!text) return;

    state.supportMsgs.push({ id: Date.now(), text: `[Support Admin] ${text}`, time: new Date().toLocaleTimeString(), sender: 'admin' });
    saveState();
    renderSupportWidget();
    renderAdminSupportList();
}

function saveState() {
    localStorage.setItem('rootify_user', JSON.stringify(state.user));
    localStorage.setItem('rootify_chats', JSON.stringify(state.chats));
    localStorage.setItem('rootify_support_msgs', JSON.stringify(state.supportMsgs));
    updateNavUI();
}

function clearAllData() {
    if (confirm("Réinitialiser les données ?")) {
        localStorage.clear();
        location.reload();
    }
}
