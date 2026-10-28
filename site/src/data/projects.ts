export interface Project {
  slug: string;
  title: string;
  year: number;
  categories: string[];
  cover: string;
  width: number;
  height: number;
  alt: string;
  featured?: boolean;
  href?: string;
  previews?: { src: string; alt: string; width: number; height: number }[];
  live?: 'school' | 'medx';
  description: string;
  identity: { name: string; tagline: string; background: string; color: string };
}

const school: Project = {
  slug: 'my-school', href: '/cases/my-school/', title: 'Курс «Цифровая платформа для школ»', year: 2023,
  categories: ['UX/UI', 'Edtech'],
  description: 'Обучающий курс для новой школьной платформы, которую запускали по всей стране. Педагоги и администраторы шаг за шагом учатся вести журнал, создавать тесты и работать с контентом.',
  cover: '/images/school-platform/cover.png', width: 2400, height: 1400,
  alt: 'Фрагменты обучающего урока Цифровой платформы для школ',
  identity: { name: 'Школы', tagline: 'Цифровая платформа для школ', background: '#eef2ff', color: '#4659aa' },
  live: 'school',
};
const medx: Project = {
  slug: 'medx', href: '/cases/medx/', title: 'Medx.pro: лонгриды о вакцинации', year: 2021,
  categories: ['UX/UI', 'Medtech'],
  description: 'Интерактивные лонгриды для врачей и медицинского персонала о вакцинации от COVID-19: схемы вместо сложного текста, самопроверки и медицински точные иллюстрации.',
  live: 'medx',
  cover: '/images/medx/cover.webp', width: 1800, height: 1285,
  alt: 'Лонгрид Medx.pro о вакцинации онкологических пациентов: шапка, содержание и первый раздел',
  previews: [
    { src: '/images/medx/scheme.webp', alt: 'Схема из лонгрида: как вирус проникает в клетку', width: 1400, height: 668 },
    { src: '/images/medx/lms.webp', alt: 'Концепт личного кабинета «Моё обучение»', width: 1400, height: 700 },
  ],
  identity: { name: 'medx.pro', tagline: 'Лонгриды о вакцинации', background: '#e8f3ee', color: '#3b876a' },
};
export const projects: Project[] = [school, medx];
export const allProjects = projects;
