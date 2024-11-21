import tournamentPage from '../pages/tournament.html?raw';
import '../css/tournament.css';

export async function initTournament(client) {
  client.app.innerHTML = tournamentPage;

  // State to track the tournament
  const state = {
    players: [],
    isLocked: false,
    matches: [],
    currentMatch: null,
  };

  // WebSocket connection
  if (!client.socket) {
    client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/`);
  }

  client.socket.onopen = () => {
    console.log('WebSocket for tournament connected.');

    // Notify server to create a tournament
    const initMessage = {
      type: 'create_tournament',
      content: { host: client.user, room_id: 'tournament-123' },
    };
    client.socket.send(JSON.stringify(initMessage));
  };

  client.socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'player_joined':
        updatePlayerList(data.content.player);
        break;

      case 'tournament_locked':
        handleTournamentLocked();
        break;

      case 'match_ready':
        startMatch(data.content.match);
        break;

      case 'tournament_update':
        updateTournamentBracket(data.content.bracket);
        break;

      case 'tournament_end':
        handleTournamentEnd(data.content.winner);
        break;

      default:
        console.log('Unknown message:', data);
    }
  };

  // Lock tournament
  document.getElementById('lockTournament').addEventListener('click', () => {
    client.socket.send(JSON.stringify({ type: 'lock_tournament' }));
  });

  // Start tournament
  document.getElementById('startTournament').addEventListener('click', () => {
    client.socket.send(JSON.stringify({ type: 'start_tournament' }));
  });

  // Helper functions
  function updatePlayerList(player) {
    state.players.push(player);
    const playerList = document.getElementById('playerList');
    const newPlayer = document.createElement('li');
    newPlayer.textContent = player;
    playerList.appendChild(newPlayer);
  }

  function handleTournamentLocked() {
    state.isLocked = true;
    document.getElementById('lockTournament').disabled = true;
    document.getElementById('startTournament').disabled = false;
    console.log('Tournament locked! Ready to start.');
  }

  function startMatch(match) {
    state.currentMatch = match;
    console.log(`Starting match: ${match.player1} vs ${match.player2}`);
    pong(client, {
      mode: 'tournament',
      room_id: match.room_id,
      player: match.player,
    });
  }

  function updateTournamentBracket(bracket) {
    const bracketElement = document.getElementById('tournamentBracket');
    bracketElement.innerHTML = bracket.map(
      (match) =>
        `<p>${match.player1} vs ${match.player2} - Winner: ${
          match.winner || 'TBD'
        }</p>`
    ).join('');
  }

  function handleTournamentEnd(winner) {
    console.log(`Tournament ended! Winner: ${winner}`);
    client.app.innerHTML = `<h1>Congratulations, ${winner}!</h1>`;
  }
}
