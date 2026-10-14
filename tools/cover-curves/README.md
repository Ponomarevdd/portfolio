# Обложка школьного кейса: текст в кривые

`SchoolLive.text.astro` — исходник живой обложки с обычным текстом (Geologica).
`run.sh` собирает сайт с этим исходником, раскладывает текст по буквам в браузере,
переводит буквы в кривые и пишет итоговый `site/src/components/SchoolLive.astro`, где
текст уже нарисован SVG и шрифты не грузятся.

Перед запуском поднять сервер: `python3 -m http.server 4399 --bind 127.0.0.1 -d site/dist`.
Нужны `playwright` (Chromium) и `pip install fonttools brotli`.
Правки текста и вёрстки обложки делаются в `SchoolLive.text.astro`, потом `./run.sh`.
