import pongPage from '../pages/pong.html?raw'
import '../css/pong.css'

export async function pong(client, options = {}) {
  const { mode, host, room_id } = options

  client.app.innerHTML = pongPage

  client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/?mode=${mode}&host=${host}&room_id=${room_id}`)

  const canvas = document.getElementById('pongCanvas')
  if (!canvas) {
    console.log('No canvas found')
    client.router.redirect('/')
  }
  client.router.addEvent(document, 'visibilitychange', () => {
    client.socket.close()
    client.router.redirect('/')
  })

  client.socket.onopen = () => {
    console.log('WebSocket connected.')
    const initMessage = JSON.stringify({
      type: 'init_game',
      mode: options.mode,
      host: options.host,
      opponentId: options.opponentId,
    })
    client.socket.send(initMessage)
  }

  client.router.addEvent(document, 'keyup', async (event) => {
    await handleKeyPress(event, client.socket)
  })

  // client.router.addEventListener(window, 'resize', () => {
  //   canvasResize(canvas)
  // })

  client.socket.onmessage = async (event) => {
    const gameState = JSON.parse(event.data)
    // console.log('Received game status:', gameState)

    await renderGame(gameState, canvas)
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

async function handleKeyPress(event, socket) {
  if (!socket)
    return

  console.log(`Key pressed: ${event.key}`)
  const type = 'move'
  let action = ''
  let player = 0

  switch (event.key) {
    case 'ArrowUp':
      action = 'move_up'
      player = 2
      break
    case 'ArrowDown':
      action = 'move_down'
      player = 2
      break
    case 'w':
      action = 'move_up'
      player = 1
      break
    case 's':
      action = 'move_down'
      player = 1
      break
    default:
      return
  }

  // event.preventDefault()
  const data = {
    type,
    player,
    action,
  }
  socket.send(JSON.stringify(data))
}
