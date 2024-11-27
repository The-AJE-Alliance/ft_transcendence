import * as bootstrap from 'bootstrap'
import ky from 'ky'
import friendsPage from '../pages/friends.html?raw'
import { updateNavbar } from './navbar.js'
import { loadPageStyle } from './utils.js'
import '../css/friends.css'

function initializeAddFriendSection(client) {
  const addFriendBtn = document.getElementById('add-friend-btn')
  const friendUsernameInput = document.getElementById('friend-username')
  if (addFriendBtn && friendUsernameInput) {
    addFriendBtn.addEventListener('click', async () => {
      const friendUsername = friendUsernameInput.value.trim()
      if (friendUsername) {
        await sendFriendRequest(client, friendUsername)
        friendUsernameInput.value = ''
      }
    })
  }
  else {
    console.error('Add Friend elements not found in the DOM.')
  }
}

export async function friends(client) {
  loadPageStyle('friends')
  client.app.innerHTML = friendsPage

  if (await client.isLoggedIn()) {
    await loadPendingFriendRequests(client)
    await displayFriendsList(client)
  }
  initializeAddFriendSection(client)
  await updateNavbar(client)
}

async function displayFriendsList(client) {
  const friendsList = document.getElementById('friends-list-perso')
  const friends = await getFriends(client)
  friendsList.innerHTML = ''

  if (friends && friends.length > 0) {
    friends.forEach((friend) => {
      const friendItem = document.createElement('li')
      friendItem.classList.add('friend-item')
      const avatarImg = document.createElement('img')
      avatarImg.src = friend.avatar_url_full
      avatarImg.alt = `Avatar de ${friend.username}`
      avatarImg.classList.add('friend-avatar')
      const infoContainer = document.createElement('div')
      infoContainer.classList.add('friend-info')
      const usernameSpan = document.createElement('span')
      usernameSpan.textContent = friend.username
      usernameSpan.classList.add('friend-username')
      const statusContainer = document.createElement('span')
      statusContainer.classList.add('friend-status')
      const statusIcon = document.createElement('i')
      statusIcon.classList.add('bi', 'bi-circle-fill')
      statusIcon.classList.add(friend.is_online ? 'online' : 'offline')
      statusIcon.title = friend.is_online ? 'Online' : 'Offline'
      const statusText = document.createElement('span')
      statusText.textContent = friend.is_online ? ' Online' : ' Offline'
      statusText.classList.add('status-text', friend.is_online ? 'online' : 'offline')
      statusContainer.appendChild(statusIcon)
      statusContainer.appendChild(statusText)
      infoContainer.appendChild(usernameSpan)
      infoContainer.appendChild(statusContainer)
      friendItem.appendChild(avatarImg)
      friendItem.appendChild(infoContainer)

      // const playButton = document.createElement('button')
      // playButton.textContent = 'Play'
      // client.router.addEvent(playButton, 'click', () => startGameWithFriend(client, friend.id))

      // listItem.appendChild(playButton)
      friendsList.appendChild(friendItem)
    })
  }
  else {
    const noFriendsItem = document.createElement('li')
    noFriendsItem.textContent = 'No friends found'
    noFriendsItem.classList.add('no-friends')
    friendsList.appendChild(noFriendsItem)
  }
}

// function startGameWithFriend(client, friendId) {
//  client.router.redirect(`/pong/remote/${friendId}`)
// }

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
  const errorAlert = document.getElementById('error-alert')
  const successToast = document.getElementById('success-toast')
  const toastMessage = document.getElementById('toast-message')
  const toast = new bootstrap.Toast(successToast)
  errorAlert.classList.add('d-none')
  try {
    await ky.post('https://auth.api.transcendence.fr/send-friend-request/', {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      json: { username: friendUsername },
    })
    console.log(`Friend request sent to ${friendUsername}!`)
    toastMessage.textContent = `Friend request sent successfully to ${friendUsername}!`
    successToast.classList.remove('d-none')
    toast.show()
    errorAlert.classList.add('d-none')
    await loadPendingFriendRequests(client)
  }
  catch (error) {
    const errorResponse = await error.response.json()
    if (errorResponse.error === 'You cannot add yourself as a friend.') {
      errorAlert.textContent = 'You cannot add yourself as a friend.'
    }
    else if (errorResponse.error === 'Friend request already sent.') {
      errorAlert.textContent = 'Friend request already sent.'
    }
    else if (errorResponse.error === 'User does not exist.') {
      errorAlert.textContent = 'The user doesn\'t exist.'
    }
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
    // await loadFriends(client)
    await displayFriendsList(client)
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
      credentials: 'include',
    }).json()
    const pendingList = document.getElementById('pending-requests-list')
    pendingList.innerHTML = ''

    if (pendingRequests.length > 0) {
      console.log(pendingRequests.length)
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
