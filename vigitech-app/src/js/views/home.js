export function initHome() {
  const btn = document.getElementById('btn-login');
  if (btn) btn.addEventListener('click', () => location.hash = '#/login');
}
