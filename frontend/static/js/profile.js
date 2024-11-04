export function initializeProfilePage(client) {
  const editButton = document.getElementById('edit-profile-btn')
  const deleteButton = document.getElementById('delete-profile-btn')

  editButton.addEventListener('click', () => editProfile(client))
  deleteButton.addEventListener('click', () => deleteProfile(client))
}

export async function updateProfile(client, updatedData) {
  try {
    const response = await fetch(`https://auth.api.transcendence.local/users/${client.userId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${client.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringigit fy(updatedData),
    })
    if (response.ok) {
      console.log('Profile updated successfully.')
    }
    else {
      console.error('Failed to update profile:', response.statusText)
    }
  }
  catch (error) {
    console.error('Error updating profile:', error)
  }
}

export async function deleteProfile(client) {
  if (!confirm('Are you sure you want to delete your profile? This action cannot be undone.'))
    return

  try {
    const response = await fetch(`https://auth.api.transcendence.local/users/${client.userId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${client.token}` },
    })
    if (response.ok) {
      console.log('Profile deleted successfully.')
      // Redirige l'utilisateur après la suppression
      client.router.redirect('/login')
    }
    else {
      console.error('Failed to delete profile:', response.statusText)
    }
  }
  catch (error) {
    console.error('Error deleting profile:', error)
  }
}

export function editProfile(client) {
  const updatedData = {
    username: prompt('Enter new username:'),
    email: prompt('Enter new email:'),
    nickname: prompt('Enter new nickname:'),
  }
  updateProfile(client, updatedData)
}
