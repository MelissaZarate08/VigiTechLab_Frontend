// src/api/adminService.js
const BASE_URL = 'http://localhost:8080/api';

// Recupera todos los usuarios
export async function fetchAllUsers(token) {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Error al cargar usuarios');
  return res.json(); // [{ id, name, email, role, active }, …]
}

// Cambia el estatus de un usuario
export async function updateUserStatus(token, userId, isActive) {
  const res = await fetch(`${BASE_URL}/users/${userId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ active: isActive })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Error al actualizar estatus');
  }
  return res.json(); // { success: true }
}
