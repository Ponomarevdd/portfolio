import { gsap } from 'gsap';
const media = gsap.matchMedia();
media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
  const cleanups = [...document.querySelectorAll<HTMLElement>('.stat-card')].map(card => {
    const surface = card.querySelector<HTMLElement>('.stat-surface')!;
    const move = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      gsap.to(surface, { rotationY: ((event.clientX - rect.left) / rect.width - .5) * 10, rotationX: -((event.clientY - rect.top) / rect.height - .5) * 8, y: -4, duration: .45, overwrite: true, ease: 'power2.out' });
    };
    const leave = () => gsap.to(surface, { rotationX: 0, rotationY: 0, y: 0, duration: .7, overwrite: true, ease: 'elastic.out(1,.6)' });
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
    return () => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); gsap.killTweensOf(surface); gsap.set(surface, { clearProps: 'transform' }); };
  });
  return () => cleanups.forEach(cleanup => cleanup());
});
if (import.meta.hot) import.meta.hot.dispose(() => media.revert());
