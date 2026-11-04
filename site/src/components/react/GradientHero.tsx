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
  return <GradientASCII {...props} style={{ background }} />;
}
