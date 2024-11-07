import ky from 'ky'

export function validateEmailField(emailField) {
  const emailFeedback = emailField.nextElementSibling

  emailField.addEventListener('input', () => {
    if (isValidEmail(emailField.value)) {
      emailField.classList.add('is-valid')
      emailField.classList.remove('is-invalid')
      emailFeedback.style.display = 'none'
    }
    else {
      emailField.classList.add('is-invalid')
      emailField.classList.remove('is-valid')
      emailFeedback.style.display = 'block'
    }
  })
}

export function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  return emailPattern.test(email)
}

export function validateRegistrationPasswordConfirmation(form) {
  const passwordInput = form.querySelector('#password')
  const confirmPasswordInput = form.querySelector('#confirm-password')

  if (passwordInput && confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      if (passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.classList.remove('is-valid')
        confirmPasswordInput.classList.add('is-invalid')
        confirmPasswordInput.nextElementSibling.textContent = 'Passwords do not match.'
      }
      else {
        confirmPasswordInput.classList.remove('is-invalid')
        confirmPasswordInput.classList.add('is-valid')
        confirmPasswordInput.nextElementSibling.textContent = ''
      }
    })
  }
}

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

async function submitForm({ form, actionUrl, processData, callback, client }) {
  const errorAlert = document.getElementById('error-alert')
  const formData = new FormData(form)
  const body = processData ? processData(formData) : formData
  let result
  try {
    result = await ky.post(actionUrl, {
      body,
      headers: processData ? { 'Content-Type': 'application/json' } : {},
      credentials: 'include',
    }).json()
  }
  catch (error) {
    console.error('Error during form submission:', error)
    if (errorAlert)
      errorAlert.classList.remove('d-none')
  }
  finally {
    if (callback)
      await callback(client, result)
  }
}

export function handleForm({ form, actionUrl, method, processData, callback, client, enableValidation = false, enablePasswordConfirmation = false }) {
  client.router.addEvent(form, 'submit', async (event) => {
    event.preventDefault()
    if (enablePasswordConfirmation) {
      const passwordInput = form.querySelector('#password')
      const confirmPasswordInput = form.querySelector('#confirm-password')
      if (passwordInput && confirmPasswordInput && passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.classList.add('is-invalid')
        confirmPasswordInput.nextElementSibling.textContent = 'Passwords do not match.'
        return
      }
      else if (confirmPasswordInput) {
        confirmPasswordInput.classList.remove('is-invalid')
        confirmPasswordInput.classList.add('is-valid')
      }
    }
    if (enableValidation) {
      form.classList.add('was-validated')
    }
    await submitForm({ form, actionUrl, method, processData, callback, client })
  })
}

export function loadPageStyle(page) {
  const existingStyle = document.getElementById('page-style')
  if (existingStyle)
    existingStyle.remove()

  const styleSheet = document.createElement('link')
  styleSheet.rel = 'stylesheet'
  styleSheet.href = `../css/${page}.css`
  styleSheet.id = 'page-style'
  document.head.appendChild(styleSheet)
}

export function processLoginData(formData) {
  return JSON.stringify(Object.fromEntries(formData.entries()))
}
