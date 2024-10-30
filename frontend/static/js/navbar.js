// Importez cette fonction dans votre fichier principal pour l'utiliser avec client
export function updateNavbar(client) {
  const signInLink = document.getElementById('sign-in-link')
  const profileLink = document.getElementById('profile-link')
  const logoutLink = document.getElementById('logout-link')

  if (client.token) {
    signInLink.classList.add('d-none')
    profileLink.classList.remove('d-none')
    logoutLink.classList.remove('d-none')
  }
  else {
    signInLink.classList.remove('d-none')
    profileLink.classList.add('d-none')
    logoutLink.classList.add('d-none')
  }
}
