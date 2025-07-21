import Chart from 'chart.js/auto';
import { navigateTo } from '../router.js';  // Asume que '#/particle' está mapeado

const periodFilter   = document.getElementById("periodFilter");
const resultsSection = document.getElementById("results");
const downloadBtn    = document.getElementById("downloadBtn");
const backBtn        = document.getElementById("backBtn");

const API_BASE = "http://192.168.115.1:8000/particle";

periodFilter.addEventListener("change", () => loadStats(periodFilter.value));
downloadBtn.addEventListener("click", () => {
  window.open(`${API_BASE}/pdf/${periodFilter.value}`, "_blank");
});
backBtn.addEventListener("click", () => navigateTo('#/particle'));

// Al cargar la página, lee 'today'
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
  // 1) Estadísticas métricas
  let html = `<div class="stats-grid">`;
  for (let [key, vals] of Object.entries(stats)) {
    if (key === 'count') continue;
    let rl = risk[key] != null ? `${(risk[key]*100).toFixed(1)}%` : 'N/A';
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

  // 2) Gráficas por campo (pm1_0, pm2_5, pm10)
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

  // 3) Inicialización de Chart.js
  for (let field of Object.keys(timeseries)) {
    const pts    = timeseries[field];
    const vals   = pts.map(p => p.y);
    const labels = pts.map(p => new Date(p.x).toLocaleString());

    // DONUT: seguro vs crítico (threshold sólo para pm2_5 = 35)
    const thresholds = { pm1_0: null, pm2_5: 35.0, pm10: null };
    const thr = thresholds[field];
    const safeCount = thr != null ? vals.filter(v => v <= thr).length : vals.length;
    const critCount = thr != null ? vals.filter(v => v > thr).length  : 0;

    new Chart(document.getElementById(`donut-${field}`), {
      type:'doughnut',
      data:{
        labels:['Seguro','Crítico'],
        datasets:[{
          data: [safeCount, critCount],
          backgroundColor: ['#77b4ff', '#ff7f7f']
        }]
      },
      options:{
        responsive:true,
        cutout: '70%',
        plugins:{ legend:{ position:'bottom' } }
      }
    });

    // LINE: evolución histórica
    new Chart(document.getElementById(`line-${field}`), {
      type:'line',
      data:{
        labels,
        datasets:[{
          label: field.toUpperCase(),
          data: vals,
          fill:true,
          tension:0.3,
          backgroundColor:'rgba(75,192,192,0.2)',
          borderColor:'rgba(75,192,192,1)'
        }]
      },
      options:{
        responsive:true,
        scales:{ x:{ ticks:{ maxRotation:45, minRotation:30 } } }
      }
    });
  }
}

function showResults() {
  resultsSection.style.display = 'flex';
  setTimeout(() => resultsSection.style.opacity = '1', 20);
}
