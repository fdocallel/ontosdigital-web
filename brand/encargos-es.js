/* details funciona también sin JS. El refuerzo mantiene una sola familia abierta
   en motores sin soporte del atributo name; el usuario puede cerrarlas todas. */
(() => {
  const families = [...document.querySelectorAll('[data-familias] > details')];
  families.forEach(family => family.addEventListener('toggle', () => {
    if (family.open) families.forEach(other => { if (other !== family) other.open = false; });
  }));
})();
