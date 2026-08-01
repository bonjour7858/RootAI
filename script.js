// Remplace par ta vraie clé API Groq
const API_KEY = "TA_CLE_GROQ_ICI"; 

// Mémoire de conversation
let conversationHistory = [
    { role: "system", content: "Tu es RootAI, une IA tout-en-un ultra puissante, polyvalente, polie et experte en code, rédaction et réponse aux questions." }
];

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
    document.getElementById('page-' + pageName).classList.add('active-page');
    if (document.getElementById('link-' + pageName)) {
        document.getElementById('link-' + pageName).classList.add('active');
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const text = input.value.trim();

    if (text === '') return;

    // Afficher message utilisateur
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.textContent = text;
    chatBox.appendChild(userMsg);
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Détection si l'utilisateur demande une image
    if (text.toLowerCase().startsWith('/image') || text.toLowerCase().includes('génère une image') || text.toLowerCase().includes('dessine')) {
        generateImage(text, chatBox);
        return;
    }

    // Ajouter à la mémoire
    conversationHistory.push({ role: "user", content: text });

    // Afficher l'indicateur
    const botMsg = document.createElement('div');
    botMsg.className = 'message bot';
    botMsg.textContent = "RootAI génère la réponse... 🧠";
    chatBox.appendChild(botMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

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
            
            // Sauvegarder dans la mémoire
            conversationHistory.push({ role: "assistant", content: aiReply });
        } else {
            botMsg.textContent = "Erreur : Vérifiez votre clé API dans script.js";
        }

    } catch (error) {
        console.error(error);
        botMsg.textContent = "Erreur de connexion avec l'IA.";
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

// Générateur d'images HD 100% gratuit
function generateImage(prompt, chatBox) {
    const botMsg = document.createElement('div');
    botMsg.className = 'message bot';
    botMsg.textContent = "🎨 Génération de l'image en cours...";
    chatBox.appendChild(botMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    const cleanPrompt = encodeURIComponent(prompt.replace('/image', '').trim());
    const imageUrl = `https://pollinations.ai/p/${cleanPrompt}?width=800&height=600&seed=${Math.floor(Math.random() * 1000)}`;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'generated-image';
    img.onload = () => {
        botMsg.textContent = "Voici votre image générée :";
        botMsg.appendChild(img);
        chatBox.scrollTop = chatBox.scrollHeight;
    };
    img.onerror = () => {
        botMsg.textContent = "Erreur lors de la création de l'image.";
    };
}

function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(); }
