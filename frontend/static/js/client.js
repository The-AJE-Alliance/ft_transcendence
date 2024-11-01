export default {
  app: document.getElementById('app'),
  token: '',
  socket: undefined,
  router: undefined,

  async refresh() {
    try {
      const response = await fetch('https://auth.api.transcendence.fr/login/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const result = await response.json()
      if (response.ok) {
        this.token = result.access
      }
      else {
        console.log('Refresh invalid')
        this.token = ''
      }
    }
    catch (error) {
      console.error('Error during refresh token fetch:', error)
      this.token = ''
    }
  },

  async isLoggedIn() {
    if (this.token)
      return true
    await this.refresh()
    return this.token
  },
}
