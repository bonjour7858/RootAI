// 🔑 Ta clé API Groq (gsk_...)
const API_KEY = "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"; 

// 🔐 Code secret Administrateur
const ADMIN_PIN = "1234";

// Données locales
let currentUser = JSON.parse(localStorage.getItem('rootai_user')) || null;
let tickets = JSON.parse(localStorage.getItem('rootai_tickets')) || [];
let activeTicketId = null;
let conversationHistory = [
    { role: "system", content: "Tu es RootAI, une IA tout-en-un puissante et utile." }
];

// Navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
    
    const targetPage = document.getElementById('page-' + pageName);
    if(targetPage) targetPage.classList.add('active-page');
    
    const targetLink = document.getElementById('link-' + pageName);
    if (targetLink) targetLink.classList.add('active');

    updateUserUI();
}

// -------------------------------------------------------------
// 1. COMPTES & AUTHENTIFICATION
// -------------------------------------------------------------
function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    currentUser = { email: email, isPremium: false, isAdmin: false };
    localStorage.setItem('rootai_user', JSON.stringify(currentUser));
    alert('✅ Connexion réussie ! Welcome ' + email);
    updateUserUI();
    showPage('chat');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('rootai_user');
    updateUserUI();
    alert('Déconnexion effectuée.');
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
            const roleTag = currentUser.isAdmin ? '<b style="color:#ef4444;">[ADMIN]</b>' : (currentUser.isPremium ? '<b style="color:#a855f7;">[PREMIUM]</b>' : '[GRATUIT]');
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

// -------------------------------------------------------------
// 2. CHATBOT IA & GÉNÉRATEUR D'IMAGES CORRIGÉ 🎨
// -------------------------------------------------------------
async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (text === '') return;

    appendMessage(text, 'user');
    input.value = '';

    if (text.toLowerCase().startsWith('/image') || text.toLowerCase().includes('génère une image')) {
        generateImage(text.replace('/image', '').trim());
        return;
    }

    conversationHistory.push({ role: "user", content: text });
    const botMsg = appendMessage("RootAI réfléchit... 🧠", 'bot');

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: conversationHistory,
                model: "llama-3.3-70b-versatile"
            })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            const aiReply = data.choices[0].message.content;
            botMsg.textContent = aiReply;
            conversationHistory.push({ role: "assistant", content: aiReply });
        } else {
            botMsg.textContent = "⚠️ Clé API invalide ou quota dépassé.";
        }
    } catch (error) {
        botMsg.textContent = "⚠️ Erreur de connexion au serveur d'IA.";
    }
}

function triggerImageGen() {
    const prompt = document.getElementById('img-prompt-input').value.trim();
    if (!prompt) return;
    showPage('chat');
    generateImage(prompt);
}

function generateImage(promptText) {
    const botMsg = appendMessage("🎨 Génération de l'image en cours...", 'bot');
    const cleanPrompt = encodeURIComponent(promptText || "futuristic city");
    // URL directe Pollinations AI sans redirection
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random()*99999)}`;

    const imgContainer = document.createElement('div');
    imgContainer.style.marginTop = "10px";
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
    img.style.border = "1px solid #30363d";
    
    img.onload = () => {
        botMsg.textContent = "Voici votre création :";
        imgContainer.appendChild(img);
        botMsg.appendChild(imgContainer);
    };
    img.onerror = () => {
        botMsg.textContent = "Erreur lors du chargement de l'image. Réessayez !";
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
// 3. SYSTÈME DE TICKETS PRIVÉS & DÉDIÉS 🎫
// -------------------------------------------------------------
function createTicket(e) {
    e.preventDefault();
    if (!currentUser) {
        alert("Veuillez vous connecter pour ouvrir un ticket.");
        showPage('auth');
        return;
    }

    const subject = document.getElementById('ticket-subject').value;
    const priority = document.getElementById('ticket-priority').value;
    const desc = document.getElementById('ticket-desc').value;

    const newTicket = {
        id: Math.floor(100000 + Math.random() * 900000), // ID unique 6 chiffres
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
    alert("Ticket #" + newTicket.id + " créé !");
    renderTickets();
}

function renderTickets() {
    const list = document.getElementById('ticket-list');
    if (!list) return;
    list.innerHTML = '';

    // Filtrer : L'utilisateur ne voit QUE SES tickets (L'admin voit TOUT)
    const userTickets = (currentUser && currentUser.isAdmin) 
        ? tickets 
        : tickets.filter(t => currentUser && t.user === currentUser.email);

    if (userTickets.length === 0) {
        list.innerHTML = "<p style='color:#8b949e;'>Aucun ticket disponible.</p>";
        return;
    }

    userTickets.forEach(t => {
        const item = document.createElement('div');
        item.style.cssText = "background:#21262d; padding:15px; border-radius:8px; margin-bottom:10px; cursor:pointer; display:flex; justify-between; align-items:center; border:1px solid #30363d;";
        item.onclick = () => openTicketPage(t.id);
        
        item.innerHTML = `
            <div style="flex:1;">
                <strong>#${t.id} - ${t.subject}</strong> 
                <p style="font-size:0.8rem; color:#8b949e;">De: ${t.user} | Priorité: ${t.priority}</p>
            </div>
            <span style="padding:4px 8px; border-radius:4px; font-size:0.8rem; background:${getStatusColor(t.status)}; color:white;">${t.status}</span>
        `;
        list.appendChild(item);
    });
}

function openTicketPage(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // 🔒 SÉCURITÉ : Vérifier si c'est l'auteur du ticket OU l'admin
    const isOwner = currentUser && currentUser.email === ticket.user;
    const isAdmin = currentUser && currentUser.isAdmin;

    if (!isOwner && !isAdmin) {
        alert("🔒 Accès refusé ! Ce ticket appartient à un autre utilisateur.");
        return;
    }

    activeTicketId = ticketId;
    showPage('ticket-detail');

    // Charger les infos dans la page dédiée
    document.getElementById('detail-ticket-id').textContent = ticket.id;
    document.getElementById('detail-ticket-subject').textContent = ticket.subject;
    document.getElementById('detail-ticket-user').textContent = ticket.user;
    
    const statusSelect = document.getElementById('detail-ticket-status');
    statusSelect.value = ticket.status;
    
    // Seul l'Admin peut changer le statut
    statusSelect.disabled = !isAdmin;

    renderTicketMessages(ticket);
}

function renderTicketMessages(ticket) {
    const msgBox = document.getElementById('ticket-messages-box');
    msgBox.innerHTML = '';

    ticket.messages.forEach(m => {
        const isMe = currentUser && m.sender === currentUser.email;
        const div = document.createElement('div');
        div.style.cssText = `max-width:80%; padding:10px 14px; border-radius:8px; margin-bottom:10px; ${isMe ? 'background:#238636; margin-left:auto;' : 'background:#21262d; margin-right:auto; border:1px solid #30363d;'}`;
        div.innerHTML = `
            <div style="font-size:0.75rem; color:#8b949e; margin-bottom:3px;">${m.sender} - ${m.date}</div>
            <div>${m.text}</div>
        `;
        msgBox.appendChild(div);
    });
    msgBox.scrollTop = msgBox.scrollHeight;
}

function addTicketReply() {
    const input = document.getElementById('ticket-reply-input');
    const text = input.value.trim();
    if (text === '' || !activeTicketId) return;

    const ticket = tickets.find(t => t.id === activeTicketId);
    if (ticket) {
        ticket.messages.push({
            sender: currentUser ? currentUser.email : "Anonyme",
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
        alert("Statut du ticket mis à jour : " + newStatus);
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

// -------------------------------------------------------------
// 4. ACCÈS ADMINISTRATION
// -------------------------------------------------------------
function accessAdmin() {
    const pin = prompt("Entrez le code secret Administrateur :");
    if (pin === ADMIN_PIN) {
        if (!currentUser) currentUser = { email: "admin@rootai.com", isAdmin: true };
        currentUser.isAdmin = true;
        localStorage.setItem('rootai_user', JSON.stringify(currentUser));
        updateUserUI();
        alert("🔓 Accès Admin activé ! Vous pouvez voir tous les tickets.");
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
