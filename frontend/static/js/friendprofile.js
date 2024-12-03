import ky from 'ky'
import friendProfilePage from '../pages/friend-profile.html?raw'
import { updateNavbar } from './navbar.js'
import { loadPageStyle } from './utils.js'
import '../css/edit-profile.css'

export async function getFriendProfile(client) {
  try {
    return await ky.get(`https://auth.api.transcendence.fr/friend-profile/${client.friendId}/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
    }).json()
  }
  catch (error) {
    console.error('Error while trying to get user:', error)
    return null
  }
}

function displayUserInfo(friend) {
  document.getElementById('email').textContent = friend.email
  document.getElementById('nickname-display').textContent = friend.nickname
  document.getElementById('status').textContent = friend.is_online ? 'Online' : 'Offline'
}

function displayUserAvatar(friend) {
  const avatarElement = document.getElementById('avatar')
  if (friend.avatar_url_full) {
    avatarElement.src = `https://auth.api.transcendence.fr${friend.avatar_url_full}`
    avatarElement.alt = `Avatar de ${friend.username}`
  }
  else {
    avatarElement.src = 'path/to/default/avatar.png'
    avatarElement.alt = `Avatar par défaut`
  }
}

export async function friendprofile(client) {
  loadPageStyle('profile')
  client.app.innerHTML = friendProfilePage

  if (await client.isLoggedIn()) {
    const friend = await getFriendProfile(client)
    if (friend) {
      displayUserInfo(friend)
      displayUserAvatar(friend)
    }
  }

  await updateNavbar(client)
}
