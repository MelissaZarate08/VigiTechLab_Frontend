// src/js/router.js
export const routes = {
  '#/':         '/src/views/home.html',
  '#/login':    '/src/views/login.html',
  '#/register': '/src/views/register.html',
  '#/dashboard': '/src/views/dashboard.html',
  '#/configSensor':  '/src/views/configSensor.html',
  '#/gas':          '/src/views/gasSensor.html',
  '#/particle':     '/src/views/particleSensor.html',
  '#/camMotion':    '/src/views/camMotionSensors.html',
  '#/gasProbability':    '/src/views/gasSensor-Probability.html',

};
// en router.js
export function navigateTo(hash, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, '', hash);
  } else {
    location.hash = hash;
  }
}
