import { navigateTo } from '../router.js';
import * as configAPI from '../../api/configServices.js';


export function initConfigSensor() {
// —————— Lógica menú y usuario (igual que dashboard) ——————
const btnMenu   = document.getElementById('btn-menu');
const btnClose  = document.getElementById('btn-close');
const sidebar   = document.getElementById('sidebar');
btnMenu.addEventListener('click', () => sidebar.classList.add('visible'));
btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));

const btnUser  = document.getElementById('btn-user');
const dropdown = document.getElementById('dropdown-user');
btnUser.addEventListener('click', () => dropdown.classList.toggle('hidden'));

document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  navigateTo('#/');
});

// Mostrar nombre
let user = {};
try { user = JSON.parse(localStorage.getItem('currentUser')) || {}; } catch {}
const name = user.name || 'Usuario';
document.getElementById('user-name').textContent = name;

// Submenú
const toggleSensors = document.getElementById('toggle-sensors');
toggleSensors.addEventListener('click', () => 
  toggleSensors.parentElement.classList.toggle('open')
);

// Resaltar activo
document.querySelectorAll('.menu a').forEach(a => {
  if (a.getAttribute('href') === '#/configSensor') {
    a.classList.add('active');
  }
  a.addEventListener('click', e => {
    document.querySelector('.menu a.active')?.classList.remove('active');
    e.target.classList.add('active');
    sidebar.classList.remove('visible');
  });
});

// —————— Carga y render de switches ——————
const listEl = document.getElementById('sensor-list');

async function loadSensors() {
  try {
    const sensors = await configAPI.fetchSensorConfigs();
    listEl.innerHTML = '';
    sensors.forEach(s => {
      const item = document.createElement('div');
      item.className = 'sensor-item';
      item.innerHTML = `
        <label for="sensor-${s.id}">${s.name} (${s.model})</label>
        <label class="switch">
          <input type="checkbox" id="sensor-${s.id}" ${s.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      `;
      listEl.appendChild(item);

      // listener toggle
      item.querySelector('input').addEventListener('change', async (e) => {
        await configAPI.updateSensorConfig(s.id, e.target.checked);
      });
    });
  } catch (err) {
    console.error('No se pudieron cargar los sensores', err);
  }
}

document.addEventListener('DOMContentLoaded', loadSensors);

// —————— Modal SOS ——————
const btnSos   = document.getElementById('btn-sos');
const modalSos = document.getElementById('modal-sos');
const closeSos = document.getElementById('close-sos');
btnSos.addEventListener('click', () => modalSos.classList.remove('hidden'));
closeSos.addEventListener('click', () => modalSos.classList.add('hidden'));

// justo al final de initDashboard (después de montar todo lo demás)
history.pushState(null, null, location.href);
window.addEventListener('popstate', () => {
  // cada intento de “atrás” te devuelve al mismo dashboard
  history.pushState(null, null, location.href);
});

}