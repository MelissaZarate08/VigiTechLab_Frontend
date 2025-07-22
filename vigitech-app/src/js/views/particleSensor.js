// File: src/js/views/particleSensor.js

import Chart from 'chart.js/auto';
import Toastify from 'toastify-js';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/dashboardService.js';

const BASE_URL   = "http://192.168.115.1:8081";
const MAX_POINTS = 8;

export function initParticleSensor() {
  // 1) Menú, usuario y sidebar
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
  document.querySelector('.menu a[href="#/particle"]').classList.add('active');
  document.getElementById('toggle-sensors')
    .addEventListener('click', e=>e.target.parentElement.classList.toggle('open'));

  // 2) Control de WebSocket
  let ws = null;
  function startRealtime() {
    ws = initWebSocket(onData);
  }
  function stopRealtime() {
    if (ws) ws.close();
  }

  // 3) Switch Sistema Completo
  const systemToggle = document.getElementById('system-toggle');
  const systemLabel  = document.getElementById('system-label');
  let sysState = localStorage.getItem('vigitech-system') || 'on';
  systemToggle.checked = (sysState === 'on');
  systemLabel.textContent = `Sistema: ${sysState.toUpperCase()}`;
  systemToggle.addEventListener('change', async () => {
    const state = systemToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/system`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action: state })
    });
    localStorage.setItem('vigitech-system', state);
    systemLabel.textContent = `Sistema: ${state.toUpperCase()}`;
    // habilitar/deshabilitar switch particles
    particleToggle.disabled = state === 'off';
    particleLabel.style.opacity = state === 'off' ? '0.5' : '1';
    if (state === 'off') stopRealtime(); else startRealtime();
    Toastify({
      text:`Sistema ${state==='on'?'encendido':'apagado'}`,
      duration:3000, gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  });

  // 4) Switch Sensor de Partículas
  const particleToggle = document.getElementById('particle-toggle');
  const particleLabel  = document.getElementById('particle-label');
  let particleState = localStorage.getItem('vigitech-particle') || 'on';
  particleToggle.checked = (particleState === 'on');
  particleLabel.textContent = `Partículas: ${particleState.toUpperCase()}`;
  if (sysState === 'off') {
    particleToggle.disabled = true;
    particleLabel.style.opacity = '0.5';
  }
  particleToggle.addEventListener('change', async () => {
    const state = particleToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/sensor`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ sensor:'particles', action:state })
    });
    localStorage.setItem('vigitech-particle', state);
    particleLabel.textContent = `Partículas: ${state.toUpperCase()}`;
    Toastify({
      text:`Sensor de partículas ${state==='on'?'activado':'desactivado'}`,
      duration:3000, gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  });

  // 5) Umbrales y alertas de partículas
  const THRESHOLDS = { PM1_0:12, PM2_5:35, PM10:50 };
  let alertedParticle   = false;
  let sensorOffAlerted  = false;
  const alertSound      = document.getElementById('alert-sound');
  let audioReady        = false;
  document.addEventListener('click', () => {
    if (!audioReady) {
      alertSound.play()
        .then(()=>{ alertSound.pause(); alertSound.currentTime=0; audioReady=true; })
        .catch(()=>{});
    }
  }, { once:true });

  // 6) Configurar gráfica y tabla
  const canvas   = document.getElementById('particleChart');
  const tableEl  = document.getElementById('particleTable');
  const btnChart = document.getElementById('btn-chart');
  const btnTable = document.getElementById('btn-table');
  const ctx      = canvas.getContext('2d');
  let chart      = null;
  let chartData  = [];
  function updateChart() {
    const labels = chartData.map(r => r.timestamp.slice(11,16));
    const d1 = chartData.map(r=>r.pm1_0),
          d2 = chartData.map(r=>r.pm2_5),
          d3 = chartData.map(r=>r.pm10);
    if (chart) chart.destroy();
    chart = new Chart(ctx,{
      type:'line',
      data:{ labels, datasets:[
        { label:'PM1.0', data:d1, tension:0.3, fill:false },
        { label:'PM2.5', data:d2, tension:0.3, fill:false },
        { label:'PM10',  data:d3, tension:0.3, fill:false }
      ] }
    });
  }
  function updateTable() {
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    chartData.slice().reverse().forEach(r=>{
      tbody.insertAdjacentHTML('beforeend',`
        <tr>
          <td>${r.timestamp.slice(11,16)}</td>
          <td>${r.pm1_0.toFixed(2)}</td>
          <td>${r.pm2_5.toFixed(2)}</td>
          <td>${r.pm10.toFixed(2)}</td>
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

  // 7) Callback WS
  function onData(data) {
    // sistema global
    if (localStorage.getItem('vigitech-system') !== 'on') return;
    // sensor apagado → una sola alerta
    if (localStorage.getItem('vigitech-particle') !== 'on') {
      if (!sensorOffAlerted) {
        Toastify({ text:"Sensor de partículas apagado", duration:3000 }).showToast();
        sensorOffAlerted = true;
      }
      return;
    } else {
      sensorOffAlerted = false;
    }
    if (!data.id?.startsWith('p-')) return;

    // actualizar datos
    chartData.push(data);
    if (chartData.length > MAX_POINTS) chartData.shift();
    document.getElementById('rt-hour').textContent  = data.timestamp.slice(11,16);
    document.getElementById('rt-value').textContent = data.pm2_5.toFixed(2);

    updateChart();
    updateTable();

    // alerta de umbral
    const alarm = data.pm1_0 > THRESHOLDS.PM1_0
               || data.pm2_5 > THRESHOLDS.PM2_5
               || data.pm10  > THRESHOLDS.PM10;
    if (alarm && !alertedParticle) {
      alertedParticle = true;
      if (audioReady) { alertSound.currentTime=0; alertSound.play().catch(()=>{}); }
      Toastify({
        text:"Alerta de partículas alto",
        duration:5000, gravity:"top", position:"right",
        style:{ background:"#e63946" }
      }).showToast();
    }
    if (!alarm) alertedParticle = false;
  }

  // 8) Iniciar al cargar
  startRealtime();

  // redirige al historial de partículas
const btnStatsParticle = document.getElementById('btn-stats');
if (btnStatsParticle) {
  btnStatsParticle.addEventListener('click', () => {
    navigateTo('#/particleProbability');
  });
}


  // 9) SOS y bloqueo atrás (igual que dashboard)
  document.getElementById('btn-sos')
    .addEventListener('click',()=>document.getElementById('modal-sos').classList.remove('hidden'));
  document.getElementById('close-sos')
    .addEventListener('click',()=>document.getElementById('modal-sos').classList.add('hidden'));
  history.pushState(null,null,location.href);
  window.addEventListener('popstate',()=>history.pushState(null,null,location.href));
}
