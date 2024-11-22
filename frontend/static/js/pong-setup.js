import pongPage from '../pages/pong.html?raw'
import chooseModePage from '../pages/pong-mode.html?raw'
import pongRemotePage from '../pages/pong-remote.html?raw'
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
  })

  const state = {
    mode: 'remote',
    player: 1,
    host: true,
    room_id: globalThis.crypto.randomUUID(),
  }

  client.router.addEvent(client.socket, 'open', () => {
    console.log('WebSocket connected.')
    const initMessage = {
      type: 'setup',
      content: {
        state,
      },
    }
    client.socket.send(JSON.stringify(initMessage))
  })

  client.router.addEvent(client.socket, 'message', async (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'setup') {
      const { ready } = data.content
      if (ready) {
        client.app.innerHTML = pongPage
        // TODO: game starting soon
      }
      else {
        // TODO: waiting for other player
        // TODO: create button to copy link and invite them
      }
    }
    else {
      // TODO: pong game send data, state
    }
  })
}

export async function joinGame(client) {
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
    room_id: 'a', // TODO: gret from url,
  }

  client.router.addEvent(client.socket, 'open', () => {
    console.log('WebSocket connected.')
    const initMessage = {
      type: 'setup',
      content: {
        state,
      },
    }
    client.socket.send(JSON.stringify(initMessage))
  })

  client.router.addEvent(client.socket, 'message', async (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'setup') {
      const { ready } = data.content
      if (ready) {
        client.app.innerHTML = pongPage
        // TODO: game starting soon
      }
      else {
        // TODO: waiting for host to start the game
      }
    }
    else {
      // TODO: pong game send data, state
    }
  })
}
