import { navigateTo } from '../router.js';
import Chart from 'chart.js/auto';  

const periodFilter   = document.getElementById("periodFilter");
const resultsSection = document.getElementById("results");
const downloadBtn    = document.getElementById("downloadBtn");
const backBtn        = document.getElementById("backBtn");

const API_BASE = "https://vigitech-analisis.namixcode.cc/particle";

periodFilter.addEventListener("change", () => loadReport(periodFilter.value));
downloadBtn.addEventListener("click", () => {
  window.open(`${API_BASE}/pdf/${periodFilter.value}`, "_blank");
});
backBtn.addEventListener("click", () => navigateTo("#/particle"));

window.addEventListener("DOMContentLoaded", () => loadReport("today"));

async function loadReport(period) {
  resultsSection.style.display = "none";
  try {
    const res = await fetch(`${API_BASE}/report/${period}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${res.status}`);
    }
    const { label, stats, risk, times_label, series } = await res.json();
    renderReport(label, stats, risk, times_label, series);
  } catch (e) {
    resultsSection.innerHTML = `
      <p style="color:red; text-align:center;">
        ${e.message}
      </p>`;
    showResults();
  }
}

function renderReport(label, stats, risk, times, series) {

  const periodEl = document.createElement("h2");
  periodEl.id = "period-label";
  periodEl.textContent = label;

  let html = `<div class="stats-grid">`;
  for (let [field, vals] of Object.entries(stats)) {
    if (field === "count") continue;
    const pct = risk[field] != null
      ? `${(risk[field] * 100).toFixed(1)}%`
      : "N/A";
    html += `
      <div class="stats-card">
        <h3>${field.toUpperCase()}</h3>
        <p><strong>Media:</strong> ${vals.mean.toFixed(2)}</p>
        <p><strong>Mín:</strong> ${vals.min.toFixed(2)}</p>
        <p><strong>Máx:</strong> ${vals.max.toFixed(2)}</p>
        <p><strong>Riesgo:</strong> ${pct}</p>
      </div>
    `;
  }
  html += `</div>`;

  for (let key of Object.keys(series)) {
    const title = key.replace(/_/g, " ").toUpperCase();
    html += `
      <div class="metric-block">
        <div class="metric-header">${title}</div>
        <div class="chart-container">
          <canvas id="chart_${key}" width="400" height="200"></canvas>
        </div>
      </div>
    `;
  }

  resultsSection.innerHTML = "";
  resultsSection.appendChild(periodEl);
  resultsSection.insertAdjacentHTML("beforeend", html);
  showResults();

  for (let [key, data] of Object.entries(series)) {
    const ctx = document.getElementById(`chart_${key}`).getContext('2d');
    const isBinary = data.every(v => v === 0 || v === 1);

    if (isBinary) {
      const crit = data.filter(v => v === 1).length;
      const safe = data.length - crit;
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Crítico','Seguro'],
          datasets: [{
            data: [crit, safe],
            backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(75, 192, 192, 0.6)']
          }]
        },
        options: { responsive: true }
      });
    } else {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: times, 
          datasets: [{
            label: key.toUpperCase(),
            data,
            fill: false,
            tension: 0.1,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: 'Fecha / Hora' } },
            y: { title: { display: true, text: key.toUpperCase() } }
          }
        }
      });
    }
  }
}

function showResults() {
  resultsSection.style.display = "flex";
  resultsSection.style.opacity = "0";
  setTimeout(() => resultsSection.style.opacity = "1", 20);
}
