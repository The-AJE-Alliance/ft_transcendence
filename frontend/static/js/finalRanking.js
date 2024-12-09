import ky from 'ky'
import finalRankingPage from '../pages/finalRanking.html?raw'
import { updateNavbar } from './navbar'
import '../css/finalRanking.css'

export async function finalRanking(client, tournamentId) {
  client.app.innerHTML = finalRankingPage
  if (!await client.isLoggedIn()) {
    client.router.redirect('/sign-in')
  }
  else {
    await updateNavbar(client)
  }

  try {
    // Récupérer les données du classement final et des matchs
    const data = await ky.get(`https://pong.api.transcendence.fr/tournaments/${tournamentId}/final-ranking/`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${client.token}` },
    }).json()

    const finalRankingEl = document.getElementById('finalRanking')
    const tournamentSummaryEl = document.getElementById('tournamentSummary')

    // Vérifier si des joueurs sont présents dans le classement
    if (data.ranking.length === 0) {
      finalRankingEl.innerHTML = '<p>No player in this tournament.</p>'
    }
    else {
      // Supposer que le premier joueur du classement est le gagnant
      const winner = data.ranking[0]
      let rankingHtml = ''
      rankingHtml += `
        <div class="winner">
          <h3>The winner is... ${winner.nickname} !!</h3>
        </div>
      `
      finalRankingEl.innerHTML = rankingHtml
    }
    if (data.matches.length === 0) {
      tournamentSummaryEl.innerHTML = '<p>No match in this tournament.</p>'
    }
    else {
      const sortedMatches = data.matches.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

      let summaryHtml = '<h2>Match summary</h2><table class="table-summary table-striped"><thead><tr><th>Round</th><th>Joueur 1</th><th>Joueur 2</th><th>Gagnant</th><th>Score</th></tr></thead><tbody>'

      sortedMatches.forEach((match, index) => {
        let roundName = ''
        if (sortedMatches.length === 3) {
          if (index === 0 || index === 1) {
            roundName = 'Round 1'
          }
          else if (index === 2) {
            roundName = 'Final'
          }
        }

        const score = `${match.score_player1} - ${match.score_player2}`
        const winner = match.winner ? match.winner : 'Match Nul'
        summaryHtml += `
          <tr>
            <td>${roundName}</td>
            <td>${match.player1}</td>
            <td>${match.player2}</td>
            <td>${winner}</td>
            <td>${score}</td>
          </tr>
        `
      })
      summaryHtml += '</tbody></table>'
      tournamentSummaryEl.innerHTML = summaryHtml
    }
  }
  catch (error) {
    console.error('Error fetching final ranking:', error)
    const finalRankingEl = document.getElementById('finalRanking')
    finalRankingEl.innerHTML = '<p>Erreur lors du chargement du classement final.</p>'
  }
}
