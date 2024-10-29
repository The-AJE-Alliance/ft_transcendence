import { handleForm, loadHTML, processLoginData } from './utils.js'

export async function login(client) {
  client.app.innerHTML = await loadHTML('../login.html')
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
  client.app.innerHTML = await loadHTML('../profile.html')
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
    client.router.redirect('/profile')
  }
  else {
    document.getElementById('username').value = ''
    document.getElementById('password').value = ''
    document.getElementById('invalid-login').classList.remove('d-none')
  }
}

export async function register(client) {
  client.app.innerHTML = await loadHTML('../register.html')
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
  if (ok) {
    client.router.redirect('/login')
  }
  else {
    console.error('Registration failed:', result)
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
  client.app.innerHTML = await loadHTML('../login42.html') // Charger login42.html
  const oauthButton = document.createElement('button')
  oauthButton.textContent = 'Log in with 42'
  oauthButton.addEventListener('click', () => {
    window.location.href = 'https://auth.api.transcendence.local/login/42/'
  })
  client.app.innerHTML = ''
  client.app.appendChild(oauthButton)
}

export async function logout(client) {
  const logoutButton = document.createElement('button')
  logoutButton.textContent = 'Logout'
  logoutButton.addEventListener('click', async () => {
    try {
      const response = await fetch('https://auth.api.transcendence.local/logout/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${client.token}` },
        credentials: 'include',
      })
      const successMessage = document.getElementById('logout-message')
      const failedMessage = document.getElementById('logout-failed-message')
      if (response.ok) {
        successMessage.classList.remove('d-none')
        setTimeout(() => {
          client.router.redirect('/')
          successMessage.classList.add('d-none')
        }, 2000)
      }
      else {
        failedMessage.classList.remove('d-none')
        setTimeout(() => {
          failedMessage.classList.add('d-none')
        }, 2000)
      }
    }
    catch (error) {
      console.error('Error while trying to logout:', error)
    }
  })
  // const logoutContainer = document.getElementById('logout-container')
  // logoutContainer.innerHTML = ''
  // logoutContainer.appendChild(logoutButton)
}
