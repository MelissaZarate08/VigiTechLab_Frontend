import { navigateTo } from '../router.js';
import { fetchGallery } from '../../api/galeriaService.js';

export async function initGaleria() {
  const container = document.querySelector('.gallery-container');
  const btnBack   = document.getElementById('btn-back');
  const modal     = document.getElementById('image-modal');
  const modalImg  = modal.querySelector('.modal-content img');

  btnBack.addEventListener('click', () => navigateTo('#/camMotion'));

  let snaps = await fetchGallery();
  snaps = snaps.slice(0, 30);

  snaps.forEach((snap, idx) => {
    const card = document.createElement('div');
    card.classList.add('card');

    const img = document.createElement('img');
    img.src  = snap.image_path;
    img.alt  = `Captura ${snap.id}`;
    card.appendChild(img);

    if (idx < 5) {
      const badge = document.createElement('span');
      badge.classList.add('badge-new');
      badge.textContent = 'Nuevo';
      card.appendChild(badge);
    }

    card.addEventListener('click', () => {
      modalImg.src = snap.image_path;
      modal.classList.remove('hidden');
    });

    container.appendChild(card);
  });

  modal.addEventListener('click', e => {
    if (e.target.classList.contains('modal-backdrop')) {
      modal.classList.add('hidden');
      modalImg.src = '';
    }
  });
}

window.addEventListener('DOMContentLoaded', initGaleria);
