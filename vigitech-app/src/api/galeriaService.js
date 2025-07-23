const API_BASE = 'http://vigitech-data.namixcode.cc:8081';

export async function fetchGallery() {
  try {
    const res = await fetch(`${API_BASE}/sensor/camera`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    return Array.isArray(data)
      ? data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      : [];
  } catch (err) {
    console.error('fetchGallery error:', err);
    return [];
  }
}
