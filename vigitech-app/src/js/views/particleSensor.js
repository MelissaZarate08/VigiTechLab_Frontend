// src/js/views/particleSensor.js
import Chart from 'chart.js/auto';
import { navigateTo } from '../router.js';
import * as svc from '../../api/particleService.js';
import { initWebSocket } from '../../api/dashboardService.js';

export function initParticleSensor() {
  // Menú y sidebar
  const btnMenu  = document.getElementById('btn-menu'),
        btnClose = document.getElementById('btn-close'),
        sidebar  = document.getElementById('sidebar');
  btnMenu .addEventListener('click', () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));

  // Usuario
  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser'))||{}; } catch{}
  document.getElementById('user-name').textContent = user.name || 'Usuario';

  document.getElementById('btn-user')
    .addEventListener('click', () => document.getElementById('dropdown-user').classList.toggle('hidden'));
  document.getElementById('logout')
    .addEventListener('click', () => { localStorage.clear(); navigateTo('#/', {replace:true}); });

  // Submenú sensores
  document.getElementById('toggle-sensors')
    .addEventListener('click', e => e.target.parentElement.classList.toggle('open'));

  // Resaltar Partículas
  document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector('.menu a[href="#/particle"]');
  if (link) link.classList.add('active');

  // Gráfica / tabla
  const canvas   = document.getElementById('particleChart'),
        table    = document.getElementById('particleTable'),
        btnChart = document.getElementById('btn-chart'),
        btnTable = document.getElementById('btn-table');
  const ctx = canvas.getContext('2d');
  let chart = null;

  const MAX_POINTS = 8;
  let chartData   = [];

  function updateChart() {
    const labels = chartData.map(r => r.timestamp.slice(11,16)); // HH:MM
    const pm1_0  = chartData.map(r => r.pm1_0),
          pm2_5  = chartData.map(r => r.pm2_5),
          pm10   = chartData.map(r => r.pm10);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'PM1.0', data: pm1_0, borderColor: '#00ffc8cc', tension: 0.3, fill:false },
          { label: 'PM2.5', data: pm2_5, borderColor: '#02a07ecc', tension: 0.3, fill:false },
          { label: 'PM10',  data: pm10,  borderColor: '#005643cc', tension: 0.3, fill:false }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Hora' } },
          y: { title: { display: true, text: 'µg/m³' } }
        }
      }
    });
  }

  function updateTable() {
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    // últimos primero
    chartData.slice().reverse().forEach(r => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${r.timestamp.slice(11,16)}</td>
          <td>${r.pm1_0.toFixed(2)}</td>
          <td>${r.pm2_5.toFixed(2)}</td>
          <td>${r.pm10.toFixed(2)}</td>
        </tr>
      `);
    });
  }

  function showChart() {
    canvas.classList.remove('hidden');
    table.classList.add  ('hidden');
    updateChart();
  }
  function showTable() {
    table.classList.remove  ('hidden');
    canvas.classList.add    ('hidden');
    updateTable();
  }

  btnChart.addEventListener('click', showChart);
  btnTable.addEventListener('click', showTable);
  showChart();

  // —–– Aquí enlazamos el botón "Ver stats" al router –––—
  const btnStats = document.getElementById('btn-stats');
  if (btnStats) {
    btnStats.addEventListener('click', () => {
      navigateTo('#/particleProbability');
    });
  }

  // Mantener datos en vivo via WebSocket
  const rtHour  = document.getElementById('rt-hour'),
        rtValue = document.getElementById('rt-value');
  initWebSocket((data) => {
    if (!data.id?.startsWith('p-')) return;
    chartData.push(data);
    if (chartData.length > MAX_POINTS) chartData.shift();

    rtHour.textContent  = data.timestamp;
    rtValue.textContent = data.pm2_5.toFixed(2);

    updateChart();
    updateTable();
  });

  // SOS modal
  document.getElementById('btn-sos')
    .addEventListener('click', () => document.getElementById('modal-sos').classList.remove('hidden'));
  document.getElementById('close-sos')
    .addEventListener('click', () => document.getElementById('modal-sos').classList.add('hidden'));

  // Bloquear atrás
  history.pushState(null, null, location.href);
  window.addEventListener('popstate', () => history.pushState(null, null, location.href));
}
