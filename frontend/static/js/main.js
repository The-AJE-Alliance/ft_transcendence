import authPage from '../pages/auth.html?raw'
import homePage from '../pages/home.html?raw'
import { chooseFriends, chooseMode, login, login42, logout, profile, register } from './auth.js'
import Client from './client.js'
import { updateNavbar } from './navbar.js'
import { pong } from './pong.js'
import Router from './router.js'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import '../css/styles.css'

const router = new Router(Client)
Client.router = router

router.get('/choose-mode', chooseMode)

router.get('/choose-friends', chooseFriends)

router.get('/', async (client) => {
  client.app.innerHTML = homePage
  await updateNavbar(client)
})

router.get('/404', (client) => {
  client.app.innerHTML = '<p style="text-align: center">404 Not found</p>'
})

router.get('/login', login)

router.get('/sign-in', async (client) => {
  client.app.innerHTML = authPage
})

router.get('/login/42', login42)

router.get('/logout', logout)

router.get('/register', register)

router.get('/profile', profile)

// router.get('/pong', pong)

router.get('/pong/local', client => pong(client, { mode: 'local' }))
router.get('/pong/remote/:id', (client, params) => pong(client, { mode: 'remote', opponentId: params.id }))
