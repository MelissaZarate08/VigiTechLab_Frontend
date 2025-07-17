// src/js/views/dashboard.js

import { navigateTo } from '../router.js';
import {
  initWebSocket
} from '../../api/dashboardService.js';

export function initDashboard() {
  // Abrir y cerrar menú
  const btnMenu   = document.getElementById('btn-menu');
  const btnClose  = document.getElementById('btn-close');
  const sidebar   = document.getElementById('sidebar');
  btnMenu.addEventListener('click', () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));

  // Dropdown usuario
  const btnUser  = document.getElementById('btn-user');
  const dropdown = document.getElementById('dropdown-user');
  btnUser.addEventListener('click', () => dropdown.classList.toggle('hidden'));

  // Logout
  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    navigateTo('#/');
  });

  // Mostrar nombre
  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser')) || {}; } catch {}
  const name = user.name || 'Usuario';
  document.getElementById('user-name').textContent    = name;
  document.getElementById('welcome-name').textContent = name;

  // Submenú Sensores
  const toggleSensors = document.getElementById('toggle-sensors');
  toggleSensors.addEventListener('click', () =>
    toggleSensors.parentElement.classList.toggle('open')
  );

  // Resaltar activo y cerrar menú al navegar
  document.querySelectorAll('.menu a').forEach(a => {
    if (a.getAttribute('href') === '#/dashboard') {
      a.classList.add('active');
    }
    a.addEventListener('click', e => {
      document.querySelector('.menu a.active')?.classList.remove('active');
      e.target.classList.add('active');
      sidebar.classList.remove('visible');
    });
  });

  // Modal SOS
  const btnSos   = document.getElementById('btn-sos');
  const modalSos = document.getElementById('modal-sos');
  const closeSos = document.getElementById('close-sos');
  btnSos.addEventListener('click', () => modalSos.classList.remove('hidden'));
  closeSos.addEventListener('click', () => modalSos.classList.add('hidden'));

  // Mantener en dashboard al presionar atrás
  history.pushState(null, null, location.href);
  window.addEventListener('popstate', () => {
    history.pushState(null, null, location.href);
  });

  // WebSocket en tiempo real: Actualizar las tarjetas del estado de sensores
  initWebSocket((data) => {
    console.log('Dato recibido por WebSocket:', data);

    if (data.id?.startsWith('g-')) {
      const gasCard = document.getElementById('gas-status');
      if (gasCard) {
        gasCard.innerHTML = `
          <strong>Gas:</strong><br>
          LPG: ${data.lpg}<br>
          CO: ${data.co}<br>
          Humo: ${data.smoke}
          `; 
      }
    }

    if (data.id?.startsWith('p-')) {
      const particleCard = document.getElementById('particle-status');
      if (particleCard) {
        particleCard.innerHTML = `
          <strong>Partículas:</strong><br>
          PM1.0: ${data.pm1_0}<br>
          PM2.5: ${data.pm2_5}<br>
          PM10: ${data.pm10}
        `;

      }
    }

    if (data.id?.startsWith('motion')) {
      const motionCard = document.getElementById('motion-status');
      if (motionCard) {
        motionCard.innerHTML = `
          <strong>Movimiento:</strong><br>
          Estado: ${data.motion_detected ? "Detectado" : "Sin movimiento"}<br>
          Intensidad: ${data.intensity ?? '–'}
        `;

      }
    }
  });
}
