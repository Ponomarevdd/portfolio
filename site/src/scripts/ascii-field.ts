// Фон из символов (components/AsciiField.astro), режим Wind. Каждая клетка сетки — буква или цифра;
// ветер гонит по фону вытянутые облака, и где облако, там символы проступают. Курсор разгоняет облака:
// сдвигает их по ходу своего движения, ничего не рисуя и не стирая. Клик пускает кривую рваную волну.
// Символ в клетке меняется, когда клетка заметно темнеет или светлеет, и изредка сам по себе, поэтому
// смена идёт вслед за движением, а не мельтешит. Каждый кадр скрипт считает для клеток символ и яркость,
// кладёт их в маленькую текстуру, а WebGL рисует символы из атласа одним проходом. Под заголовком и меню
// символы гаснут. Без WebGL канвас не включается и остаётся обычный градиент.
import { asciiField as cfg } from './motion-settings';

const GLYPHS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Строчных букв больше всего, цифр меньше, заглавных совсем немного
const GLYPH_PICK = [...GLYPHS].flatMap((ch, i) => Array(/[a-z]/.test(ch) ? 6 : /[0-9]/.test(ch) ? 3 : 1).fill(i));
const MAX_RIPPLES = 8;
const WIND_SPEED = 38; // скорость ветра при fieldSpeed = 1, px/с

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAGMENT = `
precision mediump float;
uniform vec2 u_res;
uniform float u_dpr;
uniform vec2 u_cell;
uniform vec2 u_grid;
uniform sampler2D u_atlas;
uniform sampler2D u_cells;
uniform float u_glyphs;
uniform vec3 u_ink;
void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y * u_dpr - gl_FragCoord.y) / u_dpr;
  vec2 cell = floor(p / u_cell);
  vec4 c = texture2D(u_cells, (cell + 0.5) / u_grid);
  if (c.g <= 0.0) discard;
  vec2 local = fract(p / u_cell);
  float id = floor(c.r * 255.0 + 0.5);
  float ink = texture2D(u_atlas, vec2((id + local.x) / u_glyphs, local.y)).a;
  float alpha = ink * c.g;
  gl_FragColor = vec4(u_ink * alpha, alpha);
}`;

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const hash3 = (a: number, b: number, c: number) => hash(a * 73856093 ^ c * 83492791, b);
const fbm = (x: number, y: number) => noise(x, y) * .55 + noise(x * 2.03 + 7.1, y * 2.03 + 7.1) * .3 + noise(x * 4.07 + 3.3, y * 4.07 + 3.3) * .15;
const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function hex(color: string) {
  const v = parseInt(color.slice(1), 16);
  return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
}

export function initAsciiField(canvas: HTMLCanvasElement, quietElements: Element[]) {
  const context = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!context) return () => {};
  const gl: WebGLRenderingContext = context;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX), fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return () => {};
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};
  gl.useProgram(program);
  const u = (name: string) => gl.getUniformLocation(program, name);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  let inkColor = '';
  gl.uniform1f(u('u_glyphs'), GLYPHS.length);
  gl.uniform1i(u('u_atlas'), 0);
  gl.uniform1i(u('u_cells'), 1);

  const texture = (unit: number, filter: number) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const atlasTexture = texture(0, gl.LINEAR);
  const cellsTexture = texture(1, gl.NEAREST);

  let dpr = 1, width = 0, height = 0, cellW = 0, cellH = 0, cols = 0, rows = 0;
  let cells = new Uint8Array(0), seed = new Float32Array(0), field = new Float32Array(0);
  // Насколько курсор сдвинул облака в каждой клетке, px
  let pushX = new Float32Array(0), pushY = new Float32Array(0), tmpX = new Float32Array(0), tmpY = new Float32Array(0);

  // Атлас: все символы в одну строку, белым по прозрачному
  const buildAtlas = () => {
    const atlas = document.createElement('canvas');
    const ctx = atlas.getContext('2d')!;
    const font = `500 ${cfg.fontSize * dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.font = font;
    cellW = Math.ceil(ctx.measureText('M').width / dpr * 1.08);
    cellH = Math.round(cfg.fontSize * 1.15);
    const w = Math.round(cellW * dpr);
    atlas.width = w * GLYPHS.length;
    atlas.height = Math.round(cellH * dpr);
    ctx.font = font;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [...GLYPHS].forEach((ch, i) => ctx.fillText(ch, w * (i + .5), atlas.height / 2));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.uniform2f(u('u_cell'), cellW, cellH);
  };

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u('u_res'), width, height);
    gl.uniform1f(u('u_dpr'), dpr);
    buildAtlas();
    cols = Math.ceil(width / cellW); rows = Math.ceil(height / cellH);
    cells = new Uint8Array(cols * rows * 4);
    const n = cols * rows;
    field = new Float32Array(n);
    pushX = new Float32Array(n); pushY = new Float32Array(n); tmpX = new Float32Array(n); tmpY = new Float32Array(n);
    seed = new Float32Array(n).map(() => Math.random());
    gl.uniform2f(u('u_grid'), cols, rows);
    if (reduced) draw(performance.now());
  };

  const ripples: { x: number; y: number; t: number; s: number }[] = [];
  const start = performance.now();
  const clock = (now: number) => (now - start) / 1000;
  const pointer = { x: 0, y: 0, px: 0, py: 0, active: false, moved: false };
  let last = 0;

  // Курсор разгоняет облака: клетки рядом с его путём сдвигаются по ходу движения. Сдвиг не растёт
  // бесконечно, а подтягивается к пределу, и спадает к краю плавно; предел меньше половины радиуса, поэтому
  // облака только растягиваются и не рвутся, у следа нет ни резкой границы, ни пустых дыр
  function push(x0: number, y0: number, x1: number, y1: number) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    if (dist < .5) return;
    const radius = cfg.trailRadius, ux = (x1 - x0) / dist, uy = (y1 - y0) / dist;
    const reach = Math.min(.45, cfg.trailStrength * .3) * radius;
    const steps = Math.max(1, Math.ceil(dist / (cellW * 1.5)));
    const rate = Math.min(1, dist / steps / 20) * .35;
    const rc = Math.ceil(radius / cellW) + 1, rr = Math.ceil(radius / cellH) + 1;
    for (let s = 1; s <= steps; s++) {
      const px = x0 + (x1 - x0) * s / steps, py = y0 + (y1 - y0) * s / steps;
      const gx = Math.floor(px / cellW), gy = Math.floor(py / cellH);
      for (let y = Math.max(0, gy - rr); y <= Math.min(rows - 1, gy + rr); y++) {
        for (let x = Math.max(0, gx - rc); x <= Math.min(cols - 1, gx + rc); x++) {
          const d = Math.hypot((x + .5) * cellW - px, (y + .5) * cellH - py) / radius;
          if (d >= 1) continue;
          const k = (1 - d * d) ** 2 * rate, i = y * cols + x;
          pushX[i] += (ux * reach - pushX[i]) * k;
          pushY[i] += (uy * reach - pushY[i]) * k;
        }
      }
    }
  }

  // Сдвиг облаков тает и немного размывается, чтобы соседние клетки не расходились рывками
  function relax(dt: number) {
    const fade = Math.exp(-dt / cfg.fadeTime);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const l = x > 0 ? i - 1 : i, r = x < cols - 1 ? i + 1 : i, t = y > 0 ? i - cols : i, b = y < rows - 1 ? i + cols : i;
        tmpX[i] = (pushX[i] * 4 + pushX[l] + pushX[r] + pushX[t] + pushX[b]) / 8 * fade;
        tmpY[i] = (pushY[i] * 4 + pushY[l] + pushY[r] + pushY[t] + pushY[b]) / 8 * fade;
      }
    }
    [pushX, tmpX] = [tmpX, pushX];
    [pushY, tmpY] = [tmpY, pushY];
  }

  // Вытянутые по ветру облака, слегка завихрённые, сдвинутые курсором
  function computeField(t: number) {
    const ft = t * cfg.fieldSpeed, sx = cfg.cloudSize * cfg.cloudStretch, sy = cfg.cloudSize, lo = 1 - cfg.cloudCover;
    for (let y = 0; y < rows; y++) {
      const cy = (y + .5) * cellH;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x, cx = (x + .5) * cellW;
        const X = (cx - pushX[i] - ft * WIND_SPEED) / sx, Y = (cy - pushY[i]) / sy;
        const w = noise(X * .8 + 3.1, Y * .8 - ft * .05);
        field[i] = smoothstep(lo, lo + .35, fbm(X + w * .9, Y + w * .5)) * cfg.cloudOpacity;
      }
    }
  }

  function fill(t: number) {
    const box = canvas.getBoundingClientRect();
    // Меню закреплено, поэтому при прокрутке его место над фоном меняется
    const quiet = quietElements.map((el) => {
      const r = el.getBoundingClientRect();
      return [r.left - box.left - cfg.quietPadding, r.top - box.top - cfg.quietPadding, r.right - box.left + cfg.quietPadding, r.bottom - box.top + cfg.quietPadding];
    });
    const live = ripples.filter((r) => t - r.t < cfg.rippleLife);
    const steps = cfg.swapSteps;
    for (let y = 0; y < rows; y++) {
      const cy = (y + .5) * cellH;
      // Снизу фон растворяется
      const bottom = 1 - smoothstep(height * .6, height * .98, cy);
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x, cx = (x + .5) * cellW;
        let quietK = 1;
        for (const q of quiet) {
          const dx = Math.max(q[0] - cx, 0, cx - q[2]), dy = Math.max(q[1] - cy, 0, cy - q[3]);
          quietK *= smoothstep(0, 70, Math.hypot(dx, dy));
        }
        const fade = quietK * bottom;
        if (fade <= 0) { cells[i * 4 + 1] = 0; continue; }

        let level = field[i];

        // Волна от клика: кривое рваное кольцо, за ним второе потише
        for (const r of live) {
          const el = t - r.t, life = 1 - el / cfg.rippleLife;
          const dx = cx - r.x, dy = cy - r.y, d = Math.hypot(dx, dy);
          const R = cfg.rippleReach * (1 - Math.exp(-el / .8));
          if (d > R * 1.4 + 60) continue;
          const a = Math.atan2(dy, dx), ca = Math.cos(a), sa = Math.sin(a);
          let s = 0;
          for (let k = 0; k < 2; k++) {
            const Rk = R * (k ? .62 : 1);
            const wob = (noise(ca * 1.6 + r.s + k * 3, sa * 1.6 + el * 1.2) - .5) * 2 * cfg.rippleWobble * Rk;
            // Толщина кольца гуляет по окружности: где-то тонкая нить, где-то широкая полоса
            const w = cfg.rippleWidth * (.35 + 1.3 * noise(ca * 2.4 + r.s + 7, sa * 2.4 + el)) * (1 + el * .5);
            const wd = d - Rk - wob;
            s += Math.exp(-wd * wd / (w * w)) * (k ? .35 : 1);
          }
          // Внутри кольца редкие обрывки ряби
          if (d < R) s += (noise(cx / 30 + el * 1.5, cy / 30 - el) > .7 ? .18 : 0) * smoothstep(R * .2, R * .8, d);
          // Кольцо держится ярким, а под конец быстро тает
          s *= 1 - smoothstep(.4, 1, 1 - life);
          level += s;
        }

        // Символ меняется, когда клетка переходит на новую ступень яркости, и изредка сам
        const tick = Math.floor(t * cfg.swapRate + seed[i] * 7);
        const stepId = Math.floor(Math.min(1.2, level) * steps + seed[i] * .9);
        cells[i * 4] = GLYPH_PICK[Math.floor(hash3(i, tick, stepId) * GLYPH_PICK.length)];
        const alpha = cfg.floor + (cfg.maxOpacity - cfg.floor) * Math.min(1, level);
        cells[i * 4 + 1] = Math.min(255, alpha * fade * 255);
      }
    }
    while (ripples.length && t - ripples[0].t > cfg.rippleLife) ripples.shift();
  }

  function draw(now: number) {
    const t = reduced ? 12 : clock(now), dt = Math.min(.05, Math.max(0, t - last));
    last = t;
    if (inkColor !== cfg.ink) { inkColor = cfg.ink; gl.uniform3fv(u('u_ink'), hex(inkColor)); }
    if (pointer.active && pointer.moved) {
      pointer.moved = false;
      push(pointer.px, pointer.py, pointer.x, pointer.y);
      pointer.px = pointer.x; pointer.py = pointer.y;
    }
    relax(dt);
    computeField(t);
    fill(t);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cellsTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, cells);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let frame = 0, visible = true;
  // Цикл не останавливается совсем: вне экрана кадры просто пропускаются. Браузер сам не крутит его в
  // скрытой вкладке, а если остановить цикл и ждать события, он иногда так и не просыпается
  const loop = (now: number) => {
    if (visible && !document.hidden) draw(now);
    frame = requestAnimationFrame(loop);
  };
  const kick = () => { if (!frame && !reduced) frame = requestAnimationFrame(loop); };

  const local = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top, inside: e.clientY >= box.top && e.clientY <= box.bottom };
  };
  const onDown = (e: PointerEvent) => {
    if (reduced || (e.target as Element).closest('a, button, input, textarea, dialog, .project')) return;
    const p = local(e);
    if (!p.inside) return;
    ripples.push({ x: p.x, y: p.y, t: clock(performance.now()), s: Math.random() * 50 });
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  };
  const onMove = (e: PointerEvent) => {
    if (reduced) return;
    const p = local(e);
    if (!pointer.active) { pointer.px = p.x; pointer.py = p.y; }
    pointer.x = p.x; pointer.y = p.y; pointer.active = p.inside; pointer.moved = true;
  };
  const onLeave = () => { pointer.active = false; };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; kick(); });
  io.observe(canvas);
  addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', kick);

  resize();
  document.documentElement.classList.add('has-ascii');
  kick();

  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect(); io.disconnect();
    removeEventListener('pointerdown', onDown);
    removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', kick);
    document.documentElement.classList.remove('has-ascii');
  };
}
