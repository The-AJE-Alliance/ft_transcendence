import chooseFriendsPage from '../pages/pong-friends.html?raw'
import chooseModePage from '../pages/pong-mode.html?raw'
import { loadFriends, loadPendingFriendRequests, sendFriendRequest } from './friends'
import '../css/pong-friends.css'
import '../css/pong-mode.css'

export async function choosePongMode(client) {
  client.app.innerHTML = chooseModePage
}

export async function remotePong(client) {
  if (await client.isLoggedIn())
    client.router.redirect('/pong/remote/setup')
  else
    client.router.redirect('/sign-in')
}

export async function remoteSetup(client) {
  if (!await client.isLoggedIn()) {
    await client.refresh()
    client.router.redirect('/login')
    return
  }
  client.app.innerHTML = chooseFriendsPage
  const addFriendBtn = document.getElementById('add-friend-btn')
  const friendUsernameInput = document.getElementById('friend-username')

  client.router.addEvent(addFriendBtn, 'click', async () => {
    const friendUsername = friendUsernameInput.value.trim()
    if (friendUsername) {
      await sendFriendRequest(client, friendUsername)
      friendUsernameInput.value = ''
    }
  })

  // Charger la liste d'amis dès le chargement de la page
  await loadFriends(client)
  await loadPendingFriendRequests(client)
}
