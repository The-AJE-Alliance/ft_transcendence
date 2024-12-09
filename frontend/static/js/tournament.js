import tournamentPage from '../pages/tournament.html?raw'
import { pong } from './pong.js'

export async function tournament(client, input) {
  client.app.innerHTML = tournamentPage

  const state = {
    players: [],
    isLocked: false,
    matches: [],
    currentMatch: null,
    host: input.host,
    player: input.player,
    user_id: input.user_id,
    tournament_id: input.tournament_id,
  }
  const controls = document.querySelector('.tournament-controls')
  if (state.host) {
    controls.style.display = 'block'
  }
  else {
    controls.style.display = 'none'
  }
  client.socket.onopen = () => {
    console.log('Tournament WebSocket connected.')
    const initMessage = {
      type: 'setup_tournament',
      content: { ...input },
    }
    client.socket.send(JSON.stringify(initMessage))
  }
  client.socket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    switch (data.type) {
      case 'setup_tournament':
        greetTournament(client, state, data.content)
        break
      case 'player_joined':
        updatePlayerList(state, data.content.players)
        break

      case 'tournament_locked':
        state.tournamentHostId = data.content.host_user_id
        handleTournamentLocked(data.content, state)
        break
      case 'match_ready':
        startMatch(data.content.match, state, client)
        break

      case 'match_result':
        handleMatchResult(data.content)
        break

      case 'tournament_update':
        if (document.getElementById('tournamentBracket')) {
          updateTournamentBracket(data.content.bracket)
        }
        else {
          console.warn('tournamentBracket element not found, skipping update.')
        }
        break

      case 'tournament_end':
        handleTournamentEnd(data.content, client, client.socket, state)
        break

      case 'start_tournament':
        handleStartTournament()
        break
      case 'match_ended':
        handleMatchEnded(data.content, state, client)
        break
      case 'unauthorized':
        client.socket.close()
        client.router.redirect('/sign-in')
        break
      case 'game_not_ready':
        alert(data.content.message)
        break
      default:
        console.log('Unknown message:', data.type)
    }
  }
  const lockTournamentBtn = document.getElementById('lock-tournament')
  client.router.addEvent(lockTournamentBtn, 'click', () => {
    if (lockTournamentBtn.disabled)
      return
    client.socket.send(JSON.stringify({
      type: 'lock_tournament',
      content: { user_id: state.user_id },
    }))
  })
  const startTournamentBtn = document.getElementById('start-tournament')
  client.router.addEvent(startTournamentBtn, 'click', () => {
    if (!state.isLocked) {
      alert('The tournament must be locked before starting.')
      return
    }
    client.socket.send(JSON.stringify({ type: 'start_tournament' }))
  })
}

function handleMatchResult(content) {
  if (content.result === 'win') {
    alert(`You won against ${content.opponent} !`)
  }
  else {
    alert(`You lost to ${content.opponent}.`)
  }
}

function handleStartTournament() {
  const tournamentMessage = document.getElementById('tournamentMessage')

  tournamentMessage.textContent = `You'll be playing a match against XX in 5 seconds.`

  setTimeout(() => {
    tournamentMessage.textContent = `The match has started!`
  }, 5000)
}

function handleTournamentLocked(content, state) {
  if (!content.ready) {
    alert(content.message)
    return
  }
  state.isLocked = true
  console.log('Tournament locked! Ready to start.')
  if (content.ready) {
    content.bracket.forEach((match) => {
      if (!match.player1.host && !match.player2.host) {
        match.player1.host = true
        match.player2.host = false
      }
    })
    updateTournamentBracket(content.bracket)
    const lockTournamentBtn = document.getElementById('lock-tournament')
    lockTournamentBtn.disabled = true
    lockTournamentBtn.textContent = 'Locked'
  }
}

async function startMatch(match, state, client) {
  state.currentMatch = match
  const localUserId = state.user_id
  let playerNumber
  let isHost
  if (match.player1.user_id === localUserId) {
    playerNumber = 1
    isHost = match.player1.host
  }
  else if (match.player2.user_id === localUserId) {
    playerNumber = 2
    isHost = match.player2.host
  }
  else {
    return
  }
  if (isHost === undefined) {
    if (playerNumber === 1) {
      isHost = true
    }
    else {
      isHost = false
    }
  }
  if (!isHost)
    await new Promise(resolve => setTimeout(resolve, 1000))

  console.log(`Starting match: ${match.player1.user_id} vs ${match.player2.user_id}`)
  const gameSocket = new WebSocket(`wss://pong.api.transcendence.fr/ws/?token=${client.token}`)
  await pong(client, {
    mode: 'tournament',
    room_id: match.room_id,
    host: isHost,
    player: playerNumber,
    tournament_id: state.tournament_id,
    user_id: state.user_id,
  }, gameSocket)
}

function handleMatchEnded(content, state, client) {
  const { match } = content
  const winner = match.winner
  const loser = match.player1.user_id === winner.user_id ? match.player2 : match.player1
  const matchIndex = state.matches.findIndex(m => m.room_id === match.room_id)
  if (matchIndex !== -1) {
    state.matches[matchIndex].winner = match.winner
    updateTournamentBracket(state.matches)
  }
  if (state.user_id === loser.user_id) {
    alert(`You lost this round. The winner is: ${winner.nickname}`)
    client.router.redirect(`/tournament/${state.tournament_id}`)
    return
  }
  if (state.user_id === winner.user_id) {
    alert('Congratulations! You won this round and are advancing to the next match.')
  }
}

export function updateTournamentBracket(bracket) {
  const bracketElement = document.getElementById('tournamentBracket')
  bracketElement.innerHTML = ''
  bracket.forEach((match, index) => {
    const matchElement = document.createElement('div')
    matchElement.innerHTML = `
        <div class="match">
          <p>Match ${index + 1}:</p>
          <p>${match.player1.nickname} vs ${match.player2.nickname}</p>
          <p>Winner: ${match.winner ? match.winner.nickname : 'Waiting'}</p>
        </div>
      `
    bracketElement.appendChild(matchElement)
  })
}

function handleTournamentEnd(content, client, gameSocket, state) {
  if (state.tournamentComplete) {
    return
  }
  state.tournamentComplete = true
  alert(`${content.winner} won the tournament !`)
  if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
    gameSocket.close()
    console.log('Game WebSocket closed after tournament completion.')
  }
  client.router.redirect(`/tournaments/${state.tournament_id}/final-ranking`)
}

function greetTournament(client, state, data) {
  console.log('Greet tournament called with data:', data)
  updatePlayerList(state, data.players)
  if (state.host) {
    const copyLinkBtn = document.getElementById('host-copy-btn')
    copyLinkBtn.classList.remove('d-none')
    if (copyLinkBtn) {
      client.router.addEvent(copyLinkBtn, 'click', async () => {
        console.log('Copy button clicked!')
        const link = `https://transcendence.fr/pong/tournament/join/${state.tournament_id}`
        console.log('Link to copy:', link)
        await navigator.clipboard.writeText(`https://transcendence.fr/pong/tournament/join/${state.tournament_id}`)
        alert('Link copied!')
      })
    }
    else {
      console.error('Copy Link button not found in the DOM.')
    }
  }
  else {
    state.player = data.player
    const localPlayer = data.players.find(player => player.user_id === state.user_id)
    state.host = localPlayer ? localPlayer.host : false
    updatePlayerList(state, data.players)
  }
}

function updatePlayerList(state, players) {
  console.log('Players received:', players)
  state.players = players

  const playerList = document.getElementById('playerList')
  playerList.innerHTML = ''

  players.forEach((player) => {
    console.log('Player:', player)
    const newPlayer = document.createElement('li')
    newPlayer.textContent = `Player ${player.player_num}: ${player.nickname}${player.host ? ' (Host)' : ''}`
    playerList.appendChild(newPlayer)
  })
}

export async function updateTournament(client) {
  const tournamentId = client.state.tournament_id
  try {
    const data = await ky.get(`https://pong.api.transcendence.fr/tournaments/${tournamentId}/final-ranking/`).json()
    renderTournamentData(data)
  }
  catch (error) {
    console.error('Error updating tournament:', error)
  }
}

function renderTournamentData(data) {
  const tournamentBracket = document.getElementById('tournamentBracket')
  tournamentBracket.innerHTML = ''
  data.ranking.forEach((player, index) => {
    const playerElement = document.createElement('div')
    playerElement.innerHTML = `
      <div class="player">
        <p>${index + 1}. ${player.nickname}</p>
      </div>
    `
    tournamentBracket.appendChild(playerElement)
  })
}
