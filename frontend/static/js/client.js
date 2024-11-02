import ky from 'ky'

export default {
  app: document.getElementById('app'),
  token: '',
  socket: undefined,
  router: undefined,

  async refresh() {
    try {
      const result = await ky.post('https://auth.api.transcendence.fr/login/refresh/', {
        credentials: 'include',
      }).json()
      this.token = result.access
    }
    catch {
      // console.clear()
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
