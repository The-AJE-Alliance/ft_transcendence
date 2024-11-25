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
  const userId = client.userId // TODO: WITH THE LOADED
  let selectedConversationId = null
  let ws = null

  async function loadFriends() {
    const friends = await ky.get('/friends/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      credentials: 'include',
    }).json()
    const conversations = await ky.get(`/conversations/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      credentials: 'include',
    }).json()
    renderFriends(friends, conversations)
  }

  function renderFriends(friends, conversations) {
    friendsList.innerHTML = ''
    friends.forEach((friend) => {
      const conversationWithUnreadMsg = conversations.find(conv => (conv.user1.id === userId && conv.user2.id === friend.id
        && conv.hasUnreadMessagesByUser1) || (conv.user1.id === friend.id && conv.user2.id === userId && conv.hasUnreadMessagesByUser2))
      const li = document.createElement('li')
      li.textContent = friend.nickname
      if (conversationWithUnreadMsg) {
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
    document.getElementById('chat-user').textContent = friend.nickname
    updateReadStatus(friend.nickname, false)
    try {
      const conversations = await ky.get(`/conversations/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      }).json()
      const conversation = conversations.find(conv =>
        (conv.user1.id === userId && conv.user2.id === friend.id)
        || (conv.user1.id === friend.id && conv.user2.id === userId),
      )
      if (conversation) {
        selectedConversationId = conversation.id
        loadMessages(selectedConversationId)
        openWebSocket(selectedConversationId)
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
        selectedConversationId = newConversation.id
        chatMessages.innerHTML = ''
        openWebSocket(selectedConversationId)
      }
    }
    catch (error) {
      console.error('Error while loading the selected conversation:', error)
    }
  }

  // Charger les messages d'une conversation
  async function loadMessages(conversationId) {
    const messages = await ky.get(`/conversations/${conversationId}/messages/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      credentials: 'include',
    }).json()
    renderMessages(messages)
  }

  function renderMessages(messages) {
    chatMessages.innerHTML = ''
    messages.forEach((message) => {
      const div = document.createElement('div')
      div.textContent = `${message.sentFromUser.nickname}: ${message.messageContent}`
      if (message.sentFromUser.nickname === 'Me') {
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
      div.textContent = `${data.sender.nickname}: ${data.content}`
      chatMessages.appendChild(div)
      chatMessages.scrollTop = chatMessages.scrollHeight // Auto-scroll
    }
  }

  function updateReadStatus(friendNickame, isUnread) {
    const friendItem = [...friendsList.children].find(li => li.textContent.trim().startsWith(friendNickame))

    if (!friendItem) {
      console.error('Conversation introuvable dans la liste.')
      return
    }
    const unreadIndicator = friendItem.querySelector('.unread')
    if (isUnread) {
      if (!unreadIndicator) {
        const newIndicator = document.createElement('span')
        newIndicator.textContent = '●'
        newIndicator.className = 'unread'
        friendItem.appendChild(newIndicator)
      }
    }
    else {
      if (unreadIndicator) {
        unreadIndicator.remove()
      }
    }
  }

  // Envoyer un message
  client.router.addEvent(sendMessageButton, 'click', () => {
    const messageContent = messageInput.value.trim()
    if (messageContent) {
      if (ws) {
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
        if (ws) {
          ws.send(JSON.stringify({ messageContent }))
          messageInput.value = '' // Clear the input field
        }
      }
    }
  })

  client.router.addEvent(blockButton, 'click', async () => {
    if (!selectedConversationId) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    if (ws)
      ws.close()
    try {
      const response = await ky.post(`/conversations/${selectedConversationId}/block/`, {
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
    await loadMessages(selectedConversationId)
  })

  client.router.addEvent(getProfileButton, 'click', async () => {
    if (!selectedConversationId) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    if (ws)
      ws.close()
    // TODO: ADD HERE THE FUNCTION TO LOAD A USER PROFILE
  })

  // Envoyer une invitation
  client.router.addEvent(inviteToGameButton, 'click', async () => {
    if (!selectedConversationId) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    try {
      // TODO: ADD HERE THE API CALL TO GET THE ROOM_ID
      const roomId = TODOmyRandomAPItoGetit()
      const response = await ky.post(`/conversations/${selectedConversationId}/invite/`, {
        json: {
          room_id: roomId,
          conversation_id: selectedConversationId,
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
      ws.close()
  })
}
