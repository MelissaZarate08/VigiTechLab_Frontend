import { routes } from './router.js';

// Mapea cada vista con su hoja de estilo correspondiente
const viewStyles = {
  '#/':           '/src/css/home.css',
  '#/login':      '/src/css/login.css',
  '#/register':   '/src/css/register.css',
  '#/dashboard':  '/src/css/dashboard.css',
  '#/configSensor':'/src/css/configSensor.css',
  '#/gas':        '/src/css/gasSensor.css',
  '#/particle':    '/src/css/particleSensor.css', 
  '#/camMotion':    '/src/css/camMotionSensors.css',
  '#/gasProbability':    '/src/css/gasSensor-Probability.css',
  '#/particleProbability':    '/src/css/particleSensor-Probability.css',
  '#/camMotionProbability':    '/src/css/camMotionSensors-Probability.css',
  '#/galeria':    '/src/css/galeria.css',
};

// Carga dinámica de CSS para la vista actual
async function loadViewStyle(hash) {
  const href = viewStyles[hash] || '';
  if (!href) return;
  // Elimina cualquier <link> previo de vistas
  document.querySelectorAll('link[data-view-style]').forEach(link => link.remove());
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.viewStyle = hash;
    link.onload = () => resolve();
    document.head.appendChild(link);
  });
}

async function renderView(path) {
  const hash = location.hash || '#/';
  // 1) Cargar estilos de la vista
  await loadViewStyle(hash);

  // 2) Cargar HTML de la vista
  const html = await fetch(path).then(r => r.text());
  document.getElementById('app').innerHTML = html;

  // 3) Inicializar lógica de la vista
  const viewName = path.split('/').pop().replace('.html','');
  /* @vite-ignore */
  const module = await import(`./views/${viewName}.js`);
  const fnName = 'init' + viewName.charAt(0).toUpperCase() + viewName.slice(1);
  if (typeof module[fnName] === 'function') {
    module[fnName]();
  }
}

// Listeners de routing
window.addEventListener('hashchange', () => {
  renderView(routes[location.hash] || routes['#/']);
});

window.addEventListener('DOMContentLoaded', () => {
  renderView(routes[location.hash] || routes['#/']);
});

// Bloquear BACK una sola vez en Dashboard/subvistas
history.replaceState(null, null, location.href);
window.addEventListener('popstate', () => {
  history.replaceState(null, null, location.href);
});
