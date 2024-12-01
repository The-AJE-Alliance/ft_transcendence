import ky from 'ky'
import chatPage from '../pages/chat.html?raw'
import { updateNavbar } from './navbar.js'
import '../css/chat.css'

export async function chat(client) {
  await updateNavbar(client)
  client.app.innerHTML = chatPage
  const friendsList = document.getElementById('friends')
  const chatMessages = document.getElementById('chat-messages')
  const messageInput = document.getElementById('message-input')
  const sendMessageButton = document.getElementById('send-message')
  const blockButton = document.getElementById('block-user')
  const getProfileButton = document.getElementById('profile-user')
  const inviteToGameButton = document.getElementById('invite-game')
  let selectedFriendId = null
  let senderNickname = null
  let selectedFriendNickname = null
  const friendNicknameToId = new Map()
  const friendIdToNickname = new Map()

  async function loadFriends() {
    const friends = await ky.get(`https://chat.api.transcendence.fr/friends/${client.id}/`, {
      credentials: 'include',
    }).json()
    const conversations = await ky.get(`https://chat.api.transcendence.fr/conversations/${client.id}/`, {
      credentials: 'include',
    }).json()
    friends.forEach((friend) => {
      friendNicknameToId.set(friend.nickname, friend.id)
      friendIdToNickname.set(friend.id, friend.nickname)
    })
    renderFriends(friends, conversations)
  }

  function renderFriends(friends, conversations) {
    friendsList.innerHTML = ''
    friends.forEach((friend) => {
      const conversationWithUnreadMsg = conversations.find(conv => (conv.user1.id === client.id && conv.user2.id === friend.id
        && conv.hasUnreadMessagesByUser1) || (conv.user1.id === friend.id && conv.user2.id === client.id && conv.hasUnreadMessagesByUser2))
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
  await loadFriends()

  async function selectConversation(friend) {
    if (client.socket) {
      client.socket.close()
      client.socket = null
    }
    // Todo: IF click on navbar, shut the websocket down
    document.getElementById('chat-user').textContent = friend.nickname
    selectedFriendId = friendNicknameToId.get(friend.nickname)
    selectedFriendNickname = friend.nickname
    updateFrontendReadStatus(friend.nickname, false)
    try {
      const response = await loadMessages(client.id, selectedFriendId, selectedFriendNickname)
      if (response.is_blocked === false) {
        openWebSocket(response.id, selectedFriendNickname)
      }
    }
    catch (error) {
      console.error('Error while loading the selected conversation:', error)
    }
  }

  // Charger les messages d'une conversation
  async function loadMessages(loggedUserId, friendId, friendNickname) {
    const response = await ky.get(`https://chat.api.transcendence.fr/conversations/${loggedUserId}/${friendId}/messages/`, {
      credentials: 'include',
    }).json()
    renderMessages(response.messages, friendNickname)
    return (response)
  }

  function renderMessages(messages, friendNickname) {
    chatMessages.innerHTML = ''
    messages.forEach((message) => {
      const div = document.createElement('div')
      if (message.sentFromUser.nickname !== friendNickname) {
        div.textContent = `Me: ${message.messageContent}`
        div.classList.add('sent-by-me')
      }
      else {
        div.textContent = `${message.sentFromUser.nickname}: ${message.messageContent}`
      }
      chatMessages.appendChild(div)
    })
    chatMessages.scrollTop = chatMessages.scrollHeight
  }

  // Ouvrir une connexion WebSocket
  function openWebSocket(socketID, friendNickname) {
    if (client.socket) {
      client.socket.close()
      client.socket = null
    }
    if (!socketID) {
      console.error('Invalid WebSocket ID.')
      return
    }
    client.socket = new WebSocket(`wss://chat.api.transcendence.fr/ws/chat/${socketID}/${client.id}/`)
    client.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const div = document.createElement('div')
        senderNickname = friendIdToNickname.get(Number.parseInt(data.sender_id))
        if (senderNickname) {
          div.textContent = `${senderNickname}: ${data.messageContent}`
        }
        else {
          div.textContent = `Me: ${data.messageContent}`
        }
        if (senderNickname !== friendNickname) {
          div.classList.add('sent-by-me')
        }
        chatMessages.appendChild(div)
        chatMessages.scrollTop = chatMessages.scrollHeight // Auto-scroll
      }
      catch (e) {
        console.error('Error parsing WebSocket message:', e)
      }
    }
  }

  function updateFrontendReadStatus(friendNickame, isUnread) {
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
    if (messageContent && client.socket) {
      client.socket.send(JSON.stringify({ messageContent }))
      messageInput.value = '' // Clear the input field
    }
  })
  //
  // Trigger send on Enter key press
  client.router.addEvent(messageInput, 'keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const messageContent = messageInput.value.trim()
      if (messageContent) {
        if (client.socket) {
          client.socket.send(JSON.stringify({ messageContent }))
          messageInput.value = ''
        }
      }
    }
  })

  client.router.addEvent(blockButton, 'click', async () => {
    if (!selectedFriendId) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    try {
      const responseBlock = await ky.post(`https://chat.api.transcendence.fr/conversations/${client.id}/${selectedFriendId}/block/`, {
        credentials: 'include',
      })
      if (!responseBlock.ok) {
        console.error('Erreur lors du blocage du contact.')
        return
      }
      const responseLoad = await loadMessages(client.id, selectedFriendId, selectedFriendNickname)
      if (client.socket && responseLoad.is_blocked === true) {
        client.socket.close()
        client.socket = null
      }
      if (responseLoad.is_blocked === false) {
        openWebSocket(responseLoad.id, selectedFriendNickname)
      }
    }
    catch (error) {
      console.error('Error during block submission:', error)
    }
  })

  client.router.addEvent(getProfileButton, 'click', async () => {
    if (!selectedFriendId) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    if (client.socket) {
      client.socket.close()
      client.socket = null
    }
    // TODO: ADD HERE THE FUNCTION TO LOAD A USER PROFILE
  })

  client.router.addEvent(inviteToGameButton, 'click', async () => {
    if (!selectedFriendId) {
      console.error('Aucune conversation sélectionnée.')
      return
    }
    const invite_link = 'fakeurl.com'// client.invitation_link
    const holder = messageInput.value
    messageInput.value = `Join me at Pong party! Here\'s the link: ${invite_link}`
    const messageContent = messageInput.value.trim()
    if (messageContent && client.socket) {
      client.socket.send(JSON.stringify({ messageContent }))
      messageInput.value = '' // Clear the input field
    }
    messageInput.value = holder
  })
}
