import * as bootstrap from 'bootstrap'
import ky from 'ky'
import loginPage from '../pages/login.html?raw'
import login42Page from '../pages/login42.html?raw'
import profilePage from '../pages/profile.html?raw'
import registerPage from '../pages/register.html?raw'
import { getFriends, loadFriends, loadPendingFriendRequests, sendFriendRequest } from './friends.js'
import { updateNavbar } from './navbar.js'
import { handleForm, loadPageStyle, processLoginData } from './utils.js'
import '../css/login.css'
import '../css/login42.css'
import '../css/profile.css'
import '../css/register.css'

export async function chooseMode(client) {
  client.app.innerHTML = await loadHTML('../html/choose-mode.html')
  document.getElementById('remote-btn').addEventListener('click', () => {
    client.redirectToGame = true
    client.router.redirect('/sign-in')
  })
  document.getElementById('local-btn').addEventListener('click', () => {
    client.router.redirect('/pong/local')
  })
}

export async function chooseFriends(client) {
  if (!client.token) {
    await client.refresh()
    if (!client.token) {
      client.router.redirect('/login')
      return
    }
  }
  client.app.innerHTML = await loadHTML('../html/choose-friends.html')
  const addFriendBtn = document.getElementById('add-friend-btn')
  const friendUsernameInput = document.getElementById('friend-username')

  addFriendBtn.addEventListener('click', async () => {
    const friendUsername = friendUsernameInput.value.trim()
    if (friendUsername) {
      await sendFriendRequest(client, friendUsername)
      friendUsernameInput.value = ''
    }
  })

  // Charger la liste d'amis dès le chargement de la page
  await loadFriends(client)
  await loadPendingFriendRequests(client)
}

export async function login(client) {
  client.redirectToGame = client.redirectToGame || false
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
    if (client.redirectToGame) {
      client.router.redirect('/choose-friends')
      client.redirectToGame = false
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
  const errorAlert = document.getElementById('error-alert')
  if (result) {
    errorAlert.classList.add('d-none')
    client.router.redirect('/login')
  }
  else {
    console.error('Registration failed:', result)
    errorAlert.classList.remove('d-none')
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
  await logout(client)
}

export async function users(client) {
  if (!client.token) {
    await client.refresh()
    if (!client.token) {
      client.app.innerHTML = '<p>Please login again</p>'
      return
    }
  }

  let users = await getUsers(client)
  if (!users) {
    await client.refresh()
    if (!client.token) {
      client.app.innerHTML = '<p>Please login again</p>'
      return
    }
    users = await getUsers(client)
  }
  client.app.innerHTML = `<ul><li>${users[0].username}</li><li>${users[0].email}</li></ul><br>`
}

export async function getUserProfile(client) {
  try {
    return await ky.get('https://auth.api.transcendence.fr/users/me/', {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    }).json()
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
  oauthButton.addEventListener('click', () => {
    window.location.href = 'https://auth.api.transcendence.fr/login/42/'
  })
}

export async function logout(client) {
  const logoutButton = document.getElementById('logout-link')

  logoutButton.removeEventListener('click', handleLogout)
  logoutButton.addEventListener('click', handleLogout)

  async function handleLogout(event) {
    event.preventDefault()
    try {
      const response = await fetch('https://auth.api.transcendence.local/logout/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${client.token}` },
        credentials: 'include',
      })

      if (response.ok) {
        client.token = null
        await updateNavbar(client)
        client.router.redirect('/')
        const toastSuccess = new bootstrap.Toast(document.getElementById('logout-toast'))
        toastSuccess.show()
      }
      else {
        const toastFailed = new bootstrap.Toast(document.getElementById('logout-toast-failed'))
        toastFailed.show()
      }
    }
    catch (error) {
      console.error('Error while trying to logout:', error)
      const toastFailed = new bootstrap.Toast(document.getElementById('logout-toast-failed'))
      toastFailed.show()
    }
  }
}
