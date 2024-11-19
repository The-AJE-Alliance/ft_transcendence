import ky from 'ky'
import editProfilePage from '../pages/edit-profile.html?raw'
import { changePassword, validatePasswordConfirmation } from './change-password.js'
import { setupEmailValidation, setupUsernameValidation, validateFormFields } from './check-profile.js'
import { getUserProfile } from './profile.js'

export async function editProfile(client) {
  client.app.innerHTML = editProfilePage
  const user = await getUserProfile(client)

  if (user) {
    const currentEmail = user.email
    const currentUsername = user.username

    document.getElementById('username').value = currentUsername
    document.getElementById('email').value = currentEmail
    document.getElementById('nickname').value = user.nickname
  }
  const emailField = document.getElementById('email')
  const usernameField = document.getElementById('username')
  const nicknameField = document.getElementById('nickname')
  const saveProfileButton = document.getElementById('save-profile-info-link')
  const errorAlert = document.getElementById('edit-alert')
  setupEmailValidation(client, emailField, user.email)
  setupUsernameValidation(client, usernameField, user.username)
  saveProfileButton.addEventListener('click', async (event) => {
    event.preventDefault()

    if (!usernameField.value || !emailField.value || !nicknameField.value) {
      errorAlert.classList.remove('d-none')
      errorAlert.textContent = 'Please fill all the fields.'
      return
    }
    errorAlert.classList.add('d-none')
    await updateProfile(client)
  })
  const passwordForm = document.getElementById('change-password-form')
  validatePasswordConfirmation(passwordForm)
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (validateFormFields())
      await changePassword(client)
  })
}
/*
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
*/

function updateProfileFields(client) {
  const nicknameField = document.getElementById('nickname')
  const formData = new FormData()

  if (client.authMethod === 'oauth42') {
    formData.append('nickname', nicknameField.value)
  }
  else {
    const usernameField = document.getElementById('username')
    const emailField = document.getElementById('email')
    const avatarInput = document.getElementById('new-avatar')

    formData.append('username', usernameField.value)
    formData.append('email', emailField.value)
    formData.append('nickname', nicknameField.value)
    if (avatarInput.files.length > 0) {
      formData.append('avatar', avatarInput.files[0])
    }
  }
  return formData
}

export async function updateProfile(client) {
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
