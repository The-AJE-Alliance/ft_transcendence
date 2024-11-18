import authPage from '../pages/auth.html?raw'
import homePage from '../pages/home.html?raw'
import { login, login42, logout } from './auth.js'
import Client from './client.js'
import { editProfile, updateProfile } from './edit-profile.js'
import { updateNavbar } from './navbar.js'
import { pong } from './pong.js'
import { choosePongMode, remotePong, remoteSetup } from './pong-setup.js'
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

router.get('/pong/local', client => pong(client, { mode: 'local', host: true, room_id: '35343' }))
router.get('/pong/remote/:id', (client, params) => pong(client, { mode: 'remote', opponentId: params.id }))

router.get('/profile/edit', editProfile)
router.get('/profile/update', updateProfile)
