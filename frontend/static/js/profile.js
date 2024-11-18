import ky from 'ky'
import profilePage from '../pages/profile.html?raw'
import { getFriends } from './friends.js'
import { updateNavbar } from './navbar.js'
import { loadPageStyle } from './utils.js'
import '../css/edit-profile.css'

function setupDeleteProfileButton(client) {
  const confirmDeleteButton = document.getElementById('confirmDelete')
  if (confirmDeleteButton) {
    confirmDeleteButton.addEventListener('click', async () => {
      try {
        await ky.delete(`https://auth.api.transcendence.fr/users/${client.userId}/`, {
          headers: { Authorization: `Bearer ${client.token}` },
          credentials: 'include',
        })
        const deleteConfirmModal = document.getElementById('deleteConfirmModal')
        if (deleteConfirmModal) {
          deleteConfirmModal.classList.remove('show')
          deleteConfirmModal.style.display = 'none'
          document.body.classList.remove('modal-open')
          const modalBackdrop = document.querySelector('.modal-backdrop')
          if (modalBackdrop) {
            modalBackdrop.remove()
          }
        }
        client.router.redirect('/')
      }
      catch (error) {
        console.error('Erreur lors de la suppression du profil :', error)
      }
    })
  }
}

export async function getUserProfile(client) {
  try {
    const userProfile = await ky.get('https://auth.api.transcendence.fr/users/me/', {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    }).json()
    client.userId = userProfile.id
    return userProfile
  }
  catch (error) {
    console.error('Error while trying to get user:', error)
    return null
  }
}

export async function profile(client) {
  loadPageStyle('profile')
  client.app.innerHTML = profilePage
  await updateNavbar(client)
  if (await client.isLoggedIn()) {
    const user = await getUserProfile(client)
    if (user) {
      document.getElementById('username').textContent = user.username
      document.getElementById('email').textContent = user.email
      document.getElementById('nickname').textContent = user.nickname
      document.getElementById('status').textContent = user.is_online ? 'Online' : 'Offline'
      const avatarElement = document.getElementById('avatar')
      if (user.avatar_url_full) {
        avatarElement.src = user.avatar_url_full
      }
      avatarElement.alt = `Avatar de ${user.username}`
      const friendsList = document.getElementById('friends-list')
      const friends = await getFriends(client)
      friendsList.innerHTML = ''

      if (friends && friends.length > 0) {
        friends.forEach((friend) => {
          const friendItem = document.createElement('li')
          friendItem.textContent = friend.username
          friendsList.appendChild(friendItem)
        })
      }
      else {
        friendsList.innerHTML = '<li>No friends found</li>'
      }
    }
  }
  if (client.authMethod === 'oauth42') {
    const deleteProfileButton = document.getElementById('delete-profile-button')
    if (deleteProfileButton) {
      deleteProfileButton.style.display = 'none'
    }
  }
  else {
    setupDeleteProfileButton(client)
  }
}
