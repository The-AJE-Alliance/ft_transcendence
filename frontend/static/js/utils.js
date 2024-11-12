import ky from 'ky'

export function setupRegisterEmailValidation(client, emailField) {
  const emailFormatFeedback = document.getElementById('email-format-feedback')
  const emailExistsFeedback = document.getElementById('email-exists-feedback')

  emailField.addEventListener('input', async () => {
    emailFormatFeedback.style.display = 'none'
    emailExistsFeedback.style.display = 'none'
    emailField.classList.remove('is-invalid', 'is-valid')

    if (!isValidEmail(emailField.value)) {
      emailField.classList.add('is-invalid')
      emailFormatFeedback.style.display = 'block'
      return
    }
    const emailExists = await checkEmailExistsForRegister(client, emailField.value)
    if (emailExists) {
      emailField.classList.add('is-invalid')
      emailExistsFeedback.style.display = 'block'
    }
    else {
      emailField.classList.add('is-valid')
    }
  })
}

async function checkEmailExistsForRegister(client, email) {
  if (!email) {
    console.error('Email is empty.')
    return false
  }
  try {
    const response = await ky.get(`https://auth.api.transcendence.fr/users/check-email/?email=${email}`).json()
    return !!response.error
  }
  catch (error) {
    if (error.response && error.response.status === 409) {
      return true
    }
    else {
      console.error('Erreur lors de la vérification de l\'email:', error)
      return false
    }
  }
}

export function setupRegisterUsernameValidation(client, usernameField) {
  const usernameFeedback = document.getElementById('username-feedback')
  const usernameExistsFeedback = document.getElementById('username-exists')

  usernameField.addEventListener('input', async () => {
    usernameFeedback.style.display = 'none'
    usernameExistsFeedback.style.display = 'none'
    usernameField.classList.remove('is-invalid', 'is-valid')

    if (!usernameField.value.trim()) {
      usernameExistsFeedback.style.display = 'block'
      usernameField.classList.add('is-invalid')
      return
    }

    const usernameExists = await checkUsernameExistsForRegister(client, usernameField.value)
    if (usernameExists) {
      usernameField.classList.add('is-invalid')
      usernameFeedback.style.display = 'block'
    }
    else {
      usernameField.classList.add('is-valid')
    }
  })
}

async function checkUsernameExistsForRegister(client, username) {
  if (!username) {
    console.error('Username is empty.')
    return false
  }
  try {
    const response = await ky.get(`https://auth.api.transcendence.fr/users/check-username/?username=${username}`).json()
    return !!response.error
  }
  catch (error) {
    if (error.response && error.response.status === 409) {
      return true
    }
    else {
      console.error('Erreur lors de la vérification du username:', error)
      return false
    }
  }
}

export function validateEmailField(emailField, useEmailExistsFeedback = false) {
  const emailFormatFeedback = document.getElementById('email-format-feedback')
  const emailExistsFeedback = useEmailExistsFeedback ? document.getElementById('email-exists-feedback') : null

  emailField.addEventListener('input', () => {
    if (emailExistsFeedback) {
      emailExistsFeedback.style.display = 'none'
    }
    if (isValidEmail(emailField.value)) {
      emailField.classList.add('is-valid')
      emailField.classList.remove('is-invalid')
      emailFormatFeedback.style.display = 'none'
    }
    else {
      emailField.classList.add('is-invalid')
      emailField.classList.remove('is-valid')
      emailFormatFeedback.style.display = 'block'
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
