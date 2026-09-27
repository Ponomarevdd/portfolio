import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { letterMotion, menuMotion } from './motion-settings';

gsap.registerPlugin(ScrollTrigger, SplitText);
const media = gsap.matchMedia();
let disposed = false;

function setupMenu(animated: boolean) {
  const nav = document.querySelector<HTMLElement>('.navigation');
  const indicator = nav?.querySelector<HTMLElement>('.navigation__indicator');
  if (!nav || !indicator) return () => {};

  const items = [...nav.querySelectorAll<HTMLElement>(':scope > a, :scope > button')];
  let hovered: HTMLElement | null = null;
  const pointerEnabled = animated && matchMedia('(hover: hover) and (pointer: fine)').matches;

  const slideTo = (item: HTMLElement, immediate = false) => {
    gsap.to(indicator, {
      x: item.offsetLeft,
      y: item.offsetTop,
      width: item.offsetWidth,
      height: item.offsetHeight,
      opacity: 1,
      duration: animated && !immediate ? menuMotion.indicatorDuration : 0,
      ease: 'power3.out',
      overwrite: true,
    });
  };
  const hideIndicator = () => gsap.to(indicator, { opacity: 0, duration: animated ? .2 : 0, overwrite: true });
  const onNavPointerMove = (event: PointerEvent) => {
    if (!pointerEnabled || event.pointerType === 'touch') return;
    const item = items.find((candidate) => {
      const box = candidate.getBoundingClientRect();
      return event.clientX >= box.left && event.clientX <= box.right
        && event.clientY >= box.top && event.clientY <= box.bottom;
    });
    if (item && item !== hovered) {
      hovered = item;
      slideTo(item);
    }
  };
  const onNavPointerLeave = () => {
    hovered = null;
    hideIndicator();
  };
  const onDocumentPointerMove = (event: PointerEvent) => {
    if (!pointerEnabled || event.pointerType === 'touch') return;
    const box = nav.getBoundingClientRect();
    const currentX = Number(gsap.getProperty(nav, 'x')) || 0;
    const currentY = Number(gsap.getProperty(nav, 'y')) || 0;
    const left = box.left - currentX;
    const right = box.right - currentX;
    const top = box.top - currentY;
    const bottom = box.bottom - currentY;
    const nearestX = Math.max(left, Math.min(event.clientX, right));
    const nearestY = Math.max(top, Math.min(event.clientY, bottom));
    const distance = Math.hypot(event.clientX - nearestX, event.clientY - nearestY);
    const strength = Math.max(0, 1 - distance / menuMotion.magnetDistance);
    const maxX = innerWidth < 600 ? menuMotion.magnetX * .65 : menuMotion.magnetX;
    const x = Math.max(-maxX, Math.min(maxX, (event.clientX - (left + right) / 2) * .08)) * strength;
    const y = Math.max(-menuMotion.magnetY, Math.min(menuMotion.magnetY, (event.clientY - (top + bottom) / 2) * .12)) * strength;
    gsap.to(nav, {
      x, y, duration: menuMotion.magnetDuration,
      ease: 'power3.out', overwrite: 'auto',
    });
  };
  const onFocusIn = (event: FocusEvent) => {
    const item = event.target as HTMLElement;
    if (items.includes(item)) slideTo(item);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (!nav.contains(event.relatedTarget as Node | null)) hideIndicator();
  };
  const onResize = () => { if (hovered) slideTo(hovered, true); };

  gsap.set(indicator, { opacity: 0 });
  nav.addEventListener('pointermove', onNavPointerMove);
  nav.addEventListener('pointerleave', onNavPointerLeave);
  nav.addEventListener('focusin', onFocusIn);
  nav.addEventListener('focusout', onFocusOut);
  document.addEventListener('pointermove', onDocumentPointerMove, { passive: true });
  window.addEventListener('resize', onResize);
  return () => {
    nav.removeEventListener('pointermove', onNavPointerMove);
    nav.removeEventListener('pointerleave', onNavPointerLeave);
    nav.removeEventListener('focusin', onFocusIn);
    nav.removeEventListener('focusout', onFocusOut);
    document.removeEventListener('pointermove', onDocumentPointerMove);
    window.removeEventListener('resize', onResize);
    gsap.killTweensOf([nav, indicator]);
  };
}

// Content remains visible if JS is disabled; motion is only an enhancement.
document.fonts.ready.then(() => {
  if (disposed) return;
  media.add('(prefers-reduced-motion: reduce)', () => setupMenu(false));
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const cleanupMenu = setupMenu(true);
    const title = document.querySelector<HTMLElement>('.intro h1');
    let chars: HTMLElement[] = [];
    let textReady = false;
    let letterCenters: { x: number; y: number }[] = [];
    let activeLetters = new Set<HTMLElement>();
    let letterFrame = 0;
    let lastPointer: PointerEvent;

    const releaseLetters = () => {
      cancelAnimationFrame(letterFrame);
      if (activeLetters.size) {
        gsap.to([...activeLetters], {
          x: 0, y: 0, rotation: 0, filter: 'blur(0px)',
          duration: letterMotion.returnDuration, ease: 'power3.out', overwrite: true,
        });
      }
      activeLetters = new Set();
    };
    const measureLetters = () => {
      letterCenters = chars.map((char) => {
        const box = char.getBoundingClientRect();
        return {
          x: box.left + box.width / 2 - Number(gsap.getProperty(char, 'x')),
          y: box.top + box.height / 2 - Number(gsap.getProperty(char, 'y')),
        };
      });
    };
    const moveLetters = () => {
      letterFrame = 0;
      if (!textReady || !lastPointer || !letterCenters.length) return;
      const next = new Set<HTMLElement>();
      chars.forEach((char, index) => {
        const base = letterCenters[index];
        const dx = base.x - lastPointer.clientX;
        const dy = base.y - lastPointer.clientY;
        const distance = Math.hypot(dx, dy);
        if (distance >= letterMotion.radius) return;
        const influence = (1 - distance / letterMotion.radius) ** 1.2;
        const x = ((dx / Math.max(distance, 1)) * letterMotion.sidePush + Math.sin(index * 2.4) * letterMotion.wobble) * influence;
        const y = -letterMotion.lift * influence;
        const rotation = Math.sin(index * 1.7) * letterMotion.rotation * influence;
        const blur = letterMotion.blur * influence;
        gsap.to(char, {
          x, y, rotation, filter: `blur(${blur}px)`,
          duration: letterMotion.followDuration, ease: 'power3.out', overwrite: true,
        });
        next.add(char);
      });
      activeLetters.forEach((char) => {
        if (!next.has(char)) gsap.to(char, {
          x: 0, y: 0, rotation: 0, filter: 'blur(0px)',
          duration: letterMotion.returnDuration, ease: 'power3.out', overwrite: true,
        });
      });
      activeLetters = next;
    };
    const split = title ? SplitText.create('.intro h1', {
      type: 'lines,words,chars',
      autoSplit: true,
      onSplit(self) {
        releaseLetters();
        chars = self.chars as HTMLElement[];
        textReady = false;
        letterCenters = [];
        return gsap.from(self.words, {
          yPercent: 110, opacity: 0, duration: letterMotion.revealDuration,
          stagger: letterMotion.revealStagger, ease: 'power3.out', delay: letterMotion.revealDelay,
          onComplete() { textReady = true; },
        });
      },
    }) : null;
    gsap.from('.header', { y: -12, opacity: 0, duration: .7, ease: 'power2.out' });
    gsap.utils.toArray<HTMLElement>('.project').forEach((project) => {
      gsap.from(project, {
        y: 32, opacity: 0, duration: .9, ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: project, start: 'top 96%', once: true },
      });
    });
    const pointerEnabled = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const enterTitle = () => { if (textReady) measureLetters(); };
    const moveTitle = (event: PointerEvent) => {
      lastPointer = event;
      if (textReady && !letterCenters.length) measureLetters();
      if (!letterFrame) letterFrame = requestAnimationFrame(moveLetters);
    };
    if (pointerEnabled) {
      title?.addEventListener('pointerenter', enterTitle);
      title?.addEventListener('pointermove', moveTitle);
      title?.addEventListener('pointerleave', releaseLetters);
    }
    return () => {
      cleanupMenu();
      title?.removeEventListener('pointerenter', enterTitle);
      title?.removeEventListener('pointermove', moveTitle);
      title?.removeEventListener('pointerleave', releaseLetters);
      cancelAnimationFrame(letterFrame);
      gsap.killTweensOf(chars);
      split?.revert();
    };
  });
});

const gradient = document.querySelector<HTMLElement>('.gradient');
let inView = true;
const updateBackground = () => gradient?.classList.toggle('is-paused', document.hidden || !inView);
const observer = new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  updateBackground();
});
if (gradient) observer.observe(gradient);
document.addEventListener('visibilitychange', updateBackground);

if (import.meta.hot) import.meta.hot.dispose(() => {
  disposed = true;
  media.revert();
  observer.disconnect();
  document.removeEventListener('visibilitychange', updateBackground);
});
