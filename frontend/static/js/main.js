import { chooseFriends, chooseMode, login, login42, logout, profile, register, users } from './auth.js'
import Client from './client.js'
import { pong } from './pong.js'
import Router from './router.js'
import { loadHTML } from './utils.js'

const router = new Router(Client)
Client.router = router

router.get('/choose-mode', chooseMode)

router.get('/choose-friends', chooseFriends)

router.get('/', async (client) => {
  client.app.innerHTML = await loadHTML('../html/home.html')
})

router.get('/404', (client) => {
  client.app.innerHTML = '<p style="text-align: center">404 Not found</p>'
})

router.get('/users', users)

router.get('/login', login)

router.get('/sign-in', async (client) => {
  client.app.innerHTML = await loadHTML('../html/auth.html')
})

router.get('/login/42', login42)

router.get('/logout', logout)

router.get('/register', register)

router.get('/profile', profile)

// router.get('/pong', pong)

router.get('/pong/local', client => pong(client, { mode: 'local' }))
router.get('/pong/remote/:id', (client, params) => pong(client, { mode: 'remote', opponentId: params.id }))
