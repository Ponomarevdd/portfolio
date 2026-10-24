// Кейс MedX: фрагменты макетов шире базовой ширины не перестраиваются, а уменьшаются целиком.
document.querySelectorAll<HTMLElement>('.sc-scale').forEach((box) => {
  const inner = box.firstElementChild as HTMLElement | null;
  if (!inner) return;
  const fit = () => {
    const base = parseFloat(getComputedStyle(box).getPropertyValue('--base'));
    const k = Math.min(1, box.clientWidth / base);
    box.classList.toggle('is-scaled', k < 1);
    box.style.setProperty('--k', String(k));
    box.style.height = k < 1 ? `${inner.offsetHeight * k}px` : '';
  };
  const ro = new ResizeObserver(fit);
  ro.observe(box); ro.observe(inner);
  fit();
});
