import ky from 'ky'
import { showAlert, validateFormFields } from './check-profile.js'

export async function setupPasswordChange(client) {
  const passwordForm = document.getElementById('change-password-form')

  if (!passwordForm)
    return

  validatePasswordConfirmation(client, passwordForm)

  client.router.addEvent(passwordForm, 'submit', async (event) => {
    event.preventDefault()
    const isValid = validateFormFields()
    if (isValid)
      await changePassword(client)
  })
}

export function validatePasswordConfirmation(client, form) {
  const passwordChange = form.querySelector('#new-password')
  const confirmPasswordChange = form.querySelector('#confirm-new-password')

  if (passwordChange && confirmPasswordChange) {
    client.router.addEvent(confirmPasswordChange, 'input', () => {
      if (passwordChange.value !== confirmPasswordChange.value) {
        confirmPasswordChange.classList.remove('is-valid')
        confirmPasswordChange.classList.add('is-invalid')
        confirmPasswordChange.nextElementSibling.textContent = 'Passwords do not match.'
      }
      else {
        confirmPasswordChange.classList.remove('is-invalid')
        confirmPasswordChange.classList.add('is-valid')
        confirmPasswordChange.nextElementSibling.textContent = ''
      }
    })
  }
}

export async function changePassword(client) {
  const currentPassword = document.getElementById('current-password').value
  const newPassword = document.getElementById('new-password').value
  const confirmPassword = document.getElementById('confirm-new-password').value

  if (newPassword !== confirmPassword) {
    return
  }
  try {
    await ky.post(`https://auth.api.transcendence.fr/users/change-password/`, {
      headers: { Authorization: `Bearer ${client.token}` },
      credentials: 'include',
      json: { current_password: currentPassword, new_password: newPassword },
    })
    client.router.redirect('/profile')
  }
  catch (error) {
    console.error('Error changing password:', error)
    showAlert('An error occurred. Please try again.')
  }
}
