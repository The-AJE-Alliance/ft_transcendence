import ky from 'ky'
import profilePage from '../pages/profile.html?raw'
import { updateNavbar } from './navbar.js'
import { loadPageStyle } from './utils.js'
import '../css/edit-profile.css'

function setupDeleteProfileButton(client) {
  const confirmDeleteButton = document.getElementById('confirmDelete')
  if (confirmDeleteButton) {
    client.router.addEvent(confirmDeleteButton, 'click', async () => {
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
        console.error('Error while deleting profile :', error)
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

async function handleNicknameEdit(client) {
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
  client.router.addEvent(editButton, 'click', () => {
    nicknameDisplay.parentElement.classList.add('d-none')
    nicknameEditContainer.classList.remove('d-none')
    nicknameInput.value = nicknameDisplay.textContent.trim()
  })

  client.router.addEvent(saveButton, 'click', async () => {
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

  client.router.addEvent(cancelButton, 'click', () => {
    nicknameDisplay.parentElement.classList.remove('d-none')
    nicknameEditContainer.classList.add('d-none')
  })
}

function displayUserInfo(user) {
  document.getElementById('username').textContent = user.username
  document.getElementById('email').textContent = user.email
  document.getElementById('nickname-display').textContent = user.nickname
  document.getElementById('status').textContent = user.is_online ? 'Online' : 'Offline'
}

function displayUserAvatar(user) {
  const avatarElement = document.getElementById('avatar')
  if (user.avatar_url_full) {
    avatarElement.src = user.avatar_url_full
    avatarElement.alt = `Avatar de ${user.username}`
  }
  else {
    avatarElement.src = 'path/to/default/avatar.png'
    avatarElement.alt = `Avatar par défaut`
  }
}

async function setupNicknameEdit(client, user) {
  const editElement = document.getElementById('edit-nickname-btn')
  if (user.auth_method === 'oauth42') {
    editElement.classList.remove('d-none')
    await handleNicknameEdit(client)
  }
  else {
    editElement.classList.add('d-none')
  }
}

function configureDeleteProfileButton(client) {
  if (client.authMethod !== 'oauth42') {
    setupDeleteProfileButton(client)
  }
  else {
    const actionsButton = document.getElementById('action-buttons')
    actionsButton.classList.add('d-none')
  }
}

export async function profile(client) {
  loadPageStyle('profile')
  client.app.innerHTML = profilePage

  if (await client.isLoggedIn()) {
    const user = await getUserProfile(client)
    if (user) {
      displayUserInfo(user)
      displayUserAvatar(user)
      await setupNicknameEdit(client, user)
    }
  }

  configureDeleteProfileButton(client)
  await updateNavbar(client)
}
