import tournamentPage from '../pages/tournament.html?raw'

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

        // case 'player_joined':
        //   updatePlayerList(state, data.content.player)
        //   break

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

      case 'start_tournament':
        handleStartTournament()
        break

      default:
        console.log('Unknown message:', data.type)
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

  function handleStartTournament() {
    const tournamentMessage = document.getElementById('tournamentMessage')

    tournamentMessage.textContent = `You'll be playing a match against XX in 5 seconds.`

    setTimeout(() => {
      tournamentMessage.textContent = `The match has started!`
    }, 5000)
  }

  function handleTournamentLocked() {
    state.isLocked = true
    console.log('Tournament locked! Ready to start.')
    document.getElementById('lock-tournament').disabled = true
    document.getElementById('start-tournament').disabled = false
  }

  function startMatch(match) {
    state.currentMatch = match
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

function greetTournament(client, state, data) {
  console.log('Greet tournament called with data:', data)
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
  state.players = players

  const playerList = document.getElementById('playerList')

  playerList.innerHTML = ''

  players.forEach((player) => {
    const newPlayer = document.createElement('li')
    newPlayer.textContent = `Player ${player.player_num}: ${player.user_id}`
    playerList.appendChild(newPlayer)
  })
}
