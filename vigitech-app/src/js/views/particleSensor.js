import Chart from 'chart.js/auto';
import { navigateTo } from '../router.js';
import * as svc from '../../api/particleService.js';

export function initParticleSensor() {
  // —––– Menú y usuario ––––
  const btnMenu = document.getElementById('btn-menu'),
        btnClose = document.getElementById('btn-close'),
        sidebar = document.getElementById('sidebar');
  btnMenu.addEventListener('click', () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));

  // Cargar nombre
  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser'))||{}; } catch{}
  document.getElementById('user-name').textContent = user.name||'Usuario';

  // Dropdown + Logout
  document.getElementById('btn-user')
    .addEventListener('click', () => document.getElementById('dropdown-user').classList.toggle('hidden'));
  document.getElementById('logout')
    .addEventListener('click', () => { localStorage.clear(); navigateTo('#/', {replace:true}); });

  // Submenú Sensores
  document.getElementById('toggle-sensors')
    .addEventListener('click', e=> e.target.parentElement.classList.toggle('open'));

  // Resaltar “Partículas”
  document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector('.menu a[href="#/particle"]');
  if (link) link.classList.add('active');

  // —––– Canvas & Table ––––
  const canvas = document.getElementById('particleChart'),
        table   = document.getElementById('particleTable'),
        btnChart= document.getElementById('btn-chart'),
        btnTable= document.getElementById('btn-table');
  const ctx = canvas.getContext('2d'); let chart=null;

  const MOCK = [
    { timestamp:'08:00', pm1_0:12, pm2_5:20, pm10:35 },
    { timestamp:'10:00', pm1_0:15, pm2_5:25, pm10:40 },
    { timestamp:'12:00', pm1_0:10, pm2_5:18, pm10:30 },
    { timestamp:'14:00', pm1_0:14, pm2_5:22, pm10:38 },
    { timestamp:'16:00', pm1_0:18, pm2_5:28, pm10:45 },
  ];

  async function loadChart() {
    let data = [];
    try { data = await svc.fetchReadings(); }
    catch { data = MOCK; }
    const labels = data.map(r=>r.timestamp),
          vals = data.map(r=>r.pm2_5);
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type:'line',
      data:{ labels, datasets:[{ label:'PM2.5 (µg/m³)', data:vals, fill:false, tension:0.3 }] },
      options:{ responsive:true, scales:{ x:{title:{display:true,text:'Hora'}}, y:{title:{display:true,text:'PM2.5'}} } }
    });
  }

  async function loadTable() {
    let data = [];
    try { data = await svc.fetchReadings(); }
    catch { data = MOCK; }
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    data.forEach(r => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${r.timestamp}</td>
          <td>${r.pm1_0.toFixed(2)}</td>
          <td>${r.pm2_5.toFixed(2)}</td>
          <td>${r.pm10.toFixed(2)}</td>
        </tr>
      `);
    });
  }

  function showChart(){ canvas.classList.remove('hidden'); table.classList.add('hidden'); loadChart(); }
  function showTable(){ table.classList.remove('hidden'); canvas.classList.add('hidden'); loadTable(); }

  btnChart.addEventListener('click', showChart);
  btnTable.addEventListener('click', showTable);
  showChart();

  // Datos en tiempo real
  const latest = MOCK.at(-1);
  document.getElementById('rt-hour').textContent = latest.timestamp;
  document.getElementById('rt-value').textContent = latest.pm2_5.toFixed(2);

  // SOS
  document.getElementById('btn-sos')
    .addEventListener('click', ()=>document.getElementById('modal-sos').classList.remove('hidden'));
  document.getElementById('close-sos')
    .addEventListener('click', ()=>document.getElementById('modal-sos').classList.add('hidden'));

  // Bloquear Back
  history.pushState(null,null,location.href);
  window.addEventListener('popstate', ()=>history.pushState(null,null,location.href));
}
