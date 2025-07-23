import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.esm.js';
import { registerUser } from '../../api/logeoService.js';
import { navigateTo } from '../router.js';

export function initRegister() {
  const form = document.getElementById('register-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const name     = document.getElementById('register-name').value.trim();
    const email    = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm  = document.getElementById('register-confirm-password').value;
    const role     = document.getElementById('register-role').value;
    const systemID = parseInt(document.getElementById('register-systemID')?.value, 10) || undefined;

    if (password !== confirm) {
      return Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Las contraseñas no coinciden',
        showConfirmButton: false,
        timer: 2000
      });
    }
    if (role === 'user' && !systemID) {
      return Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'ID de sistema requerido para usuario',
        showConfirmButton: false,
        timer: 2000
      });
    }

    try {
      await registerUser({ name, email, password, role, id_Sistema: systemID });
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Registrado con éxito',
        showConfirmButton: false,
        timer: 2000
      });
      navigateTo('#/login');
    } catch (err) {
      const msg = err.message === 'ID de sistema inválido para este rol'
        ? 'ID de sistema no autorizado'
        : (err.message || 'Error al registrarse');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: msg,
        showConfirmButton: false,
        timer: 2500
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', initRegister);
