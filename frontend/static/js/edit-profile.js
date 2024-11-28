import ky from 'ky'
import editProfilePage from '../pages/edit-profile.html?raw'
import { checkNicknameExists, setupEmailValidation, setupNicknameValidation, setupUsernameValidation } from './check-profile.js'
import { updateNavbar } from './navbar'
import { getUserProfile } from './profile.js'

async function validateProfileForm(client, currentNickname) {
  const nicknameField = document.getElementById('nickname')
  const nickname = nicknameField.value.trim()

  if (!nickname) {
    return false
  }
  const nicknameExists = await checkNicknameExists(client, nickname, currentNickname)
  if (nicknameExists) {
    return false
  }
  return true
}

export async function editProfile(client) {
  await updateNavbar(client)
  client.app.innerHTML = editProfilePage
  const user = await getUserProfile(client)

  if (user) {
    document.getElementById('username').value = user.username
    document.getElementById('email').value = user.email
    document.getElementById('nickname').value = user.nickname
  }
  const emailField = document.getElementById('email')
  const usernameField = document.getElementById('username')
  const nicknameField = document.getElementById('nickname')
  const saveProfileButton = document.getElementById('save-profile-info-link')
  const errorAlert = document.getElementById('edit-alert')
  setupEmailValidation(client, emailField, user.email)
  setupUsernameValidation(client, usernameField, user.username)
  setupNicknameValidation(client, nicknameField, user.nickname)
  client.router.addEvent(saveProfileButton, 'click', async (event) => {
    event.preventDefault()

    if (!usernameField.value || !emailField.value || !nicknameField.value) {
      errorAlert.classList.remove('d-none')
      return
    }
    errorAlert.classList.add('d-none')
    const isValid = await validateProfileForm(client, user.nickname)
    if (!isValid) {
      return
    }
    await updateProfile(client)
  })
}

function updateProfileFields() {
  const usernameField = document.getElementById('username')
  const emailField = document.getElementById('email')
  const nicknameField = document.getElementById('nickname')
  const avatarInput = document.getElementById('new-avatar')

  const formData = new FormData()
  formData.append('username', usernameField.value)
  formData.append('email', emailField.value)
  formData.append('nickname', nicknameField.value)
  if (avatarInput.files.length > 0) {
    formData.append('avatar', avatarInput.files[0])
  }
  return formData
}

async function updateProfile(client) {
  const errorAlert = document.getElementById('edit-alert')
  const formData = updateProfileFields()

  try {
    await ky.patch(`https://auth.api.transcendence.fr/users/${client.userId}/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      body: formData,
    })
    client.router.redirect('/profile')
  }
  catch (error) {
    errorAlert.classList.remove('d-none')
    console.error('Error updating profile:', error)
  }
}
