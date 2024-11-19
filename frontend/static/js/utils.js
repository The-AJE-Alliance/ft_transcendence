import ky from 'ky'

async function submitForm({ form, actionUrl, processData, callback, client }) {
  const errorAlert = document.getElementById('error-alert')
  const formData = new FormData(form)
  const body = processData ? processData(formData) : formData
  let result
  let responseStatus
  try {
    const response = await ky.post(actionUrl, {
      body,
      headers: processData ? { 'Content-Type': 'application/json' } : {},
      credentials: 'include',
    })
    responseStatus = response.status
    result = await response.json()
  }
  catch (error) {
    console.error('Error during form submission:', error)
    if (error.response) {
      responseStatus = error.response.status
      result = await error.response.json()
    }
    if (errorAlert)
      errorAlert.classList.remove('d-none')
  }
  finally {
    if (callback)
      await callback(client, result, responseStatus)
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
