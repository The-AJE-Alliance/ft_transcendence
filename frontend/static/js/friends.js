export async function loadFriends(client) {
  if (!client.token) {
    await client.refresh()
    if (!client.token) {
      client.app.innerHTML = '<p>Please login again</p>'
      return
    }
  }
  const friends = await getFriends(client)
  if (!friends) {
    client.app.innerHTML = '<p>Unable to load friends list</p>'
    return
  }
  const friendsList = document.getElementById('friends-list')
  friendsList.innerHTML = ''
  if (friends && friends.length > 0) {
    friends.forEach((friend) => {
      const listItem = document.createElement('li')
      listItem.textContent = friend.username

      const playButton = document.createElement('button')
      playButton.textContent = 'Jouer'
      playButton.addEventListener('click', () => startGameWithFriend(client, friend.id))

      listItem.appendChild(playButton)
      friendsList.appendChild(listItem)
    })
  }
  else {
    friendsList.innerHTML = '<li>No friends found</li>'
  }
}

// Fonction pour démarrer le jeu avec un ami
function startGameWithFriend(client, friendId) {
  // Redirige vers la route de jeu en ligne avec l'ID de l'ami comme adversaire
  client.router.redirect(`/pong/remote/${friendId}`)
}

/*
export async function loadFriends(client) {
  if (!client.token) {
    await client.refresh()
    if (!client.token) {
      client.app.innerHTML = '<p>Please login again</p>'
      return
    }
  }
  const friends = await getFriends(client)
  if (!friends) {
    client.app.innerHTML = '<p>Unable to load friends list</p>'
    return
  }
  const friendsList = document.getElementById('friends-list')
  friendsList.innerHTML = ''
  if (friends && friends.length > 0) {
    friendsList.innerHTML = friends.map(friend => `<li>${friend.username}</li>`).join('')
  }
  else {
    friendsList.innerHTML = '<li>No friends found</li>'
  }
}
*/
export async function getFriends(client) {
  try {
    const response = await fetch('https://auth.api.transcendence.local/friends/', {
      method: 'GET',
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    })
    if (response.ok) {
      return await response.json()
    }
    else {
      console.error('Failed to fetch friends', response.status)
      return null
    }
  }
  catch (error) {
    console.error('Error while trying to get friends:', error)
    return null
  }
}

export async function addFriend(client, friendUsername) {
  try {
    const response = await fetch('https://auth.api.transcendence.local/send-friend-request/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${client.token}`,
      },
      body: JSON.stringify({ username: friendUsername }),
    })
    if (response.ok) {
      console.log(`${friendUsername} has been added as a friend!`)
      await loadFriends(client)
    }
    else {
      console.error('Failed to add friend')
    }
  }
  catch (error) {
    console.error('Error while trying to add friend:', error)
  }
}
export async function sendFriendRequest(client, friendUsername) {
  const duplicateAlert = document.getElementById('duplicate-alert')
  const errorAlert = document.getElementById('error-alert')
  const friends = await getFriends(client)
  if (friends && friends.some(friend => friend.username === friendUsername)) {
    duplicateAlert.classList.remove('d-none')
    return
  }
  try {
    const response = await fetch('https://auth.api.transcendence.local/send-friend-request/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${client.token}`,
      },
      body: JSON.stringify({ username: friendUsername }),
    })
    if (response.ok) {
      console.log(`Friend request sent to ${friendUsername}!`)
      errorAlert.classList.add('d-none')
      await loadPendingFriendRequests(client)
    }
    else {
      errorAlert.classList.remove('d-none')
      console.error('Failed to send friend request')
    }
  }
  catch (error) {
    errorAlert.classList.remove('d-none')
    console.error('Error while trying to send friend request:', error)
  }
}

export async function acceptFriendRequest(client, fromUserId) {
  try {
    const response = await fetch('https://auth.api.transcendence.local/accept-friend-request/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${client.token}`,
      },
      body: JSON.stringify({ from_user_id: fromUserId }),
    })
    if (response.ok) {
      console.log(`Friend request from user ${fromUserId} accepted!`)
      await loadPendingFriendRequests(client)
      await loadFriends(client)
    }
    else {
      console.error('Failed to accept friend request')
    }
  }
  catch (error) {
    console.error('Error while trying to accept friend request:', error)
  }
}

export async function loadPendingFriendRequests(client) {
  try {
    const response = await fetch('https://auth.api.transcendence.local/pending-friend-requests/', {
      method: 'GET',
      headers: { Authorization: `Bearer ${client.token}` },
    })
    if (response.ok) {
      const pendingRequests = await response.json()
      const pendingList = document.getElementById('pending-requests-list')
      pendingList.innerHTML = ''

      if (pendingRequests.length) {
        pendingRequests.forEach((req) => {
          if (req.from_user && req.from_user.username) {
            // Créer un élément de liste pour chaque demande
            const listItem = document.createElement('li')
            listItem.textContent = req.from_user.username

            // Créer un bouton "Accepter"
            const acceptButton = document.createElement('button')
            acceptButton.textContent = 'Accepter'

            // Ajouter un écouteur d'événement au bouton
            acceptButton.addEventListener('click', () => {
              acceptFriendRequest(client, req.from_user.id)
            })

            // Ajouter le bouton à l'élément de liste
            listItem.appendChild(acceptButton)
            pendingList.appendChild(listItem)
          }
          else {
            const unknownUserItem = document.createElement('li')
            unknownUserItem.textContent = 'Unknown User'
            pendingList.appendChild(unknownUserItem)
            console.warn('Incomplete request data:', req)
          }
        })
      }
      else {
        pendingList.innerHTML = '<li>No pending friend requests.</li>'
      }
    }
    else {
      console.error('Failed to load pending friend requests')
    }
  }
  catch (error) {
    console.error('Error while loading pending friend requests:', error)
  }
}
