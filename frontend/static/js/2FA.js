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
    await ky.post('https://auth.api.transcendence.fr/users/disable-two-factor/', {
      headers: {
        'Authorization': `Bearer ${client.token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
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
    client.router.addEvent(activationForm, 'submit', async (event) => {
      event.preventDefault()
      const otpCode = document.getElementById('otp_code').value

      try {
        await ky.post('https://auth.api.transcendence.fr/users/confirm-two-factor/', {
          headers: {
            'Authorization': `Bearer ${client.token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ otp_code: otpCode }),
        })

        showAlert('Two-Factor Authentication has been enabled successfully.', 'success')
        const qrcodeContainer = document.getElementById('qrcode-container')
        qrcodeContainer.innerHTML = ''
        const enable2FAButton = document.getElementById('enable-2fa-button')
        if (enable2FAButton) {
          const newEnable2FAButton = enable2FAButton.cloneNode(true)
          enable2FAButton.parentNode.replaceChild(newEnable2FAButton, enable2FAButton)
          newEnable2FAButton.textContent = 'Disable 2FA'
          client.router.addEvent(newEnable2FAButton, 'click', () => {
            disableTwoFactor(client)
          })
        }
        activationForm.classList.add('d-none')
      }
      catch {
        activationError.textContent = 'Invalid 2FA code, please try again.'
        activationError.classList.remove('d-none')
      }
    })
    activationForm.dataset.listenerAdded = 'true'
  }
  if (cancelBtn && !cancelBtn.dataset.listenerAdded) {
    client.router.addEvent(cancelBtn, 'click', () => {
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
    client.router.addEvent(twoFactorForm, 'submit', async (event) => {
      event.preventDefault()
      const otpCode = document.getElementById('otp_code').value
      try {
        const data = await ky.post('https://auth.api.transcendence.fr/users/verify-two-factor/', {
          json: {
            username: client.tempUsername,
            password: client.tempPassword,
            otp_code: otpCode,
          },
        }).json()

        client.token = data.access
        client.authMethod = 'classic'
        localStorage.setItem('authMethod', 'classic')
        await updateNavbar(client)
        client.router.redirect('/')
      }
      catch {
        invalidLoginAlert.classList.remove('d-none')
        invalidLoginAlert.querySelector('div').textContent = 'Invalid 2FA code, please try again.'
      }
    })
  }
}
