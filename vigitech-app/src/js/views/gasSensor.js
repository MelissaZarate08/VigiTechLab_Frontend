// src/js/views/gasSensor.js
import Chart from 'chart.js/auto';
import { navigateTo } from '../router.js';
import * as gasAPI from '../../api/gasService.js';
import { initWebSocket } from '../../api/dashboardService.js';

export function initGasSensor() {
  const btnMenu   = document.getElementById('btn-menu');
  const btnClose  = document.getElementById('btn-close');
  const sidebar   = document.getElementById('sidebar');
  btnMenu.addEventListener('click', () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));

  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser')) || {}; } catch {}
  const name = user.name || 'Usuario';
  const userNameSpan = document.getElementById('user-name');
  if (userNameSpan) userNameSpan.textContent = name;

  const btnUser = document.getElementById('btn-user');
  const dropdown = document.getElementById('dropdown-user');
  if (btnUser && dropdown) {
    btnUser.addEventListener('click', () => dropdown.classList.toggle('hidden'));
  }

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      navigateTo('#/', { replace: true });
    });
  }

  const toggleSensors = document.getElementById('toggle-sensors');
  if (toggleSensors) {
    toggleSensors.addEventListener('click', () => {
      toggleSensors.parentElement.classList.toggle('open');
    });
  }

  document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
  const gasLink = document.querySelector('.menu a[href="#/gas"]');
  if (gasLink) gasLink.classList.add('active');
  document.querySelectorAll('.menu a').forEach(a => {
    a.addEventListener('click', () => {
      sidebar.classList.remove('visible');
    });
  });

  const canvasEl = document.getElementById('gasChart');
  const tableEl  = document.getElementById('gasTable');
  const btnChart = document.getElementById('btn-chart');
  const btnTable = document.getElementById('btn-table');
  let chart      = null;
  const ctx      = canvasEl.getContext('2d');

  const MAX_POINTS = 8;
  const chartData = [];

  function updateChart() {
    const labels = chartData.map(r => r.timestamp.slice(11,16)); // solo HH:mm
    const lpg    = chartData.map(r => r.lpg);
    const co     = chartData.map(r => r.co);
    const smoke  = chartData.map(r => r.smoke);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'LPG (ppm)', data: lpg, borderColor: 'orange', tension: 0.3, fill: false },
          { label: 'CO (ppm)', data: co, borderColor: 'gray', tension: 0.3, fill: false },
          { label: 'Humo (ppm)', data: smoke, borderColor: 'black', tension: 0.3, fill: false }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: 'Hora' } },
          y: { title: { display: true, text: 'Concentración (ppm)' } }
        }
      }
    });
  }

  function updateTable() {
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    // Mostrar los datos en orden cronológico (más recientes abajo)
    chartData.forEach(r => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${r.timestamp.slice(11,16)}</td>
          <td>${r.lpg.toFixed(2)}</td>
          <td>${r.co.toFixed(2)}</td>
          <td>${r.smoke.toFixed(2)}</td>
        </tr>
      `);
    });
  }

  function showChart() {
    btnChart.classList.add('active');
    btnTable.classList.remove('active');
    canvasEl.classList.remove('hidden');
    tableEl.classList.add('hidden');
    updateChart();
  }
  function showTable() {
    btnTable.classList.add('active');
    btnChart.classList.remove('active');
    canvasEl.classList.add('hidden');
    tableEl.classList.remove('hidden');
    updateTable();
  }

  btnChart.addEventListener('click', showChart);
  btnTable.addEventListener('click', showTable);

  showChart();

  const rtHour  = document.getElementById('rt-hour');
  const rtValue = document.getElementById('rt-value');

initWebSocket((data) => {
  if (!data.id || !data.id.startsWith('g-')) return;

  console.log('Nuevo dato sensor gas:', data);  // <== esta línea

  chartData.push(data);
  if (chartData.length > MAX_POINTS) chartData.shift();

  rtHour.textContent  = data.timestamp;
  rtValue.textContent = data.lpg.toFixed(2);

  updateChart();
  updateTable();
});


  document.getElementById('btn-sos')
    .addEventListener('click', () => document.getElementById('modal-sos').classList.remove('hidden'));
  document.getElementById('close-sos')
    .addEventListener('click', () => document.getElementById('modal-sos').classList.add('hidden'));
  const btnStats = document.getElementById('btn-stats');
if (btnStats) {
  btnStats.addEventListener('click', () => {
    navigateTo('#/gasProbability');
  });
}


  history.pushState(null, null, location.href);
  window.addEventListener('popstate', () => {
    history.pushState(null, null, location.href);
  });
}
