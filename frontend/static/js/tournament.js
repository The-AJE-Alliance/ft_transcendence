import tournamentPage from '../pages/tournaments.html?raw'
// import '../css/tournament.css';

export async function initTournament(client) {
  client.app.innerHTML = tournamentPage

  // State to track the tournament
  const tournamentState = {
    players: [],
    isLocked: false,
    matches: [],
    currentMatch: null,
  }

  client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/`)

  client.socket.onopen = () => {
    console.log('WebSocket for tournament connected.')

    const initMessage = {
      type: 'setup_tournament',
      content: {
        mode: 'tournament',
        host: true,
        tournament_id: globalThis.crypto.randomUUID(),
      },
    }
    client.socket.send(JSON.stringify(initMessage))
  }

  client.socket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log('Message received:', event.data)

    switch (data.type) {
      case 'player_joined':
        updatePlayerList(data.content.player)
        break

      case 'tournament_locked':
        handleTournamentLocked()
        break

      case 'match_ready':
        startMatch(data.content.match)
        break

      case 'tournament_update':
        updateTournamentBracket(data.content.bracket)
        break

      case 'tournament_end':
        handleTournamentEnd(data.content.winner)
        break

      default:
        console.log('Unknown message:', data)
    }
  }

  // Lock tournament
  const lockTournamentBtn = document.getElementById('lock-tournament')
  client.router.addEvent(lockTournamentBtn, 'click', () => {
    client.socket.send(JSON.stringify({ type: 'lock_tournament' }))
  })

  // Start tournament
  const startTournamentBtn = document.getElementById('start-tournament')
  client.router.addEvent(startTournamentBtn, 'click', () => {
    client.socket.send(JSON.stringify({ type: 'start_tournament' }))
  })

  // Helper functions
  function updatePlayerList(player) {
    tournamentState.players.push(player)
    const playerList = document.getElementById('playerList')
    const newPlayer = document.createElement('li')
    newPlayer.textContent = player
    playerList.appendChild(newPlayer)
  }

  function handleTournamentLocked() {
    tournamentState.isLocked = true
    console.log('Tournament locked! Ready to start.')
    document.getElementById('lock-tournament').disabled = true
    document.getElementById('start-tournament').disabled = false
  }

  function startMatch(match) {
    tournamentState.currentMatch = match
    console.log(`Starting match: ${match.player1} vs ${match.player2}`)
    pong(client, {
      mode: 'tournament',
      room_id: match.room_id,
      player: match.player,
    })
  }

  function updateTournamentBracket(bracket) {
    const bracketElement = document.getElementById('tournamentBracket')
    bracketElement.innerHTML = bracket.map(
      match =>
        `<p>${match.player1} vs ${match.player2} - Winner: ${
          match.winner || 'TBD'
        }</p>`,
    ).join('')
  }

  function handleTournamentEnd(winner) {
    console.log(`Tournament ended! Winner: ${winner}`)
    client.app.innerHTML = `<h1>Congratulations, ${winner}!</h1>`
  }
}
