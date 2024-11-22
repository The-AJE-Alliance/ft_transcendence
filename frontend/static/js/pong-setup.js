import chooseModePage from '../pages/pong-mode.html?raw'
import pongRemotePage from '../pages/pong-remote.html?raw'
import { pong } from './pong.js'
import '../css/pong-friends.css'
import '../css/pong-mode.css'

export async function choosePongMode(client) {
  client.app.innerHTML = chooseModePage
}

export async function remotePong(client) {
  client.redirectToFriends = true
  if (await client.isLoggedIn())
    client.router.redirect('/pong/remote/setup')
  else
    client.router.redirect('/sign-in')
}

export async function remoteSetup(client) {
  if (!await client.isLoggedIn()) {
    await client.refresh()
    client.router.redirect('/login')
    return
  }

  client.app.innerHTML = pongRemotePage
  const createGameBtn = document.getElementById('host-create-btn')

  client.router.addEvent(createGameBtn, 'click', async () => {
    client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/`)

    const state = {
      mode: 'remote',
      player: 1,
      host: true,
      room_id: globalThis.crypto.randomUUID(),
    }
    createGameBtn.classList.add('d-none')

    await pong(client, state)
  })
}

export async function joinGame(client, uuid) {
  if (!await client.isLoggedIn()) {
    await client.refresh()
    client.router.redirect('/login')
    return
  }

  client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/`)

  const state = {
    mode: 'remote',
    player: 2,
    host: false,
    room_id: uuid,
  }

  // TODO: potentially create a waiting page for player2

  await pong(client, state)
}

export async function localGame(client) {
  client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/`)

  const state = {
    mode: 'local',
    player: 1,
    host: true,
    room_id: globalThis.crypto.randomUUID(),
  }

  await pong(client, state)
}
