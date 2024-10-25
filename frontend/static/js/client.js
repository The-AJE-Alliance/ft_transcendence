export default {
  app: document.getElementById('app'),
  token: '',

  async refresh() {
    try {
      const response = await fetch('https://auth.api.transcendence.local/login/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const result = await response.json()
      if (response.ok) {
        this.token = result.access
      }
      else {
        // TODO: Temp error handling, replace by requesting login
        console.log('Refresh invalid')
        this.token = ''
      }
    }
    catch (error) {
      console.error('Error during refresh token fetch:', error)
      this.token = ''
    }
  },
}
