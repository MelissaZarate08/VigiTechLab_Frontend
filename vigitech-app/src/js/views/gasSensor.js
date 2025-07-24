import Chart from 'chart.js/auto';
import Toastify from 'toastify-js';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/wsService.js';

const BASE_URL   = "https://vigitech-data.namixcode.cc";
const MAX_POINTS = 8;
const ALERT_COOLDOWN = 5000;

export function initGasSensor() {
  document.getElementById('btn-menu').onclick = () => document.getElementById('sidebar').classList.add('visible');
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
  document.querySelector('.menu a[href="#/gas"]').classList.add('active');
  document.getElementById('toggle-sensors').onclick = e => e.target.parentElement.classList.toggle('open');

  let wsClient = null;
  function startRealtime() {
    wsClient = initWebSocket(onData);
  }
  function stopRealtime() {
    wsClient?.close();
  }

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
    document.getElementById('gas-toggle').disabled = state==='off';
    document.getElementById('gas-label').style.opacity = state==='off'?0.5:1;
    state==='off'? stopRealtime() : startRealtime();
    Toastify({
      text:`Sistema ${state==='on'?'encendido':'apagado'}`, duration:3000,
      gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  };

  const gasToggle = document.getElementById('gas-toggle');
  const gasLabel  = document.getElementById('gas-label');
  let gasState    = localStorage.getItem('vigitech-gas') || 'on';
  gasToggle.checked = gasState==='on';
  gasLabel.textContent = `Gas: ${gasState.toUpperCase()}`;
  if(sysState==='off') { gasToggle.disabled=true; gasLabel.style.opacity=0.5; }
  gasToggle.onchange = async () => {
    const state = gasToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/sensor`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ sensor:'gas', action:state })
    });
    localStorage.setItem('vigitech-gas', state);
    gasLabel.textContent = `Gas: ${state.toUpperCase()}`;
    Toastify({
      text:`Sensor de gas ${state==='on'?'activado':'desactivado'}`, duration:3000,
      gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  };

  const TH = { LPG:1000, CO:50, Smoke:50 };
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

  const canvas   = document.getElementById('gasChart');
  const tableEl  = document.getElementById('gasTable');
  const btnChart = document.getElementById('btn-chart');
  const btnTable = document.getElementById('btn-table');
  const ctx      = canvas.getContext('2d');
  let chart      = null, chartData = [];
  function updateChart() {
    const labels = chartData.map(r=>r.timestamp.slice(11,16));
    const L = chartData.map(r=>r.lpg), C = chartData.map(r=>r.co), S = chartData.map(r=>r.smoke);
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
      type:'line',
      data:{ labels, datasets:[
        { label:'LPG', data:L, tension:0.3, fill:false },
        { label:'CO',  data:C, tension:0.3, fill:false },
        { label:'Humo',data:S, tension:0.3, fill:false }
      ]}
    });
  }
  function updateTable() {
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    chartData.forEach(r => tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${r.timestamp.slice(11,16)}</td>
        <td>${r.lpg.toFixed(2)}</td>
        <td>${r.co.toFixed(2)}</td>
        <td>${r.smoke.toFixed(2)}</td>
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
    if (localStorage.getItem('vigitech-system')!=='on') return;
    if (localStorage.getItem('vigitech-gas')!=='on') {
      const now = Date.now();
      if (now - lastOffToast > ALERT_COOLDOWN) {
        Toastify({ text:"Sensor de gas está apagado", duration:3000 }).showToast();
        lastOffToast = now;
      }
      return;
    }
    if (!data.id?.startsWith('g-')) return;

    chartData.push(data);
    if (chartData.length > MAX_POINTS) chartData.shift();

    document.getElementById('rt-lpg')  .textContent = data.lpg.toFixed(2);
    document.getElementById('rt-co')   .textContent = data.co.toFixed(2);
    document.getElementById('rt-smoke').textContent = data.smoke.toFixed(2);

    updateChart();
    updateTable();

    const high = data.lpg>TH.LPG || data.co>TH.CO || data.smoke>TH.Smoke;
    if (high && !alertedHigh) {
      alertedHigh = true;
      if (audioReady) { alertSound.currentTime=0; alertSound.play().catch(()=>{}); }
      Toastify({
        text:"Alerta de gas alto", duration:5000,
        gravity:"top", position:"right",
        style:{ background:"#e63946" }
      }).showToast();
    }
    if (!high) alertedHigh = false;
  }

  startRealtime();

  const sosModal = document.getElementById('modal-sos');
document.getElementById('btn-sos').onclick = () => {
  sosModal.classList.toggle('hidden');
};

  document.getElementById('btn-stats').onclick = () => navigateTo('#/gasProbability');

  history.pushState(null,null,location.href);
  window.addEventListener('popstate', ()=> history.pushState(null,null,location.href));
}
