// src/js/views/gasSensor.js
import Chart from 'chart.js/auto';
import { navigateTo } from '../router.js';
import * as gasAPI   from '../../api/gasService.js';

export function initGasSensor() {
  // —–––– Menú, dropdown, logout ––––
  const btnMenu   = document.getElementById('btn-menu');
  const btnClose  = document.getElementById('btn-close');
  const sidebar   = document.getElementById('sidebar');
  btnMenu.addEventListener('click', () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));

  // Mostrar nombre de usuario
  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser')) || {}; } catch {}
  const name = user.name || 'Usuario';
  const userNameSpan = document.getElementById('user-name');
  if (userNameSpan) userNameSpan.textContent = name;

  // Dropdown usuario
  const btnUser = document.getElementById('btn-user');
  const dropdown = document.getElementById('dropdown-user');
  if (btnUser && dropdown) {
    btnUser.addEventListener('click', () => dropdown.classList.toggle('hidden'));
  }

  // Logout
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      navigateTo('#/', { replace: true });
    });
  }

  // Submenú Sensores
  const toggleSensors = document.getElementById('toggle-sensors');
  if (toggleSensors) {
    toggleSensors.addEventListener('click', () => {
      toggleSensors.parentElement.classList.toggle('open');
    });
  }

    // Resaltar ruta activa y cerrar menú
  // Primero limpiar todas las activas
  document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
  // Luego marcar solo Gas
  const gasLink = document.querySelector('.menu a[href="#/gas"]');
  if (gasLink) gasLink.classList.add('active');
  // Cerrar menú al clicar en enlaces
  document.querySelectorAll('.menu a').forEach(a => {
    a.addEventListener('click', e => {
      sidebar.classList.remove('visible');
    });
  });

  // —–––– DECLARAR ctx, chart y MOCK_READINGS ––––, chart y MOCK_READINGS ––––
  const canvasEl = document.getElementById('gasChart');
  const tableEl  = document.getElementById('gasTable');
  const btnChart = document.getElementById('btn-chart');
  const btnTable = document.getElementById('btn-table');
  let chart      = null;
  const ctx      = canvasEl.getContext('2d');

  const MOCK_READINGS_WITH_FIELDS = [
    { timestamp:'08:00', lpg:65.00, co:3.20, smoke:5.10 },
    { timestamp:'10:00', lpg:80.00, co:4.10, smoke:6.00 },
    { timestamp:'12:00', lpg:55.00, co:2.50, smoke:4.30 },
    { timestamp:'14:00', lpg:72.00, co:3.80, smoke:5.50 },
    { timestamp:'16:00', lpg:90.00, co:5.00, smoke:7.20 },
  ];

  // —–––– Función para cargar la gráfica ––––
  async function loadChart() {
    let readings;
    try {
      readings = await gasAPI.fetchGasReadings();
    } catch {
      readings = MOCK_READINGS_WITH_FIELDS;
    }
    const labels = readings.map(r => r.timestamp);
    const data   = readings.map(r => r.lpg);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'LPG (ppm)', data, fill: false, tension: 0.3 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: 'Hora' } },
          y: { title: { display: true, text: 'LPG (ppm)' } }
        }
      }
    });
  }

  // —–––– Función para cargar la tabla ––––
  async function loadTable() {
    let readings;
    try {
      readings = await gasAPI.fetchGasReadings();
    } catch {
      readings = MOCK_READINGS_WITH_FIELDS;
    }
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    readings.forEach(r => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${r.timestamp}</td>
          <td>${r.lpg.toFixed(2)}</td>
          <td>${r.co.toFixed(2)}</td>
          <td>${r.smoke.toFixed(2)}</td>
        </tr>
      `);
    });
  }

  // —–––– Toggle gráfica/tabla ––––
  function showChart() {
    btnChart.classList.add('active');
    btnTable.classList.remove('active');
    canvasEl.classList.remove('hidden');
    tableEl.classList.add('hidden');
    loadChart();
  }
  function showTable() {
    btnTable.classList.add('active');
    btnChart.classList.remove('active');
    canvasEl.classList.add('hidden');
    tableEl.classList.remove('hidden');
    loadTable();
  }

  btnChart.addEventListener('click', showChart);
  btnTable.addEventListener('click', showTable);

  // Inicializar vista en gráfico
  showChart();

  // —–––– Datos en tiempo real ––––
  const latest = MOCK_READINGS_WITH_FIELDS.at(-1);
  document.getElementById('rt-hour').textContent  = latest.timestamp;
  document.getElementById('rt-value').textContent = latest.lpg.toFixed(2);

  // —–––– Modal SOS ––––
  document.getElementById('btn-sos')
    .addEventListener('click', () => document.getElementById('modal-sos').classList.remove('hidden'));
  document.getElementById('close-sos')
    .addEventListener('click', () => document.getElementById('modal-sos').classList.add('hidden'));

  // —–––– Bloquear Back en esta vista ––––
  history.pushState(null, null, location.href);
  window.addEventListener('popstate', () => {
    history.pushState(null, null, location.href);
  });
}
