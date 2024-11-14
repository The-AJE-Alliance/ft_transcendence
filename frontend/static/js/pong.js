import pongPage from '../pages/pong.html?raw'
import '../css/pong.css'

export async function pong(client, options = {}) {
  const state = {
    mode: options.mode,
    player: options.mode === 'remote' && !options.host ? 2 : 1,
    host: options.host,
    room_id: options.room_id,
  }

  client.app.innerHTML = pongPage

  client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/`)

  const canvas = document.getElementById('pongCanvas')
  if (!canvas) {
    console.log('No canvas found')
    client.router.redirect('/')
  }
  client.router.addEvent(document, 'visibilitychange', () => {
    // TODO: Pause game for x seconds...
    client.socket.close()
    client.router.redirect('/')
  })

  client.socket.onopen = () => {
    console.log('WebSocket connected.')
    const initMessage = {
      type: 'setup',
      content: {
        mode: state.mode,
        player: state.player,
        host: state.host,
        room_id: state.room_id,
      },
    }
    client.socket.send(JSON.stringify(initMessage))
  }

  client.router.addEvent(document, 'keyup', async (event) => {
    await handleKeyPress(event, client.socket, state)
  })

  // client.router.addEventListener(window, 'resize', () => {
  //   canvasResize(canvas)
  // })

  client.socket.onmessage = async (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'state') {
      await renderGame(data.content, canvas)
    }

    else if (data.type === 'setup') {
      const { ready } = data.content
      if (ready) {
        // TODO: Game starting in timer.seconds
      }
      else {
        // TODO: Waiting for player2...
      }
    }
  }
}

// function canvasResize(canvas) {
//   // console.log('canvasResize called')
//   // const style = getComputedStyle(canvas)
//   // console.log(style)
//   // canvas.width = Number.parseInt(style.width)
//   // canvas.height = Number.parseInt(style.height)
// }

// fonction pr initialiser canvas puis une autre qui render
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
