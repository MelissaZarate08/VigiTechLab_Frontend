
const periodFilter = document.getElementById("periodFilter");
const statsCards = document.getElementById("stats-cards");
const chartsContainer = document.getElementById("charts");

const API_BASE = "http://192.168.4.1:8000/gas"; // cambia si es en producción

periodFilter.addEventListener("change", () => {
  loadStats(periodFilter.value);
});

window.addEventListener("DOMContentLoaded", () => {
  loadStats("today");
});

function loadStats(period) {
  fetch(`${API_BASE}/report/${period}`)
    .then((res) => {
      if (!res.ok) throw new Error("Error al obtener datos");
      return res.json();
    })
    .then((data) => {
      displayStats(data);
      drawCharts(data.timeseries);
    })
    .catch((err) => {
      statsCards.innerHTML = `<p style="color: red;">${err.message}</p>`;
      chartsContainer.innerHTML = "";
    });
}

function displayStats(data) {
  statsCards.innerHTML = "";
  const { stats, risk, label } = data;

  for (const [key, values] of Object.entries(stats)) {
    if (key === "count") continue;
    const riskLevel = risk[key] !== undefined ? `${(risk[key] * 100).toFixed(1)}%` : "N/A";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${key.toUpperCase()}</h3>
      <p><strong>Media:</strong> ${values.mean.toFixed(2)}</p>
      <p><strong>Mín:</strong> ${values.min.toFixed(2)}</p>
      <p><strong>Máx:</strong> ${values.max.toFixed(2)}</p>
      <p><strong>Riesgo:</strong> ${riskLevel}</p>
    `;
    statsCards.appendChild(card);
  }
}

function drawCharts(timeseries) {
  chartsContainer.innerHTML = "";
  for (const [key, points] of Object.entries(timeseries)) {
    const canvas = document.createElement("canvas");
    canvas.id = `chart-${key}`;
    chartsContainer.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const labels = points.map(p => new Date(p.x).toLocaleString());
    const values = points.map(p => p.y);

    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: key.toUpperCase(),
          data: values,
          borderColor: "rgba(75,192,192,1)",
          backgroundColor: "rgba(75,192,192,0.2)",
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            ticks: {
              maxRotation: 60,
              minRotation: 45
            }
          }
        }
      }
    });
  }
}

const downloadBtn = document.getElementById("downloadBtn");

downloadBtn.addEventListener("click", () => {
  const period = periodFilter.value;
  const downloadUrl = `${API_BASE}/pdf/${period}`;
  window.open(downloadUrl, "_blank");
});
