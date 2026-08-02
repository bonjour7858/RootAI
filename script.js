const ADMIN_PIN = "1234";

// URL de ton Worker Cloudflare (Proxy sécurisé sans clé API exposée)
const WORKER_URL = "https://rootai.bonjour7858.workers.dev";

let currentUser = JSON.parse(localStorage.getItem('rootai_user')) || null;
let tickets = JSON.parse(localStorage.getItem('rootai_tickets')) || [];
let activeTicketId = null;

let conversationHistory = [
    { role: "system", content: "Tu es Rootify, une IA utile, intelligente et dynamique." }
];

// Navigation entre les pages
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
    
    const targetPage = document.getElementById('page-' + pageName);
    if(targetPage) targetPage.classList.add('active-page');
    
    const targetLink = document.getElementById('link-' + pageName);
    if (targetLink) targetLink.classList.add('active');

    updateUserUI();
}

// Authentification
function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    currentUser = { email: email, isPremium: false, isAdmin: false };
    localStorage.setItem('rootai_user', JSON.stringify(currentUser));
    alert('✅ Connecté en tant que : ' + email);
    updateUserUI();
    showPage('chat');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('rootai_user');
    updateUserUI();
    alert('Déconnecté.');
    showPage('auth');
}

function updateUserUI() {
    const authLink = document.getElementById('link-auth');
    const userBadge = document.getElementById('user-badge');
    
    if (currentUser) {
        if(authLink) {
            authLink.textContent = "Déconnexion";
            authLink.onclick = logout;
        }
        if (userBadge) {
            const roleTag = currentUser.isAdmin ? '<b style="color:#ef4444;">[ADMIN]</b>' : '[MEMBRE]';
            userBadge.innerHTML = `👤 ${currentUser.email} ${roleTag}`;
        }
    } else {
        if(authLink) {
            authLink.textContent = "Connexion";
            authLink.onclick = () => showPage('auth');
        }
        if (userBadge) userBadge.innerHTML = "";
    }
}

// Bulle de dialogue de la mascotte Root
function updateRootSpeech(message) {
    const statusEl = document.getElementById('root-status');
    if (statusEl) {
        statusEl.textContent = `« ${message} »`;
    }
}

// -------------------------------------------------------------
// CHATBOT IA & GENERATEUR D'IMAGES
// -------------------------------------------------------------
async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (text === '') return;

    appendMessage(text, 'user');
    input.value = '';

    if (text.toLowerCase().startsWith('/image')) {
        generateImage(text.replace('/image', '').trim());
        return;
    }

    conversationHistory.push({ role: "user", content: text });
    const botMsg = appendMessage("Rootify réfléchit... 🧠", 'bot');
    updateRootSpeech("Je cherche la réponse... 🧐");

    try {
        // Envoi au proxy Cloudflare (qui injecte la clé de manière sécurisée)
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: conversationHistory,
                model: "llama-3.1-8b-instant"
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            const reply = data.choices[0].message.content;
            botMsg.textContent = reply;
            conversationHistory.push({ role: "assistant", content: reply });
            updateRootSpeech("Et voilà ! Autre chose ? 🧡");
        } else {
            botMsg.textContent = "⚠️ Erreur de réponse de l'IA.";
            updateRootSpeech("Oups... Un petit souci de connexion !");
        }
    } catch (err) {
        botMsg.textContent = "⚠️ Erreur de connexion au serveur.";
        updateRootSpeech("Impossible de contacter le serveur.");
    }
}

function triggerImageGen() {
    const prompt = document.getElementById('img-prompt-input').value.trim();
    if (!prompt) return;
    showPage('chat');
    generateImage(prompt);
}

function generateImage(promptText) {
    const botMsg = appendMessage("🎨 Génération HD en cours...", 'bot');
    updateRootSpeech("Je prépare ton image HD... 🎨");
    
    const enhancedPrompt = `${promptText}, highly detailed, 8k resolution, cinematic lighting, photorealistic, masterpiece, Unreal Engine 5 render`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&model=flux&nologo=true&seed=${Math.floor(Math.random()*999999)}`;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = "max-width:100%; border-radius:12px; margin-top:10px; border:2px solid #ff6b00; box-shadow: 0 4px 15px rgba(0,0,0,0.5);";
    
    img.onload = () => {
        botMsg.textContent = "✨ Voici votre création :";
        botMsg.appendChild(document.createElement('br'));
        botMsg.appendChild(img);
        updateRootSpeech("Regarde cette merveille ! 🧡");
    };
    img.onerror = () => {
        botMsg.textContent = "Impossible de générer l'image pour l'instant.";
        updateRootSpeech("Désolé, l'image n'a pas pu charger...");
    };
}

function appendMessage(text, type) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msg;
}

function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(); }

// -------------------------------------------------------------
// SYSTEME DE TICKETS PRIVÉS
// -------------------------------------------------------------
function createTicket(e) {
    e.preventDefault();
    if (!currentUser) {
        alert("Connectez-vous pour ouvrir un ticket !");
        showPage('auth');
        return;
    }

    const subject = document.getElementById('ticket-subject').value;
    const priority = document.getElementById('ticket-priority').value;
    const desc = document.getElementById('ticket-desc').value;

    const newTicket = {
        id: Math.floor(100000 + Math.random() * 900000),
        subject: subject,
        priority: priority,
        status: "En attente",
        user: currentUser.email,
        messages: [
            { sender: currentUser.email, text: desc, date: new Date().toLocaleString() }
        ]
    };

    tickets.unshift(newTicket);
    localStorage.setItem('rootai_tickets', JSON.stringify(tickets));
    
    document.getElementById('ticket-subject').value = '';
    document.getElementById('ticket-desc').value = '';
    alert("Ticket créé ! ID: #" + newTicket.id);
    renderTickets();
}

function renderTickets() {
    const list = document.getElementById('ticket-list');
    if (!list) return;
    list.innerHTML = '';

    const visibleTickets = (currentUser && currentUser.isAdmin)
        ? tickets
        : tickets.filter(t => currentUser && t.user === currentUser.email);

    if (visibleTickets.length === 0) {
        list.innerHTML = "<p style='color:#8b949e;'>Aucun ticket disponible.</p>";
        return;
    }

    visibleTickets.forEach(t => {
        const item = document.createElement('div');
        item.style.cssText = "background:#21262d; padding:15px; border-radius:8px; margin-bottom:10px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border:1px solid #30363d;";
        item.onclick = () => openTicketPage(t.id);
        
        item.innerHTML = `
            <div>
                <strong>#${t.id} - ${t.subject}</strong>
                <p style="font-size:0.8rem; color:#8b949e; margin-top:3px;">Par: ${t.user} | Priorité: ${t.priority}</p>
            </div>
            <span style="padding:4px 8px; border-radius:4px; font-size:0.8rem; background:${getStatusColor(t.status)}; color:white;">${t.status}</span>
        `;
        list.appendChild(item);
    });
}

function openTicketPage(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const isOwner = currentUser && currentUser.email === ticket.user;
    const isAdmin = currentUser && currentUser.isAdmin;

    if (!isOwner && !isAdmin) {
        alert("🔒 Accès interdit : Vous n'êtes ni l'auteur de ce ticket ni administrateur.");
        return;
    }

    activeTicketId = ticketId;
    showPage('ticket-detail');

    document.getElementById('detail-ticket-id').textContent = ticket.id;
    document.getElementById('detail-ticket-subject').textContent = ticket.subject;
    document.getElementById('detail-ticket-user').textContent = ticket.user;
    
    const statusSelect = document.getElementById('detail-ticket-status');
    statusSelect.value = ticket.status;
    statusSelect.disabled = !isAdmin;

    const replyInput = document.getElementById('ticket-reply-input');
    const replyButton = document.querySelector('#page-ticket-detail button.btn-action');
    
    if (replyInput) {
        replyInput.disabled = false;
        replyInput.placeholder = "Écrire une réponse dans le ticket...";
    }
    if (replyButton) {
        replyButton.disabled = false;
        replyButton.style.opacity = "1";
        replyButton.style.cursor = "pointer";
    }

    renderTicketMessages(ticket);
}

function renderTicketMessages(ticket) {
    const box = document.getElementById('ticket-messages-box');
    box.innerHTML = '';

    ticket.messages.forEach(m => {
        const isMe = currentUser && m.sender === currentUser.email;
        const div = document.createElement('div');
        div.style.cssText = `max-width:80%; padding:10px; border-radius:8px; margin-bottom:10px; ${isMe ? 'background:#238636; margin-left:auto;' : 'background:#21262d; margin-right:auto; border:1px solid #30363d;'}`;
        div.innerHTML = `
            <div style="font-size:0.75rem; color:#8b949e; margin-bottom:3px;">${m.sender} (${m.date})</div>
            <div>${m.text}</div>
        `;
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

function addTicketReply() {
    const input = document.getElementById('ticket-reply-input');
    const text = input.value.trim();
    if (!text || !activeTicketId) return;

    const ticket = tickets.find(t => t.id === activeTicketId);
    if (ticket) {
        ticket.messages.push({
            sender: currentUser ? currentUser.email : "Visiteur",
            text: text,
            date: new Date().toLocaleString()
        });
        localStorage.setItem('rootai_tickets', JSON.stringify(tickets));
        input.value = '';
        renderTicketMessages(ticket);
    }
}

function updateTicketStatus() {
    if (!activeTicketId || !currentUser || !currentUser.isAdmin) return;
    const newStatus = document.getElementById('detail-ticket-status').value;
    const ticket = tickets.find(t => t.id === activeTicketId);
    if (ticket) {
        ticket.status = newStatus;
        localStorage.setItem('rootai_tickets', JSON.stringify(tickets));
        alert("Statut mis à jour : " + newStatus);
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'En attente': return '#eab308';
        case 'En cours': return '#3b82f6';
        case 'Résolu': return '#22c55e';
        case 'Fermé': return '#ef4444';
        default: return '#6b7280';
    }
}

function accessAdmin() {
    const pin = prompt("Entrez le code Admin (1234) :");
    if (pin === ADMIN_PIN) {
        currentUser = { email: "admin@rootai.com", isAdmin: true };
        localStorage.setItem('rootai_user', JSON.stringify(currentUser));
        updateUserUI();
        alert("🔓 Connecté en tant qu'ADMIN !");
        showPage('support');
        renderTickets();
    } else if (pin !== null) {
        alert("Code PIN incorrect !");
    }
}

window.onload = () => {
    updateUserUI();
    renderTickets();
};
