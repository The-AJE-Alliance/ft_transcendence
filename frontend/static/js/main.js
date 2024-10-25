import { login, logout, register, users } from './auth.js'
import Client from './client.js'
import Router from './router.js'
import { loadHTML } from './utils.js'

const router = new Router(Client)

router.get('/', async (client) => {
  client.app.innerHTML = await loadHTML('../home.html')
})

router.get('/bonjour', async (client) => {
  client.app.innerHTML = await loadHTML('../bonjour.html')
})

router.get('/404', (client) => {
  client.app.innerHTML = '<p style="text-align: center">404 Not found</p>'
})

router.get('/users', users)

router.get('/login', login)

router.get('/login/42', (client) => {
  const oauthButton = document.createElement('button')
  oauthButton.textContent = 'Log in with 42'
  oauthButton.addEventListener('click', () => {
    window.location.href = 'https://auth.api.transcendence.local/login/42/'
  })
  client.app.innerHTML = ''
  client.app.appendChild(oauthButton)
})

router.get('/logout', logout)

router.get('/register', register)
