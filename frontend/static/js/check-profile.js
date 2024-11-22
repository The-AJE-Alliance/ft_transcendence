import ky from 'ky'
import { isValidEmail } from './register.js'

export async function checkNicknameExists(client, nickname, currentNickname) {
  if (!nickname || nickname === currentNickname) {
    return false
  }
  try {
    const response = await ky.get(`https://auth.api.transcendence.fr/users/check-nickname/?nickname=${encodeURIComponent(nickname)}`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    }).json()
    return response.exists
  }
  catch (error) {
    if (error.response && error.response.status === 409) {
      return true
    }
    else {
      console.error('Error during nickname verification: ', error)
      return false
    }
  }
}

export function validateEmailField(client, emailField, useEmailExistsFeedback = false) {
  const emailFormatFeedback = document.getElementById('email-format-feedback')
  const emailExistsFeedback = useEmailExistsFeedback ? document.getElementById('email-exists-feedback') : null

  client.router.addEvent(emailField, 'input', () => {
    if (emailExistsFeedback) {
      emailExistsFeedback.style.display = 'none'
    }
    if (isValidEmail(emailField.value)) {
      emailField.classList.add('is-valid')
      emailField.classList.remove('is-invalid')
      emailFormatFeedback.style.display = 'none'
    }
    else {
      emailField.classList.add('is-invalid')
      emailField.classList.remove('is-valid')
      emailFormatFeedback.style.display = 'block'
    }
  })
}

export function validateFormFields() {
  const currentPasswordField = document.getElementById('current-password')
  const newPasswordField = document.getElementById('new-password')
  const confirmPasswordField = document.getElementById('confirm-new-password')

  if (!currentPasswordField.value || !newPasswordField.value || !confirmPasswordField.value) {
    showAlert('Please fill in all fields.')
    return false
  }
  return true
}

export function showAlert(message) {
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
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    })
  }
  catch (error) {
    if (error.response && error.response.status === 409) {
      return true
    }
    else {
      console.error('Error during email verification: ', error)
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
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    })
  }
  catch (error) {
    if (error.response && error.response.status === 409) {
      return true
    }
    else {
      console.error('Error during username verification: ', error)
      return false
    }
  }
}

export function setupEmailValidation(client, emailField, currentEmail) {
  validateEmailField(client, emailField)
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

export function setupUsernameValidation(client, usernameField, currentUsername) {
  client.router.addEvent(usernameField, 'input', async () => {
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
