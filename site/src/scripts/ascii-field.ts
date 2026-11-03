// Фон из символов (components/AsciiField.astro) в духе ASCII-арта: символ в клетке зависит от яркости,
// от точки до «@». Курсор оставляет «чернила», они текут по полю шума, растекаются протоками, как
// река в дельте, и тают. Клик пускает волну, на гребне символы вспыхивают оранжевым. Без курсора по фону
// медленно плывут бледные облака. Каждый кадр скрипт считает для клетки символ, яркость и свечение,
// кладёт их в маленькую текстуру, а WebGL рисует символы из атласа одним проходом. Под заголовком и
// меню символы гаснут. Без WebGL канвас не включается и остаётся обычный градиент.
import { asciiField as cfg } from './motion-settings';

const GLYPHS = '.,:;-~=+*xo#%@'; // от светлого к тёмному
const MAX_RIPPLES = 8;

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
uniform vec3 u_glow;
void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y * u_dpr - gl_FragCoord.y) / u_dpr;
  vec2 cell = floor(p / u_cell);
  vec4 c = texture2D(u_cells, (cell + 0.5) / u_grid);
  if (c.g <= 0.0) discard;
  vec2 local = fract(p / u_cell);
  float id = floor(c.r * 255.0 + 0.5);
  float ink = texture2D(u_atlas, vec2((id + local.x) / u_glyphs, local.y)).a;
  float alpha = ink * c.g;
  gl_FragColor = vec4(mix(u_ink, u_glow, c.b) * alpha, alpha);
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
  gl.uniform3fv(u('u_ink'), hex('#23242b'));
  gl.uniform3fv(u('u_glow'), hex('#fe8c00'));
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
  let cells = new Uint8Array(0), ink = new Float32Array(0), heat = new Float32Array(0), next = new Float32Array(0);

  // Атлас: все символы в одну строку, белым по прозрачному
  const buildAtlas = () => {
    const atlas = document.createElement('canvas');
    const ctx = atlas.getContext('2d')!;
    const font = `500 ${cfg.fontSize * dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.font = font;
    cellW = Math.ceil(ctx.measureText('M').width / dpr * 1.08);
    cellH = Math.round(cfg.fontSize * 1.3);
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
    ink = new Float32Array(cols * rows); heat = new Float32Array(cols * rows); next = new Float32Array(cols * rows);
    gl.uniform2f(u('u_grid'), cols, rows);
    if (reduced) draw(performance.now());
  };

  const ripples: { x: number; y: number; t: number }[] = [];
  const start = performance.now();
  const clock = (now: number) => (now - start) / 1000;
  const pointer = { x: 0, y: 0, px: 0, py: 0, active: false, moved: false };
  let last = 0;

  // Курсор оставляет чернила вдоль пути от прошлого кадра
  function deposit() {
    if (!pointer.active || !pointer.moved) return;
    pointer.moved = false;
    const dist = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
    const steps = Math.max(1, Math.ceil(dist / (cellW * 2)));
    const r = cfg.trailRadius, rc = Math.ceil(r / cellW) + 1, rr = Math.ceil(r / cellH) + 1;
    // Каждые две клетки пути добавляют одинаково, так что след ровный при любой скорости кадров
    const amount = cfg.trailStrength * .45;
    for (let s = 1; s <= steps; s++) {
      const px = pointer.px + (pointer.x - pointer.px) * s / steps, py = pointer.py + (pointer.y - pointer.py) * s / steps;
      const gx = Math.floor(px / cellW), gy = Math.floor(py / cellH);
      for (let y = Math.max(0, gy - rr); y <= Math.min(rows - 1, gy + rr); y++) {
        for (let x = Math.max(0, gx - rc); x <= Math.min(cols - 1, gx + rc); x++) {
          const d = Math.hypot((x + .5) * cellW - px, (y + .5) * cellH - py) / r;
          if (d >= 1) continue;
          const k = (1 - d * d) * amount, i = y * cols + x;
          ink[i] = Math.min(1.6, ink[i] + k);
          heat[i] = Math.min(1, heat[i] + k * 1.5);
        }
      }
    }
    pointer.px = pointer.x; pointer.py = pointer.y;
  }

  // Чернила текут по полю шума (без вихрей и стоков, поэтому расходятся протоками) и тают
  function flow(t: number, dt: number) {
    const scale = cfg.channelSize, speed = cfg.flowSpeed * dt, e = .01;
    const fade = Math.exp(-dt / cfg.fadeTime), cool = Math.exp(-dt / .6);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = (x + .5) * cellW / scale, ny = (y + .5) * cellH / scale, nt = t * .05;
        const dx = (noise(nx + e, ny + nt) - noise(nx - e, ny + nt)) / (2 * e);
        const dy = (noise(nx, ny + e + nt) - noise(nx, ny - e + nt)) / (2 * e);
        // Поворот градиента даёт течение вдоль линий шума
        const sx = x - dy * speed / cellW, sy = y + dx * speed / cellH;
        const x0 = Math.max(0, Math.min(cols - 2, Math.floor(sx))), y0 = Math.max(0, Math.min(rows - 2, Math.floor(sy)));
        const fx = Math.min(1, Math.max(0, sx - x0)), fy = Math.min(1, Math.max(0, sy - y0));
        const i0 = y0 * cols + x0;
        const v = ink[i0] * (1 - fx) * (1 - fy) + ink[i0 + 1] * fx * (1 - fy) + ink[i0 + cols] * (1 - fx) * fy + ink[i0 + cols + 1] * fx * fy;
        next[y * cols + x] = v * fade;
      }
    }
    [ink, next] = [next, ink];
    for (let i = 0; i < heat.length; i++) heat[i] *= cool;
  }

  function fill(t: number) {
    const box = canvas.getBoundingClientRect();
    // Меню закреплено, поэтому при прокрутке его место над фоном меняется
    const quiet = quietElements.map((el) => {
      const r = el.getBoundingClientRect();
      return [r.left - box.left - cfg.quietPadding, r.top - box.top - cfg.quietPadding, r.right - box.left + cfg.quietPadding, r.bottom - box.top + cfg.quietPadding];
    });
    const live = ripples.filter((r) => t - r.t < 4);
    const driftX = -cfg.windSpeed * t, driftY = cfg.windSpeed * .3 * t;
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

        // Протоки: узкие гребни шума, по ним след видно ярче всего
        const ridge = 1 - Math.abs(2 * noise(cx / cfg.channelSize * 2.2, cy / cfg.channelSize * 1.4 + t * .04) - 1);
        let level = ink[i] * (.25 + .75 * ridge ** 3);
        // Бледные облака без курсора
        level += smoothstep(.55, .85, fbm((cx + driftX) / cfg.cloudSize, (cy + driftY) / cfg.cloudSize)) * cfg.cloudOpacity;

        let glow = heat[i];
        for (const r of live) {
          const el = t - r.t;
          const wd = cfg.rippleReach * (1 - Math.exp(-el / 1.4)) - Math.hypot(cx - r.x, cy - r.y);
          if (wd < -60) continue;
          const s = Math.exp(-wd * wd / (cfg.rippleWidth * cfg.rippleWidth)) * smoothstep(-40, 10, wd) * Math.exp(-el / 1.1);
          level += s * (.5 + .5 * ridge);
          glow += s;
          // Волна оставляет немного чернил, и после неё тоже текут протоки
          ink[i] = Math.min(1.6, ink[i] + s * .04);
        }

        if (level < .03) { cells[i * 4 + 1] = 0; continue; }
        cells[i * 4] = Math.min(GLYPHS.length - 1, Math.floor(Math.min(1, level) * GLYPHS.length));
        cells[i * 4 + 1] = Math.min(255, Math.min(1, level * 1.5) * fade * 255);
        cells[i * 4 + 2] = Math.min(255, glow * 1.4 * 255);
      }
    }
    while (ripples.length && t - ripples[0].t > 4) ripples.shift();
  }

  function draw(now: number) {
    const t = reduced ? 12 : clock(now), dt = Math.min(.05, Math.max(0, t - last));
    last = t;
    deposit();
    flow(t, dt);
    fill(t);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cellsTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, cells);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let frame = 0, visible = true;
  const loop = (now: number) => {
    draw(now);
    frame = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!frame && !reduced && visible && !document.hidden) frame = requestAnimationFrame(loop); };

  const local = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top, inside: e.clientY >= box.top && e.clientY <= box.bottom };
  };
  const onDown = (e: PointerEvent) => {
    if (reduced || (e.target as Element).closest('a, button, input, textarea, dialog, .project')) return;
    const p = local(e);
    if (!p.inside) return;
    ripples.push({ x: p.x, y: p.y, t: clock(performance.now()) });
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
