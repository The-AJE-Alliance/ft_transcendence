import ky from 'ky'
import registerPage from '../pages/register.html?raw'
import { updateNavbar } from './navbar'
import {
  handleForm,
  loadPageStyle,
} from './utils.js'

function validateRegistrationPasswordConfirmation(form) {
  const passwordInput = form.querySelector('#password')
  const confirmPasswordInput = form.querySelector('#confirm-password')

  if (passwordInput && confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      if (passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.classList.remove('is-valid')
        confirmPasswordInput.classList.add('is-invalid')
        confirmPasswordInput.nextElementSibling.textContent = 'Passwords do not match.'
      }
      else {
        confirmPasswordInput.classList.remove('is-invalid')
        confirmPasswordInput.classList.add('is-valid')
        confirmPasswordInput.nextElementSibling.textContent = ''
      }
    })
  }
}

export function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  return emailPattern.test(email)
}
function setupRegisterEmailValidation(client, emailField) {
  const emailFormatFeedback = document.getElementById('email-format-feedback')
  const emailExistsFeedback = document.getElementById('email-exists-feedback')

  emailField.addEventListener('input', async () => {
    emailFormatFeedback.style.display = 'none'
    emailExistsFeedback.style.display = 'none'
    emailField.classList.remove('is-invalid', 'is-valid')

    if (!isValidEmail(emailField.value)) {
      emailField.classList.add('is-invalid')
      emailFormatFeedback.style.display = 'block'
      return
    }
    const emailExists = await checkEmailExistsForRegister(client, emailField.value)
    if (emailExists) {
      emailField.classList.add('is-invalid')
      emailExistsFeedback.style.display = 'block'
    }
    else {
      emailField.classList.add('is-valid')
    }
  })
}

async function checkEmailExistsForRegister(client, email) {
  if (!email) {
    console.error('Email is empty.')
    return false
  }
  try {
    const response = await ky.get(`https://auth.api.transcendence.fr/users/check-email/?email=${email}`).json()
    return !!response.error
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

function setupRegisterUsernameValidation(client, usernameField) {
  const usernameFeedback = document.getElementById('username-feedback')
  const usernameExistsFeedback = document.getElementById('username-exists')

  usernameField.addEventListener('input', async () => {
    usernameFeedback.style.display = 'none'
    usernameExistsFeedback.style.display = 'none'
    usernameField.classList.remove('is-invalid', 'is-valid')

    if (!usernameField.value.trim()) {
      usernameExistsFeedback.style.display = 'block'
      usernameField.classList.add('is-invalid')
      return
    }

    const usernameExists = await checkUsernameExistsForRegister(client, usernameField.value)
    if (usernameExists) {
      usernameField.classList.add('is-invalid')
      usernameFeedback.style.display = 'block'
    }
    else {
      usernameField.classList.add('is-valid')
    }
  })
}

async function checkUsernameExistsForRegister(client, username) {
  if (!username) {
    console.error('Username is empty.')
    return false
  }
  try {
    const response = await ky.get(`https://auth.api.transcendence.fr/users/check-username/?username=${username}`).json()
    return !!response.error
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

async function registerPostProcess(client, result) {
  if (result) {
    if (client.redirectToFriends) {
      client.router.redirect('/pong/remote/setup')
      client.redirectToFriends = true
    }
    client.router.redirect('/login')
  }
  else {
    console.error('Registration failed:', result)
  }
}

export async function register(client) {
  await updateNavbar(client)
  loadPageStyle('register')
  client.app.innerHTML = registerPage
  const form = document.getElementById('register-form')
  validateRegistrationPasswordConfirmation(form)
  const emailField = document.getElementById('email')
  const usernameField = document.getElementById('username')
  setupRegisterEmailValidation(client, emailField)
  setupRegisterUsernameValidation(client, usernameField)
  await handleForm({
    form,
    actionUrl: 'https://auth.api.transcendence.fr/register/',
    callback: registerPostProcess,
    client,
    enableValidation: true,
    enablePasswordConfirmation: true,
  })
}
