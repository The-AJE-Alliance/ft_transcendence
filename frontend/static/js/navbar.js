export async function updateNavbar(client) {
  const signInLink = document.getElementById('sign-in-link')
  const profileLink = document.getElementById('profile-link')
  const logoutLinkItem = document.getElementById('logout-link')
  const logout42LinkItem = document.getElementById('logout42-link')

  if (await client.isLoggedIn()) {
    signInLink.classList.add('d-none')
    profileLink.classList.remove('d-none')

    if (client.authMethod === 'oauth42') {
      logoutLinkItem.classList.add('d-none')
      logout42LinkItem.classList.remove('d-none')
    }
    else {
      logoutLinkItem.classList.remove('d-none')
      logout42LinkItem.classList.add('d-none')
    }
  }
  else {
    signInLink.classList.remove('d-none')
    profileLink.classList.add('d-none')
    logoutLinkItem.classList.add('d-none')
    logout42LinkItem.classList.add('d-none')
  }
}
