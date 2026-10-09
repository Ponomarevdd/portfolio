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
  description: string;
  identity: { name: string; tagline: string; background: string; color: string };
}

// Demonstration content. Replace with real projects before publication.
export const projects: Project[] = [
  {
    slug: 'put',
    description: 'Планирование путешествия от первой идеи до готового маршрута. Концепт объединяет вдохновение, подбор мест и удобную организацию поездки.',
    identity: { name: 'Путь', tagline: 'Новые места. Ближе к себе.', background: '#e5eddd', color: '#456044' },
    title: 'Путь — сервис путешествий',
    year: 2026,
    categories: ['UX/UI', 'Веб-дизайн', 'Дизайн-система'],
    cover: '/images/travel.png',
    width: 1566,
    height: 1004,
    alt: 'Концепт сервиса путешествий: маршруты, фотографии побережья и интерфейс планирования поездки',
    featured: true,
  },
  {
    slug: 'planeta',
    description: 'Культурная платформа, которая помогает находить выставки, события и новые впечатления. Выразительная айдентика встречается с простым календарём и понятной навигацией.',
    identity: { name: 'Планета', tagline: 'Искусство становится ближе.', background: '#f0ede8', color: '#ec3d32' },
    title: 'Планета',
    year: 2025,
    categories: ['Брендинг', 'Веб-дизайн'],
    cover: '/images/culture.png',
    width: 1983,
    height: 793,
    alt: 'Концепт культурной платформы: красные и синие афиши и календарь выставок',
  },
  {
    slug: 'ritm',
    description: 'Приложение для небольших пауз в течение дня. Спокойный интерфейс помогает выбрать практику, включить запись и сосредоточиться на себе.',
    identity: { name: 'Ритм', tagline: 'В своём темпе.', background: '#e8eef6', color: '#737eac' },
    title: 'Ритм',
    year: 2026,
    categories: ['UX/UI', 'Мобильный дизайн'],
    cover: '/images/music.png',
    width: 2089,
    height: 753,
    alt: 'Концепт музыкального приложения: светлый плеер и коралловая звуковая волна',
  },
  {
    slug: 'line', title: 'Линия', year: 2026,
    description: 'Личные финансы без лишней сложности. Баланс, привычки и накопления собраны в одном интерфейсе, чтобы замечать главное и планировать следующий шаг.',
    identity: { name: 'Линия', tagline: 'Больше ясности. Больше возможностей.', background: '#e3ebcd', color: '#526341' },
    categories: ['UX/UI', 'Веб-дизайн'], cover: '/images/finance.svg', width: 1400, height: 1000,
    alt: 'Демонстрационный интерфейс личных финансов в зелёных тонах',
  },
  {
    slug: 'tiho', title: 'Тихо — архитектурное бюро', year: 2026,
    description: 'Сайт архитектурного бюро о внимании к пространству и человеку. Крупные изображения, спокойная типографика и простая структура раскрывают характер каждого проекта.',
    identity: { name: 'Тихо', tagline: 'Пространство для жизни.', background: '#e9e5dc', color: '#626757' },
    categories: ['Брендинг', 'Веб-дизайн'], cover: '/images/architecture.svg', width: 1400, height: 1000,
    alt: 'Архитектурная композиция с геометричным домом и сайтом бюро Тихо', featured: true,
  },
  {
    slug: 'forma', title: 'Форма', year: 2026,
    description: 'Магазин предметов для дома с вниманием к форме, материалам и деталям. Лаконичный каталог помогает выбирать вещи, которые хочется оставить надолго.',
    identity: { name: 'форма', tagline: 'Вещи с характером.', background: '#eee5e3', color: '#887568' },
    categories: ['UX/UI', 'Веб-дизайн'], cover: '/images/objects.svg', width: 1400, height: 1000,
    alt: 'Демонстрационный магазин предметов для дома: керамика и освещение',
  },
];

// Extra demo entries for testing the second page; replace before publication.
export const moreProjects: Project[] = [
  ['atlas', 'Атлас — гид по городу', 0],
  ['scene', 'Сцена — культурный журнал', 1],
  ['pause', 'Пауза — практики внимания', 2],
  ['balance', 'Баланс — планирование бюджета', 3],
  ['space', 'Пространство — студия интерьера', 4],
  ['sreda', 'Среда — предметы для дома', 5],
].map(([slug, title, source]) => ({ ...projects[Number(source)], slug: String(slug), title: String(title), description: 'Демонстрационный проект для проверки каталога. Здесь появится краткое описание задачи и решения.', identity: { ...projects[Number(source)].identity, name: String(title).split(' — ')[0] } }));
const school: Project = {
  slug: 'my-school', href: '/cases/my-school/', title: 'Цифровая платформа для школ', year: 2023,
  categories: ['UX/UI', 'Веб-дизайн'],
  description: 'Система обучения для педагогов и администраторов школ: 45 лонгридов, LMS и дизайн-система, по которой команда выпускает уроки потоком. Проект под NDA.',
  cover: '/images/school-platform/cover.png', width: 2400, height: 1400,
  alt: 'Фрагменты обучающего урока и LMS Цифровой платформы для школ',
  identity: { name: 'Школы', tagline: 'Цифровая платформа для школ', background: '#eef2ff', color: '#4659aa' },
  previews: [
    { src: '/images/my-school/2.png', alt: 'Карточная структура обучающего лонгрида', width: 1160, height: 750 },
    { src: '/images/my-school/4.png', alt: 'Тематические иллюстрации для обучающих курсов', width: 1160, height: 480 },
  ],
};
projects.splice(0, 1, school);
export const allProjects = [...projects, ...moreProjects];
