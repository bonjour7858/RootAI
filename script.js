// 🔑 Mets ta clé Groq valide ici (commence par gsk_...)
const API_KEY = "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"; 

// 🔐 Ton code PIN secret pour accéder au Panneau Admin
const ADMIN_PIN = "1234";

// Données en mémoire locale
let currentUser = JSON.parse(localStorage.getItem('rootai_user')) || null;
let tickets = JSON.parse(localStorage.getItem('rootai_tickets')) || [];
let conversationHistory = [
    { role: "system", content: "Tu es RootAI, une IA tout-en-un puissante, utile et aimable." }
];

// Gestion des pages
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
// 1. GESTION DES COMPTES
// -------------------------------------------------------------
function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    currentUser = { email: email, isPremium: false };
    localStorage.setItem('rootai_user', JSON.stringify(currentUser));
    alert('Connexion réussie ! Bienvenue ' + email);
    updateUserUI();
    showPage('chat');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('rootai_user');
    updateUserUI();
    alert('Vous êtes déconnecté.');
}

function updateUserUI() {
    const authLink = document.getElementById('link-auth');
    const userBadge = document.getElementById('user-badge');
    
    if (currentUser) {
        authLink.textContent = "Déconnexion";
        authLink.onclick = logout;
        if (userBadge) {
            userBadge.innerHTML = `👤 ${currentUser.email} ${currentUser.isPremium ? '<b style="color:#a855f7;">[PREMIUM]</b>' : '[GRATUIT]'}`;
        }
    } else {
        authLink.textContent = "Connexion";
        authLink.onclick = () => showPage('auth');
        if (userBadge) userBadge.innerHTML = "";
    }
}

// -------------------------------------------------------------
// 2. SYSTEME PREMIUM (3€)
// -------------------------------------------------------------
function subscribePremium() {
    if (!currentUser) {
        alert("Veuillez vous connecter avant de souscrire.");
        showPage('auth');
        return;
    }
    
    if (confirm("Confirmer l'abonnement RootAI Premium à 3,00 € / mois ?")) {
        currentUser.isPremium = true;
        localStorage.setItem('rootai_user', JSON.stringify(currentUser));
        alert("🎉 Bravo ! Vous êtes désormais membre Premium !");
        updateUserUI();
        showPage('chat');
    }
}

// -------------------------------------------------------------
// 3. IA CHAT + GENERATEUR D'IMAGES
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
            botMsg.textContent = "Erreur : La clé API Groq est invalide ou manquante.";
        }
    } catch (error) {
        botMsg.textContent = "Erreur de connexion avec l'IA.";
    }
}

function triggerImageGen() {
    const prompt = document.getElementById('img-prompt-input').value;
    if (!prompt) return;
    showPage('chat');
    generateImage(prompt);
}

function generateImage(promptText) {
    const botMsg = appendMessage("🎨 Génération de votre image en cours...", 'bot');
    const cleanPrompt = encodeURIComponent(promptText);
    const imageUrl = `https://pollinations.ai/p/${cleanPrompt}?width=800&height=600&seed=${Math.floor(Math.random()*10000)}`;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'generated-image';
    img.onload = () => {
        botMsg.textContent = "Voici votre création :";
        botMsg.appendChild(img);
    };
    img.onerror = () => {
        botMsg.textContent = "Erreur lors de la génération de l'image.";
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
// 4. TICKETS SUPPORT CLIENT + PANNEAU ADMIN
// -------------------------------------------------------------
function createTicket(e) {
    e.preventDefault();
    if (!currentUser) {
        alert("Connectez-vous pour envoyer un ticket.");
        showPage('auth');
        return;
    }
    const subject = document.getElementById('ticket-subject').value;
    const priority = document.getElementById('ticket-priority').value;
    const desc = document.getElementById('ticket-desc').value;

    const newTicket = {
        id: Math.floor(1000 + Math.random() * 9000),
        subject: subject,
        priority: priority,
        status: "En attente",
        user: currentUser.email,
        desc: desc,
        replies: []
    };

    tickets.unshift(newTicket);
    localStorage.setItem('rootai_tickets', JSON.stringify(tickets));
    renderTickets();
    document.getElementById('ticket-subject').value = '';
    document.getElementById('ticket-desc').value = '';
    alert("Ticket créé avec succès ! Le support vous répondra bientôt.");
}

function renderTickets() {
    const list = document.getElementById('ticket-list');
    if (!list) return;
    list.innerHTML = '';

    if (tickets.length === 0) {
        list.innerHTML = "<p style='color:#8b949e;'>Aucun ticket pour le moment.</p>";
        return;
    }

    tickets.forEach(t => {
        const item = document.createElement('div');
        item.style.background = "#21262d";
        item.style.padding = "12px";
        item.style.borderRadius = "8px";
        item.style.marginBottom = "10px";
        item.innerHTML = `
            <div>
                <strong>#${t.id} - ${t.subject}</strong> <span style="font-size:0.8rem; color:#a855f7;">(${t.status})</span>
                <p style="font-size:0.85rem; color:#8b949e; margin-top:4px;">${t.desc}</p>
                ${t.replies.map(r => `<div style="color:#58a6ff; font-size:0.85rem; margin-top:6px; background:#0d1117; padding:6px; border-radius:4px;">💬 ${r}</div>`).join('')}
            </div>
        `;
        list.appendChild(item);
    });
}

function accessAdmin() {
    const pin = prompt("Code secret Administrateur :");
    if (pin === ADMIN_PIN) {
        showPage('admin');
        renderAdminTickets();
    } else {
        alert("Code PIN incorrect ! Accès refusé.");
    }
}

function renderAdminTickets() {
    const container = document.getElementById('admin-tickets-container');
    container.innerHTML = '';

    if (tickets.length === 0) {
        container.innerHTML = "<p style='color:#8b949e;'>Aucun ticket d'utilisateur à traiter.</p>";
        return;
    }

    tickets.forEach((t, index) => {
        const card = document.createElement('div');
        card.className = 'card-box';
        card.style.marginBottom = '15px';
        card.innerHTML = `
            <h3>Ticket #${t.id} - ${t.subject}</h3>
            <p><strong>De :</strong> ${t.user} | <strong>Priorité :</strong> ${t.priority}</p>
            <p style="margin:8px 0; background:#0d1117; padding:10px; border-radius:6px;">${t.desc}</p>
            <div style="margin-top:10px; display:flex; gap:10px;">
                <input type="text" id="reply-input-${index}" placeholder="Votre réponse en tant qu'Admin..." style="flex:1; padding:8px; background:#0d1117; color:white; border:1px solid #30363d; border-radius:4px;">
                <button onclick="adminReply(${index})" class="btn-action">Répondre</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function adminReply(index) {
    const input = document.getElementById(`reply-input-${index}`);
    const replyText = input.value.trim();
    if (replyText === '') return;

    tickets[index].replies.push(`Support: ${replyText}`);
    tickets[index].status = "Résolu";
    localStorage.setItem('rootai_tickets', JSON.stringify(tickets));
    renderAdminTickets();
    alert("Réponse envoyée au client !");
}

window.onload = () => {
    updateUserUI();
    renderTickets();
};
