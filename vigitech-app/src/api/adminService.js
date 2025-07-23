const BASE_URL = 'http://vigitech-auth.namixcode.cc:8080/api';

export async function fetchAllUsers() {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${BASE_URL}/users`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Error al obtener usuarios');
  }
  const { users } = await res.json();
  return users;
}

export async function updateUserStatus(id, active) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${BASE_URL}/users/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ active })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Error al actualizar estado');
  }
  return res.json();
}
