const BASE = '/api/sensors/gas';
function authHdr() {
  const t = localStorage.getItem('authToken');
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

/** Devuelve array [{ time:'HH:MM', value: number }] */
export async function fetchGasReadings() {
  const res = await fetch(`${BASE}/readings`, { headers: { ...authHdr() } });
  if (!res.ok) throw new Error('Error cargando lecturas');
  return res.json();
}

/** Devuelve sólo la última lectura */
export async function fetchLatestReading() {
  const res = await fetch(`${BASE}/latest`, { headers: { ...authHdr() } });
  if (!res.ok) throw new Error('Error leyendo último dato');
  return res.json();
}

/** (Opcional) estadísticas y probabilidades */
export async function fetchGasStats() {
  const res = await fetch(`${BASE}/stats`, { headers: { ...authHdr() } });
  if (!res.ok) throw new Error('Error cargando estadísticas');
  return res.json();
}
