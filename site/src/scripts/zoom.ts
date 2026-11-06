import { gsap } from 'gsap';
import '../styles/zoom.css';

// Увеличение картинок по клику: статичные экраны кейсов открываются крупно поверх страницы
const selector = '.jd-shot, .jd-mosaic, .ta-shot, .rc-old img';
const images = [...document.querySelectorAll<HTMLImageElement>(selector)];

if (images.length) {
  const dialog = document.createElement('dialog');
  dialog.className = 'zoom';
  dialog.setAttribute('aria-label', 'Увеличенное изображение');
  dialog.innerHTML = '<button class="zoom__close" type="button" aria-label="Закрыть"><span></span><span></span></button><div class="zoom__stage"><img class="zoom__img" alt=""></div>';
  document.body.append(dialog);
  const big = dialog.querySelector<HTMLImageElement>('.zoom__img')!;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let source: HTMLImageElement | null = null;
  let closing = false;

  // Широкий экран вписываем целиком; высокий показываем по ширине и даём прокрутить
  const size = (img: HTMLImageElement) => {
    const pad = innerWidth < 600 ? 16 : 48;
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const maxW = Math.min(w, innerWidth - pad * 2, 1600);
    const fit = Math.min(maxW, (innerHeight - pad * 2) * (w / h));
    const tall = fit < maxW * .6;
    dialog.classList.toggle('is-tall', tall);
    big.style.width = `${Math.round(tall ? Math.min(maxW, 1200) : fit)}px`;
  };

  const open = (img: HTMLImageElement) => {
    if (dialog.open) return;
    source = img;
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    size(img);
    dialog.showModal();
    dialog.scrollTop = 0;
    const d = reduced() ? 0 : 1;
    gsap.fromTo(dialog, { '--zoom-bg': 0 }, { '--zoom-bg': 1, duration: .3 * d, ease: 'power2.out' });
    gsap.fromTo(big, { ...offset(img) }, { x: 0, y: 0, scale: 1, duration: .32 * d, ease: 'power3.out' });
  };

  // Сдвиг и масштаб, при которых большая картинка ложится ровно на маленькую: увеличение растёт из неё самой
  const offset = (img: HTMLImageElement) => {
    gsap.set(big, { x: 0, y: 0, scale: 1, transformOrigin: '50% 50%' });
    const from = img.getBoundingClientRect(), to = big.getBoundingClientRect();
    return {
      x: from.left + from.width / 2 - (to.left + to.width / 2),
      y: from.top + from.height / 2 - (to.top + to.height / 2),
      scale: from.width / to.width,
    };
  };

  // Страницу под увеличением не прокручиваем, но и прокрутку не прячем, чтобы вёрстка не сдвигалась
  const block = (event: Event) => { if (dialog.scrollHeight <= dialog.clientHeight) event.preventDefault(); };
  dialog.addEventListener('wheel', block, { passive: false });
  dialog.addEventListener('touchmove', block, { passive: false });

  const close = () => {
    if (closing || !dialog.open) return;
    closing = true;
    const d = reduced() ? 0 : 1;
    const back = source ? { ...offset(source) } : { scale: .96, opacity: 0 };
    if (source) gsap.set(big, { y: -dialog.scrollTop });
    gsap.to(big, { ...back, duration: .26 * d, ease: 'power3.inOut' });
    gsap.to(dialog, { '--zoom-bg': 0, duration: .26 * d, ease: 'power2.in', onComplete() {
      dialog.close();
      gsap.set(big, { clearProps: 'all' });
      closing = false;
      source?.focus({ preventScroll: true });
    } });
  };

  images.forEach((img) => {
    img.classList.add('is-zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', img.alt ? `Увеличить: ${img.alt}` : 'Увеличить изображение');
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(img); }
    });
  });
  dialog.addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  addEventListener('resize', () => { if (dialog.open && source) size(source); });
}
