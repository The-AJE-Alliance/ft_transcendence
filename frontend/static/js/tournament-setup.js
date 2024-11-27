import tournamentSetupPage from '../pages/tournament-setup.html?raw'
import { tournament } from './tournament'
// import '../css/tournament.css';

export async function remoteTournament(client) {
  if (await client.isLoggedIn())
    client.router.redirect('/pong/tournament/setup')
  else
    client.router.redirect('/sign-in')
}

export async function joinTournament(client, uuid) {
  if (!await client.isLoggedIn()) {
    await client.refresh()
    client.router.redirect('/login')
    return
  }

  client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/`)

  const state = {
    host: false,
    player: 0,
    user_id: client.id,
    tournament_id: uuid,
  }

  await tournament(client, state)
}

export async function tournamentSetup(client) {
  if (!await client.isLoggedIn()) {
    await client.refresh()
    client.router.redirect('/login')
    return
  }

  client.app.innerHTML = tournamentSetupPage

  const createGameBtn = document.getElementById('host-create-btn')

  client.router.addEvent(createGameBtn, 'click', async () => {
    client.socket = new WebSocket(`wss://pong.api.transcendence.fr/ws/`)

    const state = {
      host: true,
      player: 1,
      user_id: client.id,
      tournament_id: globalThis.crypto.randomUUID().split('-')[0],
    }
    createGameBtn.classList.add('d-none')

    await tournament(client, state)
  })
}
