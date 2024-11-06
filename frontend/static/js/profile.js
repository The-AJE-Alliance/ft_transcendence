import ky from 'ky'
import editProfilePage from '../pages/edit-profile.html?raw'
import { getUserProfile } from './auth.js'
import { validateEmailField } from './utils.js'
import '../css/edit-profile.css'

export async function editProfile(client) {
  client.app.innerHTML = editProfilePage
  const user = await getUserProfile(client)

  if (user) {
    document.getElementById('username').value = user.username
    document.getElementById('email').value = user.email
    document.getElementById('nickname').value = user.nickname
    document.getElementById('status').textContent = user.is_online ? 'Online' : 'Offline'
  }
  const emailField = document.getElementById('email')
  validateEmailField(emailField)
}

async function changePassword(client, currentPassword, newPassword) {
  try {
    await ky.post(`https://auth.api.transcendence.fr/users/change-password/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      json: { current_password: currentPassword, new_password: newPassword },
    })
  }
  catch (error) {
    console.error('Error changing password:', error)
  }
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

async function updatePasswordField(client) {
  const currentPassword = document.getElementById('current-password').value
  const newPassword = document.getElementById('new-password').value
  const confirmPassword = document.getElementById('confirm-new-password').value

  if (newPassword && newPassword !== confirmPassword) {
    document.getElementById('confirm-new-password').classList.add('is-invalid')
    return false
  }
  if (currentPassword && newPassword) {
    await changePassword(client, currentPassword, newPassword)
  }
  return true
}

export async function updateProfile(client) {
  const formData = updateProfileFields(client)
  try {
    await ky.patch(`https://auth.api.transcendence.fr/users/${client.userId}/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      body: formData,
    })
  }
  catch (error) {
    console.error('Error updating profile:', error)
  }
  const passwordUpdated = await updatePasswordField(client)
  if (passwordUpdated) {
    client.router.redirect('/profile')
  }
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
