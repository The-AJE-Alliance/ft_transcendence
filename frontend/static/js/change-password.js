import ky from 'ky'
import { showAlert } from './check-profile.js'

export function validatePasswordConfirmation(form) {
  const passwordChange = form.querySelector('#new-password')
  const confirmPasswordChange = form.querySelector('#confirm-new-password')

  if (passwordChange && confirmPasswordChange) {
    confirmPasswordChange.addEventListener('input', () => {
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
