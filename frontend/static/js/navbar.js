export async function updateNavbar(client) {
  const signInLink = document.getElementById('sign-in-link')
  const profileDropdown = document.getElementById('profile-dropdown')
  const settingsLink = document.querySelector('a[href="/settings"]')
  if (await client.isLoggedIn()) {
    signInLink.classList.add('d-none')
    profileDropdown.classList.remove('d-none')
    if (client.authMethod === 'oauth42' && settingsLink) {
      settingsLink.parentElement.classList.add('d-none')
    }
  }
  else {
    signInLink.classList.remove('d-none')
    profileDropdown.classList.add('d-none')
    if (settingsLink) {
      settingsLink.parentElement.classList.remove('d-none')
    }
  }
}
