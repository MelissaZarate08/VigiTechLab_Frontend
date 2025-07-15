const API_BASE = '/api/sensors';

function getAuthHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Obtiene la configuración de todos los sensores
 * @returns {Promise<Array<{id:number,name:string,model:string,enabled:boolean}>>}
 */
export async function fetchSensorConfigs() {
  const res = await fetch(`${API_BASE}/config`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });
  if (!res.ok) throw new Error('Error al obtener configuración');
  return await res.json();
}

/**
 * Actualiza el estado de un sensor
 * @param {number} id 
 * @param {boolean} enabled 
 */
export async function updateSensorConfig(id, enabled) {
  const res = await fetch(`${API_BASE}/config/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ enabled })
  });
  if (!res.ok) console.warn(`No se pudo actualizar sensor ${id}`);
}
