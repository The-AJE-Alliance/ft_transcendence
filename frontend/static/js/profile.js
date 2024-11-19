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
    if (userProfile.auth_method) {
      client.authMethod = userProfile.auth_method
      localStorage.setItem('authMethod', userProfile.auth_method)
    }
    return userProfile
  }
  catch (error) {
    console.error('Error while trying to get user:', error)
    return null
  }
}

function handleNicknameEdit(client) {
  const nicknameDisplay = document.getElementById('nickname-display')
  const nicknameEditContainer = document.getElementById('nickname-edit-container')
  const editButton = document.getElementById('edit-nickname-btn')
  const nicknameInput = document.getElementById('nickname-input')
  const saveButton = document.getElementById('save-nickname-btn')
  const cancelButton = document.getElementById('cancel-nickname-btn')

  if (!nicknameDisplay || !nicknameEditContainer || !editButton || !nicknameInput || !saveButton || !cancelButton) {
    console.error('Nickname elements not found in DOM.')
    return
  }
  editButton.addEventListener('click', () => {
    nicknameDisplay.parentElement.classList.add('d-none')
    nicknameEditContainer.classList.remove('d-none')
    nicknameInput.value = nicknameDisplay.textContent.trim()
  })

  saveButton.addEventListener('click', async () => {
    const newNickname = nicknameInput.value.trim()
    if (newNickname) {
      try {
        await ky.patch(
          `https://auth.api.transcendence.fr/users/${client.userId}/`,
          {
            headers: { Authorization: `Bearer ${client.token}` },
            json: { nickname: newNickname },
            credentials: 'include',
          },
        )
        nicknameDisplay.textContent = newNickname
        nicknameDisplay.parentElement.classList.remove('d-none')
        nicknameEditContainer.classList.add('d-none')
      }
      catch (error) {
        console.error('Error updating nickname:', error)
      }
    }
  })

  cancelButton.addEventListener('click', () => {
    nicknameDisplay.parentElement.classList.remove('d-none')
    nicknameEditContainer.classList.add('d-none')
  })
}

export async function profile(client) {
  loadPageStyle('profile')
  client.app.innerHTML = profilePage
  if (await client.isLoggedIn()) {
    const user = await getUserProfile(client)
    if (user) {
      document.getElementById('username').textContent = user.username
      document.getElementById('email').textContent = user.email
      document.getElementById('nickname-display').textContent = user.nickname
      document.getElementById('status').textContent = user.is_online ? 'Online' : 'Offline'
      const avatarElement = document.getElementById('avatar')
      if (user.avatar_url_full) {
        avatarElement.src = user.avatar_url_full
      }
      avatarElement.alt = `Avatar de ${user.username}`

      const editElement = document.getElementById('edit-nickname-btn')
      if (user.auth_method === 'oauth42') {
        editElement.classList.remove('d-none')
        handleNicknameEdit(client)
      }
      else {
        editElement.classList.add('d-none')
      }

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
  if (client.authMethod !== 'oauth42') {
    setupDeleteProfileButton(client)
  }
  else {
    const actionsButton = document.getElementById('action-buttons')
    actionsButton.classList.add('d-none')
  }
  await updateNavbar(client)
}
