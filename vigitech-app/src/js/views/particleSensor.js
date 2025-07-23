import Chart from 'chart.js/auto';
import Toastify from 'toastify-js';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/wsService.js';

const BASE_URL       = "http://vigitech-data.namixcode.cc:8081";
const MAX_POINTS     = 8;
const ALERT_COOLDOWN = 5000;

export function initParticleSensor() {
  document.getElementById('btn-menu').onclick  = () => document.getElementById('sidebar').classList.add('visible');
  document.getElementById('btn-close').onclick = () => document.getElementById('sidebar').classList.remove('visible');
  document.getElementById('btn-user').onclick  = () => document.getElementById('dropdown-user').classList.toggle('hidden');
  document.getElementById('logout').onclick    = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    navigateTo('#/');
  };
  try {
    const user = JSON.parse(localStorage.getItem('currentUser'))||{};
    document.getElementById('user-name').textContent = user.name || 'Usuario';
  } catch {}

  document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
  document.querySelector('.menu a[href="#/particle"]').classList.add('active');
  document.getElementById('toggle-sensors').onclick = e => e.target.parentElement.classList.toggle('open');

  let wsClient = null;
  function startRealtime() { wsClient = initWebSocket(onData); }
  function stopRealtime()  { wsClient?.close(); }

  const sysToggle = document.getElementById('system-toggle');
  const sysLabel  = document.getElementById('system-label');
  let sysState    = localStorage.getItem('vigitech-system') || 'on';
  sysToggle.checked = sysState==='on';
  sysLabel.textContent = `Sistema: ${sysState.toUpperCase()}`;
  sysToggle.onchange = async () => {
    const state = sysToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/system`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action: state })
    });
    localStorage.setItem('vigitech-system', state);
    sysLabel.textContent = `Sistema: ${state.toUpperCase()}`;
    const toggle = document.getElementById('particle-toggle');
    const label  = document.getElementById('particle-label');
    toggle.disabled = state==='off';
    label.style.opacity = state==='off'?0.5:1;
    state==='off'? stopRealtime() : startRealtime();
    Toastify({
      text:`Sistema ${state==='on'?'encendido':'apagado'}`, duration:3000,
      gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  };

  const partToggle = document.getElementById('particle-toggle');
  const partLabel  = document.getElementById('particle-label');
  let partState    = localStorage.getItem('vigitech-particle') || 'on';
  partToggle.checked = partState==='on';
  partLabel.textContent = `Partículas: ${partState.toUpperCase()}`;
  if(sysState==='off') { partToggle.disabled=true; partLabel.style.opacity=0.5; }
  partToggle.onchange = async () => {
    const state = partToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/sensor`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ sensor:'particles', action:state })
    });
    localStorage.setItem('vigitech-particle', state);
    partLabel.textContent = `Partículas: ${state.toUpperCase()}`;
    Toastify({
      text:`Sensor de partículas ${state==='on'?'activado':'desactivado'}`, duration:3000,
      gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  };

  const TH = { PM1_0:12, PM2_5:35, PM10:50 };
  let alertedHigh = false;
  let lastOffToast = 0;
  const alertSound = document.getElementById('alert-sound');
  let audioReady = false;
  document.addEventListener('click', () => {
    if (!audioReady) {
      alertSound.play()
        .then(()=>{ alertSound.pause(); alertSound.currentTime=0; audioReady=true; })
        .catch(()=>{});
    }
  }, { once:true });

  const canvas   = document.getElementById('particleChart');
  const tableEl  = document.getElementById('particleTable');
  const btnChart = document.getElementById('btn-chart');
  const btnTable = document.getElementById('btn-table');
  const ctx      = canvas.getContext('2d');
  let chart      = null, chartData = [];
  function updateChart() {
    const labels = chartData.map(r=>r.timestamp.slice(11,16));
    const d1 = chartData.map(r=>r.pm1_0),
          d2 = chartData.map(r=>r.pm2_5),
          d3 = chartData.map(r=>r.pm10);
    if(chart) chart.destroy();
    chart = new Chart(ctx,{
      type:'line',
      data:{ labels, datasets:[
        { label:'PM1.0', data:d1, tension:0.3, fill:false },
        { label:'PM2.5', data:d2, tension:0.3, fill:false },
        { label:'PM10',  data:d3, tension:0.3, fill:false }
      ]}
    });
  }
  function updateTable() {
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    chartData.forEach(r=> tbody.insertAdjacentHTML('beforeend',`
      <tr>
        <td>${r.timestamp.slice(11,16)}</td>
        <td>${r.pm1_0.toFixed(2)}</td>
        <td>${r.pm2_5.toFixed(2)}</td>
        <td>${r.pm10.toFixed(2)}</td>
      </tr>`));
  }

  btnChart.onclick = () => {
  canvas.classList.remove('hidden');
  tableEl.classList.add('hidden');
  updateChart();
  btnChart.classList.add('active');
  btnTable.classList.remove('active');
};
btnTable.onclick = () => {
  tableEl.classList.remove('hidden');
  canvas.classList.add('hidden');
  updateTable();
  btnTable.classList.add('active');
  btnChart.classList.remove('active');
};

function onData(data) {
  if (localStorage.getItem('vigitech-system') !== 'on') return;

  if (localStorage.getItem('vigitech-particle') !== 'on') {
    const now = Date.now();
    if (now - lastOffToast > ALERT_COOLDOWN) {
      Toastify({ text: "Sensor de partículas está apagado", duration: 3000 }).showToast();
      lastOffToast = now;
    }
    return;
  }

  if (!data.id?.startsWith('p-')) return;

  chartData.push(data);
  if (chartData.length > MAX_POINTS) chartData.shift();

  const el1 = document.getElementById('rt-pm1');
  const el2 = document.getElementById('rt-pm2');
  const el3 = document.getElementById('rt-pm10');

  if (el1 && el2 && el3) {
    el1.textContent = data.pm1_0.toFixed(2);
    el2.textContent = data.pm2_5.toFixed(2);
    el3.textContent = data.pm10.toFixed(2);
  }

  updateChart();
  updateTable();

  const high = data.pm1_0 > TH.PM1_0 || data.pm2_5 > TH.PM2_5 || data.pm10 > TH.PM10;
  if (high && !alertedHigh) {
    alertedHigh = true;
    if (audioReady) {
      alertSound.currentTime = 0;
      alertSound.play().catch(() => {});
    }
    Toastify({
      text: "Alerta de partículas alto", duration: 5000,
      gravity: "top", position: "right",
      style: { background: "#e63946" }
    }).showToast();
  }
  if (!high) alertedHigh = false;
}

  startRealtime();

const sosModal = document.getElementById('modal-sos');
document.getElementById('btn-sos').onclick = () => sosModal.classList.toggle('hidden');


  document.getElementById('btn-stats').onclick = () => navigateTo('#/particleProbability');

  history.pushState(null,null,location.href);
  window.addEventListener('popstate', ()=> history.pushState(null,null,location.href));
}
