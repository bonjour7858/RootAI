const WORKER_URL = 'https://rootai.bonjour7858.workers.dev/';
const ADMIN_PIN = "1234"; // CODE PIN ADMIN

let currentUser = JSON.parse(localStorage.getItem('rootify_user')) || { email: 'invité@rootify.com', role: 'user', isVip: false };
let currentChatId = null;

document.addEventListener("DOMContentLoaded", () => {
    updateUserUI();
    renderChatHistoryList();
    startNewChat();
    loadSupportMessagesInAdmin();

    // Entrée sur le tchat principal
    document.getElementById('user-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Entrée sur le support
    document.getElementById('widget-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendWidgetMessage();
    });

    // Entrée sur le PIN Admin
    document.getElementById('admin-pin-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyAdminPin();
    });
});

// Navigation Inter-Pages
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    const targetLink = document.getElementById(`link-${pageId}`);

    if (targetPage) targetPage.classList.add('active-page');
    if (targetLink) targetLink.classList.add('active');

    if (pageId === 'admin') {
        loadSupportMessagesInAdmin();
    }
}

function focusChatInput() {
    showPage('chat');
    document.getElementById('user-input').focus();
}

// SECURE ADMIN PIN SYSTEM
function openAdminPinModal() {
    if (currentUser.role === 'admin') {
        showPage('admin');
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
        currentUser = { email: 'admin@rootify.com', role: 'admin', isVip: true };
        localStorage.setItem('rootify_user', JSON.stringify(currentUser));
        updateUserUI();
        closeAdminPinModal();
        showPage('admin');
        alert("🔓 Accès Admin Autorisé !");
    } else {
        alert("❌ Code PIN Incorrect ! (Essaye: 1234)");
        document.getElementById('admin-pin-input').value = '';
    }
}

function updateUserUI() {
    const authLink = document.getElementById('link-auth');
    const adminLink = document.getElementById('link-admin');
    const adminEmail = document.getElementById('admin-user-email');

    if (authLink) authLink.textContent = currentUser.email.includes('invité') ? 'Connexion' : currentUser.email;
    if (adminEmail) adminEmail.textContent = currentUser.email;

    if (adminLink && currentUser.role === 'admin') {
        adminLink.classList.remove('hidden');
    }
}

// SUPPORT WIDGET & ADMIN LINK
function toggleSupportWidget() {
    const win = document.getElementById('support-window');
    win.classList.toggle('show');
}

function sendWidgetMessage() {
    const input = document.getElementById('widget-input');
    const text = input.value.trim();
    if (!text) return;

    const box = document.getElementById('widget-chat-box');
    const userMsg = document.createElement('div');
    userMsg.className = 'support-msg user-msg';
    userMsg.textContent = text;
    box.appendChild(userMsg);

    input.value = '';
    box.scrollTop = box.scrollHeight;

    // Sauvegarder dans le stockage pour l'admin
    let supportList = JSON.parse(localStorage.getItem('rootify_support_msgs')) || [];
    supportList.push({ id: Date.now(), text: text, time: new Date().toLocaleTimeString() });
    localStorage.setItem('rootify_support_msgs', JSON.stringify(supportList));

    // Mettre à jour la vue admin si elle est ouverte
    loadSupportMessagesInAdmin();

    setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'support-msg bot-msg';
        botMsg.textContent = "Support Rootify: Message bien transmis à l'équipe !";
        box.appendChild(botMsg);
        box.scrollTop = box.scrollHeight;
    }, 800);
}

function loadSupportMessagesInAdmin() {
    const adminListContainer = document.getElementById('admin-support-list');
    if (!adminListContainer) return;

    let supportList = JSON.parse(localStorage.getItem('rootify_support_msgs')) || [];
    
    if (supportList.length === 0) {
        adminListContainer.innerHTML = '<p style="color:#666; font-size:0.85rem;">Aucun message reçu pour le moment.</p>';
        return;
    }

    adminListContainer.innerHTML = '';
    supportList.reverse().forEach(msg => {
        const card = document.createElement('div');
        card.className = 'admin-support-card';
        card.innerHTML = `
            <div>
                <div class="msg-text">💬 "${msg.text}"</div>
                <div class="msg-time">Reçu à ${msg.time}</div>
            </div>
            <button class="btn-danger" onclick="deleteSupportMsg(${msg.id})">Supprimer</button>
        `;
        adminListContainer.appendChild(card);
    });
}

function deleteSupportMsg(id) {
    let supportList = JSON.parse(localStorage.getItem('rootify_support_msgs')) || [];
    supportList = supportList.filter(m => m.id !== id);
    localStorage.setItem('rootify_support_msgs', JSON.stringify(supportList));
    loadSupportMessagesInAdmin();
}

// MODAL ACHAT TEST
function openCheckoutModal() { document.getElementById('checkout-modal').classList.add('show'); }
function closeCheckoutModal() { document.getElementById('checkout-modal').classList.remove('show'); }

function processTestPayment(e) {
    e.preventDefault();
    currentUser.isVip = true;
    localStorage.setItem('rootify_user', JSON.stringify(currentUser));
    closeCheckoutModal();
    alert("🎉 Simulation d'achat réussie ! Statut VIP activé.");
}

// MOTEUR IA TEXTUEL (WORKER CLOUDFLARE)
function startNewChat() {
    currentChatId = Date.now().toString();
    const chatBox = document.getElementById('chat-box');
    if (chatBox) chatBox.innerHTML = '';
    
    let history = getChatsFromStorage();
    if (!history[currentChatId]) {
        history[currentChatId] = { title: 'Nouvelle conversation', messages: [] };
        localStorage.setItem('rootify_chats', JSON.stringify(history));
    }

    renderChatHistoryList();
    addBotMessageUI("Bonjour ! Je suis l'IA Rootify. Écris ton message ci-dessous et clique sur Générer !");
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    addUserMessageUI(text);
    saveChatMessage('user', text);
    input.value = '';

    let history = getChatsFromStorage();
    if (history[currentChatId] && history[currentChatId].messages.length <= 2) {
        history[currentChatId].title = text.substring(0, 18) + '...';
        localStorage.setItem('rootify_chats', JSON.stringify(history));
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
        } else if (data.response) {
            addBotMessageUI(data.response);
            saveChatMessage('bot', data.response);
        } else {
            addBotMessageUI("Réponse reçue du Worker, mais aucun texte lisible trouvé.");
        }
    } catch (error) {
        const loader = document.getElementById('loading-indicator');
        if (loader) chatBox.removeChild(loader);
        addBotMessageUI("❌ Erreur de connexion au Worker Cloudflare.");
    }
}

function addUserMessageUI(text) {
    const box = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.className = 'message user';
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}

function addBotMessageUI(text) {
    const box = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.className = 'message bot';
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}

function saveChatMessage(role, text) {
    let history = getChatsFromStorage();
    if (!history[currentChatId]) history[currentChatId] = { title: 'Discussion', messages: [] };
    history[currentChatId].messages.push({ role, text });
    localStorage.setItem('rootify_chats', JSON.stringify(history));
}

function getChatsFromStorage() { return JSON.parse(localStorage.getItem('rootify_chats')) || {}; }

function renderChatHistoryList() {
    const list = document.getElementById('chat-history-list');
    if (!list) return;
    list.innerHTML = '';
    let history = getChatsFromStorage();
    Object.keys(history).reverse().forEach(id => {
        const item = document.createElement('div');
        item.className = `history-item ${id === currentChatId ? 'active' : ''}`;
        item.innerHTML = `
            <span onclick="loadChat('${id}')">💬 ${history[id].title}</span>
            <button class="btn-danger" onclick="deleteChat('${id}', event)">✕</button>
        `;
        list.appendChild(item);
    });
}

function loadChat(id) {
    currentChatId = id;
    const box = document.getElementById('chat-box');
    box.innerHTML = '';
    let history = getChatsFromStorage();
    if (history[id]) {
        history[id].messages.forEach(m => {
            if (m.role === 'user') addUserMessageUI(m.text);
            else addBotMessageUI(m.text);
        });
    }
    renderChatHistoryList();
}

function deleteChat(id, e) {
    e.stopPropagation();
    let history = getChatsFromStorage();
    delete history[id];
    localStorage.setItem('rootify_chats', JSON.stringify(history));
    if (currentChatId === id) startNewChat();
    else renderChatHistoryList();
}

// MOTEUR IA IMAGE
function triggerImageGen() {
    const prompt = document.getElementById('img-prompt-input').value.trim();
    const resBox = document.getElementById('image-result');
    if (!prompt) return alert("Veuillez entrer une description !");
    
    resBox.innerHTML = '<p style="margin-top:15px; color:#ff5500; font-weight:bold;">🎨 Génération visuelle en cours...</p>';
    setTimeout(() => {
        const randomId = Math.floor(Math.random() * 1000);
        resBox.innerHTML = `
            <div style="margin-top:15px;">
                <img src="https://picsum.photos/seed/${randomId}/600/400" style="max-width:100%; border-radius:12px; border: 2px solid #ff5500;" alt="Image IA">
                <p style="margin-top:5px; font-size:0.85rem; color:#aaa;">Image générée pour : "${prompt}"</p>
            </div>
        `;
    }, 1000);
}

function handleAuth(e) {
    e.preventDefault();
    currentUser.email = document.getElementById('auth-email').value;
    localStorage.setItem('rootify_user', JSON.stringify(currentUser));
    updateUserUI();
    showPage('chat');
}

function clearAllData() {
    localStorage.clear();
    location.reload();
}
