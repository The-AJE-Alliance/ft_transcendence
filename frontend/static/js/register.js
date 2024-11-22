import ky from 'ky'
import registerPage from '../pages/register.html?raw'
import { updateNavbar } from './navbar'
import {
  handleForm,
  loadPageStyle,
} from './utils.js'

export async function checkNicknameExistsForRegister(client, nickname) {
  if (!nickname) {
    console.error('Nickname is empty.')
    return false
  }
  try {
    const response = await ky.get(`https://auth.api.transcendence.fr/users/check-nickname/?nickname=${encodeURIComponent(nickname)}`, {
      headers: {
        Authorization: `Bearer ${client.token}`,
      },
    }).json()
    return response.exists
  }
  catch (error) {
    if (error.response && error.response.status === 409) {
      return true
    }
    else {
      console.error('Error while verifying password:', error)
      return false
    }
  }
}

export function setupRegisterNicknameValidation(client, nicknameField) {
  const nicknameExistsFeedback = document.getElementById('nickname-exists-feedback')
  const nicknameRequiredFeedback = document.querySelector('#nickname + .invalid-feedback')

  nicknameField.addEventListener('input', async () => {
    nicknameExistsFeedback.style.display = 'none'
    nicknameRequiredFeedback.style.display = 'none'
    nicknameField.classList.remove('is-invalid', 'is-valid')

    const nickname = nicknameField.value.trim()

    if (!nickname) {
      nicknameRequiredFeedback.style.display = 'block'
      nicknameField.classList.add('is-invalid')
      return
    }

    const nicknameExists = await checkNicknameExistsForRegister(client, nickname)
    if (nicknameExists) {
      nicknameField.classList.add('is-invalid')
      nicknameExistsFeedback.style.display = 'block'
    }
    else {
      nicknameField.classList.add('is-valid')
    }
  })
}

function validateRegistrationPasswordConfirmation(form) {
  const passwordInput = form.querySelector('#password')
  const confirmPasswordInput = form.querySelector('#confirm-password')

  if (passwordInput && confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      if (passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.classList.remove('is-valid')
        confirmPasswordInput.classList.add('is-invalid')
      }
      else {
        confirmPasswordInput.classList.remove('is-invalid')
        confirmPasswordInput.classList.add('is-valid')
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
    const email = emailField.value.trim()

    if (!email) {
      emailField.classList.add('is-invalid')
      emailFormatFeedback.style.display = 'block'
      return
    }

    if (!isValidEmail(email)) {
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

    const username = usernameField.value.trim()
    if (!username) {
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
  const nicknameField = document.getElementById('nickname')
  setupRegisterEmailValidation(client, emailField)
  setupRegisterUsernameValidation(client, usernameField)
  setupRegisterNicknameValidation(client, nicknameField)
  await handleForm({
    form,
    actionUrl: 'https://auth.api.transcendence.fr/register/',
    callback: registerPostProcess,
    client,
    enableValidation: true,
    enablePasswordConfirmation: true,
  })
}
