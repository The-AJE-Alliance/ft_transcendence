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
  if (friends && friends.length > 0) {
    friendsList.innerHTML = friends.map(friend => `<li>${friend.username}</li>`).join('')
  }
  else {
    friendsList.innerHTML = '<li>No friends found</li>'
  }
}

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
      await loadPendingFriendRequests(client) // Charger les demandes d'amis en attente
    }
    else {
      console.error('Failed to send friend request')
    }
  }
  catch (error) {
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
      pendingList.innerHTML = pendingRequests.length
        ? pendingRequests.map(req => `<li>${req.sender.username}</li>`).join('')
        : '<li>No pending friend requests.</li>'
    }
    else {
      console.error('Failed to load pending friend requests')
    }
  }
  catch (error) {
    console.error('Error while loading pending friend requests:', error)
  }
}
