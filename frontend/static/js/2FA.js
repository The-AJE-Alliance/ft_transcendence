import ky from 'ky'
import { updateNavbar } from './navbar.js'

export function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alert-container')
  if (!alertContainer)
    return
  const wrapper = document.createElement('div')
  wrapper.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `
  alertContainer.appendChild(wrapper)
}

export async function disableTwoFactor(client) {
  try {
    const response = await ky.post('https://auth.api.transcendence.fr/users/disable-two-factor/', {
      headers: {
        'Authorization': `Bearer ${client.token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    })
    if (!response.ok) {
      const result = await response.json()
      console.error('Server response:', result)
      showAlert(result.detail || 'An error occurred while disabling 2FA.', 'danger')
      return false
    }
    showAlert('Two-Factor Authentication has been disabled.', 'success')
    return true
  }
  catch (error) {
    console.error('Error disabling 2FA:', error)
    showAlert('An error occurred while disabling 2FA.', 'danger')
    return false
  }
}

export function showTwoFactorActivationForm(client) {
  const activationForm = document.getElementById('two-factor-activation-form')
  const activationError = document.getElementById('activation-error')
  const cancelBtn = document.getElementById('cancel-2fa-activation-btn')

  if (!activationForm.dataset.listenerAdded) {
    activationForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const otpCode = document.getElementById('otp_code').value

      try {
        const response = await ky.post('https://auth.api.transcendence.fr/users/confirm-two-factor/', {
          headers: {
            'Authorization': `Bearer ${client.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp_code: otpCode }),
        })

        const result = await response.json()

        if (response.ok) {
          showAlert('Two-Factor Authentication has been enabled successfully.', 'success')
          const qrcodeContainer = document.getElementById('qrcode-container')
          qrcodeContainer.innerHTML = ''
          const enable2FAButton = document.getElementById('enable-2fa-button')
          if (enable2FAButton) {
            const newEnable2FAButton = enable2FAButton.cloneNode(true)
            enable2FAButton.parentNode.replaceChild(newEnable2FAButton, enable2FAButton)
            function disableTwoFactorHandler(event) {
              disableTwoFactor(client)
            }
            newEnable2FAButton.textContent = 'Disable 2FA'
            newEnable2FAButton.addEventListener('click', disableTwoFactorHandler)
          }
          activationForm.classList.add('d-none')
        }
        else {
          activationError.textContent = result.detail || 'Invalid 2FA code, please try again.'
          activationError.classList.remove('d-none')
        }
      }
      catch (error) {
        console.error('Error confirming 2FA activation:', error)
        activationError.textContent = 'An error occurred during 2FA activation.'
        activationError.classList.remove('d-none')
      }
    })
    activationForm.dataset.listenerAdded = 'true'
  }
  if (cancelBtn && !cancelBtn.dataset.listenerAdded) {
    cancelBtn.addEventListener('click', () => {
      const qrcodeContainer = document.getElementById('qrcode-container')
      qrcodeContainer.classList.add('d-none')
      activationForm.reset()
      activationError.classList.add('d-none')
    })
    cancelBtn.dataset.listenerAdded = 'true'
  }
}

export function showTwoFactorForm(client) {
  const loginForm = document.getElementById('login-form')
  const twoFactorForm = document.getElementById('two-factor-form')
  const invalidLoginAlert = document.getElementById('invalid-login')

  if (loginForm && twoFactorForm) {
    loginForm.classList.add('d-none')
    twoFactorForm.classList.remove('d-none')
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
          throwHttpErrors: false,
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
          const result = await response.json()
          invalidLoginAlert.classList.remove('d-none')
          invalidLoginAlert.querySelector('div').textContent = result.error || 'Invalid 2FA code, please try again.'
        }
      }
      catch (error) {
        console.error('Erreur lors de la vérification du code 2FA :', error)
        invalidLoginAlert.classList.remove('d-none')
        invalidLoginAlert.querySelector('div').textContent = 'An error occurred during 2FA verification.'
      }
    })
  }
}
