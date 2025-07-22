// File: src/js/views/dashboard.js

import Toastify from 'toastify-js';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/dashboardService.js';

const BASE_URL = "http://192.168.115.1:8081";
const POLL_MS  = 1000;

export function initDashboard() {
  // 1) Menú y navegación
  const btnMenu   = document.getElementById('btn-menu');
  const btnClose  = document.getElementById('btn-close');
  const sidebar   = document.getElementById('sidebar');
  btnMenu.addEventListener('click',  () => sidebar.classList.add('visible'));
  btnClose.addEventListener('click', () => sidebar.classList.remove('visible'));

  // Usuario y logout
  const btnUser  = document.getElementById('btn-user');
  const dropdown = document.getElementById('dropdown-user');
  btnUser.addEventListener('click', () => dropdown.classList.toggle('hidden'));
  document.getElementById('logout')
    .addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      navigateTo('#/');
    });
  let user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser')) || {}; } catch {}
  const name = user.name || 'Usuario';
  document.getElementById('user-name').textContent    = name;
  document.getElementById('welcome-name').textContent = name;

  // Sidebar activo
  document.querySelectorAll('.menu a').forEach(a => {
    if (a.getAttribute('href') === '#/dashboard') a.classList.add('active');
    a.addEventListener('click', e => {
      document.querySelector('.menu a.active')?.classList.remove('active');
      e.target.classList.add('active');
      sidebar.classList.remove('visible');
    });
  });
  document.getElementById('toggle-sensors')
    .addEventListener('click', e => e.target.parentElement.classList.toggle('open'));

  // 2) Audio y sonido de alerta
  const alertSound = document.getElementById('alert-sound');
  let audioReady = false;
  document.addEventListener('click', () => {
    if (!audioReady) {
      alertSound.play()
        .then(() => { alertSound.pause(); alertSound.currentTime = 0; audioReady = true; })
        .catch(() => {});
    }
  }, { once: true });

  // 3) Umbrales y flags de alerta
  const THRESHOLDS = {
    gas:      { LPG: 1000, CO: 50, Smoke: 50 },
    particle: { PM1_0: 12, PM2_5: 35, PM10: 50 },
    motion:   {}
  };
  let alerted = { gas:false, particle:false, motion:false };

  // 4) Variables WS y polling
  let ws, pollingId;

  function startRealtime() {
    ws = initWebSocket(onData);
    fetchLatestFrame();
    pollingId = setInterval(fetchLatestFrame, POLL_MS);
  }

  function stopRealtime() {
    if (ws) ws.close();
    clearInterval(pollingId);
  }

function onData(data) {
  if (localStorage.getItem('vigitech-system') !== 'on') return;

  const sensorStates = {
    gas:      localStorage.getItem('vigitech-gas') === 'on',
    particle: localStorage.getItem('vigitech-particle') === 'on',
    motion:   localStorage.getItem('vigitech-motion') === 'on',
  };

  // Control de cooldown por sensor apagado
  const now = Date.now();
  const alertCooldown = 5000; // 2 segundos
  const lastOffAlerts = {
    gas:      parseInt(localStorage.getItem('vigitech-alert-gas'))      || 0,
    particle: parseInt(localStorage.getItem('vigitech-alert-particle')) || 0,
    motion:   parseInt(localStorage.getItem('vigitech-alert-motion'))   || 0,
  };

  function showSensorOffToast(sensorKey, msg) {
    if (now - lastOffAlerts[sensorKey] > alertCooldown) {
      Toastify({ text: msg, duration: 4000, gravity: "top", position: "right", style: { background: "#999" } }).showToast();
      localStorage.setItem(`vigitech-alert-${sensorKey}`, now);
    }
  }

  // GAS
  if (data.id?.startsWith('g-')) {
    if (!sensorStates.gas) {
      showSensorOffToast('gas', "Sensor de gas está apagado");
      return;
    }

    document.getElementById('gas-status').innerHTML =
      `<strong>Gas:</strong><br>LPG: ${data.lpg}<br>CO: ${data.co}<br>Humo: ${data.smoke}`;
    const gasAlarm = data.lpg > THRESHOLDS.gas.LPG || data.co > THRESHOLDS.gas.CO || data.smoke > THRESHOLDS.gas.Smoke;
    if (gasAlarm && !alerted.gas) {
      alerted.gas = true;
      if (audioReady) { alertSound.currentTime = 0; alertSound.play().catch(() => {}); }
      Toastify({ text: "Alerta de gas alto", duration: 5000, gravity: "top", position: "right", style: { background: "#e63946" } }).showToast();
    }
    if (!gasAlarm) alerted.gas = false;
  }

  // PARTÍCULAS
  if (data.id?.startsWith('p-')) {
    if (!sensorStates.particle) {
      showSensorOffToast('particle', "Sensor de partículas está apagado");
      return;
    }

    document.getElementById('particle-status').innerHTML =
      `<strong>Partículas:</strong><br>PM1.0: ${data.pm1_0}<br>PM2.5: ${data.pm2_5}<br>PM10: ${data.pm10}`;
    const partAlarm = data.pm1_0 > THRESHOLDS.particle.PM1_0 || data.pm2_5 > THRESHOLDS.particle.PM2_5 || data.pm10 > THRESHOLDS.particle.PM10;
    if (partAlarm && !alerted.particle) {
      alerted.particle = true;
      if (audioReady) { alertSound.currentTime = 0; alertSound.play().catch(() => {}); }
      Toastify({ text: "Alerta de partículas alto", duration: 5000, gravity: "top", position: "right", style: { background: "#e63946" } }).showToast();
    }
    if (!partAlarm) alerted.particle = false;
  }

  // MOVIMIENTO
  if (data.id?.startsWith('motion')) {
    if (!sensorStates.motion) {
      showSensorOffToast('motion', "Sensor de movimiento está apagado");
      return;
    }

    const estado = data.motion_detected ? 'Detectado' : 'Sin movimiento';
    document.getElementById('motion-status').innerHTML =
      `<strong>Movimiento:</strong><br>Estado: ${estado}<br>Intensidad: ${data.intensity ?? '–'}`;
    const motionAlarm = data.motion_detected;
    if (motionAlarm && !alerted.motion) {
      alerted.motion = true;
      if (audioReady) { alertSound.currentTime = 0; alertSound.play().catch(() => {}); }
      Toastify({ text: "Se detectó movimiento", duration: 5000, gravity: "top", position: "right", style: { background: "#e63946" } }).showToast();
    }
    if (!motionAlarm) alerted.motion = false;
  }
}



  // 6) Cámara polling
  const streamImg = document.getElementById('camera-stream');
  async function fetchLatestFrame() {
    if (localStorage.getItem('vigitech-system') !== 'on') return;
    try {
      const res = await fetch(`${BASE_URL}/sensor/stream?limit=1`);
      const arr = await res.json();
      if (arr.length) {
        streamImg.src = `${arr[0].image_path}?t=${Date.now()}`;
      }
    } catch {};
  }

  // 7) Switch de sistema
  const systemToggle = document.getElementById('system-toggle');
  const systemLabel  = document.getElementById('system-label');
  let sysState = localStorage.getItem('vigitech-system') || 'on';
  systemToggle.checked = sysState === 'on';
  systemLabel.textContent = `Sistema: ${sysState.toUpperCase()}`;

  async function setSystem(state) {
    try {
      await fetch(`${BASE_URL}/command/system`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: state })
      });
      localStorage.setItem('vigitech-system', state);
      systemLabel.textContent = `Sistema: ${state.toUpperCase()}`;
      Toastify({ text: `Sistema ${state==='on'? 'encendido':'apagado'}`, duration: 3000, gravity: "top", position: "right", style: { background: state==='on'? "#4caf50":"#e63946" } }).showToast();
      
      if (state === 'off') {
        stopRealtime();
      } else {
        // Al reactivar, resetear flags de alerta y reiniciar realtime
        alerted = { gas:false, particle:false, motion:false };
        startRealtime();
      }
    } catch (err) {
      console.error("Error cambiando estado del sistema", err);
    }
  }
  systemToggle.addEventListener('change', e => setSystem(e.target.checked ? 'on' : 'off'));

  // 8) Iniciar por primera vez
  startRealtime();

  // 9) SOS y bloqueo de atrás
  document.getElementById('btn-sos')
    .addEventListener('click', () => document.getElementById('modal-sos').classList.remove('hidden'));
  document.getElementById('close-sos')
    .addEventListener('click', () => document.getElementById('modal-sos').classList.add('hidden'));
  history.pushState(null, null, location.href);
  window.addEventListener('popstate', () => history.pushState(null, null, location.href));
}
