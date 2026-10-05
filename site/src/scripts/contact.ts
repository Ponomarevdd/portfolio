import { gsap } from 'gsap';

const dialog = document.querySelector<HTMLDialogElement>('#contact-dialog')!;
const opener = document.querySelector<HTMLButtonElement>('[data-contact-open]')!;
const closer = dialog.querySelector<HTMLButtonElement>('.contact-close')!;
const form = dialog.querySelector<HTMLFormElement>('form')!;
const status = dialog.querySelector<HTMLElement>('.contact-status')!;
let closing = false;
let previousOverflow = '';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const open = () => {
  if (dialog.open) return;
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
const submit = (event: SubmitEvent) => {
  event.preventDefault();
  status.textContent = 'Форма пока работает в деморежиме. Сообщение не отправлено.';
};
opener.addEventListener('click', open);
closer.addEventListener('click', close);
dialog.addEventListener('cancel', cancel);
form.addEventListener('submit', submit);
if (import.meta.hot) import.meta.hot.dispose(() => {
  opener.removeEventListener('click', open);
  closer.removeEventListener('click', close);
  dialog.removeEventListener('cancel', cancel);
  form.removeEventListener('submit', submit);
  gsap.killTweensOf([dialog, dialog.querySelector('.contact-layout')]);
  if (dialog.open) { dialog.close(); document.documentElement.style.overflow = previousOverflow; }
});
