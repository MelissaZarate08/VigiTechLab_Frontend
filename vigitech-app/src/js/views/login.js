import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.esm.js';
import { loginUser } from '../../api/logeoService.js';
import { navigateTo } from '../router.js';

export function initLogin() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const { token, userName, role, isActive } = await loginUser({ email, password });
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify({ name: userName, role, isActive }));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `¡Bienvenido, ${userName}!`,
        showConfirmButton: false,
        timer: 1500
      });

      setTimeout(() => {
        if (role === 'admin') navigateTo('#/admin');
        else navigateTo('#/dashboard');
      }, 1600);

    } catch (err) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: err.message || 'Credenciales inválidas',
        showConfirmButton: false,
        timer: 2000
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', initLogin);
