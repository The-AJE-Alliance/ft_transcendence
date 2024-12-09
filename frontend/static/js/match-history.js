import ky from 'ky'
import matchHistoryPage from '../pages/match-history.html?raw'
import { updateNavbar } from './navbar'
import '../css/match-history.css'

export async function matchHistory(client) {
  client.app.innerHTML = matchHistoryPage
  if (!await client.isLoggedIn())
    client.router.redirect('/sign-in')
  await updateNavbar(client)

  try {
    const history = await ky.get(`https://pong.api.transcendence.fr/users/${client.id}/history/`, {}).json()
    const matchHistoryList = document.getElementById('match-history-list')
    if (!matchHistoryList) {
      console.error('match-history-list element not found in the DOM')
      return
    }
    matchHistoryList.innerHTML = ''
    const winsTable = document.createElement('table')
    const lossesTable = document.createElement('table')
    winsTable.className = 'table-perso table-striped table-bordered mb-4'
    lossesTable.className = 'table-perso table-striped table-bordered'
    const createTableHeader = () => `
      <thead>
        <tr>
          <th>Date</th>
          <th>Opponent</th>
          <th>Score</th>
        </tr>
      </thead>
    `
    winsTable.innerHTML = createTableHeader()
    lossesTable.innerHTML = createTableHeader()

    const winsBody = document.createElement('tbody')
    const lossesBody = document.createElement('tbody')

    // Trier les matchs entre victoires et défaites
    history.forEach((match) => {
      const date = new Date(match.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const opponent = match.opponent
      const score = `${match.score_player1} - ${match.score_player2}` // Format du score

      const row = `
        <tr>
          <td>${date}</td>
          <td>${opponent}</td>
          <td>${score}</td>
        </tr>
      `

      if (match.result === 'Win') {
        winsBody.innerHTML += row
      }
      else if (match.result === 'Loss') {
        lossesBody.innerHTML += row
      }
    })

    winsTable.appendChild(winsBody)
    lossesTable.appendChild(lossesBody)

    // const matchHistoryList = document.getElementById('match-history-list')
    // matchHistoryList.innerHTML = '' // Clear previous content

    // Ajouter les tableaux au DOM
    const winsSection = document.createElement('div')
    const lossesSection = document.createElement('div')
    winsSection.innerHTML = '<h4>Victories</h4>'
    lossesSection.innerHTML = '<h4>Defeats</h4>'

    winsSection.appendChild(winsTable)
    lossesSection.appendChild(lossesTable)

    matchHistoryList.appendChild(winsSection)
    matchHistoryList.appendChild(lossesSection)
  }
  catch (error) {
    console.error('Error fetching match history:', error)
  }
}
