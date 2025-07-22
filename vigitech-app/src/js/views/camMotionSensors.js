// File: src/js/views/camMotionSensors.js

import Chart from 'chart.js/auto';
import Toastify from 'toastify-js';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/dashboardService.js';

const BASE_URL   = "http://192.168.115.1:8081";
const MAX_POINTS = 8;

export function initCamMotionSensors() {
  // 1) Menú, usuario y sidebar
  const btnMenu   = document.getElementById('btn-menu');
  const btnClose  = document.getElementById('btn-close');
  const sidebar   = document.getElementById('sidebar');
  btnMenu.addEventListener('click', () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));
  document.getElementById('btn-user')
    .addEventListener('click', () => document.getElementById('dropdown-user').classList.toggle('hidden'));
  document.getElementById('logout')
    .addEventListener('click', () => {
      localStorage.clear();
      navigateTo('#/');
    });
  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser')) || {}; } catch {}
  document.getElementById('user-name').textContent = user.name || 'Usuario';
  document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
  document.querySelector('.menu a[href="#/camMotion"]').classList.add('active');
  document.getElementById('toggle-sensors')
    .addEventListener('click', e => e.target.parentElement.classList.toggle('open'));

  // 2) Botón galería
  document.getElementById('btn-gallery')
    .addEventListener('click', () => navigateTo('#/galeria'));

  // 3) Control WebSocket
  let ws;
  function startRealtime() {
    ws = initWebSocket(onData);
  }
  function stopRealtime() {
    if (ws) ws.close();
  }

  // 4) Switch Sistema Completo
  const systemToggle = document.getElementById('system-toggle');
  const systemLabel  = document.getElementById('system-label');
  let sysState = localStorage.getItem('vigitech-system') || 'on';
  systemToggle.checked = (sysState === 'on');
  systemLabel.textContent = `Sistema: ${sysState.toUpperCase()}`;
  systemToggle.addEventListener('change', async () => {
    const state = systemToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/system`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ action: state })
    });
    localStorage.setItem('vigitech-system', state);
    systemLabel.textContent = `Sistema: ${state.toUpperCase()}`;
    camMotionToggle.disabled = state === 'off';
    camMotionLabel.style.opacity = state === 'off' ? '0.5' : '1';
    if (state === 'off') stopRealtime(); else startRealtime();
    Toastify({
      text: `Sistema ${state==='on'?'encendido':'apagado'}`,
      duration:3000, gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  });

  // 5) Switch Cámara/Movimiento
  const camMotionToggle = document.getElementById('cam-motion-toggle');
  const camMotionLabel  = document.getElementById('cam-motion-label');
  let cmState = localStorage.getItem('vigitech-camMotion') || 'on';
  camMotionToggle.checked = (cmState === 'on');
  camMotionLabel.textContent = `Cámara/Movimiento: ${cmState.toUpperCase()}`;
  if (sysState === 'off') {
    camMotionToggle.disabled = true;
    camMotionLabel.style.opacity = '0.5';
  }
  camMotionToggle.addEventListener('change', async () => {
    const state = camMotionToggle.checked ? 'on' : 'off';
    await fetch(`${BASE_URL}/command/sensor`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ sensor: 'camera', action: state })
    });
    localStorage.setItem('vigitech-camMotion', state);
    camMotionLabel.textContent = `Cámara/Movimiento: ${state.toUpperCase()}`;
    Toastify({
      text: `Sensor cámara/mov ${state==='on'?'activado':'desactivado'}`,
      duration:3000, gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  });

  // 6) Umbrales y alertas de movimiento
  let alertedMotion    = false;
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

  // 7) Configurar gráfico y tabla
  const canvas    = document.getElementById('camMotionChart');
  const tableEl   = document.getElementById('camMotionTable');
  const btnChart  = document.getElementById('btn-chart');
  const btnTable  = document.getElementById('btn-table');
  const ctx       = canvas.getContext('2d');
  let chart       = null;
  let chartData   = [];

  function updateChart() {
    const labels    = chartData.map(d => d.timestamp.slice(11,16));
    const intensity = chartData.map(d => d.intensity);
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label:'Intensidad', data:intensity, tension:0.3, fill:false }]
      }
    });
  }

  function updateTable() {
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    chartData.slice().reverse().forEach(d => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${d.timestamp.slice(11,16)}</td>
          <td>${d.motion_detected?'Sí':'No'}</td>
          <td>${d.intensity.toFixed(2)}</td>
        </tr>`);
    });
  }

  btnChart.addEventListener('click', () => {
    canvas.classList.remove('hidden');
    tableEl.classList.add('hidden');
    updateChart();
  });
  btnTable.addEventListener('click', () => {
    tableEl.classList.remove('hidden');
    canvas.classList.add('hidden');
    updateTable();
  });

  // 8) Callback WebSocket
  function onData(data) {
    if (localStorage.getItem('vigitech-system') !== 'on') return;
    if (localStorage.getItem('vigitech-camMotion') !== 'on') {
      if (!sensorOffAlerted) {
        Toastify({ text:"Sensor cámara/mov apagado", duration:3000 }).showToast();
        sensorOffAlerted = true;
      }
      return;
    } else {
      sensorOffAlerted = false;
    }
    if (!data.id?.startsWith('motion')) return;

    chartData.push(data);
    if (chartData.length > MAX_POINTS) chartData.shift();
    document.getElementById('rt-hour').textContent  = data.timestamp.slice(11,16);
    document.getElementById('rt-value').textContent = data.motion_detected?'Detectado':'–';
    updateChart(); updateTable();

    if (data.motion_detected && !alertedMotion) {
      alertedMotion = true;
      if (audioReady) { alertSound.currentTime=0; alertSound.play().catch(()=>{}); }
      Toastify({
        text:"Movimiento detectado",
        duration:5000, gravity:"top", position:"right",
        style:{ background:"#e63946" }
      }).showToast();
    }
    if (!data.motion_detected) alertedMotion = false;
  }

  // 9) Arrancar al cargar
  startRealtime();

  // 10) SOS modal y bloqueo atrás
  document.getElementById('btn-sos')
    .addEventListener('click', ()=> document.getElementById('modal-sos').classList.remove('hidden'));
  document.getElementById('close-sos')
    .addEventListener('click', ()=> document.getElementById('modal-sos').classList.add('hidden'));
  history.pushState(null,null,location.href);
  window.addEventListener('popstate', ()=> history.pushState(null,null,location.href));
}
