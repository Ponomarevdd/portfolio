import { useEffect, useState } from 'react';
import GradientASCII from './GradientASCII';
import { gradientAscii } from '../../scripts/motion-settings';

type Settings = typeof gradientAscii;

// Обёртка нужна, чтобы панель настроек в превью могла менять пропсы на лету
export default function GradientHero() {
  const [settings, setSettings] = useState<Settings>(gradientAscii);
  useEffect(() => {
    // Сигнал анимации страницы: градиент запустился, можно показывать остальное
    (window as Window & { gradientAsciiReady?: boolean }).gradientAsciiReady = true;
    window.dispatchEvent(new Event('gradient-ascii:ready'));
  }, []);
  useEffect(() => {
    const onChange = (event: Event) => setSettings({ ...(event as CustomEvent<Settings>).detail });
    window.addEventListener('gradient-ascii:settings', onChange);
    return () => window.removeEventListener('gradient-ascii:settings', onChange);
  }, []);
  const { background, ...props } = settings;
  // Повторный заход на главную за сессию: градиент сразу полностью проявлен
  const seen = document.documentElement.classList.contains('intro-seen');
  return <GradientASCII {...props} intro={seen ? false : props.intro} style={{ background }} />;
}
