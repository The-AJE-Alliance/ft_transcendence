import { updateNavbar } from './navbar.js'
import { handleForm, loadHTML, processLoginData } from './utils.js'

export async function login(client) {
  updateNavbar(client)
  client.app.innerHTML = await loadHTML('../html/login.html')
  const form = document.getElementById('login-form')
  handleForm({
    form,
    actionUrl: 'https://auth.api.transcendence.local/login/',
    method: 'POST',
    submitText: 'Log In',
    processData: processLoginData,
    callback: loginPostProcess,
    client,
    enableValidation: false,
    enablePasswordConfirmation: false,
  })
}

export async function profile(client) {
  updateNavbar(client)
  client.app.innerHTML = await loadHTML('../html/profile.html')
  if (client.token) {
    const user = await getUserProfile(client)
    if (user) {
      document.getElementById('username').textContent = user.username
      document.getElementById('email').textContent = user.email
      document.getElementById('nickname').textContent = user.nickname
      document.getElementById('status').textContent = user.is_online ? 'Online' : 'Offline'
      const avatarElement = document.getElementById('avatar')
      avatarElement.src = user.avatar
      avatarElement.alt = `Avatar de ${user.username}`
    }
  }
  await logout(client)
}

async function loginPostProcess(client, result, ok) {
  if (ok) {
    client.token = result.access
    updateNavbar(client)
    client.router.redirect('/profile')
  }
  else {
    document.getElementById('username').value = ''
    document.getElementById('password').value = ''
    document.getElementById('invalid-login').classList.remove('d-none')
  }
}

export async function register(client) {
  updateNavbar(client)
  client.app.innerHTML = await loadHTML('../html/register.html')
  const form = document.getElementById('register-form')
  await handleForm({
    form,
    actionUrl: 'https://auth.api.transcendence.local/register/',
    method: 'POST',
    submitText: 'Register',
    callback: registerPostProcess,
    client,
    enableValidation: true,
    enablePasswordConfirmation: true,
  })
}

async function registerPostProcess(client, result, ok) {
  const errorAlert = document.getElementById('error-alert')
  if (ok) {
    errorAlert.classList.add('d-none')
    client.router.redirect('/login')
  }
  else {
    console.error('Registration failed:', result)
    errorAlert.classList.remove('d-none')
  }
}

// Example of working JWT auth, probably not necessary in this form

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
    const response = await fetch('https://auth.api.transcendence.local/users/me/', {
      method: 'GET',
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    })
    const result = await response.json()
    if (response.ok) {
      return result
    }
  }
  catch (error) {
    console.error('Error while trying to get user:', error)
    return null
  }
}

export async function getUsers(client) {
  try {
    const response = await fetch('https://auth.api.transcendence.local/users/', {
      method: 'GET',
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    })
    const result = await response.json()
    if (response.ok)
      return result
    else
      return null
  }
  catch (error) {
    console.error('Error while trying to get users:', error)
    return null
  }
}

export async function login42(client) {
  updateNavbar(client)
  client.app.innerHTML = await loadHTML('../html/login42.html') // Charger login42.html
  const oauthButton = document.createElement('button')
  oauthButton.textContent = 'Log in with 42'
  oauthButton.addEventListener('click', () => {
    window.location.href = 'https://auth.api.transcendence.local/login/42/'
  })
  client.app.innerHTML = ''
  client.app.appendChild(oauthButton)
}

export async function logout(client) {
  const logoutButton = document.getElementById('logout-link')
  logoutButton.addEventListener('click', async () => {
    try {
      const response = await fetch('https://auth.api.transcendence.local/logout/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${client.token}` },
        credentials: 'include',
      })
      if (response.ok) {
        client.token = null
        updateNavbar(client)
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
    }
  })
}
