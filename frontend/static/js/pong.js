import pongPage from '../pages/pong.html?raw'
import { showAlert } from './utils'
import '../css/pong.css'

let gameInitialized = false

export async function pong(client, state, gameSocket) {
  gameSocket.onopen = () => {
    console.log('Game WebSocket connected.')
    const initMessage = {
      type: 'setup',
      content: { ...state },
    }
    gameSocket.send(JSON.stringify(initMessage))
  }
  gameSocket.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'setup') {
      const { ready } = data.content
      if (ready) {
        client.app.innerHTML = pongPage
        state.canvas = document.getElementById('pongCanvas')
        state.nicks = data.content.nicks
        gameInitialized = true
        client.router.addEvent(document, 'keyup', async (event) => {
          await handleKeyPress(event, gameSocket, state)
        })
        // TODO: Game starting in timer.seconds
      }
      else {
        if (state.host) {
          if (state.mode === 'remote') {
            console.log('End game event received:', data)
            const copyLinkBtn = document.getElementById('host-copy-btn')
            if (copyLinkBtn) {
              client.router.addEvent(copyLinkBtn, 'click', async () => {
                const link = `https://transcendence.fr/pong/remote/join/${state.room_id}`
                console.log('Link to copy:', link)
                await navigator.clipboard.writeText(link)
                showAlert('Link copied!', 'success')
              })
            }
            else {
              console.error('Copy link button not found in the Dom')
            }
          }
          else if (state.mode === 'tournament') {
            console.log('Waiting for the other player to join...')
          }
        }
        else {
          // TODO: Waiting for the host to start the game
          console.log('Waiting for the host to start the game...')
        }
      }
    }
    else if (data.type === 'state') {
      if (!gameInitialized || !state.canvas) {
        console.warn('Received state before game initialized, ignoring.')
        return
      }
      await renderGame(data.content, state.canvas, state.nicks)
    }

    else if (data.type === 'end') {
      const { winner } = data.content
      showAlert(`The winner is: Player ${winner}`, 'success')
      if (state.mode !== 'tournament') {
        gameSocket.close()
        client.router.redirect('/match-history')
      }
    }
    else if (data.type === 'unauthorized') {
      gameSocket.close()
      client.router.redirect('/sign-in')
    }
  }

  gameSocket.onclose = () => {
    console.log('Game WebSocket disconnected.')
    document.removeEventListener('keyup', handleKeyPress)
  }
}
// function canvasResize(canvas) {
//   // console.log('canvasResize called')
//   // const style = getComputedStyle(canvas)
//   // console.log(style)
//   // canvas.width = Number.parseInt(style.width)
//   // canvas.height = Number.parseInt(style.height)
// }

async function renderGame(gameState, canvas, nicks) {
  if (!canvas) {
    console.warn('Canvas is not defined yet, skipping render.')
    return
  }
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

    ctx.fillText(`${nicks.player1}: ${gameState.player1_score}`, canvas.width * 0.25, 30)

    ctx.fillText(`${nicks.player2}: ${gameState.player2_score}`, canvas.width * 0.75, 30)

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
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
  }
  const player = state.mode === 'local' ? defaultPlayer : state.player

  const data = {
    type: 'move',
    content: {
      player,
      action,
    },
  }
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data))
  }
  else {
    console.log('WebSocket is not open')
  }
}
