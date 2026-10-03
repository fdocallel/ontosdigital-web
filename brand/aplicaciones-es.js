/* Aplicaciones (3-oct-2026): baldas con entrada escalonada y clips en un diálogo.
   Sin JavaScript todo funciona: el índice son anclas y cada miniatura es un enlace a su página. */
(() => {
  'use strict';

  /* Entrada: las piezas de cada balda suben una tras otra la primera vez que se ven.
     Una sola vez; con movimiento reducido o sin IntersectionObserver, quietas. */
  const baldas = [...document.querySelectorAll('#trabajos .balda')];
  if (baldas.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const balda = entry.target;
        observer.unobserve(balda);
        balda.classList.add('balda--entra');
        void balda.offsetWidth;
        balda.classList.remove('balda--espera');
        // Terminada la entrada, el gesto al pasar responde sin el retraso escalonado.
        setTimeout(() => balda.classList.remove('balda--entra'), 900);
      }
    }, { threshold: .2 });
    for (const balda of baldas) {
      // Ya en pantalla al cargar (ancla o recarga): sin entrada.
      if (balda.getBoundingClientRect().top < innerHeight * .9) continue;
      balda.classList.add('balda--espera');
      observer.observe(balda);
    }
  }

  /* Clips: el clic abre la página del clip en un <dialog> con un <iframe>.
     Se usa el href del propio enlace (en /en/ ya apunta a la versión inglesa). */
  const dialog = document.querySelector('dialog.dlg-clip');
  const links = [...document.querySelectorAll('a[data-clip]')];
  if (!dialog || !links.length || typeof dialog.showModal !== 'function') return;

  const frame = dialog.querySelector('iframe');
  const title = dialog.querySelector('.dlg-clip__titulo');
  const close = dialog.querySelector('.dlg-clip__cerrar');
  let opener = null;

  function open(link) {
    const name = link.querySelector('.clip__titulo')?.textContent.trim() || link.textContent.trim();
    const url = new URL(link.href, location.href);
    url.searchParams.set('autoplay', '1');
    opener = link;
    title.textContent = name;
    dialog.setAttribute('aria-label', name);
    frame.title = name;
    frame.src = url.href;
    dialog.showModal();
    close.focus();
  }

  for (const link of links) {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      open(link);
    });
  }

  close.addEventListener('click', () => dialog.close());
  // Clic fuera: el fondo (::backdrop) cuenta como clic en el propio <dialog>.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    // Vaciar el iframe para parar la animación.
    frame.src = 'about:blank';
    frame.removeAttribute('src');
    if (opener) opener.focus();
    opener = null;
  });
})();
