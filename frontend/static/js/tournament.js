import tournamentPage from '../pages/tournament.html?raw'
import { pong } from './pong.js'

export async function tournament(client, input) {
  client.app.innerHTML = tournamentPage
  // State to track the tournament
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

  console.log(state)
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
    console.log(initMessage)
    client.socket.send(JSON.stringify(initMessage))
  }

  client.socket.onmessage = (event) => {
    console.log('Message received:', event.data)
    const data = JSON.parse(event.data)

    switch (data.type) {
      case 'setup_tournament':
        console.log('Handling setup_tournament:', data)
        greetTournament(client, state, data.content)
        break

      case 'player_joined':
        updatePlayerList(state, data.content.players)
        break

      case 'tournament_locked':
        state.tournamentHostId = data.content.host_user_id
        handleTournamentLocked(data.content)
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

      case 'start_tournament':
        handleStartTournament()
        break
      case 'match_ended':
        handleMatchEnded(data.content)
        break
      case 'unauthorized':
        client.socket.close()
        client.router.redirect('/sign-in')
        break

      default:
        console.log('Unknown message:', data.type)
    }
  }

  // Lock tournament
  const lockTournamentBtn = document.getElementById('lock-tournament')
  client.router.addEvent(lockTournamentBtn, 'click', () => {
    // client.socket.send(JSON.stringify({ type: 'lock_tournament', user_id: state.user_id }))
    client.socket.send(JSON.stringify({
      type: 'lock_tournament',
      content: { user_id: state.user_id },
    }))
  })

  // Start tournament
  const startTournamentBtn = document.getElementById('start-tournament')
  client.router.addEvent(startTournamentBtn, 'click', () => {
    client.socket.send(JSON.stringify({ type: 'start_tournament' }))
  })

  function handleStartTournament() {
    const tournamentMessage = document.getElementById('tournamentMessage')

    tournamentMessage.textContent = `You'll be playing a match against XX in 5 seconds.`

    setTimeout(() => {
      tournamentMessage.textContent = `The match has started!`
    }, 5000)
  }

  function handleTournamentLocked(content) {
    state.isLocked = true
    console.log('Tournament locked! Ready to start.')
    if (content.ready) {
      updateTournamentBracket(content.bracket)
      document.getElementById('lock-tournament').disabled = true
      document.getElementById('start-tournament').disabled = false
    }
    else {
      alert(content.message)
    }
  }

  function startMatch(match) {
    state.currentMatch = match
    const localUserId = state.user_id
    let playerNumber
    let isHost = false
    if (match.player1.user_id === localUserId) {
      playerNumber = 1
      isHost = true
    }
    else if (match.player2.user_id === localUserId) {
      playerNumber = 2
      isHost = false
    }
    else {
      // Le joueur local n'est pas dans ce match
      return
    }
    console.log(`Starting match: ${match.player1.user_id} vs ${match.player2.user_id}`)
    pong(client, {
      mode: 'tournament',
      room_id: match.room_id,
      host: isHost,
      player: playerNumber,
    })
  }

  function handleMatchEnded(content) {
    const { match } = content
    // Mettre à jour le match correspondant dans state.matches
    const matchIndex = state.matches.findIndex(m => m.room_id === match.room_id)
    if (matchIndex !== -1) {
      state.matches[matchIndex].winner = match.winner
      updateTournamentBracket(state.matches)
    }
    // Vérifier si tous les matchs du round sont terminés
    if (state.matches.every(m => m.winner)) {
      // Tous les matchs du round sont terminés
      console.log('All matches in the round are finished.')
      // Attendre le prochain round ou terminer le tournoi
    }
  }

  function updateTournamentBracket(bracket) {
    const bracketElement = document.getElementById('tournamentBracket')
    bracketElement.innerHTML = bracket.map(
      match => `<p>${match.player1.nickname} vs ${match.player2.nickname} - Winner: ${match.winner ? match.winner.nickname || match.winner.user_id : 'TBD'}</p>`,
    ).join('')
  }

  function handleTournamentEnd(winner) {
    console.log(`Tournament ended! Winner: ${winner}`)
    client.app.innerHTML = `<h1>Congratulations, ${winner}!</h1>`
  }
}

function greetTournament(client, state, data) {
  console.log('Greet tournament called with data:', data)
  updatePlayerList(state, data.players)
  if (state.host) {
    // client.app.innerHTML = tournamentSetupPage
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
    // TODO: waiting for blabla, waiting page
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
    newPlayer.textContent = `Player ${player.player_num}: ${player.nickname}`
    playerList.appendChild(newPlayer)
  })
}
