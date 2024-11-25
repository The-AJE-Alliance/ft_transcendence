import authPage from '../pages/auth.html?raw'
import homePage from '../pages/home.html?raw'
import { settings } from './2FA.js'
import { login, login42, logout } from './auth.js'
import { chat } from './chat.js'
import Client from './client.js'
import { editProfile, updateProfile } from './edit-profile.js'
import { friends } from './friends.js'
import { updateNavbar } from './navbar.js'
import { choosePongMode, joinGame, localGame, remotePong, remoteSetup } from './pong-setup.js'
import { profile } from './profile.js'
import { register } from './register.js'
import Router from './router.js'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import '../css/styles.css'

const router = new Router(Client)
Client.router = router

router.get('/', async (client) => {
  client.app.innerHTML = homePage
  await updateNavbar(client)
})
router.get('/chat', chat)
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

router.get('/pong', choosePongMode)
router.get('/pong/remote', remotePong)
router.get('/pong/remote/setup', remoteSetup)
router.get('/pong/remote/join/:id', (client, params) => joinGame(client, params.id))
router.get('/pong/local', localGame)

router.get('/profile/edit', editProfile)
router.get('/profile/update', updateProfile)
router.get('/friends', friends)
router.get('/settings', settings)
