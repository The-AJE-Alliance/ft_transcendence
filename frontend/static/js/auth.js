import * as bootstrap from 'bootstrap'
import ky from 'ky'
import loginPage from '../pages/login.html?raw'
import login42Page from '../pages/login42.html?raw'
import profilePage from '../pages/profile.html?raw'
import registerPage from '../pages/register.html?raw'
import { getFriends } from './friends.js'
import { updateNavbar } from './navbar.js'
import { handleForm, loadPageStyle, processLoginData, validateEmailField } from './utils.js'
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

export async function register(client) {
  await updateNavbar(client)
  loadPageStyle('register')
  client.app.innerHTML = registerPage
  const form = document.getElementById('register-form')
  const emailField = document.getElementById('email')
  validateEmailField(emailField)
  await handleForm({
    form,
    actionUrl: 'https://auth.api.transcendence.fr/register/',
    callback: registerPostProcess,
    client,
    enableValidation: true,
    enablePasswordConfirmation: true,
  })
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

export async function profile(client) {
  loadPageStyle('profile')
  client.app.innerHTML = profilePage
  await updateNavbar(client)
  if (await client.isLoggedIn()) {
    const user = await getUserProfile(client)
    if (user) {
      document.getElementById('username').textContent = user.username
      document.getElementById('email').textContent = user.email
      document.getElementById('nickname').textContent = user.nickname
      document.getElementById('status').textContent = user.is_online ? 'Online' : 'Offline'
      const avatarElement = document.getElementById('avatar')
      avatarElement.src = user.avatar
      avatarElement.alt = `Avatar de ${user.username}`

      const friendsList = document.getElementById('friends-list')
      const friends = await getFriends(client)
      friendsList.innerHTML = ''

      if (friends && friends.length > 0) {
        friends.forEach((friend) => {
          const friendItem = document.createElement('li')
          friendItem.textContent = friend.username
          friendsList.appendChild(friendItem)
        })
      }
      else {
        friendsList.innerHTML = '<li>No friends found</li>'
      }
    }
  }
}

export async function getUserProfile(client) {
  try {
    const userProfile = await ky.get('https://auth.api.transcendence.fr/users/me/', {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    }).json()
    client.userId = userProfile.id
    return userProfile
  }
  catch (error) {
    console.error('Error while trying to get user:', error)
    return null
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
