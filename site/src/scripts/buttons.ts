import { gsap } from 'gsap';
const cleanups: (() => void)[] = [];
for (const button of document.querySelectorAll<HTMLElement>('.action-button')) {
  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = button.getBoundingClientRect();
    gsap.to(button, { x: (event.clientX - rect.left - rect.width / 2) * .09, y: (event.clientY - rect.top - rect.height / 2) * .15, duration: .45, overwrite: true });
  };
  const leave = () => gsap.to(button, { x: 0, y: 0, duration: .5, overwrite: true });
  button.addEventListener('pointermove', move);
  button.addEventListener('pointerleave', leave);
  cleanups.push(() => { button.removeEventListener('pointermove', move); button.removeEventListener('pointerleave', leave); gsap.killTweensOf(button); });
}
if (import.meta.hot) import.meta.hot.dispose(() => cleanups.forEach(cleanup => cleanup()));
