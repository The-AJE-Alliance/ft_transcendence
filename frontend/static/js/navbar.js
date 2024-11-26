export async function updateNavbar(client) {
  const signInLink = document.getElementById('sign-in-link')
  const profileDropdown = document.getElementById('profile-dropdown')

  if (await client.isLoggedIn()) {
    signInLink.classList.add('d-none')
    profileDropdown.classList.remove('d-none')
  }
  else {
    signInLink.classList.remove('d-none')
    profileDropdown.classList.add('d-none')
  }
}
