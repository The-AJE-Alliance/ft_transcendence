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

export function handleForm({ form, actionUrl, method, submitText, processData, callback, client }) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    form.classList.add('was-validated')
    if (form.checkValidity()) {
      const formData = new FormData(form)
      let body
      if (processData)
        body = processData(formData)
      else
        body = formData
      try {
        const response = await fetch(actionUrl, {
          method,
          body,
          headers: processData ? { 'Content-Type': 'application/json' } : {},
          credentials: 'include',
        })
        const result = await response.json()
        if (callback)
          await callback(client, result, response.ok)
        else
          console.log(`${submitText} successful:`, result)
      }
      catch (error) {
        console.error(`Error during ${submitText.toLowerCase()}:`, error)
      }
    }
    else {
      console.log('Form is invalid.')
      form.reportValidity()
    }
  })
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

export function processLoginData(formData) {
  return JSON.stringify(Object.fromEntries(formData.entries()))
}
