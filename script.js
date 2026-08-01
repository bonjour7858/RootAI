// Clé API Groq (À remplacer par la tienne)
const API_KEY = "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"; 

// Mot de passe maître pour le Panneau d'Administration
const ADMIN_PIN = "7878"; // ⬅️ Change ce code admin par celui que tu veux !

// Base de données locale
let currentUser = JSON.parse(localStorage.getItem('rootai_user')) || null;
let tickets = JSON.parse(localStorage.getItem('rootai_tickets')) || [
    { id: 1001, subject: "Problème d'accès", priority: "Haute", status: "Résolu", user: "demo@rootai.com", desc: "Je n'arrive pas à me connecter.", replies: ["Admin: Bonjour, le souci est réglé !"] }
];
let conversationHistory = [
    { role: "system", content: "Tu es RootAI, une IA tout-en-un ultra puissante, polyvalente et experte." }
];

// Navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
    
    const targetPage = document.getElementById('page-' + pageName);
    if(targetPage) targetPage.classList.add('active-page');
    
    if (document.getElementById('link-' + pageName)) {
        document.getElementById('link-' + pageName).classList.add('active');
    }
    updateUserUI();
}

// -------------------------------------------------------------
// 1. SYSTÈME DE COMPTES & AUTHENTIFICATION
// -------------------------------------------------------------
function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const isPremium = false;
    
    currentUser = { email: email, isPremium: isPremium, role: email.includes('admin') ? 'admin' : 'user' };
    localStorage.setItem('rootai_user', JSON.stringify(currentUser));
    alert('Bienvenue ' + email + ' !');
    updateUserUI();
    showPage('chat');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('rootai_user');
    updateUserUI();
    alert('Déconnexion réussie.');
}

function updateUserUI() {
    const authLink = document.getElementById('link-auth');
    const userBadge = document.getElementById('user-badge');
    
    if (currentUser) {
        authLink.textContent = "Déconnexion";
        authLink.onclick = logout;
        if (userBadge) {
            userBadge.innerHTML = `👤 ${currentUser.email} ${currentUser.isPremium ? '<span style="color:#a855f7;">[PREMIUM]</span>' : '[GRATUIT]'}`;
        }
    } else {
        authLink.textContent = "Connexion";
        authLink.onclick = () => showPage('auth');
        if (userBadge) userBadge.innerHTML = "";
    }
}

// -------------------------------------------------------------
// 2. ABONNEMENT PREMIUM (3€ / mois)
// -------------------------------------------------------------
function subscribePremium() {
    if (!currentUser) {
        alert("Veuillez vous connecter avant de souscrire un abonnement.");
        showPage('auth');
        return;
    }
    
    // Simulation du paiement Stripe
    if (confirm("Payer 3,00 €/mois pour passer RootAI en version Premium ?")) {
        currentUser.isPremium = true;
        localStorage.setItem('rootai_user', JSON.stringify(currentUser));
        alert("Félicitations ! Vous êtes maintenant Membre Premium 🚀");
        updateUserUI();
        showPage('chat');
    }
}

// -------------------------------------------------------------
// 3. IA CHAT & GENERATEUR D'IMAGES
// -------------------------------------------------------------
async function sendMessage() {
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const text = input.value.trim();

    if (text === '') return;

    // Affiche message utilisateur
    appendMessage(text, 'user');
    input.value = '';

    // Détection commande Image
    if (text.toLowerCase().startsWith('/image') || text.toLowerCase().includes('génère une image')) {
        generateImage(text, chatBox);
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
            botMsg.textContent = "Vérifiez votre clé API dans script.js.";
        }
    } catch (error) {
        botMsg.textContent = "Erreur de connexion au serveur d'IA.";
    }
}

function generateImage(prompt, chatBox) {
    const botMsg = appendMessage("🎨 Génération de l'image Haute Définition...", 'bot');
    const cleanPrompt = encodeURIComponent(prompt.replace('/image', '').trim());
    const imageUrl = `https://pollinations.ai/p/${cleanPrompt}?width=800&height=600&seed=${Math.floor(Math.random()*1000)}`;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'generated-image';
    img.onload = () => {
        botMsg.textContent = "Voici l'image générée :";
        botMsg.appendChild(img);
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
// 4. TICKETS SUPPORT + ESPACE ADMIN (SEUL TOI PEUX RÉPONDRE)
// -------------------------------------------------------------
function createTicket(e) {
    e.preventDefault();
    if (!currentUser) {
        alert("Connectez-vous pour ouvrir un ticket.");
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
    alert("Ticket créé avec succès !");
}

function renderTickets() {
    const list = document.getElementById('ticket-list');
    if (!list) return;
    list.innerHTML = '';

    tickets.forEach(t => {
        const item = document.createElement('div');
        item.className = 'ticket-item';
        item.innerHTML = `
            <div>
                <strong>#${t.id} - ${t.subject} (${t.user})</strong>
                <p style="font-size:0.8rem; color:#8b949e;">Priorité: ${t.priority} | ${t.desc}</p>
                ${t.replies.map(r => `<div style="color:#58a6ff; font-size:0.85rem; margin-top:5px;">💬 ${r}</div>`).join('')}
            </div>
            <span class="ticket-status ${t.status === 'Résolu' ? 'status-closed' : 'status-open'}">${t.status}</span>
        `;
        list.appendChild(item);
    });
}

function accessAdmin() {
    const pin = prompt("Entrez le code PIN d'administration :");
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

    tickets.forEach((t, index) => {
        const card = document.createElement('div');
        card.className = 'card-box';
        card.style.marginBottom = '15px';
        card.innerHTML = `
            <h3>Ticket #${t.id} - ${t.subject}</h3>
            <p><strong>Utilisateur :</strong> ${t.user}</p>
            <p><strong>Message :</strong> ${t.desc}</p>
            <p><strong>Statut actuel :</strong> ${t.status}</p>
            <div style="margin-top:10px;">
                <input type="text" id="reply-input-${index}" placeholder="Répondre à l'utilisateur..." style="width:70%; padding:8px; background:#0d1117; color:white; border:1px solid #30363d; border-radius:4px;">
                <button onclick="adminReply(${index})" class="btn-action" style="padding:8px 12px;">Envoyer</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function adminReply(index) {
    const input = document.getElementById(`reply-input-${index}`);
    const replyText = input.value.trim();
    if (replyText === '') return;

    tickets[index].replies.push(`Support Admin: ${replyText}`);
    tickets[index].status = "Résolu";
    localStorage.setItem('rootai_tickets', JSON.stringify(tickets));
    renderAdminTickets();
    alert("Réponse envoyée et ticket marqué comme résolu !");
}

window.onload = () => {
    updateUserUI();
    renderTickets();
};
