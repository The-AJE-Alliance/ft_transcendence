import ky from 'ky'
import { updateNavbar } from './navbar.js'

export function showTwoFactorForm(client) {
  const loginForm = document.getElementById('login-form')
  if (loginForm) {
    loginForm.classList.add('d-none')
  }
  const twoFactorFormContainer = document.getElementById('two-factor-form-container')
  if (twoFactorFormContainer) {
    const twoFactorForm = document.createElement('form')
    twoFactorForm.id = 'two-factor-form'

    twoFactorForm.innerHTML = `
      <div class="mb-3 text-start">
        <label for="otp_code" class="form-label">Enter your 2FA code:</label>
        <input type="text" class="form-control" id="otp_code" name="otp_code" placeholder="Enter 2FA code" />
      </div>
      <div class="d-grid">
        <button type="submit" class="btn">Verify</button>
      </div>
    `
    twoFactorFormContainer.innerHTML = ''
    twoFactorFormContainer.appendChild(twoFactorForm)
    twoFactorFormContainer.classList.remove('d-none')
    twoFactorForm.addEventListener('submit', async (event) => {
      event.preventDefault()

      const otpCode = document.getElementById('otp_code').value

      try {
        const response = await ky.post('https://auth.api.transcendence.fr/users/verify-two-factor/', {
          headers: {
            'Content-Type': 'application/json',
          },
          json: {
            username: client.tempUsername,
            password: client.tempPassword,
            otp_code: otpCode,
          },
        })

        if (response.ok) {
          const data = await response.json()
          client.token = data.access
          client.authMethod = 'classic'
          localStorage.setItem('authMethod', 'classic')
          await updateNavbar(client)
          client.router.redirect('/')
        }
        else {
          const invalidLoginAlert = document.getElementById('invalid-login')
          invalidLoginAlert.classList.remove('d-none')
          invalidLoginAlert.querySelector('div').textContent = 'Invalid 2FA code, please try again.'
        }
      }
      catch (error) {
        console.error('Erreur lors de la vérification du code 2FA :', error)
        const invalidLoginAlert = document.getElementById('invalid-login')
        invalidLoginAlert.classList.remove('d-none')
        invalidLoginAlert.querySelector('div').textContent = 'An error occurred during 2FA verification.'
      }
    })
  }
}

function handleTwoFactorForm(client) {
  const form = document.getElementById('two-factor-form')
  client.router.addEvent(form, 'submit', async (event) => {
    event.preventDefault()
    const otpCode = document.getElementById('otp-code').value
    const body = JSON.stringify({
      username: client.tempUsername,
      password: client.tempPassword,
      otp_code: otpCode,
    })
    let result
    try {
      const response = await ky.post('https://auth.api.transcendence.fr/login/verify-two-factor/', {
        body,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      result = await response.json()
      if (response.status === 200 && result.access) {
        // Connexion réussie avec 2FA
        client.token = result.access
        client.authMethod = 'classic'
        localStorage.setItem('authMethod', 'classic')
        await updateNavbar(client)
        if (client.redirectToFriends) {
          client.router.redirect('/pong/remote/setup')
          client.redirectToFriends = false
        }
        else {
          client.router.redirect('/')
        }
      }
      else {
        // Code OTP invalide
        showInvalidOtpMessage()
      }
    }
    catch (error) {
      console.error('Error during 2FA verification:', error)
      showInvalidOtpMessage()
    }
  })
}

function showInvalidOtpMessage() {
  const errorDiv = document.getElementById('invalid-otp')
  if (errorDiv) {
    errorDiv.classList.remove('d-none')
  }
  else {
    const errorElement = document.createElement('div')
    errorElement.id = 'invalid-otp'
    errorElement.className = 'alert alert-danger'
    errorElement.textContent = 'Invalid OTP code. Please try again.'
    document.getElementById('two-factor-form').prepend(errorElement)
  }
}
