import pongPage from '../pages/pong.html?raw'
import '../css/pong.css'

/*
export async function pong(client, state) {
  client.socket.onopen = () => {
    console.log('WebSocket connected.')
    const initMessage = {
      type: 'setup',
      content: { ...state },
    }
    console.log(initMessage)
    client.socket.send(JSON.stringify(initMessage))
  }

  // client.router.addEventListener(window, 'resize', () => {
  //   canvasResize(canvas)
  // })
  // client.router.addEvent(document, 'visibilitychange', () => {
  //   // TODO: Pause game for x seconds...
  //   client.socket.close()
  //   client.router.redirect('/')
  // })

  client.socket.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    console.log(data)

    if (data.type === 'setup') {
      const { ready } = data.content
      if (ready) {
        client.app.innerHTML = pongPage
        state.canvas = document.getElementById('pongCanvas')
        client.router.addEvent(document, 'keyup', async (event) => {
          await handleKeyPress(event, client.socket, state)
        })
        // TODO: Game starting in timer.seconds
      }
      else {
        if (state.host) {
          // TODO: Waiting for player 2, create a button to copy link
          const copyLinkBtn = document.getElementById('host-copy-btn')
          copyLinkBtn.classList.remove('d-none')
          // TODO: inform the user that the link was copied
          await navigator.clipboard.writeText(`https://transcendence.fr/pong/remote/join/${state.room_id}`)
        }
        else {
          // TODO: Waiting for the host to start the game
        }
      }
    }

    else if (data.type === 'state') {
      await renderGame(data.content, state.canvas)
    }

    else if (data.type === 'end') {
      client.socket.close()
      const { winner } = data.content
      console.log(winner)
      // TODO: winner is blabla
    }

    else if (data.type === 'unauthorized') {
      client.socket.close()
      client.router.redirect('/sign-in')
    }
  }
}
*/

export async function pong(client, state) {
  // Créez une nouvelle connexion WebSocket pour le jeu Pong
  const gameSocket = new WebSocket(`wss://pong.api.transcendence.fr/ws/?token=${client.token}`)

  gameSocket.onopen = () => {
    console.log('Game WebSocket connected.')
    const initMessage = {
      type: 'setup',
      content: { ...state },
    }
    console.log(initMessage)
    gameSocket.send(JSON.stringify(initMessage))
  }

  gameSocket.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    console.log(data)

    if (data.type === 'setup') {
      const { ready } = data.content
      if (ready) {
        client.app.innerHTML = pongPage
        state.canvas = document.getElementById('pongCanvas')
        client.router.addEvent(document, 'keyup', async (event) => {
          await handleKeyPress(event, gameSocket, state)
        })
        // TODO: Game starting in timer.seconds
      }
      else {
        if (state.host) {
          if (state.mode === 'remote') {
            // TODO: Waiting for player 2, create a button to copy link
            const copyLinkBtn = document.getElementById('host-copy-btn')
            copyLinkBtn.classList.remove('d-none')
            // TODO: inform the user that the link was copied
            try {
              await navigator.clipboard.writeText(`https://transcendence.fr/pong/remote/join/${state.room_id}`)
            }
            catch (err) {
              console.error('Failed to copy link: ', err)
            }
          }
          else if (state.mode === 'tournament') {
            // Code spécifique au mode 'tournament'
            console.log('Waiting for the other player to join...')
            // Vous pouvez afficher un message ou mettre à jour l'interface utilisateur ici
          }
        }
        else {
          // TODO: Waiting for the host to start the game
          console.log('Waiting for the host to start the game...')
        }
      }
    }

    else if (data.type === 'state') {
      await renderGame(data.content, state.canvas)
    }

    else if (data.type === 'end') {
      gameSocket.close()
      const { winner } = data.content
      console.log(winner)
      // TODO: winner is blabla
    }

    else if (data.type === 'unauthorized') {
      gameSocket.close()
      client.router.redirect('/sign-in')
    }
  }

  gameSocket.onclose = () => {
    console.log('Game WebSocket disconnected.')
    // TODO: Handle disconnection if necessary
  }
}

// function canvasResize(canvas) {
//   // console.log('canvasResize called')
//   // const style = getComputedStyle(canvas)
//   // console.log(style)
//   // canvas.width = Number.parseInt(style.width)
//   // canvas.height = Number.parseInt(style.height)
// }

async function renderGame(gameState, canvas) {
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = 'white'
  ctx.setLineDash([5, 15])
  ctx.beginPath()
  ctx.moveTo(canvas.width / 2, 0)
  ctx.lineTo(canvas.width / 2, canvas.height)
  ctx.stroke()

  if (gameState) {
    ctx.font = '24px Arial'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'

    ctx.fillText(`Player 1: ${gameState.player1_score}`, canvas.width * 0.25, 30)

    ctx.fillText(`Player 2: ${gameState.player2_score}`, canvas.width * 0.75, 30)

    const player1 = gameState.player1
    const player2 = gameState.player2
    const ballX = gameState.ball.x
    const ballY = gameState.ball.y

    drawPad(ctx, canvas, player1)
    drawPad(ctx, canvas, player2)

    drawBall(ctx, gameState, canvas, ballX, ballY)
  }
}

function drawBall(ctx, gameState, canvas, ballX, ballY) {
  const radius = gameState.ball.radius * Math.min(canvas.width, canvas.height)
  ctx.beginPath()
  ctx.arc(ballX * canvas.width, ballY * canvas.height, radius, 0, Math.PI * 2) // Avec un rayon de 10
  ctx.fillStyle = gameState.ball.color
  ctx.fill()
  ctx.closePath()
}

function drawPad(ctx, canvas, pad) {
  ctx.fillStyle = pad.color
  ctx.fillRect(pad.x * canvas.width, pad.y * canvas.height, pad.width * canvas.width, pad.height * canvas.height)
}

async function handleKeyPress(event, socket, state) {
  const keyMap = {
    ArrowUp: { action: 'up', defaultPlayer: 2 },
    ArrowDown: { action: 'down', defaultPlayer: 2 },
    w: { action: 'up', defaultPlayer: 1 },
    s: { action: 'down', defaultPlayer: 1 },
  }

  const { action, defaultPlayer } = keyMap[event.key] ?? {}
  if (!socket || !action)
    return

  console.log(`Key pressed: ${event.key}`)
  const player = state.mode === 'remote' ? state.player : defaultPlayer

  const data = {
    type: 'move',
    content: {
      player,
      action,
    },
  }

  socket.send(JSON.stringify(data))
}
