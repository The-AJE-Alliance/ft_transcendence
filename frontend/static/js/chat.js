import ky from 'ky'
import chatPage from '../pages/chat.html?raw'
import '../css/chat.css'

export async function chat(client) {
  client.app.innerHTML = chatPage
  const friendsList = document.getElementById('friends')
  const chatMessages = document.getElementById('chat-messages')
  const messageInput = document.getElementById('message-input')
  const sendMessageButton = document.getElementById('send-message')
  const blockButton = document.getElementById('block-user')
  const getProfileButton = document.getElementById('profile-user')
  const inviteToGameButton = document.getElementById('invite-game')
  const isTesting = true // Basculer sur false pour utiliser le backend réel
  const userId = 1 // Remplacer par l'ID de l'utilisateur connecté en production
  const state = {
    selectedConversationId: null,
  }

  let ws = null

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
    { name: 'User C', unread: false },
  ]
  const testMessages = [
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'User A' }, messageContent: 'Salut !' },
    { sentFromUser: { name: 'Me' }, messageContent: 'Comment ça va ?' },
  ]

  // Charger la liste des amis
  async function loadFriends() {
    if (isTesting) {
      renderFriends(testFriends)
    }
    else {
      const friends = await ky.get('/friends/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      }).json()
      renderFriends(friends)
    }
  }

  function renderFriends(friends) {
    friendsList.innerHTML = ''
    friends.forEach((friend) => {
      const li = document.createElement('li')
      li.textContent = friend.name
      if (friend.unread) {
        const unread = document.createElement('span')
        unread.textContent = '●'
        unread.className = 'unread'
        li.appendChild(unread)
      }
      client.router.addEvent(li, 'click', () => selectConversation(friend))
      friendsList.appendChild(li)
    })
  }

  async function selectConversation(friend) {
    document.getElementById('chat-user').innerText = friend.name
    if (isTesting) {
      chatMessages.innerHTML = ''
      renderMessages(testMessages)
    }
    else {
      const conversations = await ky.get(`/conversations/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      }).json()
      // TODO: ajouter un trycatch

      const conversation = conversations.find(conv =>
        (conv.user1.id === userId && conv.user2.id === friend.id)
        || (conv.user1.id === friend.id && conv.user2.id === userId),
      )

      if (conversation) {
        state.selectedConversationId = conversation.id
        loadMessages(state.selectedConversationId)
        openWebSocket(state.selectedConversationId)
      }
      else {
        const newConversation = await ky.post('/conversations/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ user_id: friend.id }),
        }).json()
        state.selectedConversationId = newConversation.id
        chatMessages.innerHTML = ''
        openWebSocket(state.selectedConversationId)
      }
    }
  }

  // Charger les messages d'une conversation
  async function loadMessages(conversationId) {
    if (isTesting) {
      renderMessages(testMessages)
    }
    else {
      const messages = await ky.get(`/conversations/${conversationId}/messages/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      }).json()
      renderMessages(messages)
    }
  }

  function renderMessages(messages) {
    chatMessages.innerHTML = ''
    messages.forEach((message) => {
      const div = document.createElement('div')
      div.textContent = `${message.sentFromUser.name}: ${message.messageContent}`
      if (message.sentFromUser.name === 'Me') {
        div.classList.add('sent-by-me')
      }
      chatMessages.appendChild(div)
    })
    chatMessages.scrollTop = chatMessages.scrollHeight
  }

  // Ouvrir une connexion WebSocket
  function openWebSocket(conversationId) {
    if (ws)
      ws.close()

    ws = new WebSocket(`ws://localhost:8000/ws/chat/${conversationId}/`)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const div = document.createElement('div')
      div.textContent = `${data.sender.name}: ${data.content}`
      chatMessages.appendChild(div)
      chatMessages.scrollTop = chatMessages.scrollHeight // Auto-scroll
    }
  }

  // Envoyer un message
  client.router.addEvent(sendMessageButton, 'click', () => {
    const messageContent = messageInput.value.trim()
    if (messageContent) {
      if (isTesting) {
        const newMessage = {
          sentFromUser: { name: 'Me' },
          messageContent,
        }
        renderMessages([...testMessages, newMessage]) // Simuler l'ajout de message
        messageInput.value = '' // Clear input field
      }
      else if (ws) {
        ws.send(JSON.stringify({ messageContent }))
        messageInput.value = '' // Clear the input field
      }
    }
  })
  //
  // Trigger send on Enter key press
  client.router.addEvent(messageInput, 'keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const messageContent = messageInput.value.trim()
      if (messageContent) {
        if (isTesting) {
          const newMessage = {
            sentFromUser: { name: 'Me' },
            messageContent,
          }
          renderMessages([...testMessages, newMessage]) // Simuler l'ajout de message
          messageInput.value = '' // Clear input field
        }
        else if (ws) {
          ws.send(JSON.stringify({ messageContent }))
          messageInput.value = '' // Clear the input field
        }
      }
    }
  })

  // Bloquer le contact
  client.router.addEvent(blockButton, 'click', async () => {
    if (!state.selectedConversationId) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    if (ws)
      ws.close()
    try {
      const response = await ky.post(`/conversations/${state.selectedConversationId}/block/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      })
      if (!response.ok) {
        console.error('Erreur lors du blocage du contact.')
        return
      }
    }
    catch (error) {
      console.error('Error during block submission:', error)
    }
    await loadMessages(state.selectedConversationId)
  })

  // Voir profile
  client.router.addEvent(getProfileButton, 'click', async () => {
    if (!state.selectedConversationId && !isTesting) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    if (ws)
      ws.close()
  })

  // Envoyer une invitation
  client.router.addEvent(inviteToGameButton, 'click', async () => {
    if (!state.selectedConversationId && !isTesting) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    // TODO: get the room id
    if (isTesting) {
      const messageContent = 'Join me at Pong party! Here\'s the link: https://transcendence.fr/pong/remote/join/XXX'
      const newMessage = {
        sentFromUser: { name: 'Me' },
        messageContent,
      }
      renderMessages([...testMessages, newMessage]) // Simuler l'ajout de message
      messageInput.value = ''
      return
    }
    try {
      const roomId = TODOmyRandomAPItoGetit()
      const response = await ky.post(`/conversations/${state.selectedConversationId}/invite/`, {
        json: {
          room_id: roomId,
          conversation_id: state.selectedConversationId,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      })
      if (!response.ok) {
        console.error('Erreur lors de l\'envoi de l\'invitation.')
      }
    }
    catch (error) {
      console.error('Erreur lors de l\'appel API pour l\'invitation:', error)
    }
  })

  await loadFriends()
  window.addEventListener('beforeunload', () => {
    if (ws)
      ws.close() // Fermer la connexion WebSocket lorsque l'utilisateur quitte la page
  })
}
