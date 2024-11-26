import ky from 'ky'
import settingsPage from '../pages/settings.html?raw'
import { updateNavbar } from './navbar.js'
import { getUserProfile } from './profile.js'
import { loadPageStyle } from './utils.js'
import '../css/settings.css'

async function enableTwoFactor(client) {
  try {
    const data = await ky.post('https://auth.api.transcendence.fr/users/enable-two-factor/', {
      credentials: 'include',
      headers: { Authorization: `Bearer ${client.token}` },
    }).json()
    const qrcodeContainer = document.getElementById('qrcode-container')
    const qrcodeImage = document.getElementById('qrcode-image')
    const qrCodeImageBase64 = data.qr_code
    qrcodeImage.src = `data:image/png;base64,${qrCodeImageBase64}`
    qrcodeContainer.classList.remove('d-none')
    showTwoFactorActivationForm(client)
  }
  catch (error) {
    console.error('Error enabling 2FA:', error)
  }
}

async function setupTwoFactorAuth(client, user) {
  const twoFactorSection = document.getElementById('two-factor-section')

  if (user.auth_method === 'oauth42') {
    if (twoFactorSection) {
      twoFactorSection.classList.add('d-none')
    }
    return
  }

  const enable2FAButton = document.getElementById('enable-2fa-button')
  if (enable2FAButton) {
    const newEnable2FAButton = enable2FAButton.cloneNode(true)
    enable2FAButton.parentNode.replaceChild(newEnable2FAButton, enable2FAButton)

    async function disableTwoFactorHandler(event) {
      const success = await disableTwoFactor(client)
      if (success) {
        newEnable2FAButton.textContent = 'Enable 2FA'
        newEnable2FAButton.removeEventListener('click', disableTwoFactorHandler)
        client.router.addEvent(newEnable2FAButton, 'click', () => {
          enableTwoFactor(client)
        })
      }
    }

    if (user.two_factor_enabled) {
      newEnable2FAButton.textContent = 'Disable 2FA'
      client.router.addEvent(newEnable2FAButton, 'click', disableTwoFactorHandler)
    }
    else {
      newEnable2FAButton.textContent = 'Enable 2FA'
      client.router.addEvent(newEnable2FAButton, 'click', () => {
        enableTwoFactor(client)
      })
    }
  }
}

export async function settings(client) {
  loadPageStyle('settings')
  client.app.innerHTML = settingsPage

  if (await client.isLoggedIn()) {
    const user = await getUserProfile(client)
    if (user) {
      await setupTwoFactorAuth(client, user)
    }
  }
  await updateNavbar(client)
}

export function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alert-settings')
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
      json: {},
    })
    showAlert('Two-Factor Authentication has been disabled.', 'success')
    const updatedUser = await getUserProfile(client)
    await setupTwoFactorAuth(client, updatedUser)
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
  activationForm.reset()
  activationForm.classList.remove('d-none')
  activationError.classList.add('d-none')
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
          qrcodeContainer.classList.add('d-none')
          const activationForm = document.getElementById('two-factor-activation-form')
          activationForm.classList.add('d-none')
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
