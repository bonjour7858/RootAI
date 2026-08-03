const WORKER_URL = 'https://rootai.bonjour7858.workers.dev/';
const ADMIN_PIN = "1234";

// ETAT DE L'APPLICATION (STATE)
let state = {
    currentPage: 'chat',
    user: JSON.parse(localStorage.getItem('rootify_user')) || { email: 'invité@rootify.com', role: 'user', isVip: false },
    currentChatId: null,
    chats: JSON.parse(localStorage.getItem('rootify_chats')) || {},
    supportMsgs: JSON.parse(localStorage.getItem('rootify_support_msgs')) || []
};

// INITIALISATION DYNAMIQUE
document.addEventListener("DOMContentLoaded", () => {
    // Navigation par hash dans l'URL (#chat, #image, #admin...)
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
    if (updateHistory) {
        window.location.hash = pageId;
    }

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

// RENDU COMPOSANT VUE (VIEWPORT)
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

/* ================= COMPOSANTS DYNAMIQUE (HTML INJECTION) ================= */

function renderChatPage() {
    return `
        <div class="hero-header">
            <span class="badge-tag">REJOIGNEZ ROOTIFY</span>
            <h1>Commencez Votre Aventure !</h1>
            <p>Rootify est la plateforme IA tout-en-un. Générez du texte et des idées en un instant !</p>
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
                        <strong>Rootify Assistant</strong> <span class="online-dot">● En ligne</span>
                        <p id="root-status" style="font-size:0.8rem; color:#aaa;">« Écrivez votre message et cliquez sur Générer ! »</p>
                    </div>
                </div>

                <div id="chat-box" class="chat-box"></div>

                <div class="chat-input-area">
                    <input type="text" id="user-input" placeholder="Écris ton prompt ici...">
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
            <p style="margin-bottom: 15px; color:#aaa;">Décrivez ce que vous souhaitez voir apparaître :</p>
            <div class="input-group">
                <input type="text" id="img-prompt-input" placeholder="Ex: Un dragon de feu futuriste dans une ville cyberpunk...">
                <button onclick="triggerImageGen()" class="btn-main-orange full-width" style="margin-top: 15px;">Générer l'image</button>
            </div>
            <div id="image-result" class="image-result-box" style="margin-top: 20px; text-align: center;"></div>
        </div>
    `;
}

function renderPremiumPage() {
    return `
        <div class="pricing-card">
            <h2>Pass VIP & Soutien ⭐</h2>
            <div class="price">3€ <span>/ mois</span></div>
            <ul>
                <li>✅ Accès prioritaire au modèle IA (Groq)</li>
                <li>✅ Génération d'images ultra-rapide</li>
                <li>✅ Badge VIP sur le profil</li>
            </ul>
            <div class="action-buttons-group">
                <button class="btn-main-orange full-width" onclick="openCheckoutModal()">Tester la souscription (Test)</button>
                <a href="https://www.leetchi.com/" target="_blank" class="btn-leetchi full-width">🎁 Soutenir sur Leetchi</a>
            </div>
        </div>
    `;
}

function renderAuthPage() {
    return `
        <div class="card" style="max-width:400px; margin: 40px auto;">
            <h2>Connexion / Inscription</h2>
            <form onsubmit="handleAuth(event)" style="margin-top:15px;">
                <input type="email" id="auth-email" placeholder="Votre adresse email" required style="margin-bottom:15px;">
                <button type="submit" class="btn-main-orange full-width">Se connecter</button>
            </form>
        </div>
    `;
}

function renderAdminPage() {
    return `
        <div class="card">
            <h2>Panneau d'Administration 👑</h2>
            <p style="color:#aaa; font-size:0.9rem;">Gestion globale de Rootify :</p>
            
            <div style="margin-top:20px; background:#1a1a1e; padding:15px; border-radius:8px; border:1px solid #2d2d35;">
                <p><strong>Utilisateur connecté :</strong> <span>${state.user.email}</span></p>
                <p style="margin-top:5px;"><strong>Moteur IA :</strong> <span style="color:#10b981;">● Opérationnel (Groq Llama 3)</span></p>
                <button onclick="clearAllData()" class="btn-danger" style="margin-top:15px;">Réinitialiser toutes les données</button>
            </div>

            <hr style="border:0; border-top:1px solid #242429; margin: 25px 0;">

            <h3>📩 Live Support Client</h3>
            <p style="color:#aaa; font-size:0.85rem; margin-bottom:15px;">Répondez en direct aux tickets reçus dans le widget :</p>
            
            <div id="admin-support-list" class="admin-support-container"></div>
        </div>
    `;
}

/* ================= ACTIONS & LOGIQUE CHAT IA ================= */

function bindChatEvents() {
    const input = document.getElementById('user-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

function startNewChat() {
    state.currentChatId = Date.now().toString();
    state.chats[state.currentChatId] = { title: 'Nouvelle conversation', messages: [] };
    saveState();
    
    renderChatHistoryList();
    const box = document.getElementById('chat-box');
    if (box) box.innerHTML = '';
    addBotMessageUI("Bonjour ! Je suis l'IA Rootify. Écris ton message ci-dessous et clique sur Générer !");
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    addUserMessageUI(text);
    saveChatMessage('user', text);
    input.value = '';

    if (state.chats[state.currentChatId].messages.length <= 2) {
        state.chats[state.currentChatId].title = text.substring(0, 18) + '...';
        saveState();
        renderChatHistoryList();
    }

    const chatBox = document.getElementById('chat-box');
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'message bot';
    loadingMsg.id = 'loading-indicator';
    loadingMsg.textContent = 'Génération en cours... 🧠';
    chatBox.appendChild(loadingMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "Tu es Rootify, l'IA officielle de la plateforme." },
                    { role: "user", content: text }
                ]
            })
        });

        const data = await response.json();
        const loader = document.getElementById('loading-indicator');
        if (loader) chatBox.removeChild(loader);

        if (data.choices && data.choices[0] && data.choices[0].message) {
            const aiReply = data.choices[0].message.content;
            addBotMessageUI(aiReply);
            saveChatMessage('bot', aiReply);
        } else {
            addBotMessageUI("Réponse indisponible.");
        }
    } catch (error) {
        const loader = document.getElementById('loading-indicator');
        if (loader) chatBox.removeChild(loader);
        addBotMessageUI("❌ Erreur de connexion au Worker Cloudflare.");
    }
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
    const box = document.getElementById('chat-box');
    if (!box) return;
    const msg = document.createElement('div');
    msg.className = 'message bot';
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
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

/* ================= GENERATION D'IMAGE IA ================= */

function triggerImageGen() {
    const prompt = document.getElementById('img-prompt-input').value.trim();
    const resBox = document.getElementById('image-result');
    if (!prompt) return alert("Veuillez entrer une description !");
    
    resBox.innerHTML = '<p style="margin-top:15px; color:#ff5500; font-weight:bold;">🎨 Génération de votre image en cours...</p>';

    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=500&seed=${Math.floor(Math.random() * 99999)}&nologo=true`;

    const img = new Image();
    img.src = imageUrl;
    img.alt = prompt;
    img.style.maxWidth = "100%";
    img.style.borderRadius = "12px";
    img.style.border = "2px solid #ff5500";
    img.style.marginTop = "15px";

    img.onload = () => {
        resBox.innerHTML = '';
        resBox.appendChild(img);
        const caption = document.createElement('p');
        caption.style.fontSize = "0.85rem";
        caption.style.color = "#aaa";
        caption.style.marginTop = "8px";
        caption.textContent = `Résultat pour : "${prompt}"`;
        resBox.appendChild(caption);
    };

    img.onerror = () => {
        resBox.innerHTML = '<p style="color:#dc2626; margin-top:15px;">❌ Erreur lors de la création de l\'image. Réessayez.</p>';
    };
}

/* ================= SUPPORT WIDGET & ADMIN DYNAMIQUE ================= */

function toggleSupportWidget() {
    document.getElementById('support-window').classList.toggle('show');
}

function sendWidgetMessage() {
    const input = document.getElementById('widget-input');
    const text = input.value.trim();
    if (!text) return;

    addSupportWidgetBubble(text, 'user');
    input.value = '';

    state.supportMsgs.push({ id: Date.now(), text: text, time: new Date().toLocaleTimeString() });
    saveState();

    if (state.currentPage === 'admin') renderAdminSupportList();
}

function addSupportWidgetBubble(text, type) {
    const box = document.getElementById('widget-chat-box');
    if (!box) return;
    const msg = document.createElement('div');
    msg.className = `support-msg ${type === 'user' ? 'user-msg' : 'bot-msg'}`;
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}

function renderSupportWidget() {
    const box = document.getElementById('widget-chat-box');
    if (!box) return;
    box.innerHTML = '<div class="support-msg bot-msg">Bonjour ! Une question sur Rootify ? Posez-la ici !</div>';
}

function renderAdminSupportList() {
    const container = document.getElementById('admin-support-list');
    if (!container) return;

    if (state.supportMsgs.length === 0) {
        container.innerHTML = '<p style="color:#666; font-size:0.85rem;">Aucun message reçu pour le moment.</p>';
        return;
    }

    container.innerHTML = '';
    state.supportMsgs.slice().reverse().forEach(msg => {
        const card = document.createElement('div');
        card.className = 'admin-support-card';
        card.innerHTML = `
            <div>
                <strong style="color:#ff5500;">Client:</strong> "${msg.text}"
                <div style="color:#a0a0ab; font-size:0.75rem; margin-top:4px;">Reçu à ${msg.time}</div>
            </div>
            <div class="admin-reply-box">
                <input type="text" id="reply-input-${msg.id}" placeholder="Réponse au client..." />
                <button class="btn-main-orange" style="padding: 6px 12px; font-size:0.85rem;" onclick="replyToSupport(${msg.id})">Envoyer</button>
                <button class="btn-danger" onclick="deleteSupportMsg(${msg.id})">✕</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function replyToSupport(id) {
    const input = document.getElementById(`reply-input-${id}`);
    const replyText = input.value.trim();
    if (!replyText) return;

    addSupportWidgetBubble(`[Admin]: ${replyText}`, 'bot');
    alert("✅ Réponse transmise au widget support !");
    input.value = '';
}

function deleteSupportMsg(id) {
    state.supportMsgs = state.supportMsgs.filter(m => m.id !== id);
    saveState();
    renderAdminSupportList();
}

/* ================= MODALS & AUTHENTIFICATION ================= */

function openAdminPinModal() {
    if (state.user.role === 'admin') {
        navigateTo('admin');
    } else {
        document.getElementById('admin-pin-modal').classList.add('show');
        document.getElementById('admin-pin-input').focus();
    }
}

function closeAdminPinModal() {
    document.getElementById('admin-pin-modal').classList.remove('show');
    document.getElementById('admin-pin-input').value = '';
}

function verifyAdminPin() {
    const inputPin = document.getElementById('admin-pin-input').value;
    if (inputPin === ADMIN_PIN) {
        state.user = { email: 'admin@rootify.com', role: 'admin', isVip: true };
        saveState();
        closeAdminPinModal();
        navigateTo('admin');
        alert("🔓 Accès Admin Débloqué !");
    } else {
        alert("❌ Code PIN Incorrect ! (Code par défaut: 1234)");
        document.getElementById('admin-pin-input').value = '';
    }
}

function openCheckoutModal() { document.getElementById('checkout-modal').classList.add('show'); }
function closeCheckoutModal() { document.getElementById('checkout-modal').classList.remove('show'); }

function processTestPayment(e) {
    e.preventDefault();
    state.user.isVip = true;
    saveState();
    closeCheckoutModal();
    alert("🎉 Statut VIP activé !");
}

function handleAuth(e) {
    e.preventDefault();
    state.user.email = document.getElementById('auth-email').value;
    saveState();
    navigateTo('chat');
}

function saveState() {
    localStorage.setItem('rootify_user', JSON.stringify(state.user));
    localStorage.setItem('rootify_chats', JSON.stringify(state.chats));
    localStorage.setItem('rootify_support_msgs', JSON.stringify(state.supportMsgs));
    updateNavUI();
}

function clearAllData() {
    localStorage.clear();
    location.reload();
}
