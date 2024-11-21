document.addEventListener("DOMContentLoaded", async () => {
    const friendsList = document.getElementById('friends');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const chatReceiver = document.getElementById('chat-user');
    const sendMessageButton = document.getElementById('send-message');
    const isTesting = true; // Basculer sur false pour utiliser le backend réel
    const userId = 1; // Remplacer par l'ID de l'utilisateur connecté en production
    let selectedConversationId = null;
    let ws = null;

    // Données de test
    const testFriends = [
		{ name: 'Elodie', unread: true },
		{ name: 'User B', unread: true },
		{ name: 'User C', unread: false },
		{ name: 'User E', unread: false },
		{ name: 'User F', unread: false },
		{ name: 'User G', unread: false },
		{ name: 'User H', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User B', unread: false },
		{ name: 'User C', unread: false }
    ];
    const testMessages = [
        { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
        { sentFromUser: { name: 'Me' }, messageContent: 'Comment ça va ?' },
    ];

    // Charger la liste des amis
    async function loadFriends() {
        if (isTesting) {
            renderFriends(testFriends);
        } else {
            const response = await fetch('/friends/', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const friends = await response.json();
            renderFriends(friends);
        }
    }

    function renderFriends(friends) {
        friendsList.innerHTML = '';
        friends.forEach(friend => {
            const li = document.createElement('li');
            li.textContent = friend.name;
            if (friend.unread) {
                const unread = document.createElement('span');
                unread.textContent = '●';
                unread.className = 'unread';
                li.appendChild(unread);
            }
            li.addEventListener('click', () => selectConversation(friend.id));
            friendsList.appendChild(li);
        });
    }

    // Sélectionner une conversation
    async function selectConversation(friendId) {
        if (isTesting) {
            chatMessages.innerHTML = '';
            renderMessages(testMessages);
        } else {
            const response = await fetch(`/conversations/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const conversations = await response.json();

            const conversation = conversations.find(conv => 
                (conv.user1.id === userId && conv.user2.id === friendId) || 
                (conv.user1.id === friendId && conv.user2.id === userId)
            );

            if (conversation) {
                selectedConversationId = conversation.id;
                loadMessages(selectedConversationId);
                openWebSocket(selectedConversationId);
            } else {
                const newConvResponse = await fetch('/conversations/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id: friendId }),
                });
                const newConversation = await newConvResponse.json();
                selectedConversationId = newConversation.id;
                chatMessages.innerHTML = '';
                openWebSocket(selectedConversationId);
            }
        }
    }

    // Charger les messages d'une conversation
    async function loadMessages(conversationId) {
        if (isTesting) {
            renderMessages(testMessages);
        } else {
            const response = await fetch(`/conversations/${conversationId}/messages/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const messages = await response.json();
            renderMessages(messages);
        }
    }

    function renderMessages(messages) {
        chatMessages.innerHTML = '';
        messages.forEach(message => {
            const div = document.createElement('div');
            div.textContent = `${message.sentFromUser.name}: ${message.messageContent}`;
            if (message.sentFromUser.name === "Me") {
                div.classList.add('sent-by-me');
            }
            chatMessages.appendChild(div);
        });
    }

    // Ouvrir une connexion WebSocket
    function openWebSocket(conversationId) {
        if (ws) ws.close();

        ws = new WebSocket(`ws://localhost:8000/ws/chat/${conversationId}/`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const div = document.createElement('div');
            div.textContent = `${data.sender.name}: ${data.content}`;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
        };
    }

    // Envoyer un message
    sendMessageButton.addEventListener('click', () => {
        const messageContent = messageInput.value.trim();
        if (messageContent) {
            if (isTesting) {
                const newMessage = {
                    sentFromUser: { name: 'Me' },
                    messageContent,
                };
                renderMessages([...testMessages, newMessage]); // Simuler l'ajout de message
                messageInput.value = ''; // Clear input field
            } else if (ws) {
                ws.send(JSON.stringify({ messageContent }));
                messageInput.value = ''; // Clear the input field
            }
        }
    });

    // Trigger send on Enter key press
    messageInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
                const messageContent = messageInput.value.trim();
                if (messageContent) {
                    if (isTesting) {
                        const newMessage = {
                            sentFromUser: { name: 'Me' },
                            messageContent,
                        };
                        renderMessages([...testMessages, newMessage]); // Simuler l'ajout de message
                        messageInput.value = ''; // Clear input field
                    } else if (ws) {
                        ws.send(JSON.stringify({ messageContent }));
                        messageInput.value = ''; // Clear the input field
                    }
                }
        }
    });
    await loadFriends();
    window.addEventListener('beforeunload', () => {
        if (ws) ws.close(); // Fermer la connexion WebSocket lorsque l'utilisateur quitte la page
    });
});
