import ky from 'ky'
import editProfilePage from '../pages/edit-profile.html?raw'
import { getUserProfile } from './auth.js'
import { handleForm, validateEmailField, validatePasswordConfirmation } from './utils.js'
import '../css/edit-profile.css'

function validateFormFields() {
  const currentPasswordField = document.getElementById('current-password')
  const newPasswordField = document.getElementById('new-password')
  const confirmPasswordField = document.getElementById('confirm-new-password')

  if (!currentPasswordField.value || !newPasswordField.value || !confirmPasswordField.value) {
    showAlert('Please fill in all fields.')
    return false
  }
  return true
}

function showAlert(message) {
  const errorAlert = document.getElementById('error-alert')
  errorAlert.textContent = message
  errorAlert.classList.remove('d-none')
}

export async function editProfile(client) {
  client.app.innerHTML = editProfilePage
  const user = await getUserProfile(client)

  if (user) {
    document.getElementById('username').value = user.username
    document.getElementById('email').value = user.email
    document.getElementById('nickname').value = user.nickname
  }
  const emailField = document.getElementById('email')
  validateEmailField(emailField)

  const passwordForm = document.getElementById('change-password-form')
  validatePasswordConfirmation(passwordForm)
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (validateFormFields())
      await changePassword(client)
  })
}

export async function changePassword(client) {
  const currentPassword = document.getElementById('current-password').value
  const newPassword = document.getElementById('new-password').value
  try {
    await ky.post(`https://auth.api.transcendence.fr/users/change-password/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      json: { current_password: currentPassword, new_password: newPassword },
    })
    client.router.redirect('/profile')
  }
  catch (error) {
    console.error('Error changing password:', error)
    showAlert('An error occurred. Please try again.')
  }
}

export function handlePasswordForm(client) {
  const form = document.getElementById('change-password-form')
  handleForm({
    form,
    actionUrl: 'https://auth.api.transcendence.fr/users/change-password/',
    client,
    enablePasswordConfirmation: true,
    callback: async (client, result) => {
      if (result) {
        console.log('Password changed successfully')
        client.router.redirect('/profile')
      }
    },
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

export async function updateProfile(client) {
  const errorAlert = document.getElementById('edit-alert')
  const formData = updateProfileFields()

  try {
    await ky.patch(`https://auth.api.transcendence.fr/users/${client.userId}/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      body: formData,
    })
  }
  catch (error) {
    errorAlert.classList.remove('d-none')
    console.error('Error updating profile:', error)
  }
  client.router.redirect('/profile')
}

export async function deleteProfile(client) {
  if (!confirm('Are you sure you want to delete your profile? This action cannot be undone.'))
    return

  try {
    await ky.delete(`https://auth.api.transcendence.fr/users/${client.userId}/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    })
    client.router.redirect('/login')
  }
  catch (error) {
    console.error('Error deleting profile:', error)
  }
}
