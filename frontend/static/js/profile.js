import ky from 'ky'
import editProfilePage from '../pages/edit-profile.html?raw'
import { getUserProfile } from './auth.js'
import { validateEmailField, validatePasswordConfirmation } from './utils.js'
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

async function checkEmailExists(client, email, currentEmail) {
  if (!email || email === currentEmail) {
    console.error('Email is empty or already used.')
    return false
  }
  try {
    await ky.get(`https://auth.api.transcendence.fr/users/check-email/?email=${email}`, {
      headers: {
        Authorization: `Bearer ${client.token}`,
      },
    }).json()
  }
  catch (error) {
    if (error.response && error.response.status === 409) {
      return true
    }
    else {
      console.error('Erreur lors de la vérification de l\'email:', error)
      return false
    }
  }
}

async function checkUsernameExists(client, username, currentUsername) {
  if (!username || username === currentUsername) {
    console.error('Username is empty or already used.')
    return false
  }
  try {
    await ky.get(`https://auth.api.transcendence.fr/users/check-username/?username=${username}`, {
      headers: {
        Authorization: `Bearer ${client.token}`,
      },
    }).json()
  }
  catch (error) {
    if (error.response && error.response.status === 409) {
      return true
    }
    else {
      console.error('Erreur lors de la vérification du username:', error)
      return false
    }
  }
}

function setupEmailValidation(client, emailField, currentEmail) {
  validateEmailField(emailField)
  emailField.addEventListener('input', async () => {
    const emailExistsFeedback = document.getElementById('email-exists-feedback')
    const emailFormatFeedback = document.getElementById('email-format-feedback')
    if (!emailField.value) {
      emailField.classList.remove('is-invalid', 'is-valid')
      emailExistsFeedback.style.display = 'none'
      emailFormatFeedback.style.display = 'none'
      return
    }
    if (emailField.classList.contains('is-valid')) {
      const email = emailField.value
      if (await checkEmailExists(client, email, currentEmail)) {
        emailField.classList.add('is-invalid')
        emailField.classList.remove('is-valid')
        emailExistsFeedback.style.display = 'block'
        emailFormatFeedback.style.display = 'none'
      }
      else {
        emailField.classList.add('is-valid')
        emailField.classList.remove('is-invalid')
        emailExistsFeedback.style.display = 'none'
      }
    }
  })
}

function setupUsernameValidation(client, usernameField, currentUsername) {
  usernameField.addEventListener('input', async () => {
    const usernameExistsFeedback = document.getElementById('username-feedback')
    const username = usernameField.value
    const validUsernamePattern = /^[a-z0-9]+$/i
    if (!username) {
      usernameField.classList.remove('is-invalid', 'is-valid')
      usernameExistsFeedback.classList.add('d-none')
      usernameExistsFeedback.textContent = ''
      return
    }
    if (!validUsernamePattern.test(username)) {
      usernameField.classList.add('is-invalid')
      usernameExistsFeedback.classList.remove('d-none')
      usernameExistsFeedback.textContent = 'Invalid characters in username.'
      return
    }
    else {
      usernameExistsFeedback.classList.add('d-none')
      usernameExistsFeedback.textContent = ''
    }

    if (await checkUsernameExists(client, username, currentUsername)) {
      usernameField.classList.add('is-invalid')
      usernameExistsFeedback.classList.remove('d-none')
      usernameExistsFeedback.textContent = 'This username is already used.'
    }
    else {
      usernameField.classList.remove('is-invalid')
      usernameField.classList.add('is-valid')
      usernameExistsFeedback.classList.add('d-none')
    }
  })
}

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

export async function changePassword(client) {
  const currentPassword = document.getElementById('current-password').value
  const newPassword = document.getElementById('new-password').value
  const confirmPassword = document.getElementById('confirm-new-password').value

  if (newPassword !== confirmPassword) {
    return
  }
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

export function setupDeleteProfileButton(client) {
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
