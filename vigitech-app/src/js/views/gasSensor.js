// File: src/js/views/gasSensor.js

import Chart from 'chart.js/auto';
import Toastify from 'toastify-js';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/dashboardService.js';

const BASE_URL   = "http://192.168.115.1:8081";
const MAX_POINTS = 8;

export function initGasSensor() {
  // ——————————————————————————————
  // 1) Menú, usuario y sidebar (igual)
  const btnMenu   = document.getElementById('btn-menu');
  const btnClose  = document.getElementById('btn-close');
  const sidebar   = document.getElementById('sidebar');
  btnMenu.addEventListener('click',  () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));
  document.getElementById('btn-user')
          .addEventListener('click', () => document.getElementById('dropdown-user').classList.toggle('hidden'));
  document.getElementById('logout')
          .addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            navigateTo('#/');
          });
  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser'))||{}; } catch {}
  document.getElementById('user-name').textContent = user.name || 'Usuario';
  document.querySelectorAll('.menu a').forEach(a=>a.classList.remove('active'));
  document.querySelector('.menu a[href="#/gas"]').classList.add('active');
  document.getElementById('toggle-sensors')
          .addEventListener('click', e=>e.target.parentElement.classList.toggle('open'));

  // ——————————————————————————————
  // 2) Preparar WebSocket control
  let ws = null;
  function startRealtime() {
    // suscribirse de nuevo
    ws = initWebSocket(onData);
  }
  function stopRealtime() {
    if (ws) ws.close();
  }

  // ——————————————————————————————
  // 3) Switch Sistema Completo
  const systemToggle = document.getElementById('system-toggle');
  const systemLabel  = document.getElementById('system-label');
  let sysState = localStorage.getItem('vigitech-system') || 'on';
  systemToggle.checked = sysState==='on';
  systemLabel.textContent = `Sistema: ${sysState.toUpperCase()}`;
  systemToggle.addEventListener('change', async ()=>{
    const state = systemToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/system`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action: state })
    });
    localStorage.setItem('vigitech-system', state);
    systemLabel.textContent = `Sistema: ${state.toUpperCase()}`;
    // habilitar/deshabilitar WS y switch de gas
    if (state==='off') {
      stopRealtime();
      gasToggle.disabled = true;
      gasLabel.style.opacity = '0.5';
    } else {
      gasToggle.disabled = false;
      gasLabel.style.opacity = '1';
      startRealtime();
    }
    Toastify({
      text:`Sistema ${state==='on'?'encendido':'apagado'}`,
      duration:3000, gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  });

  // ——————————————————————————————
  // 4) Switch Sensor de Gas
  const gasToggle = document.getElementById('gas-toggle');
  const gasLabel  = document.getElementById('gas-label');
  let gasState = localStorage.getItem('vigitech-gas') || 'on';
  gasToggle.checked = gasState==='on';
  gasLabel.textContent = `Gas: ${gasState.toUpperCase()}`;
  if (sysState==='off') {
    gasToggle.disabled = true;
    gasLabel.style.opacity = '0.5';
  }
  gasToggle.addEventListener('change', async ()=>{
    const state = gasToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/sensor`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ sensor:'gas', action:state })
    });
    localStorage.setItem('vigitech-gas', state);
    gasLabel.textContent = `Gas: ${state.toUpperCase()}`;
    Toastify({
      text:`Sensor de gas ${state==='on'?'activado':'desactivado'}`,
      duration:3000, gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  });

  // ——————————————————————————————
  // 5) Umbrales y sonido de alerta
  const THRESHOLDS = { LPG:1000, CO:50, Smoke:50 };
  let alertedGas       = false;
  let sensorOffAlerted = false;
  const alertSound     = document.getElementById('alert-sound');
  let audioReady       = false;
  document.addEventListener('click', () => {
    if (!audioReady) {
      alertSound.play()
        .then(()=>{ alertSound.pause(); alertSound.currentTime=0; audioReady=true; })
        .catch(()=>{});
    }
  }, { once:true });

  // ——————————————————————————————
  // 6) Gráfica y tabla setup
  const canvas   = document.getElementById('gasChart');
  const tableEl  = document.getElementById('gasTable');
  const btnChart = document.getElementById('btn-chart');
  const btnTable = document.getElementById('btn-table');
  const ctx      = canvas.getContext('2d');
  let chart      = null;
  let chartData  = [];
  function updateChart() {
    const labels = chartData.map(r => r.timestamp.slice(11,16));
    const l = chartData.map(r=>r.lpg), c = chartData.map(r=>r.co), s = chartData.map(r=>r.smoke);
    if (chart) chart.destroy();
    chart = new Chart(ctx,{ type:'line',
      data:{ labels, datasets:[
        { label:'LPG', data:l, tension:0.3, fill:false },
        { label:'CO',  data:c, tension:0.3, fill:false },
        { label:'Humo',data:s, tension:0.3, fill:false }
      ] }
    });
  }
  function updateTable() {
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    chartData.forEach(r=>{
      tbody.insertAdjacentHTML('beforeend',`
        <tr>
          <td>${r.timestamp.slice(11,16)}</td>
          <td>${r.lpg.toFixed(2)}</td>
          <td>${r.co.toFixed(2)}</td>
          <td>${r.smoke.toFixed(2)}</td>
        </tr>`);
    });
  }
  btnChart.addEventListener('click',()=>{
    canvas.classList.remove('hidden');
    tableEl.classList.add('hidden');
    updateChart();
  });
  btnTable.addEventListener('click',()=>{
    tableEl.classList.remove('hidden');
    canvas.classList.add('hidden');
    updateTable();
  });

  // ——————————————————————————————
  // 7) Función que procesa WS
  function onData(data) {
    // 7.1) sistema global
    if (localStorage.getItem('vigitech-system')!=='on') return;

    // 7.2) sensor gas apagado → alerta solo una vez
    if (localStorage.getItem('vigitech-gas')!=='on') {
      if (!sensorOffAlerted) {
        Toastify({ text:"Sensor de gas apagado", duration:3000 }).showToast();
        sensorOffAlerted = true;
      }
      return;
    } else {
      sensorOffAlerted = false;
    }

    if (!data.id?.startsWith('g-')) return;

    // 7.3) Llenar gráfica/tabla/RT
    chartData.push(data);
    if (chartData.length>MAX_POINTS) chartData.shift();
    document.getElementById('rt-hour').textContent  = data.timestamp.slice(11,16);
    document.getElementById('rt-value').textContent = data.lpg.toFixed(2);
    updateChart(); updateTable();

    // 7.4) alerta de umbral
    const alarm = data.lpg>THRESHOLDS.LPG || data.co>THRESHOLDS.CO || data.smoke>THRESHOLDS.Smoke;
    if (alarm && !alertedGas) {
      alertedGas = true;
      if (audioReady) { alertSound.currentTime=0; alertSound.play().catch(()=>{}); }
      Toastify({
        text:"Alerta de gas alto", duration:5000,
        gravity:"top", position:"right",
        style:{ background:"#e63946" }
      }).showToast();
    }
    if (!alarm) alertedGas = false;
  }

  // ——————————————————————————————
  // 8) Iniciar WS y demás al cargar
  startRealtime();

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
