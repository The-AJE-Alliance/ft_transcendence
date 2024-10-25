import { login, login42, logout, register, users } from './auth.js'
import Client from './client.js'
import Router from './router.js'
import { loadHTML } from './utils.js'

const router = new Router(Client)

router.get('/', async (client) => {
  client.app.innerHTML = await loadHTML('../home.html')
})

router.get('/404', (client) => {
  client.app.innerHTML = '<p style="text-align: center">404 Not found</p>'
})

router.get('/users', users)

router.get('/login', login)

router.get('/sign-in', async (client) => {
  client.app.innerHTML = await loadHTML('../auth.html') // Charger auth.html pour la sélection
})

router.get('/login/42', login42)

router.get('/logout', logout)

router.get('/register', register)
window.router = router
