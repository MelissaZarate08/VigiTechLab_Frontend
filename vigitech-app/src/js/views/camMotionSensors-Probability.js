import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns'; // Para ejes de tiempo
import { navigateTo } from '../router.js';

const periodFilter   = document.getElementById('periodFilter');
const downloadBtn    = document.getElementById('downloadBtn');
const backBtn        = document.getElementById('backBtn');
const resultsSection = document.getElementById('results');
const periodLabel    = document.getElementById('period-label');

// Apunta a localhost (asegúrate de que tu FastAPI esté corriendo aquí)
const API_BASE = 'http://192.168.115.1:8000/correlation';

periodFilter.addEventListener('change', () => loadData(periodFilter.value));
downloadBtn.addEventListener('click', () => {
  window.open(`${API_BASE}/pdf/${periodFilter.value}`, '_blank');
});
backBtn.addEventListener('click', () => navigateTo('#/camMotion'));

window.addEventListener('DOMContentLoaded', () => loadData('today'));

async function loadData(period) {
  // Ocultamos resultados antes de cada petición
  resultsSection.style.display = 'none';
  try {
    const res = await fetch(`${API_BASE}/${period}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${res.status}`);
    }
    const { label, stats, points } = await res.json();
    renderAll(label, stats, points);
  } catch (e) {
    resultsSection.innerHTML =
      `<p style="color:red; text-align:center;">${e.message}</p>`;
    showResults();
  }
}

function renderAll(label, stats, points) {
  // 1) Mostrar label de periodo
  periodLabel.textContent = label;

  // 2) Estadísticas
  const { mean_intensity, std_intensity, mean_photos, std_photos } = stats;
  let html = `
    <div class="stats-grid">
      <div class="stats-card">
        <h3>INTENSIDAD</h3>
        <p><strong>Media:</strong> ${mean_intensity?.toFixed(2) ?? 'N/A'}</p>
        <p><strong>Desv.:</strong> ${std_intensity?.toFixed(2) ?? 'N/A'}</p>
      </div>
      <div class="stats-card">
        <h3>FOTOS</h3>
        <p><strong>Media:</strong> ${mean_photos?.toFixed(2) ?? 'N/A'}</p>
        <p><strong>Desv.:</strong> ${std_photos?.toFixed(2) ?? 'N/A'}</p>
      </div>
    </div>

    <div class="metric-block">
      <div class="metric-header">Movimiento vs Cámara</div>
      <div class="chart-container"><canvas id="chart-intensity"></canvas></div>
      <div class="chart-container"><canvas id="chart-photos"></canvas></div>
      <div class="chart-container"><canvas id="chart-corr"></canvas></div>
    </div>
  `;
  resultsSection.innerHTML = html;
  showResults();

  // 3) Preparar datos
  const times = points.map(p => new Date(p.timestamp));
  const ints  = points.map(p => p.intensity);
  const phots = points.map(p => p.photo);

  // 4) Línea: Intensidad
  new Chart(document.getElementById('chart-intensity'), {
    type: 'line',
    data: {
      labels: times,
      datasets: [{
        label: 'Intensidad',
        data: ints,
        tension: 0.3,
        fill: false,
        borderColor: '#4e79a7',
        pointBackgroundColor: '#4e79a7'
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: { tooltipFormat: 'dd/MM/yyyy HH:mm' },
          title: { display: true, text: 'Fecha / Hora' }
        },
        y: {
          title: { display: true, text: 'Intensidad' }
        }
      }
    }
  });

  // 5) Línea: Fotos
  new Chart(document.getElementById('chart-photos'), {
    type: 'line',
    data: {
      labels: times,
      datasets: [{
        label: 'Fotos',
        data: phots,
        tension: 0.3,
        fill: false,
        borderColor: '#f28e2b',
        pointBackgroundColor: '#f28e2b'
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { type: 'time' },
        y: {
          title: { display: true, text: 'Fotos (0/1)' },
          ticks: { stepSize: 1, beginAtZero: true }
        }
      }
    }
  });

  // 6) Overlay: Intensidad + Fotos
  new Chart(document.getElementById('chart-corr'), {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Intensidad (línea)',
          data: times.map((t,i) => ({ x: t, y: ints[i] })),
          showLine: true,
          borderColor: '#59a14f',
          tension: 0.3,
          fill: false,
          pointRadius: 0
        },
        {
          label: 'Fotos (puntos)',
          data: times.map((t,i) => ({ x: t, y: phots[i] })),
          pointBackgroundColor: '#e15759',
          pointRadius: 5,
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: { tooltipFormat: 'dd/MM/yyyy HH:mm' },
          title: { display: true, text: 'Fecha / Hora' }
        },
        y: {
          title: { display: true, text: 'Valor' }
        }
      }
    }
  });
}

// despliega con animación (igual que en las otras vistas)
function showResults() {
  resultsSection.style.display = 'flex';
  resultsSection.style.opacity = '0';
  setTimeout(() => {
    resultsSection.style.opacity = '1';
  }, 20);
}
