export const routes = {
  '#/':         '/src/views/home.html',
  '#/login':    '/src/views/login.html',
  '#/admin':    '/src/views/adminDashboard.html',
  '#/register': '/src/views/register.html',
  '#/dashboard': '/src/views/dashboard.html',
  '#/configSensor':  '/src/views/configSensor.html',
  '#/gas':          '/src/views/gasSensor.html',
  '#/particle':     '/src/views/particleSensor.html',
  '#/camMotion':    '/src/views/camMotionSensors.html',
  '#/gasProbability':    '/src/views/gasSensor-Probability.html',
  '#/particleProbability':    '/src/views/particleSensor-Probability.html',
  '#/camMotionProbability':    '/src/views/camMotionSensors-Probability.html',
  '#/galeria':    '/src/views/galeria.html',


};
export function navigateTo(hash, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, '', hash);
  } else {
    location.hash = hash;
  }
}
