import ky from 'ky'

function validatePasswordConfirmation(form) {
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
      }
    })
  }
}

function validateFormFields(form) {
  form.querySelectorAll('.form-control').forEach((input) => {
    input.addEventListener('input', () => {
      if (input.checkValidity()) {
        input.classList.remove('is-invalid')
        input.classList.add('is-valid')
      }
      else {
        input.classList.remove('is-valid')
        input.classList.add('is-invalid')
      }
    })
  })
}

async function submitForm({ form, actionUrl, processData, callback, client }) {
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
  catch {
    // console.clear()
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
      if (!form.checkValidity()) {
        console.log('Form is invalid.')
        form.reportValidity()
        return
      }
    }
    await submitForm({ form, actionUrl, method, processData, callback, client })
  })
  if (enableValidation) {
    validateFormFields(form)
    if (enablePasswordConfirmation)
      validatePasswordConfirmation(form)
  }
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
