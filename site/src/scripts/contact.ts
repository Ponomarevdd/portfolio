import { gsap } from 'gsap';

const dialog = document.querySelector<HTMLDialogElement>('#contact-dialog')!;
// Открыть контакты можно из меню и из других кнопок с data-contact-open (например, карточка в «Обо мне»)
const openers = [...document.querySelectorAll<HTMLButtonElement>('[data-contact-open]')];
let opener: HTMLElement = openers[0];
const closer = dialog.querySelector<HTMLButtonElement>('.contact-close')!;
let closing = false;
let previousOverflow = '';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const open = (event?: Event) => {
  if (dialog.open) return;
  if (event?.currentTarget instanceof HTMLElement) opener = event.currentTarget;
  previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  dialog.showModal();
  gsap.fromTo(dialog, { clipPath: 'inset(0 0 100% 0)' }, {
    clipPath: 'inset(0 0 0% 0)', duration: reduced() ? 0 : .85, ease: 'power3.inOut',
  });
  gsap.fromTo(dialog.querySelector('.contact-layout'), { y: -28, opacity: 0 }, {
    y: 0, opacity: 1, delay: reduced() ? 0 : .24, duration: reduced() ? 0 : .65, ease: 'power2.out',
  });
};
const close = () => {
  if (closing || !dialog.open) return;
  closing = true;
  gsap.to(dialog, { overwrite: true, clipPath: 'inset(0 0 100% 0)', duration: reduced() ? 0 : .38, ease: 'power3.inOut', onComplete() {
    dialog.close();
    document.documentElement.style.overflow = previousOverflow;
    closing = false;
    opener.focus({ preventScroll: true });
  } });
};
const cancel = (event: Event) => { event.preventDefault(); close(); };
openers.forEach((button) => button.addEventListener('click', open));
closer.addEventListener('click', close);
dialog.addEventListener('cancel', cancel);
if (import.meta.hot) import.meta.hot.dispose(() => {
  openers.forEach((button) => button.removeEventListener('click', open));
  closer.removeEventListener('click', close);
  dialog.removeEventListener('cancel', cancel);
  gsap.killTweensOf([dialog, dialog.querySelector('.contact-layout')]);
  if (dialog.open) { dialog.close(); document.documentElement.style.overflow = previousOverflow; }
});
