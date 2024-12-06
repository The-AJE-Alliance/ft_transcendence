import matchHistoryPage from '../pages/match-history.html?raw'

export async function matchHistory(client) {
  client.app.innerHTML = matchHistoryPage

  try {
    const history = await ky.get(`https://auth.api.transcendence.fr/users/${client.userId}/history/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
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
