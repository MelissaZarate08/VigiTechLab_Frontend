const BASE = '/api/sensors/motion';
function authHdr() {
  const t = localStorage.getItem('authToken');
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

/** Lecturas de movimiento [{ timestamp, motion_detected, intensity }] */
export async function fetchMotionReadings() {
  const res = await fetch(`${BASE}/readings`, { headers:{...authHdr()} });
  if (!res.ok) throw new Error('Error cargando movimiento');
  return res.json();
}

/** Última lectura de movimiento */
export async function fetchLatestMotion() {
  const res = await fetch(`${BASE}/latest`, { headers:{...authHdr()} });
  if (!res.ok) throw new Error('Error leyendo último dato');
  return res.json();
}

/** (Opcional) Capturas de cámara asociadas */
export async function fetchCameraCaptures() {
  const res = await fetch(`/api/sensors/camera/captures`, { headers:{...authHdr()} });
  if (!res.ok) throw new Error('Error cargando capturas');
  return res.json();
}
