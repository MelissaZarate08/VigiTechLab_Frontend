import Toastify from 'toastify-js';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/wsService.js';

const BASE_URL = "https://vigitech-data.namixcode.cc";
const POLL_MS  = 1000;

export function initDashboard() {
  const btnMenu  = document.getElementById('btn-menu');
  const btnClose = document.getElementById('btn-close');
  const sidebar  = document.getElementById('sidebar');
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
  try { user = JSON.parse(localStorage.getItem('currentUser')) || {}; } catch {}
  const name = user.name || 'Usuario';
  document.getElementById('user-name').textContent    = name;
  document.getElementById('welcome-name').textContent = name;

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

  const alertSound = document.getElementById('alert-sound');
  let audioReady = false;
  document.addEventListener('click', () => {
    if (!audioReady) {
      alertSound.play()
        .then(() => { alertSound.pause(); alertSound.currentTime = 0; audioReady = true; })
        .catch(() => {});
    }
  }, { once: true });

  const THRESHOLDS = {
    gas:      { LPG:1000, CO:50, Smoke:50 },
    particle: { PM1_0:12, PM2_5:35, PM10:50 },
    motion:   {}
  };
  let alerted = { gas:false, particle:false, motion:false };

  let wsClient, pollingId;
  function startRealtime() {
    wsClient   = initWebSocket(onData);
    fetchLatestFrame();
    pollingId  = setInterval(fetchLatestFrame, POLL_MS);
  }
  function stopRealtime() {
    wsClient?.close();
    clearInterval(pollingId);
  }

  function onData(data) {
    if (localStorage.getItem('vigitech-system') !== 'on') return;

    const gasEl    = document.getElementById('gas-status'),
          partEl   = document.getElementById('particle-status'),
          motionEl = document.getElementById('motion-status');
    if (!gasEl || !partEl || !motionEl) return;

    const states = {
      gas:      localStorage.getItem('vigitech-gas') === 'on',
      particle: localStorage.getItem('vigitech-particle') === 'on',
      motion:   localStorage.getItem('vigitech-motion') === 'on'
    };

    const now      = Date.now(),
          cooldown = 5000;
    const last = {
      gas:      +localStorage.getItem('vigitech-alert-gas')      || 0,
      particle: +localStorage.getItem('vigitech-alert-particle') || 0,
      motion:   +localStorage.getItem('vigitech-alert-motion')   || 0,
    };
    function offToast(key, msg) {
      if (now - last[key] > cooldown) {
        Toastify({ text: msg, duration:4000, gravity:"top", position:"right", style:{background:"#999"} }).showToast();
        localStorage.setItem(`vigitech-alert-${key}`, now);
      }
    }

    // — GAS —
    if (data.id?.startsWith('g-')) {
      if (!states.gas) { offToast('gas', "Sensor de gas está apagado"); return; }
      gasEl.innerHTML = `<strong>Gas:</strong><br>LPG: ${data.lpg}<br>CO: ${data.co}<br>Humo: ${data.smoke}`;
      const alarm = data.lpg > THRESHOLDS.gas.LPG || data.co > THRESHOLDS.gas.CO || data.smoke > THRESHOLDS.gas.Smoke;
      if (alarm && !alerted.gas) {
        alerted.gas = true;
        if (audioReady) { alertSound.currentTime = 0; alertSound.play().catch(() => {}); }
        Toastify({ text:"Alerta de gas alto", duration:5000, gravity:"top", position:"right", style:{background:"#e63946"} }).showToast();
      }
      if (!alarm) alerted.gas = false;
    }

    if (data.id?.startsWith('p-')) {
      if (!states.particle) { offToast('particle', "Sensor de partículas está apagado"); return; }
      partEl.innerHTML = `<strong>Partículas:</strong><br>PM1.0: ${data.pm1_0}<br>PM2.5: ${data.pm2_5}<br>PM10: ${data.pm10}`;
      const alarm = data.pm1_0 > THRESHOLDS.particle.PM1_0
                 || data.pm2_5 > THRESHOLDS.particle.PM2_5
                 || data.pm10  > THRESHOLDS.particle.PM10;
      if (alarm && !alerted.particle) {
        alerted.particle = true;
        if (audioReady) { alertSound.currentTime = 0; alertSound.play().catch(() => {}); }
        Toastify({ text:"Alerta de partículas alto", duration:5000, gravity:"top", position:"right", style:{background:"#e63946"} }).showToast();
      }
      if (!alarm) alerted.particle = false;
    }

    if (data.id?.startsWith('motion')) {
      if (!states.motion) { offToast('motion', "Sensor de movimiento está apagado"); return; }
      const estado = data.motion_detected ? 'Detectado' : 'Sin movimiento';
      motionEl.innerHTML = `<strong>Movimiento:</strong><br>Estado: ${estado}<br>Intensidad: ${data.intensity ?? '–'}`;
      if (data.motion_detected && !alerted.motion) {
        alerted.motion = true;
        if (audioReady) { alertSound.currentTime = 0; alertSound.play().catch(() => {}); }
        Toastify({ text:"Se detectó movimiento", duration:5000, gravity:"top", position:"right", style:{background:"#e63946"} }).showToast();
      }
      if (!data.motion_detected) alerted.motion = false;
    }
  }

  const streamImg = document.getElementById('camera-stream');
  async function fetchLatestFrame() {
    if (localStorage.getItem('vigitech-system') !== 'on') return;
    try {
      const res = await fetch(`${BASE_URL}/sensor/stream?limit=1`);
      const arr = await res.json();
      if (arr.length && streamImg) {
        streamImg.src = `${arr[0].image_path}?t=${Date.now()}`;
      }
    } catch {}
  }

  const offToastVisible = { gas: false, particle: false, motion: false };
  const ALERT_COOLDOWN = 5000; // ms

  function showSensorOffToast(sensorKey, msg) {
    if (offToastVisible[sensorKey]) return;
    offToastVisible[sensorKey] = true;
    Toastify({
      text: msg,
      duration: 4000,
      gravity: "top",
      position: "right",
      style: { background: "#999" },
      onHide: () => setTimeout(() => {
        offToastVisible[sensorKey] = false;
      }, ALERT_COOLDOWN)
    }).showToast();
  }


  const systemToggle = document.getElementById('system-toggle'),
        systemLabel  = document.getElementById('system-label');
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
      Toastify({
        text: `Sistema ${state==='on'?'encendido':'apagado'}`,
        duration:3000, gravity:"top", position:"right",
        style:{ background: state==='on'? "#4caf50":"#e63946" }
      }).showToast();

      if (state === 'off') {
        stopRealtime();
      } else {
        alerted = { gas:false, particle:false, motion:false };
        startRealtime();
      }
    } catch (err) {
      console.error("Error cambiando estado del sistema", err);
    }
  }
  systemToggle.addEventListener('change', e => setSystem(e.target.checked ? 'on' : 'off'));

  startRealtime();

 const sosModal = document.getElementById('modal-sos');
 document.getElementById('btn-sos').onclick = () => sosModal.classList.toggle('hidden');

  history.pushState(null,null,location.href);
  window.addEventListener('popstate', ()=> history.pushState(null,null,location.href));
}
