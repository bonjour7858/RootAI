// ==========================================
// ⚙️ CONFIGURATION & ETAT GLOBAL
// ==========================================

// ⚠️ Remplace par l'URL exacte de ton Cloudflare Worker !
const WORKER_URL = 'https://rootai.bonjour7858.workers.dev/';

let currentUser = JSON.parse(localStorage.getItem('rootify_user')) || { email: 'invité@rootify.com', role: 'user', isVip: false };
let currentChatId = null;
let currentTicketId = null;

// ==========================================
// 🚀 INITIALISATION DU SITE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    updateUserUI();
    renderChatHistoryList();
    startNewChat();
    renderTickets();
});

// ==========================================
// 🧭 NAVIGATION ENTRE LES PAGES
// ==========================================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    const targetLink = document.getElementById(`link-${pageId}`);

    if (targetPage) targetPage.classList.add('active-page');
    if (targetLink) targetLink.classList.add('active');
}

// ==========================================
// 🔐 AUTHENTIFICATION & ROLES
// ==========================================
function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    
    currentUser = {
        email: email,
        role: email.toLowerCase() === 'admin@rootai.com' ? 'admin' : 'user',
        isVip: false
    };

    localStorage.setItem('rootify_user', JSON.stringify(currentUser));
    updateUserUI();
    renderTickets(); // Mettre à jour l'affichage des tickets selon le rôle
    showPage('chat');
}

function updateUserUI() {
    const badge = document.getElementById('user-badge');
    const authLink = document.getElementById('link-auth');

    if (currentUser.role === 'admin') {
        badge.textContent = `👑 Admin (${currentUser.email})`;
        badge.style.color = '#ef4444';
    } else if (currentUser.isVip) {
        badge.textContent = `⭐ VIP (${currentUser.email})`;
        badge.style.color = '#eab308';
    } else {
        badge.textContent = currentUser.email;
        badge.style.color = '#ff6b00';
    }

    authLink.textContent = currentUser.email.includes('invité') ? 'Connexion' : 'Profil';
}

// ==========================================
// 💬 MODULE CHAT IA (VIA CLOUDFLARE WORKER)
// ==========================================
function startNewChat() {
    currentChatId = Date.now().toString();
    const chatBox = document.getElementById('chat-box');
    if (chatBox) chatBox.innerHTML = '';
    
    let history = getChatsFromStorage();
    if (!history[currentChatId]) {
        history[currentChatId] = { title: 'Nouvelle discussion', messages: [] };
        localStorage.setItem('rootify_chats', JSON.stringify(history));
    }

    renderChatHistoryList();
    addBotMessageUI("Bonjour ! Je suis Rootify. Comment puis-je t'aider aujourd'hui ?");
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    // 1. Ajouter le message utilisateur dans le DOM et le Storage
    addUserMessageUI(text);
    saveChatMessage('user', text);
    input.value = '';

    // 2. Mettre à jour le titre du chat s'il s'agit du début
    let history = getChatsFromStorage();
    if (history[currentChatId] && history[currentChatId].messages.length <= 2) {
        history[currentChatId].title = text.substring(0, 20) + '...';
        localStorage.setItem('rootify_chats', JSON.stringify(history));
        renderChatHistoryList();
    }

    // 3. Indicateur de chargement
    const chatBox = document.getElementById('chat-box');
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'message bot';
    loadingMsg.id = 'loading-indicator';
    loadingMsg.textContent = 'Rootify réfléchit... 🧠';
    chatBox.appendChild(loadingMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // 4. Appel de ton Cloudflare Worker
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "Tu es Rootify, une IA française intelligente, dynamique, amicale et super efficace." },
                    { role: "user", content: text }
                ]
            })
        });

        const data = await response.json();

        // Enlever l'indicateur
        const loader = document.getElementById('loading-indicator');
        if (loader) chatBox.removeChild(loader);

        let aiReply = "Désolé, je n'ai pas pu comprendre la réponse.";

        if (data.choices && data.choices[0]) {
            aiReply = data.choices[0].message.content;
        } else if (data.reply) {
            aiReply = data.reply;
        }

        addBotMessageUI(aiReply);
        saveChatMessage('bot', aiReply);

    } catch (error) {
        const loader = document.getElementById('loading-indicator');
        if (loader) chatBox.removeChild(loader);

        const errorMsg = "Erreur de connexion au Worker Cloudflare. Vérifie que WORKER_URL est correcte.";
        addBotMessageUI(errorMsg);
        console.error("Erreur Chat:", error);
    }
}

function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

function addUserMessageUI(text) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.className = 'message user';
    msg.textContent = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addBotMessageUI(text) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.className = 'message bot';
    msg.textContent = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function saveChatMessage(role, text) {
    let history = getChatsFromStorage();
    if (!history[currentChatId]) history[currentChatId] = { title: 'Discussion', messages: [] };
    history[currentChatId].messages.push({ role, text });
    localStorage.setItem('rootify_chats', JSON.stringify(history));
}

function getChatsFromStorage() {
    return JSON.parse(localStorage.getItem('rootify_chats')) || {};
}

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
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';

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

// ==========================================
// 🎨 GENERATION D'IMAGE HD
// ==========================================
function triggerImageGen() {
    const prompt = document.getElementById('img-prompt-input').value;
    const resBox = document.getElementById('image-result');
    if (!prompt) return;

    resBox.innerHTML = '<p>🎨 Génération en cours par Rootify IA...</p>';
    setTimeout(() => {
        resBox.innerHTML = `<img src="https://picsum.photos/600/400?random=${Math.floor(Math.random()*1000)}" alt="Image générée">`;
    }, 1500);
}

// ==========================================
// 🎫 MODULE SUPPORT & TICKETS
// ==========================================
function createTicket(e) {
    e.preventDefault();
    const subject = document.getElementById('ticket-subject').value;
    const priority = document.getElementById('ticket-priority').value;
    const desc = document.getElementById('ticket-desc').value;

    let tickets = JSON.parse(localStorage.getItem('rootify_tickets')) || [];
    const newTicket = {
        id: Math.floor(1000 + Math.random() * 9000),
        user: currentUser.email,
        subject: subject,
        priority: priority,
        status: 'En attente',
        messages: [{ sender: currentUser.email, text: desc }]
    };

    tickets.push(newTicket);
    localStorage.setItem('rootify_tickets', JSON.stringify(tickets));

    document.getElementById('ticket-subject').value = '';
    document.getElementById('ticket-desc').value = '';

    renderTickets();
}

function renderTickets() {
    const container = document.getElementById('ticket-list');
    if (!container) return;
    container.innerHTML = '';

    let tickets = JSON.parse(localStorage.getItem('rootify_tickets')) || [];

    // L'Admin voit tout, l'utilisateur normal ne voit que ses propres tickets
    if (currentUser.role !== 'admin') {
        tickets = tickets.filter(t => t.user === currentUser.email);
    }

    if (tickets.length === 0) {
        container.innerHTML = '<p style="color:#8b949e;">Aucun ticket ouvert.</p>';
        return;
    }

    tickets.reverse().forEach(t => {
        const item = document.createElement('div');
        item.className = 'ticket-item';
        item.onclick = () => openTicketDetail(t.id);
        
        const badgeClass = t.status.toLowerCase().replace(' ', '-');
        item.innerHTML = `
            <div>
                <strong>#${t.id} - ${t.subject}</strong>
                <br><small style="color:#8b949e;">Par: ${t.user}</small>
            </div>
            <span class="badge ${badgeClass}">${t.status}</span>
        `;
        container.appendChild(item);
    });
}

function openTicketDetail(id) {
    currentTicketId = id;
    let tickets = JSON.parse(localStorage.getItem('rootify_tickets')) || [];
    let ticket = tickets.find(t => t.id === id);

    if (!ticket) return;

    document.getElementById('detail-ticket-id').textContent = ticket.id;
    document.getElementById('detail-ticket-subject').textContent = ticket.subject;
    document.getElementById('detail-ticket-user').textContent = ticket.user;
    
    const statusSelect = document.getElementById('detail-ticket-status');
    statusSelect.value = ticket.status || 'En attente';

    renderTicketMessages(ticket);
    showPage('ticket-detail');
}

function renderTicketMessages(ticket) {
    const box = document.getElementById('ticket-messages-box');
    box.innerHTML = '';

    ticket.messages.forEach(m => {
        const div = document.createElement('div');
        div.style.padding = '8px 12px';
        div.style.borderRadius = '6px';
        div.style.backgroundColor = m.sender === currentUser.email ? '#ff6b0022' : '#21262d';
        div.style.border = '1px solid #30363d';
        div.innerHTML = `<strong>${m.sender} :</strong> ${m.text}`;
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

function updateTicketStatus() {
    if (!currentTicketId) return;

    const newStatus = document.getElementById('detail-ticket-status').value;
    let tickets = JSON.parse(localStorage.getItem('rootify_tickets')) || [];

    const index = tickets.findIndex(t => t.id === currentTicketId);
    if (index !== -1) {
        tickets[index].status = newStatus;
        localStorage.setItem('rootify_tickets', JSON.stringify(tickets));
        renderTickets();
    }
}

function addTicketReply() {
    const input = document.getElementById('ticket-reply-input');
    const text = input.value.trim();
    if (!text || !currentTicketId) return;

    let tickets = JSON.parse(localStorage.getItem('rootify_tickets')) || [];
    const index = tickets.findIndex(t => t.id === currentTicketId);

    if (index !== -1) {
        tickets[index].messages.push({ sender: currentUser.email, text: text });
        localStorage.setItem('rootify_tickets', JSON.stringify(tickets));
        renderTicketMessages(tickets[index]);
        input.value = '';
    }
}

function handleTicketReplyKeyPress(e) {
    if (e.key === 'Enter') addTicketReply();
}

// ==========================================
// 💳 ACCES VIP & SIMULATION D'ACHAT
// ==========================================
function openCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'flex';
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function processTestPayment(e) {
    e.preventDefault();
    currentUser.isVip = true;
    localStorage.setItem('rootify_user', JSON.stringify(currentUser));
    updateUserUI();
    closeCheckoutModal();
    alert("🎉 Bravo ! Votre compte est désormais VIP (Mode Test). Merci de votre soutien !");
}
