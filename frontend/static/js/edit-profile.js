import ky from 'ky'
import editProfilePage from '../pages/edit-profile.html?raw'
import { showAlert } from './2FA.js'
import { changePassword, validatePasswordConfirmation } from './change-password.js'
import { checkNicknameExists, setupEmailValidation, setupUsernameValidation, validateFormFields } from './check-profile.js'
import { getUserProfile } from './profile.js'

function setupNicknameValidation(client, nicknameField, currentNickname) {
  const nicknameExistsFeedback = document.getElementById('nickname-exists-feedback')

  nicknameField.addEventListener('input', async () => {
    nicknameExistsFeedback.style.display = 'none'
    nicknameField.classList.remove('is-invalid', 'is-valid')

    const nickname = nicknameField.value.trim()

    if (!nickname) {
      nicknameField.classList.remove('is-invalid', 'is-valid')
      nicknameExistsFeedback.style.display = 'none'
      return
    }

    const nicknameExists = await checkNicknameExists(client, nickname, currentNickname)
    if (nicknameExists) {
      nicknameField.classList.add('is-invalid')
      nicknameExistsFeedback.style.display = 'block'
    }
    else {
      nicknameField.classList.add('is-valid')
    }
  })
}

async function validateProfileForm(client, currentNickname) {
  const nicknameField = document.getElementById('nickname')
  const nickname = nicknameField.value.trim()

  if (!nickname) {
    showAlert('This field cannot be empty.', 'danger')
    return false
  }
  const nicknameExists = await checkNicknameExists(client, nickname, currentNickname)
  if (nicknameExists) {
    showAlert('This nickname is already used.', 'danger')
    return false
  }
  return true
}

export async function editProfile(client) {
  client.app.innerHTML = editProfilePage
  const user = await getUserProfile(client)

  if (user) {
    const currentEmail = user.email
    const currentUsername = user.username
    const currentNickname = user.nickname

    document.getElementById('username').value = currentUsername
    document.getElementById('email').value = currentEmail
    document.getElementById('nickname').value = currentNickname
  }
  const emailField = document.getElementById('email')
  const usernameField = document.getElementById('username')
  const nicknameField = document.getElementById('nickname')
  const saveProfileButton = document.getElementById('save-profile-info-link')
  const errorAlert = document.getElementById('edit-alert')
  setupEmailValidation(client, emailField, user.email)
  setupUsernameValidation(client, usernameField, user.username)
  setupNicknameValidation(client, nicknameField, user.nickname)
  saveProfileButton.addEventListener('click', async (event) => {
    event.preventDefault()

    if (!usernameField.value || !emailField.value || !nicknameField.value) {
      errorAlert.classList.remove('d-none')
      return
    }
    errorAlert.classList.add('d-none')
    const isValid = await validateProfileForm(client, user.nickname)
    if (isValid)
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
    client.router.redirect('/profile')
  }
  catch (error) {
    errorAlert.classList.remove('d-none')
    console.error('Error updating profile:', error)
  }
}
