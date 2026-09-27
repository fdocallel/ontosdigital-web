/* Expansión acotada del panel de portada. Sin JavaScript conserva el margen inicial. */
(() => {
  const feature = document.querySelector('[data-home-feature]');
  if (!feature) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pending = false;
  let expansionDistance = 1;

  function measure() {
    const top = feature.getBoundingClientRect().top + window.scrollY;
    const header = document.querySelector('.barra');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    expansionDistance = Math.max(1, top - headerHeight);
    schedule();
  }

  function update() {
    pending = false;
    if (reducedMotion.matches) {
      feature.style.removeProperty('--home-inset');
      feature.style.removeProperty('--home-radius');
      feature.style.removeProperty('--home-drift');
      return;
    }

    const gutter = Math.min(52, Math.max(16, window.innerWidth * .04));
    const progress = Math.min(1, Math.max(0, window.scrollY / expansionDistance));
    feature.style.setProperty('--home-inset', `${(gutter * (1 - progress)).toFixed(2)}px`);
    feature.style.setProperty('--home-radius', `${(12 * (1 - progress)).toFixed(2)}px`);
    feature.style.setProperty('--home-drift', `${(22 * progress).toFixed(2)}px`);
  }

  function schedule() {
    if (!pending) {
      pending = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  reducedMotion.addEventListener('change', schedule);
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
})();
