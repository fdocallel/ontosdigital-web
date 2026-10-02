/* Cinco familias en un carril nativo: flechas, teclado y gesto táctil.
   Sin JavaScript permanece desplazable; sin temporizadores de reproducción. */
(() => {
  const track = document.querySelector('[data-familias]');
  const controls = document.querySelector('[data-familias-controls]');
  if (!track || !controls) return;
  const cards = [...track.children];
  const prev = controls.querySelector('[data-familias-prev]');
  const next = controls.querySelector('[data-familias-next]');
  const state = controls.querySelector('.familias__estado');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  const start = card => card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
  const maximum = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const first = () => cards.reduce((best, card, index) => Math.abs(start(card) - track.scrollLeft) < Math.abs(start(cards[best]) - track.scrollLeft) ? index : best, 0);
  function update() {
    frame = 0;
    const rect = track.getBoundingClientRect();
    const visible = cards.map((card, index) => ({rect: card.getBoundingClientRect(), index}))
      .filter(card => card.rect.left >= rect.left - 2 && card.rect.right <= rect.right + 2);
    const from = visible[0]?.index ?? first();
    const to = visible.at(-1)?.index ?? from;
    state.textContent = `${String(from + 1).padStart(2, '0')}–${String(to + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maximum() - 2;
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function go(left) { track.scrollTo({left: Math.max(0, Math.min(maximum(), left)), behavior: reduced.matches ? 'instant' : 'smooth'}); }
  function move(direction) {
    const index = Math.max(0, Math.min(cards.length - 1, first() + direction));
    go(start(cards[index]));
  }
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', schedule, {passive: true});
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(maximum());
    else move(event.key === 'ArrowRight' ? 1 : -1);
  });
  window.addEventListener('resize', schedule, {passive: true});
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(track);
  document.fonts?.ready.then(schedule);
  controls.hidden = false;
  update();
})();
