// src/js/views/login.js
import { loginUser } from '../../api/logeoService.js';
import { navigateTo } from '../router.js';

export function initLogin() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const { token, userName, role, isActive } = await loginUser({ email, password });
      // Guarda el token y el usuario
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify({ name: userName, role, isActive }));

      // Redirige según rol
      if (role === 'admin') {
        navigateTo('#/admin');
      } else {
        navigateTo('#/dashboard');
      }
    } catch (err) {
      alert(err.message || 'Error al iniciar sesión');
    }
  });
}

// Inicializa al cargar
document.addEventListener('DOMContentLoaded', initLogin);
