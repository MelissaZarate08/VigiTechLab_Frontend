import Chart from 'chart.js/auto';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/dashboardService.js';

export function initCamMotionSensors() {
  // Menú y sidebar
  const btnMenu = document.getElementById('btn-menu'),
        btnClose = document.getElementById('btn-close'),
        sidebar = document.getElementById('sidebar');
  btnMenu.addEventListener('click', () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));

  // Nombre de usuario
  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser'))||{}; } catch{}
  document.getElementById('user-name').textContent = user.name||'Usuario';

  // Dropdown y logout
  document.getElementById('btn-user')
    .addEventListener('click', ()=>document.getElementById('dropdown-user').classList.toggle('hidden'));
  document.getElementById('logout')
    .addEventListener('click', ()=>{ localStorage.clear(); navigateTo('#/',{replace:true}); });

  // Submenú Sensores
  document.getElementById('toggle-sensors')
    .addEventListener('click', e=> e.target.parentElement.classList.toggle('open'));

  // Resaltar enlace
  document.querySelectorAll('.menu a').forEach(a=>a.classList.remove('active'));
  const link = document.querySelector('.menu a[href="#/camMotion"]');
  if (link) link.classList.add('active');

  // Botón galería
  document.getElementById('btn-gallery').addEventListener('click', () => {
    alert('Abrir galería de imágenes');
  });

  // Canvas y tabla
  const canvas = document.getElementById('camMotionChart'),
        table = document.getElementById('camMotionTable'),
        btnChart = document.getElementById('btn-chart'),
        btnTable = document.getElementById('btn-table');
  const ctx = canvas.getContext('2d'); let chart = null;

  const chartData = []; // datos recientes
  const MAX = 8;

  function updateChart() {
    const labels = chartData.map(d => d.timestamp);
    const intensity = chartData.map(d => d.intensity);
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Intensidad', data: intensity, borderColor: 'blue', tension: 0.3 }]
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Hora' } },
          y: { title: { display: true, text: 'Intensidad' } }
        }
      }
    });
  }

  function updateTable() {
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    chartData.slice().reverse().forEach(d => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${d.timestamp}</td>
          <td>${d.motion_detected ? 'Sí' : 'No'}</td>
          <td>${d.intensity.toFixed(2)}</td>
        </tr>
      `);
    });
  }

  btnChart.addEventListener('click', () => {
    canvas.classList.remove('hidden');
    table.classList.add('hidden');
    updateChart();
  });

  btnTable.addEventListener('click', () => {
    table.classList.remove('hidden');
    canvas.classList.add('hidden');
    updateTable();
  });

  canvas.classList.remove('hidden');
  table.classList.add('hidden');

  // Realtime
  const rtHour = document.getElementById('rt-hour');
  const rtValue = document.getElementById('rt-value');

  initWebSocket((data) => {
    if (!data.id || !data.id.startsWith('motion')) return;
    chartData.push(data);
    if (chartData.length > MAX) chartData.shift();

    rtHour.textContent = data.timestamp;
    rtValue.textContent = data.motion_detected ? 'Detectado' : '—';

    updateChart();
    updateTable();
  });

  // SOS
  document.getElementById('btn-sos')
    .addEventListener('click', ()=>document.getElementById('modal-sos').classList.remove('hidden'));
  document.getElementById('close-sos')
    .addEventListener('click', ()=>document.getElementById('modal-sos').classList.add('hidden'));

  // Bloquear back
  history.pushState(null,null,location.href);
  window.addEventListener('popstate',()=>history.pushState(null,null,location.href));
}