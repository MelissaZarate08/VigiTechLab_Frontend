import Chart from 'chart.js/auto';
import { navigateTo } from '../router.js'; 

const periodFilter    = document.getElementById("periodFilter");
const resultsSection  = document.getElementById("results");
const downloadBtn     = document.getElementById("downloadBtn");
const backBtn         = document.getElementById("backBtn");

const API_BASE = "http://vigitech-analisis.namixcode.cc:8000/gas";

periodFilter.addEventListener("change", () => loadStats(periodFilter.value));
downloadBtn.addEventListener("click", () => {
  window.open(`${API_BASE}/pdf/${periodFilter.value}`, "_blank");
});
backBtn.addEventListener("click", () => navigateTo('#/gas')); 

window.addEventListener("DOMContentLoaded", () => loadStats("today"));

async function loadStats(period) {
  try {
    const res = await fetch(`${API_BASE}/report/${period}`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    renderResults(data);
  } catch (e) {
    resultsSection.innerHTML = `<p style="color:red; text-align:center;">${e.message}</p>`;
    showResults();
  }
}

function renderResults({ label, stats, risk, timeseries }) {
  let html = `<div class="stats-grid">`;
  for (let [key, vals] of Object.entries(stats)) {
    if (key === 'count') continue;
    let rl = risk[key]!=null ? `${(risk[key]*100).toFixed(1)}%` : 'N/A';
    html += `
      <div class="stats-card">
        <h3>${key.toUpperCase()}</h3>
        <p><strong>Media:</strong> ${vals.mean.toFixed(2)}</p>
        <p><strong>Mín:</strong> ${vals.min.toFixed(2)}</p>
        <p><strong>Máx:</strong> ${vals.max.toFixed(2)}</p>
        <p><strong>Riesgo:</strong> ${rl}</p>
      </div>
    `;
  }
  html += `</div>`;

  for (let field of Object.keys(timeseries)) {
    html += `
      <div class="metric-block">
        <div class="metric-header">${field.toUpperCase()} (${label})</div>
        <div class="donut-container">
          <canvas id="donut-${field}"></canvas>
        </div>
        <div class="chart-container">
          <canvas id="line-${field}"></canvas>
        </div>
      </div>
    `;
  }

  resultsSection.innerHTML = html;
  showResults();

  for (let field of Object.keys(timeseries)) {
    const pts = timeseries[field];
    const vals = pts.map(p=>p.y);
    const labels = pts.map(p=>new Date(p.x).toLocaleString());

    const thr = { lpg:800, co:50, smoke:300 }[field];
    const safeCount = vals.filter(v=>v<=thr).length;
    const critCount = vals.filter(v=>v> thr).length;
    new Chart(document.getElementById(`donut-${field}`), {
      type:'doughnut',
      data:{
        labels:['Seguro','Crítico'],
        datasets:[{ data:[safeCount,critCount], backgroundColor:['#77b4ff','#ff7f7f'] }]
      },
      options:{ responsive:true, plugins:{legend:{position:'bottom'}} }
    });

    new Chart(document.getElementById(`line-${field}`), {
      type:'line',
      data:{ labels, datasets:[{
        label: field.toUpperCase(),
        data: vals,
        fill:true,
        tension:0.3,
        backgroundColor:'rgba(75,192,192,0.2)',
        borderColor:'rgba(75,192,192,1)'
      }]},
      options:{ responsive:true, scales:{ x:{ticks:{maxRotation:45,minRotation:30}} } }
    });
  }
}

function showResults() {
  resultsSection.style.display = 'flex';
  setTimeout(()=> resultsSection.style.opacity = '1', 20);
}
