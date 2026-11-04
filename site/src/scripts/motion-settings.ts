// Настройки интерактивных эффектов. Можно менять числа и сразу смотреть результат в браузере.
export const letterMotion = {
  radius: 30,          // радиус влияния курсора вокруг буквы, px
  lift: 28,             // на сколько буквы поднимаются, px
  blur: 1.5,              // максимальное размытие, px
  sidePush: 7,         // боковое смещение, px
  wobble: 2,            // дополнительный разброс букв, px
  rotation: 3,          // максимальный поворот, градусы
  followDuration: .42, // скорость реакции, секунды
  returnDuration: .65, // скорость возврата, секунды
  revealDuration: .8,  // длительность появления текста
  revealStagger: .025, // задержка между словами
  revealDelay: .12,    // пауза перед появлением текста
};

export const menuMotion = {
  indicatorDuration: .48, // скорость перебегания овала, секунды
  magnetDistance: 100,    // расстояние, с которого меню тянется к мыши, px
  magnetX: 12,            // максимальное смещение по горизонтали, px
  magnetY: 8,             // максимальное смещение по вертикали, px
  magnetDuration: .5,     // плавность движения меню, секунды
};

// Фон из символов на главной (components/AsciiField.astro). Курсор оставляет след из символов,
// след растекается протоками и тает; клик пускает волну.
export type AsciiMode = 'wind' | 'capillary' | 'estuary';
// Свои настройки у каждого режима: при смене режима они подставляются в asciiField
export const asciiFieldModes: Record<AsciiMode, Record<string, number>> = {
  // Wind: ветер гонит облака, курсор их разгоняет, клик пускает кривую волну
  wind: {
    floor: 0, maxOpacity: .71, swapRate: .2, swapSteps: 2, fieldSpeed: 3.5,
    cloudOpacity: .3, cloudSize: 150, cloudStretch: 3, cloudCover: .55,
    trailRadius: 60, trailStrength: .5, fadeTime: 1.4, flowSpeed: 38,
    rippleReach: 400, rippleWidth: 15, rippleWobble: .1, rippleLife: 2.3,
  },
  // Capillary: тонкие извилистые линии, курсор и волна подсвечивают их
  capillary: {
    floor: .07, maxOpacity: 1, swapRate: .35, swapSteps: 5, fieldSpeed: 1,
    trailRadius: 70, trailStrength: 1, fadeTime: 1.4, flowSpeed: 60,
    rippleReach: 320, rippleWidth: 10, rippleWobble: .14, rippleLife: 1.8,
  },
  // Estuary: крупные пятна, курсор оставляет чернила, они утекают протоками
  estuary: {
    floor: .07, maxOpacity: 1, swapRate: .35, swapSteps: 5, fieldSpeed: 1,
    trailRadius: 70, trailStrength: 1, fadeTime: 1.4, flowSpeed: 60,
    rippleReach: 320, rippleWidth: 10, rippleWobble: .14, rippleLife: 1.8,
  },
};

export const asciiField = {
  mode: 'wind' as AsciiMode, // Wind — ветер, Capillary — капилляры, Estuary — дельта
  fontSize: 10,         // размер символов, px
  ink: '#111111',       // цвет символов
  floor: 0,             // яркость самых бледных символов, их видно по всему фону, 0–1
  maxOpacity: 1,        // самый тёмный символ, 0–1
  swapRate: .35,        // как часто символ в клетке сменяется сам по себе, раз в секунду
  swapSteps: 5,         // сколько раз символ сменяется, пока клетка темнеет от бледной до чёрной
  fieldSpeed: 1,        // скорость движения фона без курсора, множитель
  cloudOpacity: .3,     // Wind: насколько тёмные облака, 0–1
  cloudSize: 150,       // Wind: высота облаков, px
  cloudStretch: 3,      // Wind: во сколько раз облака вытянуты по ветру
  cloudCover: .55,      // Wind: какую часть неба закрывают облака, 0–1
  trailRadius: 70,      // ширина следа от курсора, px
  trailStrength: 1,     // насыщенность следа; в Wind — как сильно курсор разгоняет облака
  fadeTime: 1.4,        // за сколько секунд след тает
  flowSpeed: 60,        // скорость течения следа, px/с
  rippleReach: 320,     // радиус, до которого расходится волна, px
  rippleWidth: 10,      // толщина кольца, px
  rippleWobble: .14,    // насколько кольцо кривое и рваное, 0–1
  rippleLife: 1.8,      // сколько секунд живёт волна
  quietPadding: 28,     // пустое поле вокруг заголовка и меню, px
};
Object.assign(asciiField, asciiFieldModes[asciiField.mode]);
