import * as bootstrap from 'bootstrap'
import ky from 'ky'
import loginPage from '../pages/login.html?raw'
import logoutPage from '../pages/logout.html?raw'
import { updateNavbar } from './navbar.js'
import {
  handleForm,
  loadPageStyle,
  processLoginData,
} from './utils.js'
import '../css/login.css'
import '../css/profile.css'
import '../css/register.css'

export async function login(client) {
  loadPageStyle('login')
  client.app.innerHTML = loginPage
  await updateNavbar(client)
  const form = document.getElementById('login-form')
  handleForm({
    form,
    actionUrl: 'https://auth.api.transcendence.fr/login/',
    processData: processLoginData,
    callback: loginPostProcess,
    client,
    enableValidation: false,
    enablePasswordConfirmation: false,
  })
}

async function loginPostProcess(client, result) {
  if (result) {
    client.token = result.access
    client.authMethod = 'classic'
    await updateNavbar(client)
    if (client.redirectToFriends) {
      client.router.redirect('/pong/remote/setup')
      client.redirectToFriends = false
    }
    else {
      client.router.redirect('/')
    }
  }
  else {
    document.getElementById('username').value = ''
    document.getElementById('password').value = ''
    document.getElementById('invalid-login').classList.remove('d-none')
  }
}

async function checkForAccessToken(client) {
  const urlParams = new URLSearchParams(window.location.search)
  const accessToken = urlParams.get('token')
  if (accessToken) {
    localStorage.setItem('access_token', accessToken)
    client.token = accessToken
    client.authMethod = 'oauth42'

    try {
      const response = await fetch('https://auth.api.transcendence.fr/users/me/', {
        headers: { Authorization: `Bearer ${client.token}` },
        credentials: 'include',
      })
      const userData = await response.json()
      client.avatarUrl = userData.avatar_url
      window.history.replaceState({}, document.title, '/')
      client.router.redirect('/')
    }
    catch (error) {
      console.error('Failed to fetch user info:', error)
      console.error('Access token used:', client.token)
    }
  }
}

export async function login42(client) {
  const urlParams = new URLSearchParams(window.location.search)
  const accessToken = urlParams.get('token')
  if (accessToken) {
    await checkForAccessToken(client)
  }
  else {
    await updateNavbar(client)
    window.location.href = 'https://auth.api.transcendence.fr/login/42/'
  }
}

export async function logout(client) {
  try {
    if (client.authMethod === 'oauth42') {
      await ky.post('https://auth.api.transcendence.fr/logout/', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${client.token}` },
      })
      client.token = ''
      client.authMethod = ''
      localStorage.removeItem('access_token')
      await updateNavbar(client)
      client.app.innerHTML = logoutPage
    }
    else {
      await ky.post('https://auth.api.transcendence.fr/logout/', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${client.token}` },
      })
      client.token = ''
      client.authMethod = ''
      localStorage.removeItem('access_token')
      await updateNavbar(client)
      client.router.redirect('/')
      const toastSuccess = new bootstrap.Toast(document.getElementById('logout-toast'))
      toastSuccess.show()
    }
  }
  catch {
    client.router.redirect('/')
    const toastFailed = new bootstrap.Toast(document.getElementById('logout-toast-failed'))
    toastFailed.show()
  }
}
