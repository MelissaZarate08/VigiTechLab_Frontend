// src/js/views/register.js
import { registerUser } from '../../api/logeoService.js';
import { navigateTo }   from '../router.js';


export function initRegister() {
const form = document.getElementById('register-form');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const name       = document.getElementById('register-name').value;
  const email      = document.getElementById('register-email').value;
  const password   = document.getElementById('register-password').value;
  const confirm    = document.getElementById('register-confirm-password').value;
  const role       = document.getElementById('register-role').value;
  // tomamos el value (o undefined si no existe)
  const systemID   = parseInt(document.getElementById('register-systemID')?.value, 10) || undefined;

  if (password !== confirm) {
    return alert('Las contraseñas no coinciden');
  }
  if (role === 'user' && !systemID) {
    return alert('Debes ingresar un ID de sistema válido para el rol "user"');
  }

  try {
    // aquí renombramos 'systemID' a 'id_Sistema'
    await registerUser({
      name,
      email,
      password,
      role,
      id_Sistema: systemID
    });
    alert('Registrado con éxito, por favor ingresa');
    navigateTo('#/login');
  } catch (err) {
    // Capturamos el 401 de Unauthorized y mostramos alerta específica
    if (err.message === 'ID de sistema inválido para este rol') {
      return alert('El ID de sistema que ingresaste no está autorizado');
    }
    // Otros errores (email duplicado, validación, etc.)
    alert(err.message || 'Error al registrarse');
  }
});
}