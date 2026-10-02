(() => {
  'use strict';

  const controls = document.querySelector('[data-catalog-controls]');
  const cards = [...document.querySelectorAll('#trabajos .catalogo > .servicio[data-categoria]')];
  if (!controls || !cards.length) return;

  const buttons = [...controls.querySelectorAll('button[data-filtro]')];
  const filters = new Set(buttons.map(button => button.dataset.filtro));

  function selectFilter(filter) {
    if (!filters.has(filter)) return;
    for (const card of cards) {
      card.hidden = filter !== 'todas' && !card.dataset.categoria.split(/\s+/).includes(filter);
    }
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.filtro === filter));
    }
  }

  function revealDeepLink() {
    if (!location.hash) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); }
    catch { return; }
    const target = document.getElementById(id);
    const card = target?.closest('#trabajos .catalogo > .servicio');
    if (!card?.hidden) return;
    selectFilter('todas');
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }

  controls.addEventListener('click', event => {
    const button = event.target.closest('button[data-filtro]');
    if (!button || !controls.contains(button)) return;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    selectFilter(button.dataset.filtro);
  });

  controls.hidden = false;
  window.addEventListener('hashchange', revealDeepLink);
  revealDeepLink();
})();
