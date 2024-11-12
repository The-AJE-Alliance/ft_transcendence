import * as bootstrap from 'bootstrap'
import ky from 'ky'
import loginPage from '../pages/login.html?raw'
import login42Page from '../pages/login42.html?raw'
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

export async function login42(client) {
  loadPageStyle('login42')
  client.app.innerHTML = login42Page
  await updateNavbar(client)
  const oauthButton = document.getElementById('login42Button')
  oauthButton.textContent = 'Log in with 42'
  client.router.addEvent(oauthButton, 'click', () => {
    window.location.href = 'https://auth.api.transcendence.fr/login/42/'
  })
}

export async function logout(client) {
  try {
    await ky.post('https://auth.api.transcendence.fr/logout/', {
      credentials: 'include',
      headers: { Authorization: `Bearer ${client.token}` },
    })
    client.token = ''
    await updateNavbar(client)
    client.router.redirect('/')
    const toastSuccess = new bootstrap.Toast(document.getElementById('logout-toast'))
    toastSuccess.show()
  }
  catch {
    client.router.redirect('/')
    const toastFailed = new bootstrap.Toast(document.getElementById('logout-toast-failed'))
    toastFailed.show()
  }
}
