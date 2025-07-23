import Chart from 'chart.js/auto';
import Toastify from 'toastify-js';
import { navigateTo } from '../router.js';
import { initWebSocket } from '../../api/wsService.js';

const BASE_URL       = "http://vigitech-data.namixcode.cc:8081";
const MAX_POINTS     = 8;
const ALERT_COOLDOWN = 5000;

export function initCamMotionSensors() {
  document.getElementById('btn-menu').onclick   = () => document.getElementById('sidebar').classList.add('visible');
  document.getElementById('btn-close').onclick  = () => document.getElementById('sidebar').classList.remove('visible');
  document.getElementById('btn-user').onclick   = () => document.getElementById('dropdown-user').classList.toggle('hidden');
  document.getElementById('logout').onclick     = () => { localStorage.clear(); navigateTo('#/'); };
  try {
    const u = JSON.parse(localStorage.getItem('currentUser'))||{};
    document.getElementById('user-name').textContent = u.name||'Usuario';
  } catch {}

  document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
  document.querySelector('.menu a[href="#/camMotion"]').classList.add('active');
  document.getElementById('toggle-sensors').onclick = e => e.target.parentElement.classList.toggle('open');
  document.getElementById('btn-gallery').onclick     = () => navigateTo('#/galeria');

  let wsClient = null;
  function startRealtime() { wsClient = initWebSocket(onData); }
  function stopRealtime()  { wsClient?.close(); }

  const sysT  = document.getElementById('system-toggle');
  const sysL  = document.getElementById('system-label');
  let sysState = localStorage.getItem('vigitech-system') || 'on';
  sysT.checked   = sysState==='on';
  sysL.textContent = `Sistema: ${sysState.toUpperCase()}`;
  sysT.onchange = async () => {
    const state = sysT.checked ? 'on':'off';
    await fetch(`${BASE_URL}/command/system`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action: state })
    });
    localStorage.setItem('vigitech-system', state);
    sysL.textContent = `Sistema: ${state.toUpperCase()}`;
    const tog    = document.getElementById('cam-motion-toggle');
    const label  = document.getElementById('cam-motion-label');
    tog.disabled = state==='off';
    label.style.opacity = state==='off'?0.5:1;
    state==='off'? stopRealtime(): startRealtime();
    Toastify({
      text:`Sistema ${state==='on'?'encendido':'apagado'}`, duration:3000,
      gravity:"top", position:"right",
      style:{ background: state==='on'? "#4caf50":"#e63946" }
    }).showToast();
  };

  const cmT   = document.getElementById('cam-motion-toggle');
  const cmL   = document.getElementById('cam-motion-label');
  let cmState = localStorage.getItem('vigitech-camMotion') || 'on';
  cmT.checked  = cmState==='on';
  cmL.textContent = `Cámara/Movimiento: ${cmState.toUpperCase()}`;
  if(sysState==='off'){ cmT.disabled=true; cmL.style.opacity=0.5; }
  cmT.onchange = async () => {
    const s = cmT.checked?'on':'off';
    await fetch(`${BASE_URL}/command/sensor`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ sensor:'camera', action:s })
    });
    localStorage.setItem('vigitech-camMotion', s);
    cmL.textContent = `Cámara/Movimiento: ${s.toUpperCase()}`;
    Toastify({
      text:`Sensor cámara/mov ${s==='on'?'activado':'desactivado'}`, duration:3000,
      gravity:"top", position:"right",
      style:{ background: s==='on'? "#4caf50":"#e63946" }
    }).showToast();
  };

  let alertedHigh = false;
  let lastOffToast = 0;
  const alertSound = document.getElementById('alert-sound');
  let audioReady = false;
  document.addEventListener('click', () => {
    if(!audioReady){
      alertSound.play()
        .then(()=>{ alertSound.pause(); alertSound.currentTime=0; audioReady=true; })
        .catch(()=>{});
    }
  }, { once:true });

  const canvas   = document.getElementById('camMotionChart');
  const tableEl  = document.getElementById('camMotionTable');
  const btnChart = document.getElementById('btn-chart');
  const btnTable = document.getElementById('btn-table');
  const ctx      = canvas.getContext('2d');
  let chart      = null, chartData = [];
  function updateChart(){
    const labels    = chartData.map(d=>d.timestamp.slice(11,16));
    const intensity = chartData.map(d=>d.intensity);
    if(chart) chart.destroy();
    chart = new Chart(ctx,{
      type:'line',
      data:{ labels, datasets:[{ label:'Intensidad', data:intensity, tension:0.3, fill:false }] }
    });
  }
  function updateTable(){
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    chartData.forEach(d=>
      tbody.insertAdjacentHTML('beforeend',`
        <tr>
          <td>${d.timestamp.slice(11,16)}</td>
          <td>${d.motion_detected?'Sí':'No'}</td>
          <td>${d.intensity.toFixed(2)}</td>
        </tr>`
      )
    );
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

  function onData(data){
    if(localStorage.getItem('vigitech-system')!=='on') return;
    if(localStorage.getItem('vigitech-camMotion')!=='on'){
      const now = Date.now();
      if(now - lastOffToast > ALERT_COOLDOWN){
        Toastify({ text:"Sensor cámara/mov apagado", duration:3000 }).showToast();
        lastOffToast = now;
      }
      return;
    }
    if(!data.id?.startsWith('motion')) return;

    chartData.push(data);
    if(chartData.length>MAX_POINTS) chartData.shift();
    const rtHourEl = document.getElementById('rt-hour');
    const rtValEl  = document.getElementById('rt-value');
    if (rtHourEl && rtValEl) {
      rtHourEl .textContent = data.timestamp.slice(11,16);
      rtValEl  .textContent = data.motion_detected ? 'Detectado' : '–';
    }
    updateChart();
    updateTable();


    if(data.motion_detected && !alertedHigh){
      alertedHigh = true;
      if(audioReady){ alertSound.currentTime=0; alertSound.play().catch(()=>{}); }
      Toastify({
        text:"Movimiento detectado", duration:5000,
        gravity:"top", position:"right",
        style:{ background:"#e63946" }
      }).showToast();
    }
    if(!data.motion_detected) alertedHigh = false;
  }

  startRealtime();

 const sosModal = document.getElementById('modal-sos');
 document.getElementById('btn-sos').onclick = () => sosModal.classList.toggle('hidden');
  document.getElementById('btn-stats').onclick = ()=> navigateTo('#/camMotionProbability');

  history.pushState(null,null,location.href);
  window.addEventListener('popstate', ()=> history.pushState(null,null,location.href));
}
