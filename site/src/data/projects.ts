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
  live?: 'school' | 'medx' | 'rectors' | 'joy-division' | 'terra';
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
const rectors: Project = {
  slug: 'rectors', href: '/cases/rectors/', title: 'Совет ректоров вузов Москвы: редизайн сайта', year: 2022,
  categories: ['Веб-дизайн', 'Редизайн'],
  description: 'Редизайн сайта Совета ректоров вузов Москвы и Московской области: современный облик, понятная навигация и отзывчивая вёрстка для любых устройств.',
  live: 'rectors',
  cover: '/images/rectors/new-home.webp', width: 1560, height: 2849,
  alt: 'Старая главная страница сайта Совета ректоров сменяется новой',
  identity: { name: 'Совет ректоров', tagline: 'Редизайн сайта', background: '#e5efff', color: '#0066ff' },
};
const joyDivision: Project = {
  slug: 'joy-division', href: '/cases/joy-division/', title: 'Joy Division: концепт сайта', year: 2019,
  categories: ['Веб-дизайн', 'Музыка'],
  description: 'Концепт сайта о группе Joy Division: тёмная визуальная система, контрастная типографика и чёрно-белые портреты передают атмосферу пост-панка.',
  live: 'joy-division',
  cover: '/images/joy-division/mosaic.webp', width: 2214, height: 1662,
  alt: 'Экраны концепта: главная страница с фотографией группы и разделы сайта',
  identity: { name: 'Joy Division', tagline: 'Концепт сайта', background: '#222222', color: '#ffffff' },
};
const terra: Project = {
  slug: 'terra-arthropoda', href: '/cases/terra-arthropoda/', title: 'Terra Arthropoda: атлас членистоногих', year: 2026,
  categories: ['UX/UI', 'Наука', 'Пет-проект'],
  description: 'Атлас членистоногих, по которому можно разобраться, как узнать тот или иной вид: систематика от подтипа до вида, карточки видов и глоссарий терминов морфологии.',
  live: 'terra',
  cover: '/images/terra/home.webp', width: 2304, height: 2213,
  alt: 'Главная атласа Terra Arthropoda',
  identity: { name: 'Terra Arthropoda', tagline: 'Атлас членистоногих', background: '#dcecd6', color: '#387f39' },
};
export const projects: Project[] = [school, medx, rectors, joyDivision, terra];
export const allProjects = projects;
