// src/js/views/adminDashboard.js
import { fetchAllUsers, updateUserStatus } from '../../api/adminService.js';
import { capitalize } from '../main.js'; // solo si necesitas capitalizar

export function initAdminDashboard() {
  // Logout
  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    location.hash = '#/login';
  });

  // Mostrar nombre del admin
  const raw = localStorage.getItem('currentUser');
  let user = {};
  try { user = raw ? JSON.parse(raw) : {}; } catch {}
  document.getElementById('user-name').textContent = user.name || 'Admin';

  // Carga y pinta tabla
  loadUsers();
}

async function loadUsers() {
  try {
    const token = localStorage.getItem('authToken');
    const users = await fetchAllUsers(token);
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '';

    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${u.active ? 'Activo' : 'Inactivo'}</td>
        <td>
          <button class="status-btn ${u.active ? 'inactive' : 'active'}">
            ${u.active ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      `;
      tr.querySelector('button').addEventListener('click', async () => {
        try {
          await updateUserStatus(token, u.id, !u.active);
          loadUsers();
        } catch (err) {
          alert(err.message);
        }
      });
      tbody.appendChild(tr);
    });
  } catch {
    alert('No fue posible cargar los usuarios.');
  }
}
