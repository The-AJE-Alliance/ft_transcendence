// Loads a html file at the filePath and returns it as text
export async function loadHTML(filePath) {
  try {
    const response = await fetch(filePath, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
    if (!response.ok) {
      throw new Error('Failed to load HTML file')
    }
    return await response.text() // Return the file content as text
  }
  catch (error) {
    console.error('Error loading HTML:', error)
    return '<p>Error loading content</p>' // Return a default error message
  }
}

function createButton(submitText) {
  const submitButton = document.createElement('button')
  submitButton.setAttribute('type', 'submit')
  submitButton.textContent = submitText
  return submitButton
}

function createInput(field) {
  let input
  const fieldId = field.name || ''
  if (field.type === 'textarea') {
    input = document.createElement('textarea')
  }
  else if (field.type === 'select') {
    input = document.createElement('select')
    field.options.forEach((optionData) => {
      const option = document.createElement('option')
      option.value = optionData.value
      option.textContent = optionData.text
      input.appendChild(option)
    })
  }
  else {
    input = document.createElement('input')
    input.setAttribute('type', field.type || 'text')
  }
  input.setAttribute('id', fieldId)
  input.setAttribute('name', field.name || '')
  input.setAttribute('placeholder', field.placeholder || '')
  input.setAttribute('autocomplete', field.autocomplete || 'on')
  if (field.required)
    input.setAttribute('required', 'true')
  if (field.value)
    input.value = field.value
  return input
}

function createForm({ action = '', method = 'GET', fields = [], submitText = 'Submit' }) {
  const form = document.createElement('form')
  form.setAttribute('action', action)
  form.setAttribute('method', method)

  fields.forEach((field) => {
    if (field.label) {
      const label = document.createElement('label')
      label.textContent = field.label
      label.setAttribute('for', field.name || '')
      form.appendChild(label)
    }
    const input = createInput(field)
    form.appendChild(input)
    form.appendChild(document.createElement('br'))
  })
  const submitButton = createButton(submitText)
  form.appendChild(submitButton)
  return form
}

function handleBackendErrors(errors) {
  const formContainer = document.getElementById('register-form')
  if (formContainer) {
    clearFieldErrors()
    for (const [field, messages] of Object.entries(errors)) {
      const fieldElement = document.querySelector(`#${field}`)
      if (fieldElement) {
        const errorElement = document.createElement('div')
        errorElement.className = 'form-error text-danger'
        errorElement.textContent = messages.join(', ')
        fieldElement.insertAdjacentElement('afterend', errorElement)
      }
      else {
        const generalError = document.createElement('div')
        generalError.className = 'form-error text-danger'
        generalError.textContent = `${field}: ${messages.join(', ')}`
        formContainer.appendChild(generalError)
      }
    }
  }
}

function clearFieldErrors() {
  document.querySelectorAll('.form-error').forEach((errorElement) => {
    errorElement.remove()
  })
}

export function createAndHandleForm({ app, actionUrl, method, fields, submitText, processData, callback, client }) {
  const form = createForm({
    action: actionUrl,
    method,
    fields,
    submitText,
  })
  app.innerHTML = ''
  app.appendChild(form)
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearFieldErrors()
    const formData = new FormData(form)
    let body
    if (processData)
      body = processData(formData)
    else body = formData
    try {
      const response = await fetch(actionUrl, {
        method,
        body,
        headers: processData ? { 'Content-Type': 'application/json' } : {},
        credentials: 'include',
      })
      const result = await response.json()
      if (response.ok) {
        if (callback) {
          await callback(client, result, response.ok)
        }
        else {
          console.log(`${submitText} successful:`, result)
        }
      }
      else {
        handleBackendErrors(result)
      }
    }
    catch (error) {
      console.error(`Error during ${submitText.toLowerCase()}:`, error)
    }
  })
}

export function processLoginData(formData) {
  return JSON.stringify(Object.fromEntries(formData.entries()))
}
