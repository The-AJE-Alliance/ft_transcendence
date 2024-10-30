import { loadHTML } from './utils.js'

export async function pong(client) {
  client.app.innerHTML = await loadHTML(('../html/pong.html'))
  // creation de la websocket

  client.socket = new WebSocket('wss://pong.api.transcendence.local/ws/')

  const canvas = document.getElementById('pongCanvas')
  document.addEventListener('visibilitychange', () => {
    client.socket.close()
    client.router.redirect('/')
  })

  client.socket.onopen = function () {
    console.log('WebSocket connected.')
  }

  document.addEventListener('keyup', (event) => {
    handleKeyPress(event, client.socket)
  })

  window.addEventListener('resize', () => {
    canvasResize(canvas)
  })

  client.socket.onmessage = function (event) {
    const gameState = JSON.parse(event.data)
    // console.log('Received game status:', gameState)

    initializeCanvas(gameState, canvas)
  }
}

function canvasResize(canvas) {
  // console.log('canvasResize called')
  // const style = getComputedStyle(canvas)
  // console.log(style)
  // canvas.width = Number.parseInt(style.width)
  // canvas.height = Number.parseInt(style.height)

}

async function initializeCanvas(gameState, canvas) {
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
    const ballX = gameState.ball_position[0] * canvas.width
    const ballY = gameState.ball_position[1] * canvas.height

    // Dessin des raquettes
    drawPad(ctx, canvas, player1)
    drawPad(ctx, canvas, player2)

    // Dessiner la balle
    ctx.beginPath()
    ctx.arc(ballX, ballY, 10, 0, Math.PI * 2) // Avec un rayon de 10
    ctx.fill()
    ctx.closePath()
  }
}

function drawPad(ctx, canvas, pad) {
  ctx.fillStyle = pad.color
  ctx.fillRect(pad.x * canvas.width, pad.y * canvas.height, pad.width * canvas.width, pad.height * canvas.height)
}

// event listener pour les touches
function handleKeyPress(event, socket) {
  console.log(`Key pressed: ${event.key}`)
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
  const data = {
    player,
    action,
  }

  // Envoyer les données via la websocket
  socket.send(JSON.stringify(data))
}
// !!!!!!!!!! pour calculer les coordonnées adaptées à la taille du canvas
// // Taille du canvas
// let canvasWidth = canvas.width;
// let canvasHeight = canvas.height;

// // Coordonnées normalisées venant du back-end
// let normalizedBallPosition = [0.5, 0.5]; // Exemple

// // Calcul des coordonnées réelles
// let realBallPositionX = normalizedBallPosition[0] * canvasWidth;
// let realBallPositionY = normalizedBallPosition[1] * canvasHeight;
