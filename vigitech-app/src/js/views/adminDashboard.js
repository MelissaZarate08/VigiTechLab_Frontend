import { fetchAllUsers, updateUserStatus } from '../../api/adminService.js';
import { navigateTo } from '../router.js';

export function initAdminDashboard() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  if (!user || user.role !== 'admin') {
    return navigateTo('#/dashboard');
  }

  document.getElementById('admin-name').textContent = user.name;

  const btnUser = document.getElementById('btn-user');
  const dropdown = document.getElementById('dropdown-user');
  btnUser.addEventListener('click', () => dropdown.classList.toggle('hidden'));

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    navigateTo('#/');
  });

  const container = document.getElementById('users-container');
  fetchAllUsers()
    .then(users => {
      users.forEach(u => {
        const row = document.createElement('div');
        row.classList.add('row');
        row.innerHTML = `
          <div class="cell">${u.name}</div>
          <div class="cell">${u.id}</div>
          <div class="cell">${u.email}</div>
          <div class="cell">
            <button class="toggle-btn">
              ${u.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        `;
        const btn = row.querySelector('.toggle-btn');
        btn.addEventListener('click', async () => {
          try {
            await updateUserStatus(u.id, !u.active);
            u.active = !u.active;
            btn.textContent = u.active ? 'Desactivar' : 'Activar';
          } catch (err) {
            alert(err.message);
          }
        });
        container.appendChild(row);
      });
    })
    .catch(err => alert(err.message));
}

document.addEventListener('DOMContentLoaded', initAdminDashboard);
