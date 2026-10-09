// Asa — arte da escala, desenhada no próprio celular (sem custo de servidor).

export const THEMES = {
  azul: { name: 'Azul Asa', bg: ['#2A5BF0', '#0B2E8A'], ink: '#FFFFFF', muted: 'rgba(255,255,255,0.74)', accent: '#FFC83D', line: 'rgba(255,255,255,0.18)', wing: 'rgba(255,255,255,0.10)' , cine: { dark: true, base: ['#0B1638', '#02040C'], glow: '#1F4FE0', light: '#D6E3FF', ink: '#EEF2FF', soft: 'rgba(238,242,255,0.72)', accent: '#FFC83D' } },
  noite: { name: 'Noite', bg: ['#16234D', '#05091A'], ink: '#F2F5FF', muted: 'rgba(230,236,255,0.66)', accent: '#8FB0FF', line: 'rgba(255,255,255,0.14)', wing: 'rgba(143,176,255,0.12)' , cine: { dark: true, base: ['#0C1A1E', '#030607'], glow: '#1E5560', light: '#FFE6CC', ink: '#F3EADF', soft: 'rgba(243,234,223,0.7)', accent: '#E8C9A2' } },
  aurora: { name: 'Aurora', bg: ['#3B4FE4', '#8A3FD1'], ink: '#FFFFFF', muted: 'rgba(255,255,255,0.76)', accent: '#FFD66B', line: 'rgba(255,255,255,0.2)', wing: 'rgba(255,255,255,0.11)' , cine: { dark: true, base: ['#1B1036', '#06030E'], glow: '#7A3FE0', light: '#FFDDF2', ink: '#F8F0FF', soft: 'rgba(248,240,255,0.72)', accent: '#FFD66B' } },
  claro: { name: 'Claro', bg: ['#FFFFFF', '#E6ECFB'], ink: '#0F1B3D', muted: '#4A5677', accent: '#1F4FE0', line: 'rgba(15,27,61,0.12)', wing: 'rgba(31,79,224,0.06)' , cine: { dark: false, base: ['#F3EEE5', '#D9CFBF'], glow: '#FFFFFF', light: '#FFFFFF', ink: '#1B1712', soft: 'rgba(27,23,18,0.66)', accent: '#7A4E12' } },
  dourado: { name: 'Dourado', bg: ['#2B210C', '#0E0A03'], ink: '#FFF6E0', muted: 'rgba(255,240,205,0.7)', accent: '#F2C14E', line: 'rgba(242,193,78,0.22)', wing: 'rgba(242,193,78,0.10)' , cine: { dark: true, base: ['#1E160A', '#060402'], glow: '#7A5214', light: '#FFE3A8', ink: '#FFF4DE', soft: 'rgba(255,244,222,0.72)', accent: '#F2C14E' } },
};

export const FORMATS = {
  post: { name: 'Post (4:5)', w: 1080, h: 1350 },
  story: { name: 'Story (9:16)', w: 1080, h: 1920 },
};

const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
const SERIF = "'Instrument Serif', 'Playfair Display', Georgia, 'Times New Roman', serif";

export const STYLES = { cinema: 'Cinema', lista: 'Lista' };

export function defaultArt() {
  return { style: 'cinema', theme: 'noite', format: 'story', title: '', subtitle: '', phrase: '', place: '', showTeam: true, showSongs: true, photo: '' };
}

function font(weight, size, style = '') { return `${style} ${weight} ${size}px ${FONT}`.trim(); }

function spaced(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; }

// Quebra o texto em linhas que cabem na largura.
function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

// O desenho da asa (mesmas linhas do ícone), grande e suave no fundo.
function drawWing(ctx, x, y, size, color, lw = 6.5) {
  const s = size / 120;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  const paths = [
    [36, 90, 38, 54, 26, 30], [36, 90, 50, 52, 46, 24], [36, 90, 62, 54, 68, 26], [36, 90, 72, 62, 90, 40],
  ];
  for (const [x0, y0, cx, cy, x1, y1] of paths) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(36, 90); ctx.lineTo(88, 90); ctx.stroke();
  ctx.restore();
}

function coverImage(ctx, img, w, h) {
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * r, ih = img.naturalHeight * r;
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a foto de fundo.'));
    img.src = src;
  });
}

/**
 * Desenha a arte no canvas.
 * data: { ministry, title, subtitle, team: [{ role, name }], songs: [{ title, key }] }
 * art:  { theme, format, title, subtitle, phrase, showTeam, showSongs }   photo: imagem já carregada (opcional)
 */
export async function drawArt(canvas, data, art, photo) {
  return art.style === 'lista' ? drawList(canvas, data, art, photo) : drawCinema(canvas, data, art, photo);
}

async function drawList(canvas, data, art, photo) {
  const th = THEMES[art.theme] || THEMES.azul;
  const fm = FORMATS[art.format] || FORMATS.post;
  const W = fm.w, H = fm.h, P = 88;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  try { await Promise.all([document.fonts.load(font(800, 80)), document.fonts.load(font(600, 40)), document.fonts.load(font(400, 40, 'italic'))]); } catch { /* usa a fonte do sistema */ }

  // Fundo: foto (escurecida) ou degradê do tema, com a asa grande.
  if (photo) {
    coverImage(ctx, photo, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(5,10,30,0.55)'); g.addColorStop(0.45, 'rgba(5,10,30,0.62)'); g.addColorStop(1, 'rgba(5,10,30,0.86)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawWing(ctx, W * 0.36, H - W * 0.78, W * 0.86, th.wing);
  }
  const ink = photo ? '#FFFFFF' : th.ink;
  const muted = photo ? 'rgba(255,255,255,0.78)' : th.muted;
  const accent = th.accent;
  const line = photo ? 'rgba(255,255,255,0.22)' : th.line;
  const maxW = W - P * 2;
  ctx.textBaseline = 'alphabetic';

  // Cabeçalho: marca + nome do ministério.
  let y = P;
  drawWing(ctx, P - 10, y - 16, 74, accent);
  ctx.fillStyle = ink; ctx.font = font(700, 30); spaced(ctx, 4);
  ctx.fillText(ellipsize(ctx, String(data.ministry || '').toUpperCase(), maxW - 90), P + 82, y + 38);
  spaced(ctx, 0);
  y += 150;

  // Rodapé reservado: frase/versículo + assinatura.
  const footerH = 70;
  let phraseLines = [];
  if (art.phrase && art.phrase.trim()) {
    ctx.font = font(500, 36, 'italic');
    phraseLines = wrap(ctx, art.phrase.trim(), maxW).slice(0, 3);
  }
  const phraseH = phraseLines.length ? phraseLines.length * 50 + 40 : 0;
  const bottom = H - P - footerH - phraseH;

  const team = (art.showTeam ? data.team || [] : []).map((m) => ({ ...m, role: m.role.replace(/\((a|o)\)/gi, '').trim() }));
  const songs = art.showSongs ? data.songs || [] : [];
  const HEAD = 84;
  const two = team.length > 5;
  const teamRows = two ? Math.ceil(team.length / 2) : team.length;
  const need = (f) => (team.length ? HEAD + teamRows * f * 1.55 : 0) + (songs.length ? HEAD + songs.length * f * 1.55 : 0) + 24;
  const title = (art.title || data.title || '').trim();
  const titleLines = (ts) => { ctx.font = font(800, ts); return wrap(ctx, title, maxW); };
  const startY = (ts, n) => y + n * ts * 0.98 + 104;

  // Procura o maior título e o maior texto que cabem juntos.
  const maxTs = fm === FORMATS.story ? 132 : 118;
  let pick = null;
  // Primeiro o título grande; só depois diminui o texto da lista.
  for (let ts = maxTs; ts >= maxTs - 36 && !pick; ts -= 6) {
    const ls = titleLines(ts);
    if (ls.length > 3 || ls.some((l) => ctx.measureText(l).width > maxW)) continue;
    for (const fs of [38, 36, 34, 32, 30]) {
      if (need(fs) <= bottom - startY(ts, ls.length)) { pick = { fs, ts, ls }; break; }
    }
  }
  if (!pick) {
    let ts = maxTs - 36, ls = titleLines(ts);
    while (ts > 64 && (ls.length > 3 || ls.some((l) => ctx.measureText(l).width > maxW))) { ts -= 6; ls = titleLines(ts); }
    pick = { fs: 30, ts, ls };
  }
  // Centraliza o conjunto na altura disponível (com um leve peso para cima).
  {
    const used = startY(pick.ts, Math.min(3, pick.ls.length)) - y + ((team.length || songs.length) ? need(pick.fs) : 0);
    const free = bottom - y - used;
    if (free > 0) y += free * 0.4;
  }

  // Título.
  ctx.font = font(800, pick.ts); ctx.fillStyle = ink; spaced(ctx, -2);
  for (const l of pick.ls.slice(0, 3)) { y += pick.ts * 0.98; ctx.fillText(l, P, y); }
  spaced(ctx, 0);

  // Data e horário em destaque.
  y += 64;
  ctx.font = font(700, 38); spaced(ctx, 3); ctx.fillStyle = accent;
  ctx.fillText(ellipsize(ctx, (art.subtitle || data.subtitle || '').toUpperCase(), maxW), P, y);
  spaced(ctx, 0);
  y += 40;

  // Blocos: equipe e músicas.
  if (team.length || songs.length) {
    const fs = pick.fs, row = fs * 1.55;
    const blocks = (team.length ? 1 : 0) + (songs.length ? 1 : 0);
    let maxRows = Infinity;
    if (need(fs) > bottom - y) maxRows = Math.max(2, Math.floor((bottom - y - HEAD * blocks - 24) / row / blocks));

    const header = (label) => {
      y += 34;
      ctx.strokeStyle = line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W - P, y); ctx.stroke();
      y += 50;
      ctx.font = font(800, 26); spaced(ctx, 5); ctx.fillStyle = accent;
      ctx.fillText(label, P, y);
      spaced(ctx, 0);
    };

    if (team.length) {
      header('EQUIPE');
      const colW = two ? (maxW - 48) / 2 : maxW;
      const roleW = two ? colW * 0.4 : Math.min(320, colW * 0.34);
      const shown = Math.min(teamRows, maxRows);
      const hidden = team.length - shown * (two ? 2 : 1);
      for (let r = 0; r < shown; r++) {
        y += row;
        for (let c = 0; c < (two ? 2 : 1); c++) {
          const m = team[two ? r + c * teamRows : r];
          const x = P + c * (colW + 48);
          const last = r === shown - 1 && c === (two ? 1 : 0) && hidden > 0;
          if (last) {
            ctx.font = font(600, fs); ctx.fillStyle = muted;
            ctx.fillText(`+ ${hidden + 1} na equipe`, x, y);
            continue;
          }
          if (!m) continue;
          ctx.font = font(700, fs * 0.66); ctx.fillStyle = muted; spaced(ctx, 1.5);
          ctx.fillText(ellipsize(ctx, m.role.toUpperCase(), roleW - 12), x, y);
          spaced(ctx, 0);
          ctx.font = font(700, fs); ctx.fillStyle = ink;
          ctx.fillText(ellipsize(ctx, m.name, colW - roleW), x + roleW, y);
        }
      }
    }

    if (songs.length) {
      header('MÚSICAS');
      const shown = Math.min(songs.length, maxRows);
      for (let i = 0; i < shown; i++) {
        y += row;
        const s = songs[i];
        if (i === shown - 1 && shown < songs.length) {
          ctx.font = font(600, fs); ctx.fillStyle = muted;
          ctx.fillText(`+ ${songs.length - shown + 1} músicas`, P, y);
          break;
        }
        ctx.font = font(800, fs); ctx.fillStyle = accent;
        ctx.fillText(String(i + 1).padStart(2, '0'), P, y);
        let keyW = 0;
        if (s.key) {
          ctx.font = font(800, fs * 0.8);
          keyW = ctx.measureText(s.key).width + 34;
          const kx = W - P - keyW, ky = y - fs * 0.78;
          ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
          ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(kx, ky, keyW, fs * 1.08, 14); else ctx.rect(kx, ky, keyW, fs * 1.08); ctx.stroke();
          ctx.fillStyle = accent; ctx.fillText(s.key, kx + 17, y - fs * 0.04);
        }
        ctx.font = font(700, fs); ctx.fillStyle = ink;
        ctx.fillText(ellipsize(ctx, s.title, maxW - fs * 2 - keyW - 20), P + fs * 1.9, y);
      }
    }
  }

  // Frase ou versículo.
  if (phraseLines.length) {
    let py = H - P - footerH - phraseH + 40;
    ctx.fillStyle = accent; ctx.fillRect(P, py - 30, 6, phraseLines.length * 50 - 6);
    ctx.font = font(500, 36, 'italic'); ctx.fillStyle = ink;
    for (const l of phraseLines) { py += 0; ctx.fillText(l, P + 30, py); py += 50; }
  }

  // Assinatura discreta.
  ctx.font = font(700, 24); spaced(ctx, 4); ctx.fillStyle = muted; ctx.textAlign = 'right';
  ctx.fillText('FEITO NO ASA', W - P, H - P + 6);
  ctx.textAlign = 'left'; spaced(ctx, 0);
  return canvas;
}


// ---------- Estilo Cinema ----------

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function radial(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Textura de filme (granulado), sempre igual para a mesma arte.
let grainCanvas;
function grain(ctx, W, H, alpha) {
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = grainCanvas.height = 220;
    const g = grainCanvas.getContext('2d');
    const d = g.createImageData(220, 220);
    let seed = 7;
    for (let i = 0; i < d.data.length; i += 4) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const v = (seed >> 8) & 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Cena de luz: feixe vindo da esquerda e a asa desenhada com luz.
function lightScene(ctx, W, H, c, cy, wingSize) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c.base[0]); g.addColorStop(1, c.base[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  radial(ctx, W * 0.55, cy, W * 0.95, c.glow, c.dark ? 0.55 : 0.6);

  ctx.save();
  ctx.globalCompositeOperation = c.dark ? 'screen' : 'source-over';
  ctx.translate(-W * 0.08, cy + H * 0.04);
  ctx.rotate(-0.21);
  ctx.scale(1, 0.15);
  const b = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 1.3);
  b.addColorStop(0, rgba(c.light, c.dark ? 0.8 : 0.9));
  b.addColorStop(0.3, rgba(c.light, c.dark ? 0.28 : 0.5));
  b.addColorStop(1, rgba(c.light, 0));
  ctx.fillStyle = b; ctx.fillRect(-W * 1.4, -W * 1.4, W * 2.8, W * 2.8);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = c.dark ? 'screen' : 'source-over';
  radial(ctx, W * 0.1, cy + H * 0.03, W * 0.42, c.light, c.dark ? 0.5 : 0.7);
  ctx.restore();

  // Asa de luz no centro da cena.
  const size = wingSize;
  const wx = W * 0.5 - size * (60 / 120), wy = cy - size * (57 / 120);
  ctx.save();
  ctx.shadowColor = c.dark ? rgba(c.light, 0.95) : 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 60;
  drawWing(ctx, wx, wy, size, c.dark ? rgba(c.light, 0.92) : rgba(c.accent, 0.55), 2.4);
  ctx.shadowBlur = 18;
  drawWing(ctx, wx, wy, size, c.dark ? rgba('#FFFFFF', 0.85) : rgba(c.accent, 0.7), 1.1);
  ctx.restore();
}

function vignette(ctx, W, H, dark) {
  const v = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, dark ? 'rgba(0,0,0,0.7)' : 'rgba(70,50,20,0.2)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// Título: primeira palavra forte + o resto em itálico elegante (como "Culto Jimp").
function titleLayout(ctx, title, maxW, start, min) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const first = words[0] || '';
  const rest = words.slice(1).join(' ');
  for (let size = start; size >= min; size -= 4) {
    const sz2 = size * 1.16;
    ctx.font = font(800, size); spaced(ctx, -size * 0.03);
    const w1 = ctx.measureText(first).width;
    ctx.font = `italic 400 ${sz2}px ${SERIF}`; spaced(ctx, 0);
    const w2 = rest ? ctx.measureText(rest).width : 0;
    const gap = rest ? size * 0.22 : 0;
    if (w1 + gap + w2 <= maxW) return { size, sz2, first, rest, w1, w2, gap, lines: 1, maxW };
    if (rest && w1 <= maxW && w2 <= maxW && size <= start * 0.9) return { size, sz2, first, rest, w1, w2, gap, lines: 2, maxW };
  }
  // Muito longo: tudo na letra forte, em até 3 linhas.
  return { size: min, sz2: min * 1.16, first, rest, lines: 3, w1: maxW, w2: maxW, gap: 0, maxW };
}

function drawTitle(ctx, t, W, y, ink) {
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  if (t.lines === 1) {
    const x = (W - (t.w1 + t.gap + t.w2)) / 2;
    ctx.font = font(800, t.size); spaced(ctx, -t.size * 0.03);
    ctx.fillText(t.first, x, y);
    ctx.font = `italic 400 ${t.sz2}px ${SERIF}`; spaced(ctx, 0);
    if (t.rest) ctx.fillText(t.rest, x + t.w1 + t.gap, y);
    return y;
  }
  ctx.textAlign = 'center';
  ctx.font = font(800, t.size); spaced(ctx, -t.size * 0.03);
  ctx.fillText(t.first, W / 2, y);
  ctx.font = `italic 400 ${t.sz2}px ${SERIF}`; spaced(ctx, 0);
  const lines = wrap(ctx, t.rest, t.maxW || W * 0.84).slice(0, 2);
  let yy = y;
  for (const l of lines) { yy += t.sz2 * 0.92; ctx.fillText(l, W / 2, yy); }
  ctx.textAlign = 'left';
  return yy;
}

function small(ctx, text, x, y, align, color, size = 26, weight = 600, sp = 2) {
  ctx.font = font(weight, size); spaced(ctx, sp); ctx.fillStyle = color; ctx.textAlign = align;
  ctx.fillText(text, x, y);
  spaced(ctx, 0); ctx.textAlign = 'left';
}

async function drawCinema(canvas, data, art, photo) {
  const th = THEMES[art.theme] || THEMES.noite;
  const c = th.cine;
  const fm = FORMATS[art.format] || FORMATS.story;
  const story = fm === FORMATS.story;
  const W = fm.w, H = fm.h, P = 96;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  try {
    await Promise.all([document.fonts.load(font(800, 120)), document.fonts.load(font(600, 26)), document.fonts.load(`italic 400 120px ${SERIF}`)]);
  } catch { /* fontes do sistema */ }
  const ink = photo ? '#F4ECE2' : c.ink;
  const soft = photo ? 'rgba(244,236,226,0.75)' : c.soft;
  const accent = c.accent;

  // Medidas: título no alto, bloco de data embaixo, a cena de luz no espaço entre os dois.
  const title = (art.title || data.title || '').trim();
  const t = titleLayout(ctx, title, W - P * 1.4, story ? 176 : 140, 84);
  const titleY = (story ? 430 : 318) + (t.lines === 1 ? 0 : -t.size * 0.3);
  const titleBottom = titleY + (t.lines === 1 ? t.sz2 * 0.22 : t.sz2 * (t.lines === 3 ? 1.9 : 0.92) + t.sz2 * 0.22);
  const yL = story ? H * 0.715 : H * 0.655;
  const sceneTop = titleBottom + 30, sceneBottom = yL - 64;
  const cy = (sceneTop + sceneBottom) / 2 + 10;
  const wingSize = Math.max(220, Math.min(W * 0.78, (sceneBottom - sceneTop) * 1.25));

  // Fundo.
  if (photo) {
    coverImage(ctx, photo, W, H);
    ctx.fillStyle = rgba(c.base[1], 0.35); ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.32, 'rgba(0,0,0,0.12)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    vignette(ctx, W, H, true);
  } else {
    lightScene(ctx, W, H, c, cy, wingSize);
    vignette(ctx, W, H, c.dark);
  }
  grain(ctx, W, H, c.dark || photo ? 0.16 : 0.1);

  const w = data.when || {};
  const ministry = String(data.ministry || '').toUpperCase();

  // Topo: ministério, horário e data nos cantos, título.
  const yTop = story ? 118 : 86;
  small(ctx, ministry, W / 2, yTop, 'center', soft, 22, 700, 4);
  const yCorner = story ? 262 : 178;
  small(ctx, w.time || '', P, yCorner, 'left', ink, 30, 600, 1);
  small(ctx, w.short || '', W - P, yCorner, 'right', ink, 30, 600, 1);
  drawTitle(ctx, t, W, titleY, ink);

  // Parte de baixo.
  small(ctx, w.time || '', P, yL, 'left', ink, 30, 600, 1);
  small(ctx, w.short || '', W - P, yL, 'right', ink, 30, 600, 1);
  ctx.textAlign = 'center';
  ctx.font = font(800, 42); spaced(ctx, 1); ctx.fillStyle = ink;
  ctx.fillText(w.weekday || '', W / 2, yL);
  ctx.font = `italic 400 54px ${SERIF}`; spaced(ctx, 0);
  ctx.fillText(w.long || '', W / 2, yL + 52);
  let y = yL + 52;
  if (art.phrase && art.phrase.trim()) {
    ctx.font = `italic 400 38px ${SERIF}`; ctx.fillStyle = soft;
    for (const l of wrap(ctx, art.phrase.trim(), W * 0.7).slice(0, 2)) { y += 46; ctx.fillText(l, W / 2, y); }
  }
  ctx.textAlign = 'left';

  // Equipe (esquerda) e músicas (direita), em letras pequenas.
  const logoY = H - (story ? 178 : 118);
  const team = art.showTeam ? data.team || [] : [];
  const songs = art.showSongs ? data.songs || [] : [];
  const yC = y + (story ? 82 : 70);
  const lh = 32;
  const maxLines = Math.max(1, Math.floor((logoY - 48 - yC) / lh));
  const colX = [P + 40, W - P - 40];
  const colW = W / 2 - P - 70;
  const column = (items, x, align, label) => {
    if (!items.length) return;
    small(ctx, label, x, yC, align, accent, 20, 800, 4);
    const shown = items.length > maxLines ? maxLines - 1 : items.length;
    ctx.font = font(600, 23); spaced(ctx, 1.2);
    for (let i = 0; i < shown; i++) small(ctx, ellipsize(ctx, items[i], colW), x, yC + lh * (i + 1), align, ink, 23, 600, 1.2);
    if (shown < items.length) small(ctx, `+ ${items.length - shown}`, x, yC + lh * (shown + 1), align, soft, 23, 600, 1.2);
  };
  const teamItems = team.map((m) => `${m.name} · ${m.role.replace(/\((a|o)\)/gi, '')}`.toUpperCase());
  const songItems = songs.map((s) => `${s.title}${s.key ? ' (' + s.key + ')' : ''}`.toUpperCase());
  if (teamItems.length && songItems.length) {
    column(teamItems, colX[0], 'left', 'EQUIPE');
    column(songItems, colX[1], 'right', 'REPERTÓRIO');
  } else {
    column(teamItems.length ? teamItems : songItems, W / 2, 'center', teamItems.length ? 'EQUIPE' : 'REPERTÓRIO');
  }

  // Selo com a asa e rodapé.
  ctx.strokeStyle = rgba(ink.startsWith('#') ? ink : '#F4ECE2', 0.85); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(W / 2, logoY, 30, 0, Math.PI * 2); ctx.stroke();
  drawWing(ctx, W / 2 - 22, logoY - 26, 44, ink, 7);
  const footer = [ministry, (art.place || '').toUpperCase()].filter(Boolean);
  const fy = H - (story ? 78 : 46);
  if (footer.length === 2) {
    ctx.font = font(700, 20); spaced(ctx, 2);
    const a = ctx.measureText(footer[0]).width, b2 = ctx.measureText(footer[1]).width;
    const total = a + b2 + 50, x0 = (W - Math.min(total, W - P * 2)) / 2;
    small(ctx, footer[0], x0, fy, 'left', soft, 20, 700, 2);
    ctx.fillStyle = soft; ctx.fillRect(x0 + a + 24, fy - 18, 2, 22);
    small(ctx, ellipsize(ctx, footer[1], W - P * 2 - a - 50), x0 + a + 50, fy, 'left', soft, 20, 700, 2);
  } else {
    small(ctx, footer[0] || '', W / 2, fy, 'center', soft, 20, 700, 2);
  }
  return canvas;
}
