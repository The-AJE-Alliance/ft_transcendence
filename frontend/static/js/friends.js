import ky from 'ky'

export async function loadFriends(client) {
  if (!await client.isLoggedIn()) {
    client.app.innerHTML = '<p>Please login again</p>'
    return
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
      playButton.textContent = 'Play'
      client.router.addEvent(playButton, 'click', () => startGameWithFriend(client, friend.id))

      listItem.appendChild(playButton)
      friendsList.appendChild(listItem)
    })
  }
  else {
    friendsList.innerHTML = '<li>No friends found</li>'
  }
}

function startGameWithFriend(client, friendId) {
  client.router.redirect(`/pong/remote/${friendId}`)
}

export async function getFriends(client) {
  try {
    return await ky.get('https://auth.api.transcendence.fr/friends/', {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    }).json()
  }
  catch {
    console.error('Failed to fetch friends')
    return null
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
    await ky.post('https://auth.api.transcendence.fr/send-friend-request/', {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      json: { username: friendUsername },
    })
    console.log(`Friend request sent to ${friendUsername}!`)
    errorAlert.classList.add('d-none')
    await loadPendingFriendRequests(client)
  }
  catch (error) {
    errorAlert.classList.remove('d-none')
    console.error('Error while trying to send friend request:', error)
  }
}

export async function acceptFriendRequest(client, fromUserId) {
  try {
    await ky.post('https://auth.api.transcendence.fr/accept-friend-request/', {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      json: { from_user_id: fromUserId },
    })
    console.log(`Friend request from user ${fromUserId} accepted!`)
    await loadPendingFriendRequests(client)
    await loadFriends(client)
  }
  catch (error) {
    console.error('Failed to accept friend request :', error)
  }
}

export async function declineFriendRequest(client, fromUserId) {
  try {
    await ky.post('https://auth.api.transcendence.fr/decline-friend-request/', {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      json: { from_user_id: fromUserId },
    })
    console.log(`Friend request from user ${fromUserId} declined!`)
    await loadPendingFriendRequests(client)
  }
  catch (error) {
    console.error('Error while trying to decline friend request:', error)
  }
}

export async function loadPendingFriendRequests(client) {
  const friendRequest = document.getElementById('friend-requests-section')
  try {
    const pendingRequests = await ky.get('https://auth.api.transcendence.fr/pending-friend-requests/', {
      headers: { Authorization: `Bearer ${client.token}` },
    }).json()
    const pendingList = document.getElementById('pending-requests-list')
    pendingList.innerHTML = ''

    if (pendingRequests.length > 0) {
      friendRequest.classList.remove('d-none')
      pendingRequests.forEach((req) => {
        if (req.from_user && req.from_user.username) {
          const listItem = document.createElement('li')
          listItem.textContent = req.from_user.username

          const acceptButton = document.createElement('button')
          acceptButton.textContent = 'Accept'
          client.router.addEvent(acceptButton, 'click', async () => {
            await acceptFriendRequest(client, req.from_user.id)
          })

          const declineButton = document.createElement('button')
          declineButton.textContent = 'Decline'
          declineButton.classList.add('btn', 'btn-danger', 'btn-sm')
          client.router.addEvent(declineButton, 'click', async () => {
            await declineFriendRequest(client, req.from_user.id)
          })

          // Ajouter le bouton à l'élément de liste
          listItem.appendChild(acceptButton)
          listItem.appendChild(declineButton)
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
      friendRequest.classList.add('d-none')
    }
  }
  catch (error) {
    console.error('Error while loading pending friend requests:', error)
  }
}
