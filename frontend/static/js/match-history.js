import ky from 'ky'
import matchHistoryPage from '../pages/match-history.html?raw'
import { updateNavbar } from './navbar'

export async function matchHistory(client) {
  client.app.innerHTML = matchHistoryPage
  if (!await client.isLoggedIn())
    client.router.redirect('/sign-in')
  await updateNavbar(client)

  try {
    const history = await ky.get(`https://pong.api.transcendence.fr/users/${client.id}/history/`, {
      // headers: { Authorization: `Bearer ${client.token}` },
      // credentials: 'include',
    }).json()

    const matchHistoryList = document.getElementById('match-history-list')
    matchHistoryList.innerHTML = ''

    if (history.length === 0) {
      matchHistoryList.innerHTML = '<li class="list-group-item">No matches played yet.</li>'
      return
    }

    history.forEach((match) => {
      const listItem = document.createElement('li')
      listItem.className = 'list-group-item'
      listItem.textContent = `${match.date}: ${match.opponent} - ${match.score} (${match.result})`
      matchHistoryList.appendChild(listItem)
    })
  }
  catch (error) {
    console.error('Error fetching match history:', error)
  }
}
