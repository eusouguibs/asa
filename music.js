// Asa — música: mudança de tom da cifra, detecção do tom, busca de músicas e links.

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const IDX = { C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11 };

// Grafias usadas na lista de tons (as mais comuns em cifras brasileiras).
export const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

// Acorde: tônica, complemento (m, 7, 7M, sus4, add9, dim, º, (9), etc.) e baixo opcional (G/B).
const CHORD = /^([A-G])([#b]?)((?:maj|min|dim|aug|sus|add|m|M|[0-9]|[+\-º°()#b]|\/(?=[0-9]))*)(?:\/([A-G])([#b]?))?$/;
// Pedaços que aparecem em linhas de acordes e não são acordes: |, -, x2, (2x), %, /.
const FILLER = /^(\|+|-+|\/+|%|\.+|x\d+|\d+x|\(x?\d+x?\)|\*+)$/i;
// Rótulos: "Intro:", "[Refrão]", "(Final)".
const LABEL = /^(\[[^\]]*\]|[^\s:]+:|\([A-Za-zÀ-ú ]+\))$/;

function splitWrap(tok) {
  const m = tok.match(/^([(\[]*)(.*?)([)\]]*)$/);
  // "C(9)" termina com ")" que faz parte do acorde: só tira o ")" se o resto continuar sendo acorde sem ele.
  if (m[3] && CHORD.test(m[2] + m[3]) && !m[1]) return ['', tok, ''];
  return [m[1], m[2], m[3]];
}

export function isChord(tok) {
  return CHORD.test(splitWrap(tok)[1]);
}

// Uma linha é de acordes quando todo pedaço dela é acorde, enchimento ou rótulo, e há pelo menos um acorde.
export function isChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return false;
  let chords = 0;
  for (const t of toks) {
    if (isChord(t)) chords++;
    else if (!FILLER.test(t) && !LABEL.test(t)) return false;
  }
  return chords > 0;
}

export function parseKey(key) {
  const m = String(key || '').trim().match(/^([A-G])([#b]?)(m?)$/);
  if (!m || IDX[m[1] + m[2]] === undefined) return null;
  return { root: IDX[m[1] + m[2]], minor: m[3] === 'm' };
}

export function keyName(root, minor) {
  return (minor ? MINOR_KEYS : MAJOR_KEYS)[((root % 12) + 12) % 12];
}

export function semitonesBetween(fromKey, toKey) {
  const a = parseKey(fromKey), b = parseKey(toKey);
  if (!a || !b) return 0;
  return (b.root - a.root + 12) % 12;
}

export function shiftKey(key, steps) {
  const k = parseKey(key);
  return k ? keyName(k.root + steps, k.minor) : key;
}

export function transposeChord(tok, steps, useFlat) {
  const [pre, core, post] = splitWrap(tok);
  const m = CHORD.exec(core);
  if (!m) return tok;
  const names = useFlat ? FLAT : SHARP;
  const root = names[(IDX[m[1] + m[2]] + steps + 120) % 12];
  const bass = m[4] ? '/' + names[(IDX[m[4] + (m[5] || '')] + steps + 120) % 12] : '';
  return pre + root + m[3] + bass + post;
}

// Troca os acordes de uma linha mantendo cada um em cima da mesma sílaba.
function transposeLine(line, steps, useFlat) {
  let out = '';
  const re = /\S+/g;
  let m;
  while ((m = re.exec(line))) {
    const tok = isChord(m[0]) ? transposeChord(m[0], steps, useFlat) : m[0];
    let start = m.index;
    if (out.length && start < out.length + 1) start = out.length + 1;
    out += ' '.repeat(Math.max(0, start - out.length)) + tok;
  }
  return out;
}

export function transposeText(text, steps, targetKey) {
  steps = ((steps % 12) + 12) % 12;
  if (!text || !steps) return text || '';
  const useFlat = FLAT_KEYS.has(targetKey);
  return text.split('\n').map((l) => (isChordLine(l) ? transposeLine(l, steps, useFlat) : l)).join('\n');
}

// Tom provável da cifra: o primeiro acorde da primeira linha de acordes.
export function detectKey(text) {
  for (const line of String(text || '').split('\n')) {
    if (!isChordLine(line)) continue;
    for (const t of line.trim().split(/\s+/)) {
      if (!isChord(t)) continue;
      const m = CHORD.exec(splitWrap(t)[1]);
      const minor = /^m(?!aj)/.test(m[3]);
      return keyName(IDX[m[1] + m[2]], minor);
    }
  }
  return '';
}

const escHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isTabLine = (l) => /[|].*-{2,}|-{2,}.*[|]/.test(l);

// HTML da cifra: acordes destacados; no modo "só letra" some com acordes e tablaturas.
export function renderCifra(text, { lyricsOnly = false } = {}) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = [];
  for (const l of lines) {
    if (isChordLine(l)) {
      if (lyricsOnly) continue;
      out.push(`<span class="ch">${escHtml(l)}</span>`);
    } else if (isTabLine(l)) {
      if (!lyricsOnly) out.push(`<span class="tab">${escHtml(l)}</span>`);
    } else if (/^\s*\[[^\]]+\]\s*$/.test(l)) {
      out.push(`<span class="part">${escHtml(l.trim())}</span>`);
    } else {
      out.push(escHtml(l));
    }
  }
  let html = out.join('\n');
  if (lyricsOnly) html = html.replace(/\n{3,}/g, '\n\n').trim();
  return html;
}

// Links de busca para ouvir e achar a cifra da música certa.
export function songLinks(title, artist) {
  const q = encodeURIComponent(`${title || ''} ${artist || ''}`.trim());
  return {
    cifra: `https://www.cifraclub.com.br/?q=${q}`,
    youtube: `https://www.youtube.com/results?search_query=${q}`,
    spotify: `https://open.spotify.com/search/${q}`,
  };
}

export function fmtDuration(sec) {
  sec = Number(sec) || 0;
  if (!sec) return '';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

// Busca no catálogo público da Apple (sem chave, funciona direto do celular).
export function searchSongs(term) {
  return new Promise((resolve, reject) => {
    const cb = 'asaBusca' + Date.now() + Math.floor(Math.random() * 1e4);
    const script = document.createElement('script');
    const timer = setTimeout(() => { done(); reject(new Error('A busca demorou demais. Tente de novo.')); }, 12000);
    function done() { clearTimeout(timer); delete window[cb]; script.remove(); }
    window[cb] = (data) => {
      done();
      const seen = new Set();
      const list = [];
      for (const r of data.results || []) {
        if (r.kind !== 'song') continue;
        const id = (r.trackName + '|' + r.artistName).toLowerCase();
        if (seen.has(id)) continue;
        seen.add(id);
        list.push({
          title: r.trackName,
          artist: r.artistName,
          album: r.collectionName || '',
          artwork: (r.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
          duration: Math.round((r.trackTimeMillis || 0) / 1000),
          preview: r.previewUrl || '',
        });
      }
      resolve(list);
    };
    script.onerror = () => { done(); reject(new Error('Não foi possível buscar agora. Confira a internet.')); };
    script.src = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=BR&media=music&entity=song&limit=25&callback=${cb}`;
    document.head.appendChild(script);
  });
}

// ---------- Preenchimento automático de links ----------

// "Ao Único (Ao Vivo)" -> "ao-unico", como nos endereços do Cifra Club.
export function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '').replace(/\s+-\s+.*$/, '').replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// "Davi Fernandes & Cultura do Céu" -> "Davi Fernandes" (o Cifra Club guarda no primeiro artista).
export function mainArtist(a) {
  return String(a || '').split(/\s*(?:&|,|\bfeat\.?|\bft\.?|\bpart\.?|\be\b|\bx\b)\s*/i)[0].trim();
}

// Endereço direto da cifra e da letra no Cifra Club.
export function cifraClubLinks(title, artist) {
  const a = slug(mainArtist(artist)), t = slug(title);
  if (!a || !t) return { cifra: '', letra: '' };
  const base = `https://www.cifraclub.com.br/${a}/${t}/`;
  return { cifra: base, letra: base + 'letra/' };
}

function jsonp(url, ms = 8000) {
  return new Promise((resolve, reject) => {
    const cb = 'asaJ' + Date.now() + Math.floor(Math.random() * 1e5);
    const s = document.createElement('script');
    const timer = setTimeout(() => { done(); reject(new Error('timeout')); }, ms);
    function done() { clearTimeout(timer); delete window[cb]; s.remove(); }
    window[cb] = (d) => { done(); resolve(d); };
    s.onerror = () => { done(); reject(new Error('erro')); };
    s.src = url + (url.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cb;
    document.head.appendChild(s);
  });
}

const norm = (s) => slug(s).replace(/-/g, ' ');

// Link exato da faixa no Deezer (para ouvir) e o BPM, quando o Deezer tiver.
export async function findAudio(title, artist) {
  try {
    const q = encodeURIComponent(`${title.replace(/\(.*?\)/g, '')} ${mainArtist(artist)}`.trim());
    const res = await jsonp(`https://api.deezer.com/search?q=${q}&limit=10`);
    const list = res.data || [];
    const t = norm(title), a = norm(mainArtist(artist));
    const pick = list.find((x) => norm(x.title) === t && norm(x.artist?.name).includes(a))
      || list.find((x) => norm(x.title).startsWith(t) && norm(x.artist?.name).includes(a))
      || list.find((x) => norm(x.artist?.name).includes(a));
    if (!pick) return null;
    let bpm = 0;
    try { bpm = Math.round((await jsonp(`https://api.deezer.com/track/${pick.id}`)).bpm || 0); } catch { /* sem BPM */ }
    return { audio: pick.link, bpm };
  } catch {
    return null;
  }
}
