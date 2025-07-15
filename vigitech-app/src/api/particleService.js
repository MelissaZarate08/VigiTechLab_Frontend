const BASE = '/api/sensors/particle';
function authHdr() {
  const t = localStorage.getItem('authToken');
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

/** Devuelve [{ timestamp, pm1_0, pm2_5, pm10 }] */
export async function fetchReadings() {
  const res = await fetch(`${BASE}/readings`, { headers:{...authHdr()} });
  if (!res.ok) throw new Error('Error cargando partículas');
  return res.json();
}

/** Última lectura */
export async function fetchLatest() {
  const res = await fetch(`${BASE}/latest`, { headers:{...authHdr()} });
  if (!res.ok) throw new Error('Error leyendo último dato');
  return res.json();
}
