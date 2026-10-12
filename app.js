// Asa — telas e navegação do app.
import { createApi, demoAdapter, supabaseAdapter, todayISO, addDays, artsOf, ROLE_ICONS, guessIcon } from './data.js?v=19';
import {
  MAJOR_KEYS, MINOR_KEYS, parseKey, shiftKey, semitonesBetween, transposeText, detectKey,
  renderCifra, songLinks, fmtDuration, searchSongs, cifraClubLinks, findAudio,
} from './music.js?v=19';
import { drawArt, defaultArt, THEMES, FORMATS, loadImage } from './art.js?v=19';
import { holyricsClient } from './holyrics.js?v=19';

const LINK_FIELDS = [
  ['cifra', 'Cifra', 'doc'],
  ['letra', 'Letra', 'text'],
  ['audio', 'Áudio', 'music'],
  ['video', 'Vídeo', 'play'],
];
const linksOf = (s) => {
  const l = (s && typeof s.links === 'object' && s.links) || {};
  return { cifra: l.cifra || '', letra: l.letra || '', audio: l.audio || '', video: l.video || (s && s.link) || '' };
};
const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : 'https://' + u);

// ---------- Utilidades ----------

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WDL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const STATUS = { pending: 'Pendente', confirmed: 'Confirmou', declined: 'Não pode' };
const EVENT_NAMES = ['Culto de domingo', 'Culto de oração', 'Santa ceia', 'Culto de jovens', 'Ensaio'];

const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtTime = (t) => (!t ? '' : t.endsWith(':00') ? `${Number(t.slice(0, 2))}h` : `${Number(t.slice(0, 2))}h${t.slice(3, 5)}`);
const fmtShort = (iso, t) => { const d = parseISO(iso); return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}${t ? ' · ' + fmtTime(t) : ''}`; };
const fmtLong = (iso, t) => { const d = parseISO(iso); return `${WDL[d.getDay()]}, ${d.getDate()} de ${MONL[d.getMonth()]}${t ? ' · ' + fmtTime(t) : ''}`; };
const fmtAgo = (ts) => {
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 864e5);
  return days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
};
const initial = (name) => esc((name || '?').trim().charAt(0).toUpperCase() || '?');
const firstName = (name) => (name || '').trim().split(/\s+/)[0] || '';
// Foto de perfil, ou a inicial do nome.
const face = (p, cls = '') => (p && p.avatar
  ? `<img class="avatar ${cls}" src="${esc(p.avatar)}" alt="" loading="lazy">`
  : `<span class="avatar ${cls}">${initial(p && p.name)}</span>`);
const profileOf = (userId) => S.md?.members.find((m) => m.user_id === userId)?.profile || { name: '?' };
const nextSunday = () => { const t = todayISO(); const dow = parseISO(t).getDay(); return addDays(t, (7 - dow) % 7 || 7); };
const byDate = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));

const I = {
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  music: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  clip: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6v16h12V5h-2"/>',
  text: '<path d="M5 6h14M5 12h14M5 18h9"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  mega: '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M7 8l5-5 5 5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  userPlus: '<circle cx="10" cy="8" r="4"/><path d="M2 21c1-4 4-6 8-6s7 2 8 6M19 7v6M16 10h6"/>',
  team: '<circle cx="12" cy="7" r="3"/><circle cx="5" cy="10" r="2.5"/><circle cx="19" cy="10" r="2.5"/><path d="M7 20c.6-3.4 2.6-5 5-5s4.4 1.6 5 5M1.5 19c.4-2.3 1.7-3.6 3.5-3.6M22.5 19c-.4-2.3-1.7-3.6-3.5-3.6"/>',
  shapes: '<path d="M12 3l5 8H7z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  sparkle: '<path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8zM18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z"/>',
  more: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
  screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/><path d="M11 13l9-9"/>',
};
const icon = (name, size = 22, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${I[name]}</svg>`;
const logo = (size = 36) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" rx="28" fill="#1F4FE0"/><g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"><path d="M36 90 Q38 54 26 30"/><path d="M36 90 Q50 52 46 24"/><path d="M36 90 Q62 54 68 26"/><path d="M36 90 Q72 62 90 40"/><path d="M36 90 L88 90"/></g><circle cx="94" cy="78" r="8" fill="#FFC83D"/></svg>`;

// ---------- Estado ----------

const S = {
  api: null,
  user: null,
  profile: null,
  ministries: [],
  mid: null,
  md: null,
  tab: 'inicio',
  stack: [],
  view: null,
  escalasPast: false,
  loginSent: null,
  pendingInvite: null,
  search: { term: '', results: [], loading: false, error: '' },
  playing: null,
  agenda: null,
  artEdit: null,
  artKind: 'escala',
  songView: null,
};

let audio = null;
function stopAudio() { if (audio) { audio.pause(); audio = null; } S.playing = null; }

function repaint() {
  const sc = root().querySelector('.scroll');
  paint(sc ? sc.scrollTop : 0);
}

// Capa da música (ou um ícone, se não houver).
function cover(s, size = '') {
  return s.artwork
    ? `<img class="cover ${size}" src="${esc(s.artwork)}" alt="" loading="lazy">`
    : `<span class="cover ${size} cover-empty">${icon('music', size ? 28 : 20)}</span>`;
}

// Preferências da tela da música: tom escolhido, só letra e tamanho do texto.
function songView(s, params, orig) {
  if (!S.songView || S.songView.id !== s.id || S.songView.forKey !== params.key) {
    let size = 15;
    try { size = Number(localStorage.getItem('asa-cifra-size')) || 15; } catch { /* ignore */ }
    S.songView = { id: s.id, forKey: params.key, key: params.key || orig, lyrics: false, size };
  }
  return S.songView;
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } },
};

const root = () => document.getElementById('app');

// Aberto pelo atalho da tela de início (app instalado)?
const installed = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

// Lembra que um código foi pedido, para o app continuar esperando o código mesmo se o celular
// fechar o app enquanto a pessoa abre o e-mail (o código vale por 1 hora).
function setLoginSent(email) {
  S.loginSent = email;
  store.set('asa-login-sent', email ? JSON.stringify({ email, at: Date.now() }) : null);
}
function restoreLoginSent() {
  try {
    const v = JSON.parse(store.get('asa-login-sent') || 'null');
    if (v && Date.now() - v.at < 60 * 60 * 1000) S.loginSent = v.email;
  } catch { /* ignore */ }
}
const me = () => S.md && S.md.members.find((m) => m.user_id === S.user.id);
const isAdmin = () => me()?.role === 'admin';
const nameOf = (userId) => S.md?.members.find((m) => m.user_id === userId)?.profile.name || 'Ex-membro';
const current = () => (S.stack.length ? S.stack[S.stack.length - 1] : { name: S.tab, params: {} });

let toastTimer;
function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

// Janela de confirmação desenhada no próprio app (as janelas do navegador são feias e às vezes bloqueadas).
function modal(inner) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${inner}</div>`;
  document.body.appendChild(wrap);
  return wrap;
}

function ask(message, custom) {
  const label = custom || (message.startsWith('Sair') ? 'Sair' : message.startsWith('Remover') ? 'Remover'
    : /^(Excluir|Tem certeza)/.test(message) ? 'Excluir' : 'Apagar');
  return new Promise((resolve) => {
    const wrap = modal(`<p class="modal-text">${esc(message)}</p>
      <div class="modal-actions"><button class="btn outline grow" data-r="0">Cancelar</button>
      <button class="btn ${custom ? 'primary' : 'danger'} grow" data-r="1">${label}</button></div>`);
    const close = (v) => { wrap.remove(); resolve(v); };
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) close(b.dataset.r === '1'); else if (e.target === wrap) close(false);
    });
    wrap.querySelector('[data-r="0"]').focus();
  });
}

// Janela de andamento: mostra cada passo e, no fim, o resultado.
function progress(text) {
  const wrap = modal(`<div class="progress-row"><span class="spinner" aria-hidden="true"></span><p class="modal-text" data-p>${esc(text)}</p></div>`);
  wrap.set = (t) => { const p = wrap.querySelector('[data-p]'); if (p) p.textContent = t; };
  wrap.done = (html, bad) => {
    wrap.querySelector('.modal').innerHTML = `<p class="modal-text" style="font-weight:500${bad ? ';color:var(--bad)' : ''}">${html}</p><button class="btn primary block" data-r="ok">OK</button>`;
    wrap.addEventListener('click', (e) => { if (e.target.closest('[data-r="ok"]') || e.target === wrap) wrap.remove(); });
  };
  return wrap;
}

function showText(title, text) {
  const wrap = modal(`<h2 class="h2">${esc(title)}</h2>
    <textarea class="input" readonly rows="7" style="min-height:0">${esc(text)}</textarea>
    <div class="modal-actions"><button class="btn outline grow" data-r="close">Fechar</button>
    <button class="btn primary grow" data-r="copy">Copiar</button></div>`);
  const area = wrap.querySelector('textarea');
  wrap.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-r]');
    if (e.target === wrap || b?.dataset.r === 'close') return wrap.remove();
    if (b?.dataset.r === 'copy') {
      try { await navigator.clipboard.writeText(text); toast('Convite copiado.'); wrap.remove(); }
      catch { area.focus(); area.select(); toast('Texto selecionado. Toque e segure para copiar.'); }
    }
  });
}

// ---------- Fluxo principal ----------

// O que muda pouco (perfil, ministérios, membros, funções) é carregado uma vez e guardado.
// Cada tela também fica guardada: ao voltar a ela, aparece na hora e se atualiza em seguida.
let ctxReady = false;
const invalidate = () => { ctxReady = false; };
const screenCache = new Map();
const CACHEABLE = new Set(['inicio', 'escalas', 'repertorio', 'ministerio', 'evento', 'musica', 'funcoes', 'ministerios']);
let refreshSeq = 0;

async function loadContext() {
  S.user = await S.api.auth.user();
  if (!S.user) return 'login';
  let [profile, ministries] = await Promise.all([S.api.profile(S.user.id), S.api.myMinistries(S.user.id)]);
  S.profile = profile;
  if (!profile || !profile.name) return 'nome';
  if (S.pendingInvite) {
    const code = S.pendingInvite;
    S.pendingInvite = null;
    store.set('asa-convite', null);
    try { S.mid = await S.api.joinMinistry(code); store.set('asa-mid', S.mid); toast('Você entrou no ministério!'); }
    catch (e) { toast(e.message); }
    ministries = await S.api.myMinistries(S.user.id);
  }
  S.ministries = ministries;
  if (!S.ministries.length) return 'semMinisterio';
  if (!S.ministries.some((m) => m.id === S.mid)) { S.mid = S.ministries[0].id; store.set('asa-mid', S.mid); }
  S.md = await S.api.ministryData(S.mid);
  cleanupOnceADay();
  ctxReady = true;
  return null;
}

const busy = (on) => document.body.classList.toggle('busy', on);

// Foto da última abertura: o app abre mostrando o Início na hora e atualiza por trás.
function saveSnap(home) {
  if (!S.user || !S.md) return;
  try {
    const prev = JSON.parse(localStorage.getItem('asa-snap') || 'null');
    const snap = { uid: S.user.id, profile: S.profile, ministries: S.ministries, md: S.md, mid: S.mid, home: home || (prev && prev.mid === S.mid ? prev.home : null) };
    localStorage.setItem('asa-snap', JSON.stringify(snap));
  } catch { /* sem espaço: segue sem foto */ }
}
const clearSnap = () => { try { localStorage.removeItem('asa-snap'); } catch { /* ignore */ } };

let snapTried = false;
async function trySnap() {
  if (snapTried) return false;
  snapTried = true;
  let snap;
  try { snap = JSON.parse(localStorage.getItem('asa-snap') || 'null'); } catch { snap = null; }
  if (!snap || !snap.md || !snap.home) return false;
  S.user = await S.api.auth.user();
  if (!S.user || S.user.id !== snap.uid) return false;
  Object.assign(S, { profile: snap.profile, ministries: snap.ministries, md: snap.md, mid: snap.mid });
  screenCache.set(`${S.mid}|inicio|{}`, snap.home);
  ctxReady = true;
  // Atualiza tudo por trás e redesenha quando chegar.
  loadContext().then((gate) => { if (gate) { ctxReady = false; } refresh({ keepScroll: true }); }).catch(() => {});
  return true;
}

async function refresh({ keepScroll = false } = {}) {
  stopAudio();
  const seq = ++refreshSeq;
  const scroller = root().querySelector('.scroll');
  const top = keepScroll && scroller ? scroller.scrollTop : 0;
  busy(true);
  try {
    if (!ctxReady && !S.stack.length && S.tab === 'inicio') await trySnap();
    if (!ctxReady) {
      const gate = await loadContext();
      if (seq !== refreshSeq) return;
      if (gate) { S.view = { screen: gate }; return paint(top); }
    }
    const cur = current();
    const params = cur.params || {};
    const screen = SCREENS[cur.name];
    const key = `${S.mid}|${cur.name}|${JSON.stringify(params)}`;
    const cached = CACHEABLE.has(cur.name) && screenCache.get(key);
    let shown = false;
    if (cached && !keepScroll) {
      S.view = { screen: cur.name, params, data: cached };
      paint(top);
      shown = true;
    }
    const data = screen.load ? await screen.load(params) : {};
    if (seq !== refreshSeq) return; // a pessoa já foi para outra tela
    if (CACHEABLE.has(cur.name)) screenCache.set(key, data);
    if (cur.name === 'inicio') saveSnap(data); else if (ctxReady) saveSnap();
    if (shown) {
      // Só redesenha se algo mudou, e sem atrapalhar quem está digitando.
      const typing = root().contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (typing || JSON.stringify(data) === JSON.stringify(cached)) { S.view.data = data; return; }
      const sc = root().querySelector('.scroll');
      S.view = { screen: cur.name, params, data };
      return paint(sc ? sc.scrollTop : 0);
    }
    S.view = { screen: cur.name, params, data };
  } catch (e) {
    console.error(e);
    if (seq !== refreshSeq) return;
    S.view = { screen: 'erro', data: { message: friendly(e.message) } };
  } finally {
    if (seq === refreshSeq) busy(false);
  }
  paint(top);
}

// Uma vez por dia, quando um administrador abre o app, apaga banners de eventos de mais de 3 dias atrás.
function cleanupOnceADay() {
  if (!isAdmin() || S.api.mode !== 'supabase') return;
  const key = 'asa-faxina-' + S.mid;
  const today = todayISO();
  if (store.get(key) === today) return;
  store.set(key, today);
  S.api.cleanupBanners(S.mid, addDays(today, -3)).catch((e) => console.warn('faxina', e));
}

function paint(scrollTop = 0) {
  const { screen, params = {}, data = {} } = S.view;
  const def = SCREENS[screen];
  const tabScreen = ['inicio', 'escalas', 'repertorio', 'ministerio'].includes(screen) && !S.stack.length;
  root().innerHTML = `<div class="shell">${def.view(data, params)}${tabScreen ? navBar(screen) : ''}</div>`;
  const scroller = root().querySelector('.scroll');
  if (scroller) scroller.scrollTop = scrollTop;
  if (def.after) def.after(data, params);
  const auto = root().querySelector('[autofocus]');
  if (auto && !('ontouchstart' in window)) auto.focus();
}

function push(name, params = {}) { S.stack.push({ name, params }); refresh(); }
function replace(name, params = {}) { S.stack.pop(); S.stack.push({ name, params }); refresh(); }
function back() { S.stack.pop(); refresh(); }

// Mensagens de erro do servidor, em português.
function friendly(msg = '') {
  const m = msg.toLowerCase();
  const wait = msg.match(/after (\d+) seconds?/i);
  if (wait) return `Espere ${wait[1]} segundos para pedir outro código.`;
  if (m.includes('rate limit')) return 'Muitos e-mails enviados em pouco tempo. Espere um pouco e tente de novo.';
  if (m.includes('expired') || m.includes('invalid') && m.includes('token')) return 'Código incorreto ou vencido. Confira o último e-mail ou peça outro.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com a internet. Confira o sinal e tente de novo.';
  if (m.includes('invalid') && m.includes('email')) return 'Esse e-mail parece estar errado. Confira e tente de novo.';
  return msg || 'Algo deu errado. Tente de novo.';
}

async function run(fn, okMsg) {
  try {
    await fn();
    screenCache.clear();
    if (okMsg) toast(okMsg);
    return true;
  } catch (e) {
    console.error(e);
    toast(friendly(e.message));
    return false;
  }
}

// ---------- Pedaços de tela ----------

function navBar(active) {
  const tabs = [['inicio', 'Início', 'home'], ['escalas', 'Escalas', 'cal'], ['repertorio', 'Repertório', 'music'], ['ministerio', 'Ministério', 'people']];
  return `<nav class="nav" aria-label="Menu principal">${tabs.map(([id, label, ic]) =>
    `<button data-act="tab" data-tab="${id}" ${id === active ? 'aria-current="page"' : ''}><span class="pill">${icon(ic)}</span>${label}</button>`).join('')}</nav>`;
}

const backBtn = (label = 'Voltar') => `<button class="back" data-act="back">${icon('back', 20)}${esc(label)}</button>`;
const header = (title, sub) => `<div class="title-block"><h1 class="h1">${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`;
const menuItem = (ic, label, screen, count) => `<button class="item" data-act="open" data-screen="${screen}"><span class="menu-ic">${icon(ic)}</span>
  <span class="item-main"><span class="item-title">${esc(label)}</span></span>${count != null ? `<span class="item-sub">${count}</span>` : ''}${icon('chev', 18)}</button>`;
const fab = (act, label) => `<button class="fab" data-act="${act}">${icon('plus', 20)}${esc(label)}</button>`;
const tagStatus = (s) => `<span class="tag ${s}">${s === 'confirmed' ? '✓ ' : s === 'declined' ? '✕ ' : ''}${STATUS[s]}</span>`;
const demoBanner = () => (S.api.mode === 'demo'
  ? '<div class="banner"><strong>Modo demonstração.</strong> Os dados são de exemplo e ficam só neste aparelho.</div>'
  : '');

function eventCard(ev, assigns) {
  const list = assigns.filter((a) => a.event_id === ev.id);
  const mine = list.find((a) => a.user_id === S.user.id);
  const ok = list.filter((a) => a.status === 'confirmed').length;
  const d = parseISO(ev.date);
  return `<button class="event-card ${mine ? 'mine' : ''}" data-act="open" data-screen="evento" data-id="${ev.id}">
    <div class="date-block ${mine ? 'mine' : ''}"><span>${WD[d.getDay()]}</span><span>${d.getDate()}</span><span>${MON[d.getMonth()]}</span></div>
    <div class="meta">
      <span class="name">${esc(ev.title)}</span>
      <span class="item-sub">${fmtTime(ev.time) || 'Sem horário'} · ${list.length} ${list.length === 1 ? 'pessoa' : 'pessoas'}</span>
      <div class="row">${mine ? `<span class="tag pending">Você: ${esc(mine.role_name)}</span>` : ''}
        <span class="item-sub">${list.length ? `${ok} de ${list.length} confirmados` : 'Equipe a definir'}</span></div>
    </div></button>`;
}

function whatsappText(ev) {
  const lines = [`*${ev.title}*`, fmtLong(ev.date, ev.time), ''];
  if (ev.assignments.length) {
    lines.push('*Equipe*');
    for (const a of ev.assignments) lines.push(`• ${a.role_name}: ${nameOf(a.user_id)}${a.status === 'confirmed' ? ' ✅' : a.status === 'declined' ? ' ❌' : ' ⏳'}`);
    lines.push('');
  }
  if (ev.songs.length) {
    lines.push('*Músicas*');
    ev.songs.forEach((x, i) => lines.push(`${i + 1}. ${x.song.title}${x.key ? ` (${x.key})` : ''}`));
    lines.push('');
  }
  if (ev.notes) lines.push(ev.notes, '');
  lines.push('Confirme sua presença no Asa.');
  return lines.join('\n');
}

const inviteLink = (code) => `${location.origin}${location.pathname}?convite=${encodeURIComponent(code)}`;

// Artes do evento: "Escala da equipe" (lista, para o time) e "Capa do culto" (cinema, para divulgar).
const ART_KINDS = { escala: 'Escala da equipe', capa: 'Capa do culto' };
const artSettings = (ev, kind) => ({ ...defaultArt(kind), ...(artsOf(ev.art)[kind] || {}), style: kind === 'escala' ? 'lista' : 'cinema' });

function bannerBlock(ev, admin) {
  const kind = S.artKind || 'escala';
  const input = `<input type="file" accept="image/*" data-banner="${ev.id}" class="sr-only" id="banner-${ev.id}">`;
  const flyer = kind === 'capa' && ev.banner;
  const frame = flyer
    ? `<a href="${esc(ev.banner)}" target="_blank" rel="noopener" class="event-banner-link"><img class="event-banner" src="${esc(ev.banner)}" alt="Capa de ${esc(ev.title)}"></a>`
    : `<div class="art-frame" style="aspect-ratio:${artRatio(artSettings(ev, kind))}"><img class="art-img" data-art-for="${ev.id}" data-kind="${kind}" alt="${ART_KINDS[kind]}: ${esc(ev.title)}"></div>`;
  return `<div class="section">
    <div class="section-head"><h2 class="h2">Artes</h2>
      ${admin && !flyer ? `<button class="btn link small" data-act="open" data-screen="arte" data-id="${ev.id}" data-kind="${kind}">${icon('edit', 18)}Editar</button>` : ''}</div>
    <div class="seg" role="group" aria-label="Qual arte">${Object.entries(ART_KINDS).map(([k, n]) => `
      <button data-act="artKind" data-v="${k}" aria-pressed="${kind === k}">${n}</button>`).join('')}</div>
    <p class="item-sub" style="margin:0">${kind === 'escala' ? 'Com a equipe e as músicas, para mandar no grupo do ministério.' : flyer ? 'Flyer enviado por um administrador.' : 'Para divulgar o culto no status, no Instagram e no grupo da igreja.'}</p>
    ${frame}
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn primary small grow" data-act="shareArt" data-kind="${kind}">${icon('share', 18)}Compartilhar</button>
      ${admin && kind === 'capa' ? (flyer
        ? `<label class="btn outline small" for="banner-${ev.id}">${icon('swap', 18)}Trocar</label>${input}
           <button class="btn danger small" data-act="removeBanner">${icon('trash', 18)}Usar capa automática</button>`
        : `<label class="btn outline small grow" for="banner-${ev.id}">${icon('image', 18)}Usar flyer pronto</label>${input}`) : ''}</div>
  </div>`;
}

// ---------- Arte da escala ----------

const artRatio = (a) => { const f = FORMATS[a.format] || FORMATS.story; return `${f.w} / ${f.h}`; };
const artCache = new Map(); // "evento:tipo" -> último arquivo desenhado (para compartilhar)

function artData(ev) {
  const order = S.md.roles.map((r) => r.name);
  const team = ev.assignments
    .filter((a) => a.status !== 'declined')
    .sort((a, b) => ((order.indexOf(a.role_name) + 1 || 99) - (order.indexOf(b.role_name) + 1 || 99)))
    .map((a) => ({ role: a.role_name, name: firstName(nameOf(a.user_id)) }));
  const d = parseISO(ev.date);
  return {
    ministry: S.md.ministry.name,
    title: ev.title,
    subtitle: fmtLong(ev.date, ev.time),
    when: {
      time: (fmtTime(ev.time) || '').toUpperCase(),
      short: `${d.getDate()} ${MON[d.getMonth()].toUpperCase()}`,
      weekday: WDL[d.getDay()].toUpperCase(),
      long: `${d.getDate()} de ${MONL[d.getMonth()]}`,
    },
    team,
    songs: ev.songs.map((x) => ({ title: x.song.title, key: x.key })),
  };
}

async function renderArt(img, ev, kind, settings, photoImg) {
  try {
    let photo = photoImg;
    if (photo === undefined && settings.photo) photo = await loadImage(settings.photo).catch(() => null);
    const canvas = await drawArt(document.createElement('canvas'), artData(ev), settings, photo || null);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    artCache.set(ev.id + ':' + kind, blob);
    if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    img.dataset.url = URL.createObjectURL(blob);
    img.src = img.dataset.url;
    img.closest('.art-frame')?.classList.add('ready');
  } catch (e) {
    console.error(e);
    toast('Não foi possível desenhar a arte.');
  }
}

async function shareArt(ev, kind) {
  let blob = artCache.get(ev.id + ':' + kind);
  if (kind === 'capa' && ev.banner && current().name === 'evento') {
    try { blob = await (await fetch(ev.banner)).blob(); } catch { blob = null; }
  }
  if (!blob) return toast('A arte ainda está sendo preparada.');
  const name = `${kind}-${ev.title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${ev.date}.jpg`;
  const file = new File([blob], name, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: ev.title }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const wrap = modal(`<img src="${url}" alt="Arte" style="width:100%;border-radius:12px">
    <p class="sub" style="margin:0;text-align:center">Toque e segure na imagem para salvar ou compartilhar.</p>
    <a class="btn primary" href="${url}" download="${esc(name)}">Baixar imagem</a>
    <button class="btn outline" data-r="close">Fechar</button>`);
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-r="close"]')) wrap.remove(); });
}

// Reduz a foto no próprio celular (lado maior com 1280 px, JPG) antes de enviar.
async function resizeImage(file, max = 1280) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Não foi possível abrir essa imagem. Tente outra.'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) throw new Error('Não foi possível preparar a imagem.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Agenda da tela inicial: eventos da semana ou do mês. Some quando não há nada marcado no mês.
function agenda(events, assigns, today) {
  const weekEnd = addDays(today, 6);
  const monthEnd = todayISO(new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0));
  const month = events.filter((e) => e.date >= today && e.date <= monthEnd).sort(byDate);
  const week = events.filter((e) => e.date >= today && e.date <= weekEnd).sort(byDate);
  if (!month.length && !week.length) return '';
  let mode = S.agenda;
  if (!mode) mode = week.length ? 'semana' : 'mes';
  if (mode === 'semana' && !week.length) mode = 'mes';
  const list = mode === 'semana' ? week : month;
  return `<div class="section">
    <div class="section-head"><h2 class="h2">Agenda</h2>
      <div class="seg seg-sm" role="group" aria-label="Período da agenda">
        <button data-act="agenda" data-v="semana" aria-pressed="${mode === 'semana'}" ${week.length ? '' : 'disabled'}>Semana</button>
        <button data-act="agenda" data-v="mes" aria-pressed="${mode === 'mes'}">${MONL[Number(today.slice(5, 7)) - 1][0].toUpperCase() + MONL[Number(today.slice(5, 7)) - 1].slice(1)}</button></div></div>
    <div class="list">${list.map((e) => {
      const d = parseISO(e.date);
      const mine = assigns.find((a) => a.event_id === e.id && a.user_id === S.user.id);
      const n = assigns.filter((a) => a.event_id === e.id).length;
      return `<button class="item ${e.banner ? 'item-banner' : ''}" data-act="open" data-screen="evento" data-id="${e.id}">
        ${e.banner ? `<img src="${esc(e.banner)}" alt="" loading="lazy">` : ''}<span class="item-row">
        <span class="date-block ${mine ? 'mine' : ''}" style="width:46px;padding:6px 0"><span>${WD[d.getDay()]}</span><span style="font-size:19px">${d.getDate()}</span></span>
        <span class="item-main"><span class="item-title">${esc(e.title)}</span>
          <span class="item-sub">${e.date === today ? 'Hoje' : e.date === addDays(today, 1) ? 'Amanhã' : MON[d.getMonth()]}${e.time ? ' · ' + fmtTime(e.time) : ''} · ${n ? `${n} ${n === 1 ? 'pessoa' : 'pessoas'}` : 'equipe a definir'}</span></span>
        ${mine ? `<span class="tag pending">${esc(mine.role_name)}</span>` : ''}</span></button>`;
    }).join('')}</div></div>`;
}

// ---------- Telas ----------

const SCREENS = {
  erro: {
    view: (d) => `<div class="center-screen"><div class="brand">${logo(64)}<h1 class="h1">Algo deu errado</h1>
      <p class="sub">${esc(d.message)}</p></div><button class="btn primary block" data-act="reload">Tentar de novo</button></div>`,
  },

  login: {
    view: () => {
      if (S.api.mode === 'demo') {
        return `<div class="center-screen"><div class="brand">${logo(84)}<h1 class="h1">Asa</h1>
          <p class="sub">Escalas, repertório e avisos do seu ministério, num lugar só.</p></div>
          <button class="btn primary block" data-act="demoLogin">Entrar na demonstração</button>
          <p class="sub" style="text-align:center">Nesta versão de teste você entra como “Gui”, com dados de exemplo.</p></div>`;
      }
      if (S.loginSent) {
        return `<div class="center-screen"><div class="brand">${logo(84)}<h1 class="h1">Confira seu e-mail</h1>
          <p class="sub">Enviamos um código para <strong>${esc(S.loginSent)}</strong>. Pode demorar um minuto e às vezes cai no spam.</p></div>
          <div class="banner"><strong>Digite o código que chegou no e-mail.</strong> Não toque no link do e-mail: ele abre o navegador, e você continuaria sem entrar ${installed() ? 'neste app' : 'aqui'}.</div>
          <form class="form" data-form="codigo">
            <label class="field"><span>Código de acesso</span>
              <input class="input" name="code" required inputmode="numeric" autocomplete="one-time-code"
                placeholder="código" style="font-size:24px;letter-spacing:0.3em;text-align:center" autofocus></label>
            <button class="btn primary block">Entrar</button></form>
          <p class="sub" style="text-align:center">Chegou um <strong>link</strong> em vez de código? Não toque nele: toque e segure, escolha <strong>Copiar</strong> e depois toque abaixo.</p>
          <button class="btn outline block" data-act="pasteLink">Colar link do e-mail</button>
          <button class="btn link" data-act="loginAgain">Usar outro e-mail ou reenviar</button></div>`;
      }
      return `<div class="center-screen"><div class="brand">${logo(84)}<h1 class="h1">Asa</h1>
        <p class="sub">Escalas, repertório e avisos do seu ministério, num lugar só.</p></div>
        <form class="form" data-form="login">
          <label class="field"><span>Seu e-mail</span>
            <input class="input" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="voce@exemplo.com" value="${esc(store.get('asa-email') || '')}"></label>
          <button class="btn primary block">Receber código de acesso</button>
          <small class="sub" style="text-align:center">Sem senha: você recebe um código no e-mail. Depois de entrar uma vez, o Asa abre direto${installed() ? ' por este atalho' : ''}.</small>
        </form></div>`;
    },
  },

  nome: {
    view: () => `<div class="center-screen"><div class="brand">${logo(64)}<h1 class="h1">Como você se chama?</h1>
      <p class="sub">É assim que o líder vai ver você nas escalas.</p></div>
      <form class="form" data-form="perfil">
        <label class="field"><span>Nome</span><input class="input" name="name" required maxlength="40" autocomplete="given-name" autofocus></label>
        <label class="field"><span>Aniversário <small>(opcional)</small></span><input class="input" name="birthday" type="date"></label>
        <button class="btn primary block">Continuar</button></form></div>`,
  },

  semMinisterio: {
    view: () => `<div class="scroll"><div class="brand" style="padding-top:24px">${logo(64)}
      <h1 class="h1">Bem-vindo, ${esc(firstName(S.profile.name))}!</h1>
      <p class="sub">Entre no ministério da sua igreja ou crie um novo.</p></div>
      <form class="card form" data-form="entrar">
        <h2 class="h2">Tenho um código de convite</h2>
        <label class="field"><span class="sr-only">Código de convite</span>
          <input class="input" name="code" required maxlength="12" placeholder="Ex.: VIDA26" style="text-transform:uppercase;letter-spacing:0.12em"></label>
        <button class="btn primary block">Entrar no ministério</button></form>
      <form class="card form" data-form="criarMinisterio">
        <h2 class="h2">Sou líder e quero criar</h2>
        <label class="field"><span class="sr-only">Nome do ministério</span>
          <input class="input" name="name" required maxlength="60" placeholder="Ex.: Louvor Vida Renovada"></label>
        <button class="btn outline block">Criar ministério</button></form>
      <button class="btn link" data-act="signOut">Sair da conta</button></div>`,
  },

  // ----- Início -----
  inicio: {
    async load() {
      const [events, assigns, notices] = await Promise.all([S.api.events(S.mid), S.api.allAssignments(S.mid), S.api.notices(S.mid)]);
      return { events, assigns, notices };
    },
    view: ({ events, assigns, notices }) => {
      const today = todayISO();
      const upcoming = events.filter((e) => e.date >= today).sort(byDate);
      const mineUp = upcoming.map((e) => ({ e, a: assigns.find((x) => x.event_id === e.id && x.user_id === S.user.id) })).filter((x) => x.a);
      const weekEnd = addDays(today, 7);
      const thisWeek = mineUp.filter((x) => x.e.date <= weekEnd).length;
      const next = mineUp[0];
      const month = today.slice(5, 7);
      const bdays = S.md.members.filter((m) => m.profile.birthday && m.profile.birthday.slice(5, 7) === month)
        .sort((a, b) => a.profile.birthday.slice(8).localeCompare(b.profile.birthday.slice(8)));
      const agendaHtml = agenda(events, assigns, today);
      const lastNotices = notices.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
      const multi = S.ministries.length > 1;
      return `<div class="scroll">
        <div class="topbar">${logo(36)}
          <button class="grow" data-act="${multi ? 'open' : 'tab'}" data-screen="ministerios" data-tab="ministerio" style="border:0;background:none;text-align:left;padding:0;cursor:pointer;display:flex;flex-direction:column">
            <span class="item-sub">Ministério</span><span style="font-size:16px;font-weight:700">${esc(S.md.ministry.name)}${multi ? ' ▾' : ''}</span></button>
          <button class="avatar-btn" data-act="open" data-screen="perfil" aria-label="Meu perfil">${face(S.profile, 'lg me')}</button>
        </div>
        ${demoBanner()}
        <div class="title-block"><h1 class="h1">Olá, ${esc(firstName(S.profile.name))}</h1>
          <p class="sub">${thisWeek ? `Você tem ${thisWeek} ${thisWeek === 1 ? 'escala' : 'escalas'} nos próximos 7 dias.` : 'Nenhuma escala sua nos próximos 7 dias.'}</p></div>
        ${next ? `<div class="hero" >
            <div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow">Sua próxima escala</span>${tagStatus(next.a.status)}</div>
            <button data-act="open" data-screen="evento" data-id="${next.e.id}" style="all:unset;cursor:pointer;display:flex;flex-direction:column;gap:4px">
              <span class="big">${esc(next.e.title)}</span>
              <span class="small">${fmtShort(next.e.date, next.e.time)} · ${esc(next.a.role_name)}</span></button>
            ${next.a.status === 'pending' ? `<div class="hero-actions">
              <button class="btn white grow" data-act="status" data-id="${next.a.id}" data-status="confirmed">Confirmar</button>
              <button class="btn outline-light grow" data-act="status" data-id="${next.a.id}" data-status="declined">Não posso</button></div>`
              : `<button class="btn outline-light" data-act="open" data-screen="evento" data-id="${next.e.id}">Ver escala completa</button>`}
          </div>` : `<div class="empty">Quando o líder escalar você, a escala aparece aqui.</div>`}
        ${agendaHtml}
        <div class="section"><div class="section-head"><h2 class="h2">Avisos</h2>
          ${isAdmin() ? `<button class="btn link small" data-act="open" data-screen="aviso">${icon('plus', 18)}Novo aviso</button>` : ''}</div>
          ${lastNotices.length ? `<div class="list">${lastNotices.map((n) => `<div class="item static">
            <span style="color:var(--blue)">${icon('mega')}</span>
            <div class="item-main"><span class="item-title" style="white-space:pre-wrap;font-weight:600">${esc(n.text)}</span>
            <span class="item-sub">${esc(firstName(nameOf(n.author_id)))} · ${fmtAgo(n.created_at)}</span></div>
            ${isAdmin() ? `<button class="icon-btn" data-act="delNotice" data-id="${n.id}" aria-label="Apagar aviso">${icon('x', 18)}</button>` : ''}</div>`).join('')}</div>`
            : '<div class="empty">Nenhum aviso por enquanto.</div>'}</div>
        <div class="section"><h2 class="h2">Aniversariantes de ${MONL[Number(month) - 1]}</h2>
          ${bdays.length ? `<div class="list">${bdays.map((m) => `<div class="item static">${m.profile.avatar ? face(m.profile) : `<span class="avatar gold">${initial(m.profile.name)}</span>`}
            <div class="item-main"><span class="item-title">${esc(m.profile.name)}</span><span class="item-sub">${Number(m.profile.birthday.slice(8))} de ${MONL[Number(month) - 1]}</span></div></div>`).join('')}</div>`
            : '<div class="empty">Ninguém faz aniversário este mês.</div>'}</div>
      </div>`;
    },
  },

  // ----- Escalas -----
  escalas: {
    async load() {
      const [events, assigns] = await Promise.all([S.api.events(S.mid), S.api.allAssignments(S.mid)]);
      return { events, assigns };
    },
    view: ({ events, assigns }) => {
      const today = todayISO();
      const list = S.escalasPast
        ? events.filter((e) => e.date < today).sort(byDate).reverse()
        : events.filter((e) => e.date >= today).sort(byDate);
      return `<div class="scroll">${header('Escalas', S.md.ministry.name)}
        <div class="seg" role="group" aria-label="Período">
          <button data-act="past" data-v="0" aria-pressed="${!S.escalasPast}">Próximas</button>
          <button data-act="past" data-v="1" aria-pressed="${S.escalasPast}">Anteriores</button></div>
        ${list.length ? list.map((e) => eventCard(e, assigns)).join('')
          : `<div class="empty">${S.escalasPast ? 'Nenhuma escala anterior.' : isAdmin() ? 'Nenhuma escala marcada. Toque em “+ Escala” para criar.' : 'Nenhuma escala marcada ainda.'}</div>`}
      </div>${isAdmin() ? fab('newEvent', 'Escala') : ''}`;
    },
  },

  evento: {
    load: async ({ id }) => ({ ev: await S.api.eventDetail(id) }),
    after: ({ ev }) => {
      const img = ev && root().querySelector(`[data-art-for="${ev.id}"]`);
      if (img) renderArt(img, ev, img.dataset.kind, artSettings(ev, img.dataset.kind));
    },
    view: ({ ev }) => {
      if (!ev) return `<div class="scroll">${backBtn('Escalas')}<div class="empty">Esta escala foi apagada.</div></div>`;
      const admin = isAdmin();
      const mine = ev.assignments.find((a) => a.user_id === S.user.id);
      const ok = ev.assignments.filter((a) => a.status === 'confirmed').length;
      const roleOrder = S.md.roles.map((r) => r.name);
      const team = ev.assignments.slice().sort((a, b) => {
        const ia = roleOrder.indexOf(a.role_name); const ib = roleOrder.indexOf(b.role_name);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      const bar = mine
        ? `<div class="bottom-bar">${mine.status === 'pending'
          ? `<button class="btn outline grow" data-act="status" data-id="${mine.id}" data-status="declined">Não posso</button>
             <button class="btn primary grow2" data-act="status" data-id="${mine.id}" data-status="confirmed">Confirmar presença</button>`
          : mine.status === 'confirmed'
            ? `<button class="btn ok grow" data-act="status" data-id="${mine.id}" data-status="pending">✓ Presença confirmada · desfazer</button>`
            : `<button class="btn danger grow" data-act="status" data-id="${mine.id}" data-status="pending">Você avisou que não pode · desfazer</button>`}</div>`
        : '';
      return `<div class="scroll ${mine ? 'with-bar' : ''}">
        <div class="section-head">${backBtn('Escalas')}
          ${admin ? `<div style="display:flex;gap:4px"><button class="icon-btn" data-act="open" data-screen="eventoForm" data-id="${ev.id}" aria-label="Editar escala">${icon('edit', 20)}</button>
            <button class="icon-btn" data-act="delEvent" data-id="${ev.id}" aria-label="Apagar escala">${icon('trash', 20)}</button></div>` : ''}</div>
        ${header(ev.title, fmtLong(ev.date, ev.time))}
        ${bannerBlock(ev, admin)}
        ${ev.notes ? `<div class="card notes">${esc(ev.notes)}</div>` : ''}
        <div class="section"><div class="section-head"><h2 class="h2">Equipe</h2><span class="item-sub">${ev.assignments.length ? `${ok} de ${ev.assignments.length} confirmados` : ''}</span></div>
          ${team.length ? `<div class="list">${team.map((a) => `<div class="item static">
            ${face(profileOf(a.user_id), a.user_id === S.user.id ? 'me' : '')}
            <div class="item-main"><span class="item-title">${a.user_id === S.user.id ? 'Você' : esc(nameOf(a.user_id))}</span><span class="item-sub">${esc(a.role_name)}</span></div>
            ${tagStatus(a.status)}
            ${admin ? `<button class="icon-btn" data-act="unassign" data-id="${a.id}" aria-label="Tirar da escala">${icon('x', 18)}</button>` : ''}</div>`).join('')}</div>`
            : '<div class="empty">Ninguém escalado ainda.</div>'}
          ${admin ? `<button class="btn outline block" data-act="open" data-screen="escalar" data-id="${ev.id}">${icon('plus', 18)}Escalar pessoa</button>` : ''}</div>
        <div class="section"><h2 class="h2">Músicas</h2>
          ${ev.songs.length ? `<div class="list">${ev.songs.map((x, i) => `<div class="item">
            <span class="item-sub" style="width:18px;font-weight:700">${i + 1}</span>
            <button class="item-main" data-act="open" data-screen="musica" data-id="${x.song.id}" data-key="${esc(x.key || x.song.key || '')}" data-es="${x.id}" style="border:0;background:none;padding:0;text-align:left;cursor:pointer;color:inherit">
              <span class="item-title">${esc(x.song.title)}</span><span class="item-sub">${esc(x.song.artist)}</span></button>
            ${x.key ? `<span class="key">${esc(x.key)}</span>` : ''}
            ${admin ? `<button class="icon-btn" data-act="delEventSong" data-id="${x.id}" aria-label="Tirar música">${icon('x', 18)}</button>` : ''}</div>`).join('')}</div>`
            : '<div class="empty">Nenhuma música escolhida ainda.</div>'}
          ${admin ? `<button class="btn outline block" data-act="open" data-screen="addMusica" data-id="${ev.id}">${icon('plus', 18)}Adicionar música</button>` : ''}</div>
        <a class="btn outline block" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(whatsappText(ev))}">${icon('share', 18)}Enviar escala no WhatsApp</a>
        ${admin ? `<button class="btn outline block" data-act="sendHolyrics">${icon('screen', 18)}Enviar ao Holyrics</button>
          ${ev.holyrics_sent_at ? `<p class="item-sub" style="text-align:center;margin:-8px 0 0">Enviado ao Holyrics ${fmtAgo(ev.holyrics_sent_at)}</p>` : ''}` : ''}
      </div>${bar}`;
    },
  },

  eventoForm: {
    load: async ({ id }) => ({ ev: id ? await S.api.eventDetail(id) : null }),
    view: ({ ev }) => {
      const v = ev || { title: '', date: nextSunday(), time: '19:00', notes: '' };
      return `<div class="scroll">${backBtn()}${header(ev ? 'Editar escala' : 'Nova escala')}
        <form class="form" data-form="evento" data-id="${ev ? ev.id : ''}">
          <label class="field"><span>Nome do culto ou evento</span>
            <input class="input" name="title" required maxlength="60" value="${esc(v.title)}" list="event-names" ${ev ? '' : 'autofocus'}>
            <datalist id="event-names">${EVENT_NAMES.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></label>
          ${ev ? '' : `<div class="chips">${EVENT_NAMES.slice(0, 4).map((n) => `<button type="button" class="chip" data-act="fillTitle" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>`}
          <div style="display:flex;gap:12px">
            <label class="field grow"><span>Data</span><input class="input" name="date" type="date" required value="${esc(v.date)}"></label>
            <label class="field grow"><span>Horário</span><input class="input" name="time" type="time" value="${esc(v.time)}"></label></div>
          <label class="field"><span>Observações <small>(opcional)</small></span>
            <textarea class="input" name="notes" maxlength="500" placeholder="Ex.: chegar às 18h para passar o som">${esc(v.notes)}</textarea></label>
          <button class="btn primary block">${ev ? 'Salvar alterações' : 'Criar escala'}</button>
        </form></div>`;
    },
  },

  arte: {
    load: async ({ id, kind = 'escala' }) => {
      const ev = await S.api.eventDetail(id);
      if (!S.artEdit || S.artEdit.id !== id || S.artEdit.kind !== kind) {
        S.artEdit = { id, kind, settings: artSettings(ev, kind), photoBlob: null, photoImg: undefined };
      }
      return { ev };
    },
    after: ({ ev }) => {
      const img = root().querySelector('[data-art-preview]');
      if (img) renderArt(img, ev, S.artEdit.kind, S.artEdit.settings, S.artEdit.photoImg);
    },
    view: ({ ev }) => {
      const a = S.artEdit.settings;
      const hasPhoto = a.photo || S.artEdit.photoImg;
      const kind = S.artEdit.kind;
      return `<div class="scroll with-bar">${backBtn()}${header(kind === 'escala' ? 'Arte da escala' : 'Capa do culto', ev.title)}
        <div class="art-frame" style="aspect-ratio:${artRatio(a)}"><img class="art-img" data-art-preview alt="Prévia da arte"></div>
        <div class="form">
          <div class="field"><span>Cores</span><div class="theme-row">${Object.entries(THEMES).map(([k, t]) => `
            <button type="button" class="theme-chip" data-act="artSet" data-k="theme" data-v="${k}" aria-pressed="${a.theme === k}" aria-label="${t.name}">
              <span style="background:linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]});border-color:${t.accent}"></span>${t.name}</button>`).join('')}</div></div>
          <div class="field"><span>Formato</span><div class="seg" role="group" aria-label="Formato">${Object.entries(FORMATS).map(([k, f]) => `
            <button type="button" data-act="artSet" data-k="format" data-v="${k}" aria-pressed="${a.format === k}">${f.name}</button>`).join('')}</div></div>
          <label class="field"><span>Título</span><input class="input" data-art-field="title" maxlength="60" value="${esc(a.title)}" placeholder="${esc(ev.title)}"></label>
          ${kind === 'escala' ? `<label class="field"><span>Data e horário</span><input class="input" data-art-field="subtitle" maxlength="60" value="${esc(a.subtitle)}" placeholder="${esc(fmtLong(ev.date, ev.time))}"></label>`
            : `<label class="field"><span>Local ou endereço <small>(aparece no rodapé)</small></span><input class="input" data-art-field="place" maxlength="70" value="${esc(a.place || '')}" placeholder="Ex.: Rua das Flores, 120 - Centro"></label>`}
          <label class="field"><span>Frase ou versículo <small>(opcional)</small></span>
            <textarea class="input" data-art-field="phrase" maxlength="140" style="min-height:80px" placeholder="Ex.: Tudo o que tem fôlego louve ao Senhor. Sl 150:6">${esc(a.phrase)}</textarea></label>
          ${kind === 'escala' ? `<div class="list">
            <label class="item"><input type="checkbox" data-art-check="showTeam" ${a.showTeam ? 'checked' : ''} class="check"><span class="item-main"><span class="item-title" style="font-weight:600">Mostrar a equipe</span></span></label>
            <label class="item"><input type="checkbox" data-art-check="showSongs" ${a.showSongs ? 'checked' : ''} class="check"><span class="item-main"><span class="item-title" style="font-weight:600">Mostrar as músicas</span></span></label></div>` : ''}
          <div class="field"><span>Foto de fundo <small>(opcional)</small></span>
            <div style="display:flex;gap:10px">
              <label class="btn outline small grow" for="art-photo">${icon('image', 18)}${hasPhoto ? 'Trocar foto' : 'Escolher foto'}</label>
              <input type="file" accept="image/*" id="art-photo" data-art-photo class="sr-only">
              ${hasPhoto ? `<button type="button" class="btn danger small" data-act="artNoPhoto">Tirar foto</button>` : ''}</div></div>
          ${artsOf(ev.art)[kind] ? `<button type="button" class="btn link" data-act="artReset">Voltar ao padrão</button>` : ''}
        </div></div>
        <div class="bottom-bar"><button class="btn outline grow" data-act="artShare">${icon('share', 18)}Compartilhar</button>
          <button class="btn primary grow2" data-act="artSave">Salvar arte</button></div>`;
    },
  },

  escalar: {
    load: async ({ id }) => ({ ev: await S.api.eventDetail(id) }),
    view: ({ ev }) => `<div class="scroll">${backBtn()}${header('Escalar pessoa', `${ev.title} · ${fmtShort(ev.date, ev.time)}`)}
      <form class="form" data-form="escalar" data-id="${ev.id}">
        <label class="field"><span>Função</span>
          <select class="input" name="role" required data-change="escalarRole"><option value="">Escolha a função</option>
          ${S.md.roles.map((r) => `<option value="${esc(r.name)}">${r.icon} ${esc(r.name)}</option>`).join('')}</select>
          ${S.md.roles.length ? '' : '<small>Cadastre funções em Ministério › Funções.</small>'}</label>
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-size:14px;font-weight:700;margin-bottom:6px">Pessoa</legend>
          <div class="list">${S.md.members.map((m) => {
            const already = ev.assignments.filter((a) => a.user_id === m.user_id).map((a) => a.role_name);
            return `<label class="item" data-skills="${esc(m.skills.join('|'))}"><input type="radio" name="user" value="${m.user_id}" required style="width:20px;height:20px;accent-color:var(--blue)">
              ${face(m.profile)}
              <span class="item-main"><span class="item-title">${esc(m.profile.name)}${m.user_id === S.user.id ? ' (você)' : ''}</span>
              ${m.skills.length ? `<span class="item-sub">${esc(m.skills.join(', '))}</span>` : ''}
              ${already.length ? `<span class="item-sub" style="color:var(--gold-ink)">Já escalado: ${esc(already.join(', '))}</span>` : ''}</span></label>`;
          }).join('')}</div></fieldset>
        <button class="btn primary block">Escalar</button></form></div>`,
  },

  addMusica: {
    load: async ({ id }) => {
      const [ev, songs] = await Promise.all([S.api.eventDetail(id), S.api.songs(S.mid)]);
      return { ev, songs };
    },
    view: ({ ev, songs }) => {
      const used = new Set(ev.songs.map((x) => x.song_id));
      const list = songs.filter((s) => !used.has(s.id)).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      return `<div class="scroll">${backBtn()}${header('Adicionar música', ev.title)}
        <label class="search">${icon('search', 20)}<span class="sr-only">Buscar música</span>
          <input type="search" data-filter="songs" placeholder="Buscar no repertório" autofocus></label>
        ${list.length ? `<div class="list" data-filter-list="songs">${list.map((s) => `<button class="item" data-act="pickSong" data-event="${ev.id}" data-id="${s.id}" data-key="${esc(s.key)}" data-text="${esc((s.title + ' ' + s.artist).toLowerCase())}">
          <span class="item-main"><span class="item-title">${esc(s.title)}</span><span class="item-sub">${esc(s.artist)}</span></span>
          ${s.key ? `<span class="key">${esc(s.key)}</span>` : ''}</button>`).join('')}</div>`
          : `<div class="empty">Todas as músicas do repertório já estão nesta escala.</div>`}
        <button class="btn outline block" data-act="newSong">${icon('search', 18)}Buscar música nova</button></div>`;
    },
  },

  // ----- Repertório -----
  repertorio: {
    load: async () => ({ songs: await S.api.songs(S.mid) }),
    view: ({ songs }) => {
      const cats = S.md.categories.filter((c) => songs.some((s) => (s.categories || []).includes(c.id)));
      if (S.catFilter && !cats.some((c) => c.id === S.catFilter)) S.catFilter = null;
      const list = songs.filter((s) => !S.catFilter || (s.categories || []).includes(S.catFilter)).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      const artists = new Set(songs.map((s) => s.artist).filter(Boolean)).size;
      return `<div class="scroll">${header('Repertório', `${songs.length} ${songs.length === 1 ? 'música' : 'músicas'} · ${artists} ${artists === 1 ? 'artista' : 'artistas'}`)}
        <label class="search">${icon('search', 20)}<span class="sr-only">Buscar no repertório</span>
          <input type="search" data-filter="songs" placeholder="Buscar no repertório"></label>
        ${cats.length ? `<div class="cat-row" role="group" aria-label="Classificação">${cats.map((c) => `<button class="chip" data-act="catFilter" data-id="${c.id}" aria-pressed="${S.catFilter === c.id}">${esc(c.name)}</button>`).join('')}</div>` : ''}
        ${list.length ? `<div class="list" data-filter-list="songs">${list.map((s) => `<button class="item" data-act="open" data-screen="musica" data-id="${s.id}" data-text="${esc((s.title + ' ' + s.artist + ' ' + s.key).toLowerCase())}">
          ${cover(s)}
          <span class="item-main"><span class="item-title">${esc(s.title)}</span><span class="item-sub">${esc(s.artist) || 'Artista não informado'}${s.content ? '' : ' · sem cifra'}</span></span>
          ${s.key ? `<span class="key">${esc(s.key)}</span>` : ''}</button>`).join('')}</div>`
          : `<div class="empty">${isAdmin() ? 'Nenhuma música ainda. Toque em “+ Música” para buscar e adicionar.' : 'Nenhuma música cadastrada ainda.'}</div>`}
      </div>${isAdmin() ? fab('newSong', 'Música') : ''}`;
    },
  },

  buscarMusica: {
    load: async () => ({ songs: await S.api.songs(S.mid) }),
    view: ({ songs }) => {
      const q = S.search;
      const have = new Set(songs.map((s) => (s.title + '|' + s.artist).toLowerCase()));
      let body;
      if (q.loading) body = '<div class="empty">Buscando…</div>';
      else if (q.error) body = `<div class="error">${esc(q.error)}</div>`;
      else if (!q.term) body = `<div class="empty">Digite o nome da música ou do artista. Toque em ${icon('play', 16, 'style="vertical-align:-3px"')} para ouvir um trecho e confirmar a versão.</div>`;
      else if (!q.results.length) body = '<div class="empty">Nada encontrado. Confira o nome ou cadastre manualmente.</div>';
      else {
        body = `<div class="list">${q.results.map((r, i) => {
          const dup = have.has((r.title + '|' + r.artist).toLowerCase());
          const playing = S.playing && S.playing === r.preview;
          return `<div class="item static">
            <button class="item-pick" data-act="pickResult" data-i="${i}">
              ${cover(r)}
              <span class="item-main"><span class="item-title">${esc(r.title)}</span>
              <span class="item-sub">${esc(r.artist)}${r.duration ? ' · ' + fmtDuration(r.duration) : ''}</span>
              ${dup ? '<span class="tag neutral" style="align-self:flex-start">Já está no repertório</span>' : ''}</span></button>
            ${r.preview ? `<button class="icon-btn play ${playing ? 'on' : ''}" data-act="preview" data-url="${esc(r.preview)}" aria-label="${playing ? 'Parar' : 'Ouvir trecho de'} ${esc(r.title)}">${icon(playing ? 'pause' : 'play', 20)}</button>` : ''}
          </div>`;
        }).join('')}</div>`;
      }
      return `<div class="scroll">${backBtn()}${header('Adicionar música')}
        <form class="search" data-form="buscar" role="search">${icon('search', 20)}
          <label class="sr-only" for="busca-musica">Música ou artista</label>
          <input id="busca-musica" type="search" name="q" value="${esc(q.term)}" placeholder="Música ou artista" autocomplete="off" ${q.term ? '' : 'autofocus'}>
          <button class="btn link small">Buscar</button></form>
        ${body}
        <button class="btn outline block" data-act="open" data-screen="musicaForm">${icon('edit', 18)}Cadastrar manualmente</button></div>`;
    },
  },

  musica: {
    load: async ({ id }) => ({ s: await S.api.song(id) }),
    view: ({ s }, params) => {
      if (!s) return `<div class="scroll">${backBtn()}<div class="empty">Esta música foi apagada.</div></div>`;
      const admin = isAdmin();
      const orig = s.key || detectKey(s.content);
      const sv = songView(s, params, orig);
      const shown = sv.key || orig;
      const steps = orig && shown ? semitonesBetween(orig, shown) : 0;
      const text = transposeText(s.content, steps, shown);
      const search = songLinks(s.title, s.artist);
      const L = linksOf(s);
      const keyList = parseKey(orig)?.minor ? MINOR_KEYS : MAJOR_KEYS;
      const fromEvent = params.es && params.key !== undefined;
      const meta = [s.artist, fmtDuration(s.duration), s.bpm ? `${s.bpm} BPM` : ''].filter(Boolean).join(' · ');
      return `<div class="scroll"><div class="section-head">${backBtn()}
        ${admin ? `<div style="display:flex;gap:4px"><button class="icon-btn" data-act="open" data-screen="musicaForm" data-id="${s.id}" aria-label="Editar música">${icon('edit', 20)}</button>
          <button class="icon-btn" data-act="delSong" data-id="${s.id}" aria-label="Apagar música">${icon('trash', 20)}</button></div>` : ''}</div>
        <div class="song-head">${cover(s, 'lg')}<div class="title-block grow" style="min-width:0"><h1 class="h1">${esc(s.title)}</h1><p class="sub">${esc(meta)}</p></div></div>
        ${(s.categories || []).length ? `<div class="chips">${S.md.categories.filter((c) => s.categories.includes(c.id)).map((c) => `<span class="tag admin" style="font-size:13px;padding:5px 10px">${esc(c.name)}</span>`).join('')}</div>` : ''}
        <div class="link-row">
          <a class="chip-link" href="${esc(L.cifra ? safeUrl(L.cifra) : search.cifra)}" target="_blank" rel="noopener">${icon('doc', 18)}Cifra</a>
          <a class="chip-link" href="${esc(L.letra ? safeUrl(L.letra) : search.cifra)}" target="_blank" rel="noopener">${icon('text', 18)}Letra</a>
          <a class="chip-link" href="${esc(L.audio ? safeUrl(L.audio) : search.spotify)}" target="_blank" rel="noopener">${icon('music', 18)}Ouvir</a>
          <a class="chip-link" href="${esc(L.video ? safeUrl(L.video) : search.youtube)}" target="_blank" rel="noopener">${icon('play', 18)}Vídeo</a></div>
        ${orig ? `<div class="card key-card">
          <div class="key-row"><span class="h2">Tom</span>
            <button class="icon-btn" data-act="keyStep" data-v="-1" aria-label="Meio tom abaixo">${icon('minus', 20)}</button>
            <label class="sr-only" for="tom-musica">Escolher tom</label>
            <select id="tom-musica" class="input key-select" data-change="songKey">${keyList.map((k) => `<option ${k === shiftKey(shown, 0) ? 'selected' : ''}>${k}</option>`).join('')}</select>
            <button class="icon-btn" data-act="keyStep" data-v="1" aria-label="Meio tom acima">${icon('plus', 20)}</button></div>
          <p class="item-sub" style="margin:0">${fromEvent ? `Tom do culto: <strong>${esc(params.key || orig)}</strong> · ` : ''}Tom original: ${esc(orig)}${steps ? ` · ${steps <= 6 ? '+' + steps : '−' + (12 - steps)} semitons` : ''}</p>
          ${admin && fromEvent && shown !== (params.key || orig) ? `<button class="btn primary small" data-act="useKeyEvent" data-v="${esc(shown)}">Usar ${esc(shown)} neste culto</button>` : ''}
          ${admin && !fromEvent && shown !== orig && s.content ? `<button class="btn outline small" data-act="saveKeyDefault" data-v="${esc(shown)}">Salvar ${esc(shown)} como tom padrão</button>` : ''}
        </div>` : ''}
        ${s.content ? `<div class="cifra-tools">
            <div class="seg" role="group" aria-label="Mostrar"><button data-act="lyrics" data-v="0" aria-pressed="${!sv.lyrics}">Cifra</button><button data-act="lyrics" data-v="1" aria-pressed="${sv.lyrics}">Só letra</button></div>
            <button class="icon-btn" data-act="fontSize" data-v="-1" aria-label="Diminuir letra">A−</button>
            <button class="icon-btn" data-act="fontSize" data-v="1" aria-label="Aumentar letra">A+</button></div>
          <div class="card cifra-card"><pre class="cifra" style="font-size:${sv.size}px">${renderCifra(text, { lyricsOnly: sv.lyrics })}</pre></div>`
          : `<div class="empty">Ainda sem cifra.${admin ? `<br><br><button class="btn primary" data-act="open" data-screen="musicaForm" data-id="${s.id}">Adicionar cifra</button>` : ''}</div>`}
      </div>`;
    },
  },

  musicaForm: {
    load: async ({ id }) => ({ s: id ? await S.api.song(id) : null }),
    view: ({ s }, params) => {
      const v = s || params.prefill || { title: '', artist: '', key: '', link: '', content: '' };
      const keys = [...MAJOR_KEYS, ...MINOR_KEYS];
      if (v.key && !keys.includes(v.key)) keys.unshift(v.key);
      return `<div class="scroll">${backBtn()}${header(s ? 'Editar música' : 'Nova música')}
        <form class="form" data-form="musica" data-id="${s ? s.id : ''}">
          ${v.artwork ? `<div class="song-head">${cover(v, 'lg')}<p class="sub">${esc(v.album || '')}${v.duration ? (v.album ? ' · ' : '') + fmtDuration(v.duration) : ''}</p></div>` : ''}
          <input type="hidden" name="artwork" value="${esc(v.artwork || '')}"><input type="hidden" name="duration" value="${esc(v.duration || '')}">
          <label class="field"><span>Nome da música</span><input class="input" name="title" required maxlength="120" value="${esc(v.title)}" ${v.title ? '' : 'autofocus'}></label>
          <label class="field"><span>Artista</span><input class="input" name="artist" maxlength="120" value="${esc(v.artist)}"></label>
          <div class="card form" style="background:var(--blue-soft)">
            <h2 class="h2">Cifra e letra</h2>
            <p class="sub" style="color:var(--ink)">Abra a música no Cifra Club, copie a cifra inteira e cole aqui. O Asa reconhece o tom e troca os acordes para o tom que você escolher.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button type="button" class="btn white grow" data-act="openCifra">${icon('doc', 18)}Abrir no Cifra Club</button>
              <button type="button" class="btn white grow" data-act="pasteCifra">${icon('clip', 18)}Colar</button></div>
            <label class="field"><span class="sr-only">Cifra</span>
              <textarea class="input mono" name="content" maxlength="30000" data-detect="key" placeholder="Cole a cifra aqui">${esc(v.content || '')}</textarea>
              <small data-key-hint>${v.content && !v.key ? 'Tom detectado: ' + esc(detectKey(v.content)) : ''}</small></label>
          </div>
          <div style="display:flex;gap:12px">
            <label class="field grow"><span>Tom da cifra</span><select class="input" name="key" data-auto="${v.key ? '0' : '1'}"><option value="">Detectar pela cifra</option>
              ${keys.map((k) => `<option ${k === v.key ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
            <label class="field" style="width:110px"><span>BPM</span><input class="input" name="bpm" type="number" inputmode="numeric" min="0" max="300" value="${esc(v.bpm || '')}"></label></div>
          ${S.md.categories.length ? `<div class="section"><h2 class="h2">Classificação</h2>
            <div class="chips">${S.md.categories.map((c) => `<label class="chip check-chip"><input type="checkbox" name="category" value="${c.id}" ${(v.categories || []).includes(c.id) ? 'checked' : ''}><span>${esc(c.name)}</span></label>`).join('')}</div></div>` : ''}
          <div class="section">
            <div class="section-head"><h2 class="h2">Links</h2>
              <button type="button" class="btn link small" data-act="autofill">${icon('bolt', 18)}Preencher automaticamente</button></div>
            ${LINK_FIELDS.map(([k, label, ic]) => `<div class="link-field">
              <span class="link-ic" aria-hidden="true">${icon(ic, 20)}</span>
              <label class="sr-only" for="link-${k}">Link ${label.toLowerCase()}</label>
              <input class="input" id="link-${k}" name="link_${k}" type="url" inputmode="url" maxlength="400" placeholder="Link ${label.toLowerCase()}" value="${esc(linksOf(v)[k])}">
              <button type="button" class="icon-btn" data-act="openLink" data-k="${k}" aria-label="Abrir link ${label.toLowerCase()}">${icon('ext', 20)}</button></div>`).join('')}
            <small class="sub" data-autofill-hint>${params.prefill ? 'Links preenchidos pela busca. Toque em abrir para conferir.' : ''}</small>
          </div>
          <button class="btn primary block">${s ? 'Salvar alterações' : 'Salvar no repertório'}</button></form></div>`;
    },
  },

  // ----- Ministério -----
  ministerio: {
    view: () => {
      const m = S.md.ministry;
      const admin = isAdmin();
      const tab = S.minTab || 'info';
      const n = S.md.members.length;
      const admins = S.md.members.filter((x) => x.role === 'admin');
      const coverInput = admin ? `<input type="file" accept="image/*" class="sr-only" id="min-cover" data-cover="1">` : '';
      const info = `
        <div class="min-card">
          ${m.cover
            ? `<img class="min-cover" src="${esc(m.cover)}" alt="Foto do ministério ${esc(m.name)}">`
            : admin
              ? `<label class="min-cover empty" for="min-cover">${icon('camera', 26)}<span>Adicionar foto do ministério</span></label>`
              : `<div class="min-cover empty">${logo(56)}</div>`}
          ${coverInput}
          <div class="min-name">
            <span class="h2 grow">${esc(m.name)}</span>
            ${admin ? `<button class="icon-btn" data-act="open" data-screen="ministerioForm" aria-label="Editar nome e foto">${icon('edit', 20)}</button>` : ''}</div>
        </div>
        <button class="item card invite-card" data-act="open" data-screen="convite">
          <span class="invite-ic">${icon('userPlus', 22)}</span>
          <span class="item-main"><span class="item-title">Convidar membros</span>
            <span class="item-sub">Código ${esc(m.invite_code)} · enviar convite</span></span>${icon('chev', 18)}</button>
        <div class="list">
          ${menuItem('team', 'Equipes', 'equipes', S.md.teams.length)}
          ${menuItem('tag', 'Funções', 'funcoes', S.md.roles.length)}
          ${menuItem('shapes', 'Classificações', 'classificacoes', S.md.categories.length)}
          ${menuItem('shield', 'Administradores', 'administradores', admins.length)}
        </div>
        ${admin ? `<div class="section"><h2 class="h2">Integrações</h2><div class="list">
          <button class="item" data-act="open" data-screen="holyrics"><span class="menu-ic">${icon('screen')}</span>
            <span class="item-main"><span class="item-title">Holyrics</span><span class="item-sub">${S.md.hasHolyrics ? 'Conectado · envie escalas e músicas para o telão' : 'Conecte o Holyrics ao seu ministério'}</span></span>
            ${S.md.hasHolyrics ? '<span class="tag confirmed">Ligado</span>' : ''}${icon('chev', 18)}</button></div></div>` : ''}
        <div class="list">
          <button class="item" data-act="open" data-screen="perfil">${face(S.profile, 'sm')}
            <span class="item-main"><span class="item-title">Meu perfil</span></span>${icon('chev', 18)}</button>
          <button class="item" data-act="open" data-screen="ministerios"><span class="menu-ic">${icon('swap')}</span>
            <span class="item-main"><span class="item-title">Trocar ou entrar em outro ministério</span></span>${icon('chev', 18)}</button>
          ${S.api.mode === 'demo' ? `<button class="item" data-act="resetDemo"><span class="menu-ic">${icon('swap')}</span>
            <span class="item-main"><span class="item-title">Recomeçar a demonstração</span></span></button>` : ''}
          <button class="item" data-act="signOut"><span class="menu-ic" style="color:var(--bad)">${icon('out')}</span>
            <span class="item-main"><span class="item-title" style="color:var(--bad)">Sair da conta</span></span></button>
        </div>
        ${demoBanner()}`;
      const members = `<div class="list">${S.md.members.map((x) => {
        const self = x.user_id === S.user.id;
        const skills = x.skills.length ? x.skills.join(', ') : self ? 'Toque para escolher o que você faz' : 'Funções não informadas';
        return `<button class="item" data-act="open" data-screen="membro" data-id="${x.id}">${face(x.profile, 'lg')}
          <span class="item-main"><span class="item-title">${esc(x.profile.name)}${self ? ' (você)' : ''}</span>
            <span class="item-sub clamp">${esc(skills)}</span>
            ${x.role === 'admin' ? '<span class="admin-label">Administrador</span>' : ''}</span>${icon('chev', 18)}</button>`;
      }).join('')}</div>`;
      return `<div class="scroll">${header('Ministério', m.name)}
        <div class="seg" role="group" aria-label="Seção">
          <button data-act="minTab" data-v="info" aria-pressed="${tab === 'info'}">Informações</button>
          <button data-act="minTab" data-v="membros" aria-pressed="${tab === 'membros'}">Membros (${n})</button></div>
        ${tab === 'info' ? info : members}
      </div>${tab === 'membros' ? `<button class="fab" data-act="open" data-screen="convite" aria-label="Convidar membros">${icon('userPlus', 20)}Convidar</button>` : ''}`;
    },
  },

  ministerioForm: {
    view: () => {
      const m = S.md.ministry;
      return `<div class="scroll">${backBtn('Ministério')}${header('Editar ministério')}
        <div class="min-card">
          ${m.cover ? `<img class="min-cover" src="${esc(m.cover)}" alt="Foto do ministério">` : `<label class="min-cover empty" for="min-cover">${icon('camera', 26)}<span>Adicionar foto do ministério</span></label>`}
          <input type="file" accept="image/*" class="sr-only" id="min-cover" data-cover="1">
          <div class="min-name" style="gap:10px;flex-wrap:wrap">
            <label class="btn outline small grow" for="min-cover">${icon('camera', 18)}${m.cover ? 'Trocar foto' : 'Escolher foto'}</label>
            ${m.cover ? `<button class="btn danger small" data-act="removeCover">${icon('trash', 18)}Remover</button>` : ''}</div>
        </div>
        <form class="form" data-form="ministerio">
          <label class="field"><span>Nome do ministério</span><input class="input" name="name" required maxlength="60" value="${esc(m.name)}"></label>
          <button class="btn primary block">Salvar</button></form></div>`;
    },
  },

  convite: {
    view: () => {
      const m = S.md.ministry;
      return `<div class="scroll">${backBtn()}
        <div class="title-block" style="text-align:center;gap:6px;padding:8px 0">
          <p class="sub" style="font-size:16px">Convide membros para o ministério</p><h1 class="h1">${esc(m.name)}</h1></div>
        <div class="card invite-box">
          <span class="item-sub">Código de convite</span>
          <strong class="invite-code">${esc(m.invite_code)}</strong>
          <span class="item-sub" style="word-break:break-all">${esc(inviteLink(m.invite_code))}</span>
        </div>
        <button class="btn primary block" data-act="invite">${icon('share', 18)}Enviar convite</button>
        <button class="btn outline block" data-act="copyInvite">${icon('copy', 18)}Copiar link</button>
        <p class="sub" style="text-align:center">Quem abrir o link entra direto no ministério depois de fazer login. Também dá para digitar o código em “Entrar com código de convite”.</p>
        ${isAdmin() ? `<button class="btn link block" data-act="newInvite">${icon('sparkle', 18)}Gerar novo convite</button>
          <p class="item-sub" style="text-align:center;margin:0">Use se o convite foi parar com quem não devia: o código atual deixa de funcionar.</p>` : ''}
      </div>`;
    },
  },

  membro: {
    view: (_d, { id }) => {
      const x = S.md.members.find((m) => m.id === id);
      if (!x) return `<div class="scroll">${backBtn()}<div class="empty">Esta pessoa não está mais no ministério.</div></div>`;
      const self = x.user_id === S.user.id;
      const admin = isAdmin();
      const canEdit = self || admin;
      const b = x.profile.birthday;
      return `<div class="scroll">${backBtn()}
        <div class="brand" style="gap:10px">${face(x.profile, 'xl')}
          <h1 class="h1" style="font-size:24px">${esc(x.profile.name)}${self ? ' (você)' : ''}</h1>
          <div class="chips" style="justify-content:center">${x.role === 'admin' ? '<span class="tag admin">Administrador</span>' : '<span class="tag neutral">Membro</span>'}
            ${b ? `<span class="tag neutral">🎂 ${Number(b.slice(8))}/${b.slice(5, 7)}</span>` : ''}</div></div>
        <form class="form" data-form="skills" data-id="${x.id}" data-self="${self ? 1 : ''}">
          <div class="section"><h2 class="h2">${self ? 'O que você faz no ministério' : 'O que faz no ministério'}</h2>
            <p class="sub">${canEdit ? 'Ajuda o líder a escalar: quem faz a função aparece primeiro na hora de escalar.' : ''}</p>
            <div class="chips">${S.md.roles.map((r) => `<label class="chip check-chip">
              <input type="checkbox" name="skill" value="${esc(r.name)}" ${x.skills.includes(r.name) ? 'checked' : ''} ${canEdit ? '' : 'disabled'}>
              <span>${r.icon} ${esc(r.name)}</span></label>`).join('')}</div></div>
          ${canEdit ? '<button class="btn primary block">Salvar funções</button>' : ''}</form>
        ${S.md.teams.some((t) => t.member_ids.includes(x.user_id)) ? `<div class="section"><h2 class="h2">Equipes</h2>
          <div class="chips">${S.md.teams.filter((t) => t.member_ids.includes(x.user_id)).map((t) => `<span class="tag neutral" style="font-size:14px;padding:6px 12px">${esc(t.name)}</span>`).join('')}</div></div>` : ''}
        ${admin && !self ? `<div class="list">
          <button class="item" data-act="toggleAdmin" data-id="${x.id}" data-role="${x.role}"><span class="menu-ic">${icon('shield')}</span>
            <span class="item-main"><span class="item-title">${x.role === 'admin' ? 'Tirar de administrador' : 'Tornar administrador'}</span></span></button>
          <button class="item" data-act="removeMember" data-id="${x.id}" data-name="${esc(x.profile.name)}"><span class="menu-ic" style="color:var(--bad)">${icon('out')}</span>
            <span class="item-main"><span class="item-title" style="color:var(--bad)">Remover do ministério</span></span></button></div>` : ''}
        ${self ? `<button class="btn outline block" data-act="open" data-screen="perfil">${icon('user', 18)}Editar nome, foto e aniversário</button>` : ''}
      </div>`;
    },
  },

  equipes: {
    view: () => {
      const admin = isAdmin();
      const teams = S.md.teams;
      return `<div class="scroll">${backBtn('Ministério')}${header('Equipes', 'Grupos que costumam servir juntos')}
        ${teams.length ? teams.map((t) => {
          const people = S.md.members.filter((m) => t.member_ids.includes(m.user_id));
          return `<details class="card team-card"><summary>
              <span class="team-name">${esc(t.name)}</span>
              ${admin ? `<button class="icon-btn" data-act="open" data-screen="equipeForm" data-id="${t.id}" aria-label="Editar equipe ${esc(t.name)}">${icon('edit', 18)}</button>` : ''}
              <span class="team-row"><span class="item-sub">${people.length} ${people.length === 1 ? 'membro' : 'membros'}</span>
                <span class="stack">${people.slice(0, 5).map((p) => face(p.profile, 'sm')).join('')}${people.length > 5 ? `<span class="avatar sm">+${people.length - 5}</span>` : ''}</span>
                <span class="chev-down">${icon('chev', 18)}</span></span></summary>
            <div class="team-people">${people.length ? people.map((p) => `<div class="item static">${face(p.profile)}
              <span class="item-main"><span class="item-title">${esc(p.profile.name)}</span><span class="item-sub">${esc(p.skills.join(', '))}</span></span></div>`).join('')
              : '<p class="item-sub" style="margin:8px 0">Ninguém nesta equipe ainda.</p>'}</div></details>`;
        }).join('')
        : `<div class="empty">Nenhuma equipe ainda.${admin ? ' Crie equipes como “Vocal” ou “Banda de domingo” para escalar mais rápido.' : ''}</div>`}
      </div>${admin ? fab('newTeam', 'Equipe') : ''}`;
    },
  },

  equipeForm: {
    view: (_d, { id }) => {
      const t = S.md.teams.find((x) => x.id === id) || { name: '', member_ids: [] };
      return `<div class="scroll">${backBtn('Equipes')}${header(id ? 'Editar equipe' : 'Nova equipe')}
        <form class="form" data-form="equipe" data-id="${id || ''}">
          <label class="field"><span>Nome da equipe</span><input class="input" name="name" required maxlength="40" value="${esc(t.name)}" placeholder="Ex.: Vocal" ${id ? '' : 'autofocus'}></label>
          <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-size:14px;font-weight:700;margin-bottom:6px">Membros</legend>
            <div class="list">${S.md.members.map((m) => `<label class="item"><input class="check" type="checkbox" name="member" value="${m.user_id}" ${t.member_ids.includes(m.user_id) ? 'checked' : ''}>
              ${face(m.profile)}<span class="item-main"><span class="item-title">${esc(m.profile.name)}</span>
              <span class="item-sub">${esc(m.skills.join(', '))}</span></span></label>`).join('')}</div></fieldset>
          <button class="btn primary block">${id ? 'Salvar equipe' : 'Criar equipe'}</button></form>
        ${id ? `<button class="btn danger block" data-act="delTeam" data-id="${id}">${icon('trash', 18)}Apagar equipe</button>` : ''}</div>`;
    },
  },

  funcoes: {
    view: () => {
      const admin = isAdmin();
      return `<div class="scroll"><div class="section-head">${backBtn('Ministério')}
          ${admin ? `<button class="icon-btn" data-act="open" data-screen="funcaoForm" aria-label="Nova função">${icon('plus', 24)}</button>` : ''}</div>
        ${header('Funções', 'O que cada pessoa pode fazer numa escala')}
        ${S.md.roles.length ? `<div class="list">${S.md.roles.map((r) => {
          const n = S.md.members.filter((m) => m.skills.includes(r.name)).length;
          return `<div class="item static"><span class="role-ic" aria-hidden="true">${r.icon}</span>
            <span class="item-main"><span class="item-title">${esc(r.name)}</span><span class="item-sub">${n ? `${n} ${n === 1 ? 'pessoa' : 'pessoas'}` : 'Ninguém marcou ainda'}</span></span>
            ${admin ? `<button class="icon-btn" data-act="open" data-screen="funcaoForm" data-id="${r.id}" aria-label="Editar ${esc(r.name)}">${icon('edit', 20)}</button>
              <button class="icon-btn" data-act="delRole" data-id="${r.id}" data-name="${esc(r.name)}" aria-label="Apagar ${esc(r.name)}">${icon('trash', 20)}</button>` : ''}</div>`;
        }).join('')}</div>`
        : '<div class="empty">Nenhuma função cadastrada.</div>'}
        ${admin ? `<button class="btn outline block" data-act="open" data-screen="funcaoForm">${icon('plus', 18)}Nova função</button>` : ''}</div>`;
    },
  },

  funcaoForm: {
    view: (_d, { id }) => {
      const r = S.md.roles.find((x) => x.id === id) || { name: '', icon: '' };
      const cur = r.icon || '🎵';
      return `<div class="scroll">${backBtn('Funções')}${header(id ? 'Editar função' : 'Nova função')}
        <form class="form" data-form="funcao" data-id="${id || ''}">
          <label class="field"><span>Nome</span><input class="input" name="name" required maxlength="40" value="${esc(r.name)}" placeholder="Ex.: Backing vocal" data-guess-icon="${id ? '' : '1'}" ${id ? '' : 'autofocus'}></label>
          <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-size:14px;font-weight:700;margin-bottom:8px">Ícone</legend>
            <div class="icon-grid">${ROLE_ICONS.map((ic) => `<label><input type="radio" name="icon" value="${ic}" ${ic === cur ? 'checked' : ''}><span>${ic}</span></label>`).join('')}</div></fieldset>
          <button class="btn primary block">${id ? 'Salvar função' : 'Adicionar função'}</button></form>
        ${id ? `<button class="btn danger block" data-act="delRole" data-id="${id}" data-name="${esc(r.name)}" data-back="1">${icon('trash', 18)}Apagar função</button>` : ''}</div>`;
    },
  },

  classificacoes: {
    view: () => {
      const admin = isAdmin();
      const list = S.md.categories;
      return `<div class="scroll"><div class="section-head">${backBtn('Ministério')}
          ${admin ? `<button class="icon-btn" data-act="open" data-screen="categoriaForm" aria-label="Nova classificação">${icon('plus', 24)}</button>` : ''}</div>
        ${header('Classificações', 'Organize as músicas do repertório por tema')}
        ${list.length ? `<label class="search">${icon('search', 20)}<span class="sr-only">Buscar classificações</span>
            <input type="search" data-filter="cats" placeholder="Buscar classificações"></label>
          <div class="list" data-filter-list="cats">${list.map((c) => `<${admin ? 'button' : 'div'} class="item ${admin ? '' : 'static'}" ${admin ? `data-act="open" data-screen="categoriaForm" data-id="${c.id}"` : ''} data-text="${esc((c.name + ' ' + c.description).toLowerCase())}">
            <span class="item-main"><span class="item-title">${esc(c.name)}</span>${c.description ? `<span class="item-sub">${esc(c.description)}</span>` : ''}</span>
            ${admin ? icon('chev', 18) : ''}</${admin ? 'button' : 'div'}>`).join('')}</div>`
          : `<div class="empty">Nenhuma classificação ainda.${admin ? `<br><br><button class="btn primary" data-act="seedCats">Usar as sugeridas</button>` : ''}</div>`}
        ${admin && list.length ? `<button class="btn outline block" data-act="open" data-screen="categoriaForm">${icon('plus', 18)}Nova classificação</button>` : ''}</div>`;
    },
  },

  categoriaForm: {
    view: (_d, { id }) => {
      const c = S.md.categories.find((x) => x.id === id) || { name: '', description: '' };
      return `<div class="scroll">${backBtn('Classificações')}${header(id ? 'Editar classificação' : 'Nova classificação')}
        <form class="form" data-form="categoria" data-id="${id || ''}">
          <label class="field"><span>Nome</span><input class="input" name="name" required maxlength="40" value="${esc(c.name)}" placeholder="Ex.: Adoração" ${id ? '' : 'autofocus'}></label>
          <label class="field"><span>Descrição <small>(opcional)</small></span><textarea class="input" name="description" maxlength="200" rows="3" style="min-height:90px" placeholder="Que tipo de música entra aqui">${esc(c.description)}</textarea></label>
          <button class="btn primary block">${id ? 'Salvar' : 'Adicionar'}</button></form>
        ${id ? `<button class="btn danger block" data-act="delCat" data-id="${id}" data-name="${esc(c.name)}">${icon('trash', 18)}Apagar classificação</button>` : ''}</div>`;
    },
  },

  holyrics: {
    view: () => {
      const h = S.hly || {};
      const steps = `<ol class="steps">
          <li>No computador da igreja, abra o <strong>Holyrics</strong> e vá em <strong>Arquivo › Configurações › API Server</strong>.</li>
          <li>Ligue <strong>“Permitir acesso pela internet”</strong> e copie a <strong>API Key</strong>.</li>
          <li>Toque em <strong>Gerenciar permissões</strong>, crie um token (ex.: “Asa”) e copie o <strong>token</strong>.</li>
          <li>Cole os dois aqui. Na primeira vez, o Holyrics mostra um pedido de permissão na tela: é só aceitar.</li></ol>`;
      const form = `<form class="form card" data-form="holyrics">
          <label class="field"><span>API Key</span><input class="input" name="api_key" required autocomplete="off" autocapitalize="off" spellcheck="false"></label>
          <label class="field"><span>Token</span><input class="input" name="token" required autocomplete="off" autocapitalize="off" spellcheck="false"></label>
          <button class="btn primary block">${icon('link', 18)}Conectar e testar</button></form>`;
      const status = h.result ? `<div class="card form">
          <div class="item static" style="padding:0;min-height:0"><span class="menu-ic">${icon('screen')}</span>
            <span class="item-main"><span class="item-title">Holyrics ${esc(h.result.version)}</span>
            <span class="item-sub">${h.result.plan === 'none' ? 'Sem Holyrics Plan' : 'Holyrics Plan ativo'}</span></span><span class="tag confirmed">Conectado</span></div>
          ${h.result.missing.length ? `<div class="banner">Falta liberar no Holyrics: <strong>${esc(h.result.missing.join(', '))}</strong>. Apareceu um pedido de permissão na tela do Holyrics: aceite e toque em “Testar de novo”.</div>` : ''}
        </div>` : h.error ? `<div class="error">${esc(h.error)}</div>` : '';
      if (!S.md.hasHolyrics || h.editing) {
        return `<div class="scroll">${backBtn('Ministério')}${header('Holyrics', 'Leve as escalas e as músicas do Asa para o telão')}
          ${status}${steps}${form}
          ${h.editing ? '<button class="btn link block" data-act="hlyCancel">Cancelar</button>' : ''}</div>`;
      }
      const plan = h.result ? h.result.plan !== 'none' : null;
      return `<div class="scroll">${backBtn('Ministério')}${header('Holyrics', 'Conectado a este ministério')}
        ${status || '<div class="card"><p class="sub" style="margin:0">Toque em “Testar conexão” com o Holyrics aberto no computador.</p></div>'}
        <button class="btn primary block" data-act="hlyTest">${icon('bolt', 18)}${h.result ? 'Testar de novo' : 'Testar conexão'}</button>
        <div class="section"><h2 class="h2">O que vai para o Holyrics</h2>
          <div class="list">
            <div class="item static"><span class="menu-ic">${icon('music')}</span><span class="item-main"><span class="item-title">Músicas do culto</span>
              <span class="item-sub">Na ordem da escala. As que já existem no Holyrics são usadas; ${plan === false ? 'as que não existem precisam ser cadastradas lá (criar automaticamente precisa do Holyrics Plan).' : 'as que faltam são criadas com a letra, o tom e o BPM.'}</span></span></div>
            <div class="item static"><span class="menu-ic">${icon('cal')}</span><span class="item-main"><span class="item-title">Culto na agenda</span>
              <span class="item-sub">${plan === false ? 'Sem o Holyrics Plan, as músicas entram na lista aberta no Holyrics.' : 'O culto é marcado na data e hora certas, com a equipe na descrição.'}</span></span></div>
            <div class="item static"><span class="menu-ic">${icon('people')}</span><span class="item-main"><span class="item-title">Membros e funções</span>
              <span class="item-sub">Cadastra no Holyrics quem ainda não está lá (precisa do Holyrics Plan).</span></span></div>
          </div></div>
        <p class="sub">Para enviar um culto, abra a escala e toque em <strong>Enviar ao Holyrics</strong>. O Holyrics precisa estar aberto no computador da igreja.</p>
        <button class="btn outline block" data-act="hlyTeam">${icon('people', 18)}Enviar membros e funções</button>
        <div class="list">
          <button class="item" data-act="hlyEdit"><span class="menu-ic">${icon('edit')}</span><span class="item-main"><span class="item-title">Trocar API Key e token</span></span>${icon('chev', 18)}</button>
          <button class="item" data-act="hlyDisconnect"><span class="menu-ic" style="color:var(--bad)">${icon('x')}</span><span class="item-main"><span class="item-title" style="color:var(--bad)">Desconectar</span></span></button></div>
      </div>`;
    },
  },

  administradores: {
    view: () => {
      const admin = isAdmin();
      return `<div class="scroll">${backBtn('Ministério')}${header('Administradores', admin ? 'Administradores criam escalas, músicas, avisos e cuidam do ministério.' : 'Quem cuida das escalas e do ministério.')}
        <form class="form" data-form="admins">
          <div class="list">${S.md.members.map((m) => `<label class="item">${face(m.profile, 'lg')}
            <span class="item-main"><span class="item-title">${esc(m.profile.name)}${m.user_id === S.user.id ? ' (você)' : ''}</span>
              <span class="item-sub clamp">${esc(m.skills.join(', '))}</span></span>
            <input class="switch" type="checkbox" name="admin" value="${m.id}" ${m.role === 'admin' ? 'checked' : ''} ${admin ? '' : 'disabled'} aria-label="Administrador: ${esc(m.profile.name)}"></label>`).join('')}</div>
          ${admin ? '<button class="btn primary block">Salvar</button>' : ''}</form></div>`;
    },
  },

  aviso: {
    view: () => `<div class="scroll">${backBtn()}${header('Novo aviso', 'Aparece na tela inicial de todos os membros')}
      <form class="form" data-form="aviso"><label class="field"><span class="sr-only">Aviso</span>
        <textarea class="input" name="text" required maxlength="500" placeholder="Ex.: Ensaio no sábado, às 16h." autofocus></textarea></label>
        <button class="btn primary block">Publicar aviso</button></form></div>`,
  },

  perfil: {
    view: () => `<div class="scroll">${backBtn()}${header('Meu perfil')}
      <div class="brand" style="gap:10px">${face(S.profile, 'xl')}
        <input type="file" accept="image/*" class="sr-only" id="avatar-input" data-avatar="1">
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <label class="btn outline small" for="avatar-input">${icon('camera', 18)}${S.profile.avatar ? 'Trocar foto' : 'Colocar foto'}</label>
          ${S.profile.avatar ? `<button class="btn danger small" data-act="removeAvatar">${icon('trash', 18)}Remover</button>` : ''}</div></div>
      ${me() ? `<button class="item card" data-act="open" data-screen="membro" data-id="${me().id}"><span class="menu-ic">${icon('tag')}</span>
        <span class="item-main"><span class="item-title">O que eu faço no ministério</span><span class="item-sub">${esc(me().skills.join(', ') || 'Escolha suas funções')}</span></span>${icon('chev', 18)}</button>` : ''}
      <form class="form" data-form="perfil" data-stay="1">
        <label class="field"><span>Nome</span><input class="input" name="name" required maxlength="40" value="${esc(S.profile.name)}"></label>
        <label class="field"><span>Aniversário <small>(aparece para o ministério)</small></span>
          <input class="input" name="birthday" type="date" value="${esc(S.profile.birthday || '')}"></label>
        ${S.user.email ? `<p class="sub">Conta: ${esc(S.user.email)}</p>` : ''}
        <button class="btn primary block">Salvar</button></form>
      <div class="section" style="margin-top:12px">
        <h2 class="h2">Privacidade</h2>
        <a class="btn link" href="privacidade.html" target="_blank" rel="noopener" style="justify-content:flex-start">Política de privacidade</a>
        <button class="btn danger block" data-act="deleteAccount">${icon('trash', 18)}Excluir minha conta</button>
        <p class="item-sub" style="margin:0">Apaga seu perfil, suas escalas e seus avisos. Os ministérios que você criou passam para outro administrador.</p>
      </div></div>`,
  },

  ministerios: {
    view: () => `<div class="scroll">${backBtn()}${header('Seus ministérios')}
      <div class="list">${S.ministries.map((m) => `<button class="item" data-act="switchMin" data-id="${m.id}">
        ${m.cover ? `<img class="avatar" src="${esc(m.cover)}" alt="">` : `<span class="avatar">${initial(m.name)}</span>`}
        <span class="item-main"><span class="item-title">${esc(m.name)}</span><span class="item-sub">${m.myRole === 'admin' ? 'Administrador' : 'Membro'}</span></span>
        ${m.id === S.mid ? '<span class="tag admin">Atual</span>' : icon('chev', 18)}</button>`).join('')}</div>
      <form class="card form" data-form="entrar"><h2 class="h2">Entrar com código de convite</h2>
        <label class="field"><span class="sr-only">Código</span><input class="input" name="code" required maxlength="12" placeholder="Ex.: VIDA26" style="text-transform:uppercase;letter-spacing:0.12em"></label>
        <button class="btn primary block">Entrar</button></form>
      <form class="card form" data-form="criarMinisterio"><h2 class="h2">Criar novo ministério</h2>
        <label class="field"><span class="sr-only">Nome</span><input class="input" name="name" required maxlength="60" placeholder="Ex.: Mídia e projeção"></label>
        <button class="btn outline block">Criar</button></form></div>`,
  },
};

// ---------- Ações (toques em botões) ----------

const ACTIONS = {
  tab: (d) => { S.tab = d.tab; S.stack = []; refresh(); },
  back: () => back(),
  reload: () => refresh(),
  open: (d) => push(d.screen, { id: d.id, key: d.key, es: d.es, kind: d.kind }),
  shareArt: (d) => shareArt(S.view.data.ev, d.kind),
  artShare: () => shareArt(S.view.data.ev, S.artEdit.kind),
  artKind: (d) => { S.artKind = d.v; repaint(); },
  artSet: (d) => { S.artEdit.settings[d.k] = d.v; repaint(); },
  artNoPhoto: () => { S.artEdit.settings.photo = ''; S.artEdit.photoBlob = null; S.artEdit.photoImg = null; repaint(); },
  artReset: async () => {
    if (!(await ask('Apagar os ajustes e voltar à arte padrão?'))) return;
    const ev = S.view.data.ev;
    if (await run(() => S.api.resetEventArt(ev, S.artEdit.kind), 'Arte padrão restaurada.')) { S.artEdit = null; back(); }
  },
  artSave: async () => {
    const ev = S.view.data.ev;
    const e = S.artEdit;
    const settings = { ...e.settings };
    if (e.photoImg === null) settings.photo = '';
    if (await run(() => S.api.saveEventArt(ev, e.kind, settings, e.photoBlob), 'Arte salva.')) { S.artEdit = null; back(); }
  },
  deleteAccount: async () => {
    if (!(await ask('Excluir sua conta? Seu perfil, suas escalas e seus avisos serão apagados para sempre.'))) return;
    if (!(await ask('Tem certeza? Isso não pode ser desfeito.'))) return;
    try {
      await S.api.deleteAccount();
      await S.api.auth.signOut().catch(() => {});
      clearSnap(); screenCache.clear(); invalidate();
      ['asa-mid', 'asa-email', 'asa-login-sent'].forEach((k) => store.set(k, null));
      S.stack = []; S.tab = 'inicio'; S.md = null; S.mid = null;
      toast('Sua conta foi excluída.');
      refresh();
    } catch (e) {
      toast(friendly(e.message));
    }
  },
  removeBanner: async () => {
    if (!(await ask('Tirar o flyer e voltar à capa automática?'))) return;
    if (await run(() => S.api.removeEventBanner(S.view.data.ev), 'Voltou à capa automática.')) refresh({ keepScroll: true });
  },
  agenda: (d) => { S.agenda = d.v; repaint(); },
  past: (d) => { S.escalasPast = d.v === '1'; refresh(); },
  newEvent: () => push('eventoForm', {}),
  newSong: () => { S.search = { term: '', results: [], loading: false, error: '' }; push('buscarMusica', {}); },
  pickResult: (d) => {
    const r = { ...S.search.results[Number(d.i)] };
    const cc = cifraClubLinks(r.title, r.artist);
    r.links = { cifra: cc.cifra, letra: cc.letra, audio: r.audio || '', video: '' };
    push('musicaForm', { prefill: r });
    findAudio(r.title, r.artist, r.deezerId).then((a) => {
      if (!a) return;
      r.links.audio = a.audio;
      if (a.bpm) r.bpm = a.bpm;
      const f = root().querySelector('form[data-form="musica"]');
      if (!f) return;
      if (!f.elements.link_audio.value) f.elements.link_audio.value = a.audio;
      if (a.bpm && !f.elements.bpm.value) f.elements.bpm.value = a.bpm;
    });
  },
  autofill: async (d, el) => {
    const f = el.closest('form');
    const title = f.elements.title.value.trim(), artist = f.elements.artist.value.trim();
    if (!title || !artist) return toast('Preencha o nome da música e o artista.');
    const hint = f.querySelector('[data-autofill-hint]');
    hint.textContent = 'Procurando links…';
    let n = 0;
    const set = (name, val) => { if (val && !f.elements[name].value) { f.elements[name].value = val; n++; } };
    const cc = cifraClubLinks(title, artist);
    set('link_cifra', cc.cifra);
    set('link_letra', cc.letra);
    const a = await findAudio(title, artist);
    if (a) { set('link_audio', a.audio); if (a.bpm && !f.elements.bpm.value) f.elements.bpm.value = a.bpm; }
    hint.textContent = n
      ? `${n} ${n === 1 ? 'link preenchido' : 'links preenchidos'}. Toque em abrir para conferir e depois salve.`
      : 'Nenhum campo vazio para preencher. Apague um link para trocá-lo.';
  },
  openLink: (d, el) => {
    const f = el.closest('form');
    const v = f.elements['link_' + d.k].value.trim();
    const s = songLinks(f.elements.title.value, f.elements.artist.value);
    const fallback = { cifra: s.cifra, letra: s.cifra, audio: s.spotify, video: s.youtube }[d.k];
    window.open(v ? safeUrl(v) : fallback, '_blank', 'noopener');
  },
  preview: (d) => {
    if (S.playing === d.url) { stopAudio(); return repaint(); }
    stopAudio();
    audio = new Audio(d.url);
    S.playing = d.url;
    audio.onended = () => { S.playing = null; audio = null; repaint(); };
    audio.play().catch(() => { stopAudio(); toast('Não foi possível tocar o trecho.'); repaint(); });
    repaint();
  },
  openCifra: (d, el) => {
    const f = el.closest('form');
    const exact = f.elements.link_cifra.value.trim();
    const url = exact ? safeUrl(exact) : songLinks(f.elements.title.value, f.elements.artist.value).cifra;
    window.open(url, '_blank', 'noopener');
  },
  pasteCifra: async (d, el) => {
    const area = el.closest('form').elements.content;
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error('vazio');
      area.value = text;
      area.dispatchEvent(new Event('input', { bubbles: true }));
      toast('Cifra colada.');
    } catch {
      area.focus();
      toast('Toque e segure no campo e escolha Colar.');
    }
  },
  keyStep: (d) => { const sv = S.songView; sv.key = shiftKey(sv.key, Number(d.v)); repaint(); },
  lyrics: (d) => { S.songView.lyrics = d.v === '1'; repaint(); },
  fontSize: (d) => {
    const sv = S.songView;
    sv.size = Math.min(26, Math.max(11, sv.size + Number(d.v)));
    try { localStorage.setItem('asa-cifra-size', String(sv.size)); } catch { /* ignore */ }
    repaint();
  },
  useKeyEvent: async (d) => {
    const cur = current();
    if (await run(() => S.api.updateEventSong(cur.params.es, { key: d.v }), `Tom ${d.v} definido para este culto.`)) {
      cur.params.key = d.v;
      S.songView.forKey = d.v;
      refresh({ keepScroll: true });
    }
  },
  saveKeyDefault: async (d) => {
    const s = S.view.data.s;
    const orig = s.key || detectKey(s.content);
    const content = transposeText(s.content, semitonesBetween(orig, d.v), d.v);
    if (await run(() => S.api.saveSongKey(s.id, d.v, content), `Música salva em ${d.v}.`)) {
      S.songView.key = d.v;
      refresh({ keepScroll: true });
    }
  },
  fillTitle: (d, el) => { const input = el.form.elements.title; input.value = d.v; input.focus(); },

  demoLogin: async () => { await S.api.auth.signIn(); invalidate(); refresh(); },
  loginAgain: () => { setLoginSent(null); refresh(); },
  pasteLink: async () => {
    let text = '';
    try { text = await navigator.clipboard.readText(); } catch { /* sem permissão para ler */ }
    const input = document.querySelector('form[data-form=codigo] input[name=code]');
    if (!/[?&]token=/.test(text)) {
      if (input) { input.value = ''; input.focus(); }
      toast('Não achei o link. Toque e segure no campo do código e escolha Colar.');
      return;
    }
    if (input) input.value = text;
    if (await run(() => S.api.auth.verifyCode(S.loginSent, text))) { setLoginSent(null); invalidate(); refresh(); }
  },
  signOut: async () => {
    if (!(await ask('Sair da sua conta neste aparelho?'))) return;
    await S.api.auth.signOut();
    S.stack = []; S.tab = 'inicio'; S.md = null;
    invalidate(); screenCache.clear(); clearSnap();
    refresh();
  },
  resetDemo: async () => {
    if (!(await ask('Apagar as mudanças e voltar aos dados de exemplo?'))) return;
    S.api.reset(); S.stack = []; S.tab = 'inicio'; S.mid = null; invalidate(); screenCache.clear(); clearSnap(); refresh();
  },
  switchMin: (d) => { S.mid = d.id; store.set('asa-mid', d.id); S.stack = []; S.tab = 'inicio'; invalidate(); refresh(); },

  status: async (d) => {
    const msg = { confirmed: 'Presença confirmada!', declined: 'O líder vai ver que você não pode.', pending: 'Resposta desfeita.' }[d.status];
    // Mostra a resposta na hora; o servidor confirma em seguida (se falhar, a tela volta ao que era).
    const data = S.view.data || {};
    const list = (data.ev && data.ev.assignments) || data.assigns || [];
    const a = list.find((x) => x.id === d.id);
    const before = a && a.status;
    if (a) { a.status = d.status; repaint(); }
    toast(msg);
    try {
      await S.api.setMyStatus(d.id, d.status);
      screenCache.clear();
      refresh({ keepScroll: true });
    } catch (e) {
      if (a) { a.status = before; repaint(); }
      toast(friendly(e.message));
    }
  },
  unassign: async (d) => { if (await run(() => S.api.unassign(d.id), 'Pessoa tirada da escala.')) refresh({ keepScroll: true }); },
  delEvent: async (d) => {
    if (!(await ask('Apagar esta escala? Isso não pode ser desfeito.'))) return;
    if (await run(() => S.api.deleteEvent(d.id), 'Escala apagada.')) back();
  },
  pickSong: async (d) => {
    const ev = S.view.data.ev;
    const pos = ev.songs.length ? Math.max(...ev.songs.map((x) => x.position)) + 1 : 1;
    if (await run(() => S.api.addEventSong({ ministry_id: S.mid, event_id: d.event, song_id: d.id, key: d.key || '', position: pos }), 'Música adicionada.')) back();
  },
  delEventSong: async (d) => { if (await run(() => S.api.removeEventSong(d.id), 'Música tirada da escala.')) refresh({ keepScroll: true }); },
  delSong: async (d) => {
    if (!(await ask('Apagar esta música do repertório? Ela também sai das escalas.'))) return;
    if (await run(() => S.api.deleteSong(d.id), 'Música apagada.')) back();
  },
  delNotice: async (d) => {
    if (!(await ask('Apagar este aviso?'))) return;
    if (await run(() => S.api.removeNotice(d.id), 'Aviso apagado.')) refresh({ keepScroll: true });
  },
  delRole: async (d) => {
    if (!(await ask(`Apagar a função “${d.name}”? Quem já está escalado nela continua na escala.`))) return;
    if (await run(() => S.api.removeRole(d.id), 'Função apagada.')) { invalidate(); if (d.back) back(); else refresh({ keepScroll: true }); }
  },
  toggleAdmin: async (d) => {
    const role = d.role === 'admin' ? 'member' : 'admin';
    if (role === 'member' && S.md.members.filter((m) => m.role === 'admin').length <= 1) return toast('O ministério precisa de pelo menos um administrador.');
    if (await run(() => S.api.setMemberRole(d.id, role), role === 'admin' ? 'Agora é administrador.' : 'Deixou de ser administrador.')) { invalidate(); refresh({ keepScroll: true }); }
  },
  removeMember: async (d) => {
    if (!(await ask(`Remover ${d.name} do ministério?`))) return;
    if (await run(() => S.api.removeMember(d.id), 'Membro removido.')) { invalidate(); back(); }
  },
  minTab: (d) => { S.minTab = d.v; repaint(); },
  hlyTest: async () => {
    S.hly = { ...(S.hly || {}), error: '' };
    const box = progress('Falando com o Holyrics…');
    try { S.hly.result = await holyricsClient(S.api, S.mid).test(); }
    catch (e) { S.hly.result = null; S.hly.error = e.message; }
    box.remove();
    repaint();
  },
  hlyEdit: () => { S.hly = { ...(S.hly || {}), editing: true }; repaint(); },
  hlyCancel: () => { S.hly = { ...(S.hly || {}), editing: false }; repaint(); },
  hlyDisconnect: async () => {
    if (!(await ask('Desconectar o Holyrics deste ministério? As chaves são apagadas do Asa.', 'Desconectar'))) return;
    if (await run(() => S.api.removeHolyrics(S.mid), 'Holyrics desconectado.')) { S.hly = null; invalidate(); refresh(); }
  },
  hlyTeam: async () => {
    const box = progress('Enviando membros e funções…');
    try {
      const r = await holyricsClient(S.api, S.mid).sendTeam(S.md, (t) => box.set(t));
      box.done(`<strong>Pronto!</strong><br>${r.roles ? `${r.roles} ${r.roles === 1 ? 'função nova' : 'funções novas'}` : 'Nenhuma função nova'} e ${r.members ? `${r.members} ${r.members === 1 ? 'membro novo' : 'membros novos'}` : 'nenhum membro novo'} no Holyrics. Quem já estava lá foi mantido.`);
      invalidate();
    } catch (e) { box.done(esc(e.message), true); }
  },
  sendHolyrics: async () => {
    if (!S.md.hasHolyrics) return push('holyrics', {});
    const ev = S.view.data.ev;
    if (!ev.songs.length && !(await ask('Esta escala ainda não tem músicas. Enviar mesmo assim só com a equipe?', 'Enviar'))) return;
    const box = progress('Conectando ao Holyrics…');
    try {
      const r = await holyricsClient(S.api, S.mid).sendEvent(ev, { nameOf, onStep: (t) => box.set(t) });
      const lines = [];
      if (r.target === 'culto') lines.push(`Culto <strong>${esc(ev.title)}</strong> ${r.event} na agenda do Holyrics com ${r.playlist} ${r.playlist === 1 ? 'música' : 'músicas'}.`);
      else lines.push(r.playlist ? `${r.playlist} ${r.playlist === 1 ? 'música adicionada' : 'músicas adicionadas'} à lista aberta no Holyrics.` : 'As músicas já estavam na lista aberta no Holyrics.');
      if (r.created.length) lines.push(`Criadas no Holyrics: ${esc(r.created.join(', '))}.`);
      if (r.missing.length) lines.push(`<span style="color:var(--bad)">Não encontradas no Holyrics: ${esc(r.missing.join(', '))}.</span>${r.plan === 'none' ? ' Cadastre essas lá (ou assine o Holyrics Plan para o Asa criar sozinho) e envie de novo.' : ''}`);
      box.done(`<strong>Enviado!</strong><br>${lines.join('<br><br>')}`);
      invalidate(); screenCache.clear();
    } catch (e) { box.done(esc(e.message), true); }
  },
  removeCover: async () => {
    if (!(await ask('Remover a foto do ministério?', 'Remover'))) return;
    if (await run(() => S.api.removeMinistryCover(S.md.ministry), 'Foto removida.')) { invalidate(); refresh({ keepScroll: true }); }
  },
  removeAvatar: async () => {
    if (!(await ask('Remover sua foto de perfil?', 'Remover'))) return;
    if (await run(() => S.api.removeAvatar(S.profile), 'Foto removida.')) { invalidate(); refresh({ keepScroll: true }); }
  },
  copyInvite: async () => {
    const link = inviteLink(S.md.ministry.invite_code);
    try { await navigator.clipboard.writeText(link); toast('Link copiado.'); }
    catch { showText('Link do convite', link); }
  },
  newInvite: async () => {
    if (!(await ask('Gerar um novo convite? O código atual deixa de funcionar e quem ainda não entrou vai precisar do novo.', 'Gerar novo'))) return;
    if (await run(() => S.api.newInviteCode(S.mid), 'Novo convite gerado.')) { invalidate(); refresh(); }
  },
  newTeam: () => push('equipeForm', {}),
  delTeam: async (d) => {
    if (!(await ask('Apagar esta equipe? As pessoas continuam no ministério.'))) return;
    if (await run(() => S.api.removeTeam(d.id), 'Equipe apagada.')) { invalidate(); back(); }
  },
  seedCats: async () => { if (await run(() => S.api.seedCategories(S.mid), 'Classificações adicionadas.')) { invalidate(); refresh(); } },
  delCat: async (d) => {
    if (!(await ask(`Apagar a classificação “${d.name}”? As músicas continuam no repertório.`))) return;
    if (await run(() => S.api.removeCategory(d.id), 'Classificação apagada.')) { invalidate(); back(); }
  },
  catFilter: (d) => { S.catFilter = S.catFilter === d.id ? null : d.id; repaint(); },
  invite: async () => {
    const m = S.md.ministry;
    const text = `Você foi convidado para o ministério ${m.name} no Asa, o app de escalas.\n\nAbra o link: ${inviteLink(m.invite_code)}\nOu use o código: ${m.invite_code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Convite para o Asa', text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    showText('Convite para o ministério', text);
  },
};

// ---------- Formulários ----------

const FORMS = {
  login: async (f) => {
    const email = f.get('email').trim();
    store.set('asa-email', email);
    if (await run(() => S.api.auth.signIn(email))) { setLoginSent(email); refresh(); }
  },
  codigo: async (f) => {
    if (await run(() => S.api.auth.verifyCode(S.loginSent, f.get('code')))) { setLoginSent(null); invalidate(); refresh(); }
  },
  perfil: async (f, el) => {
    const patch = { name: f.get('name').trim(), birthday: f.get('birthday') || null };
    if (!patch.name) return toast('Escreva seu nome.');
    if (await run(() => S.api.saveProfile(S.user.id, patch), el.dataset.stay ? 'Perfil salvo.' : null)) {
      invalidate();
      if (el.dataset.stay) back(); else refresh();
    }
  },
  entrar: async (f) => {
    let id;
    if (await run(async () => { id = await S.api.joinMinistry(f.get('code')); }, 'Você entrou no ministério!')) {
      S.mid = id; store.set('asa-mid', id); S.stack = []; S.tab = 'inicio'; invalidate(); refresh();
    }
  },
  criarMinisterio: async (f) => {
    let id;
    if (await run(async () => { id = await S.api.createMinistry(f.get('name')); }, 'Ministério criado! Agora convide a equipe.')) {
      S.mid = id; store.set('asa-mid', id); S.stack = []; S.tab = 'ministerio'; invalidate(); refresh();
    }
  },
  evento: async (f, el) => {
    const id = el.dataset.id || null;
    let saved;
    const ok = await run(async () => {
      saved = await S.api.saveEvent({ id, ministry_id: S.mid, title: f.get('title'), date: f.get('date'), time: f.get('time'), notes: f.get('notes') });
    }, id ? 'Escala atualizada.' : 'Escala criada. Agora escale as pessoas.');
    if (ok) { if (id) back(); else replace('evento', { id: saved.id }); }
  },
  escalar: async (f, el) => {
    const ok = await run(() => S.api.assign({ ministry_id: S.mid, event_id: el.dataset.id, user_id: f.get('user'), role_name: f.get('role') }), 'Pessoa escalada.');
    if (ok) back();
  },
  musica: async (f, el) => {
    const id = el.dataset.id || null;
    let saved;
    const ok = await run(async () => {
      const content = f.get('content') || '';
      saved = await S.api.saveSong({
        id, ministry_id: S.mid, title: f.get('title'), artist: f.get('artist'),
        key: f.get('key') || detectKey(content), link: (f.get('link_video') || '').trim(), content,
        links: Object.fromEntries(LINK_FIELDS.map(([k]) => [k, (f.get('link_' + k) || '').trim()])),
        artwork: f.get('artwork'), duration: f.get('duration'), bpm: f.get('bpm'),
        ...(S.md.categories.length ? { categories: f.getAll('category') } : {}),
      });
    }, id ? 'Música atualizada.' : 'Música salva no repertório.');
    if (!ok) return;
    S.songView = null;
    if (id) return back();
    while (S.stack.length && ['musicaForm', 'buscarMusica'].includes(current().name)) S.stack.pop();
    push('musica', { id: saved.id });
  },
  buscar: async (f) => {
    const term = (f.get('q') || '').trim();
    if (!term) return;
    stopAudio();
    S.search = { term, results: [], loading: true, error: '' };
    repaint();
    try { S.search.results = await searchSongs(term); }
    catch (e) { S.search.error = e.message; }
    S.search.loading = false;
    if (current().name === 'buscarMusica') repaint();
  },
  funcao: async (f, el) => {
    const id = el.dataset.id;
    const name = (f.get('name') || '').trim();
    const ic = f.get('icon') || guessIcon(name);
    if (S.md.roles.some((r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase())) return toast('Já existe uma função com esse nome.');
    const role = S.md.roles.find((r) => r.id === id);
    const pos = Math.max(0, ...S.md.roles.map((r) => r.position || 0)) + 1;
    if (await run(() => (role ? S.api.renameRole(S.mid, role, name, ic) : S.api.addRole(S.mid, name, ic, pos)), role ? 'Função salva.' : 'Função adicionada.')) { invalidate(); back(); }
  },
  holyrics: async (f) => {
    const creds = { api_key: f.get('api_key').trim(), token: f.get('token').trim() };
    const box = progress('Testando a conexão com o Holyrics…');
    let result;
    try { result = await holyricsClient(S.api, S.mid, creds).test(); }
    catch (e) { box.done(esc(e.message), true); return; }
    try { await S.api.saveHolyrics(S.mid, creds.api_key, creds.token); }
    catch (e) { box.done(esc(friendly(e.message)), true); return; }
    box.remove();
    S.hly = { result, editing: false };
    toast('Holyrics conectado!');
    invalidate(); refresh();
  },
  ministerio: async (f) => {
    if (await run(() => S.api.updateMinistry(S.mid, { name: f.get('name').trim() }), 'Ministério salvo.')) { invalidate(); back(); }
  },
  skills: async (f, el) => {
    const skills = f.getAll('skill');
    const ok = await run(() => (el.dataset.self ? S.api.setMySkills(S.mid, skills) : S.api.setMemberSkills(el.dataset.id, skills)), 'Funções salvas.');
    if (ok) { invalidate(); back(); }
  },
  equipe: async (f, el) => {
    const t = { id: el.dataset.id || null, ministry_id: S.mid, name: f.get('name'), member_ids: f.getAll('member') };
    if (await run(() => S.api.saveTeam(t), t.id ? 'Equipe salva.' : 'Equipe criada.')) { invalidate(); back(); }
  },
  categoria: async (f, el) => {
    const c = { id: el.dataset.id || null, ministry_id: S.mid, name: f.get('name'), description: f.get('description') };
    if (await run(() => S.api.saveCategory(c), c.id ? 'Classificação salva.' : 'Classificação adicionada.')) { invalidate(); back(); }
  },
  admins: async (f) => {
    const on = new Set(f.getAll('admin'));
    if (!on.size) return toast('Deixe pelo menos um administrador.');
    const changes = S.md.members.filter((m) => (m.role === 'admin') !== on.has(m.id));
    if (!changes.length) return back();
    const meLosing = changes.some((m) => m.user_id === S.user.id);
    if (meLosing && !(await ask('Você vai deixar de ser administrador e não poderá mais editar escalas. Continuar?', 'Continuar'))) return;
    const ok = await run(async () => {
      // primeiro quem vira admin, depois quem deixa de ser (assim nunca fica sem administrador)
      for (const m of changes.filter((x) => on.has(x.id))) await S.api.setMemberRole(m.id, 'admin');
      for (const m of changes.filter((x) => !on.has(x.id))) await S.api.setMemberRole(m.id, 'member');
    }, 'Administradores salvos.');
    if (ok) { invalidate(); back(); }
  },
  aviso: async (f) => {
    if (await run(() => S.api.addNotice({ ministry_id: S.mid, author_id: S.user.id, text: f.get('text').trim() }), 'Aviso publicado.')) back();
  },
};

// ---------- Ligação com a página ----------

function wire() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root().contains(el)) return;
    const fn = ACTIONS[el.dataset.act];
    if (!fn) return;
    e.preventDefault();
    fn({ ...el.dataset }, el);
  });
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const btn = form.querySelector('button:not([type="button"])');
    if (btn) btn.disabled = true;
    try { await FORMS[form.dataset.form](new FormData(form), form); }
    finally { if (btn && document.body.contains(btn)) btn.disabled = false; }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.change === 'songKey') { S.songView.key = el.value; repaint(); }
    if (el.dataset.artCheck && S.artEdit) { S.artEdit.settings[el.dataset.artCheck] = el.checked; repaint(); return; }
    if (el.dataset.artPhoto !== undefined && el.files && el.files[0] && S.artEdit) {
      resizeImage(el.files[0], 1600).then(async (blob) => {
        S.artEdit.photoBlob = blob;
        S.artEdit.photoImg = await loadImage(URL.createObjectURL(blob));
        repaint();
      }).catch((err) => toast(err.message));
      return;
    }
    if ((el.dataset.cover || el.dataset.avatar) && el.files && el.files[0]) {
      const file = el.files[0];
      const isCover = !!el.dataset.cover;
      toast('Enviando foto…');
      run(async () => {
        const blob = await resizeImage(file, isCover ? 1280 : 512);
        if (isCover) await S.api.setMinistryCover(S.md.ministry, blob); else await S.api.setAvatar(S.profile, blob);
      }, 'Foto salva.').then((ok) => { if (ok) { invalidate(); refresh({ keepScroll: true }); } });
      return;
    }
    if (el.dataset.change === 'escalarRole') {
      const role = el.value;
      root().querySelectorAll('[data-skills]').forEach((row) => {
        const has = role && row.dataset.skills.split('|').includes(role);
        row.style.order = has ? -1 : 0;
        row.classList.toggle('match', !!has);
      });
      return;
    }
    if (el.dataset.banner && el.files && el.files[0]) {
      const file = el.files[0];
      const ev = S.view.data.ev;
      toast('Enviando banner…');
      run(async () => {
        const blob = await resizeImage(file);
        await S.api.setEventBanner(ev, blob);
      }, 'Flyer salvo como capa.').then((ok) => { if (ok) { S.artKind = 'capa'; refresh({ keepScroll: true }); } });
    }
    if (el.name === 'key' && el.dataset.auto) el.dataset.auto = el.value ? '0' : '1';
  });
  let artTimer;
  document.addEventListener('input', (e) => {
    const field = e.target.closest('[data-art-field]');
    if (field && S.artEdit) {
      S.artEdit.settings[field.dataset.artField] = field.value;
      clearTimeout(artTimer);
      artTimer = setTimeout(() => {
        const img = root().querySelector('[data-art-preview]');
        if (img && S.view.data.ev) renderArt(img, S.view.data.ev, S.artEdit.kind, S.artEdit.settings, S.artEdit.photoImg);
      }, 250);
      return;
    }
    if (e.target.dataset.guessIcon === '1') {
      const ic = guessIcon(e.target.value);
      const radio = e.target.form.querySelector(`input[name="icon"][value="${ic}"]`);
      if (radio) radio.checked = true;
      return;
    }
    const area = e.target.closest('[data-detect="key"]');
    if (area) {
      const k = detectKey(area.value);
      const sel = area.form.elements.key;
      const hint = area.form.querySelector('[data-key-hint]');
      if (k && sel.dataset.auto === '1') sel.value = k;
      if (hint) hint.textContent = k ? `Tom detectado: ${k}` : '';
      return;
    }
    const input = e.target.closest('[data-filter]');
    if (!input) return;
    const q = input.value.trim().toLowerCase();
    root().querySelectorAll(`[data-filter-list="${input.dataset.filter}"] [data-text]`).forEach((row) => {
      row.style.display = !q || row.dataset.text.includes(q) ? '' : 'none';
    });
  });
}

async function boot() {
  // Pede ao aparelho para não apagar os dados do app (e o login) quando faltar espaço.
  try { navigator.storage?.persist?.(); } catch { /* opcional */ }
  const cfg = window.ASA_CONFIG || {};
  const adapter = cfg.supabaseUrl && cfg.supabaseAnonKey ? await supabaseAdapter(cfg) : demoAdapter();
  S.api = createApi(adapter);
  S.mid = store.get('asa-mid');
  restoreLoginSent();
  const params = new URLSearchParams(location.search);
  const code = params.get('convite');
  if (code) {
    store.set('asa-convite', code);
    history.replaceState(null, '', location.pathname);
  }
  S.pendingInvite = store.get('asa-convite');
  S.api.auth.onChange((event) => {
    // Renovação automática do login não precisa recarregar nada; entrar ou sair, sim.
    if (event && !['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) return;
    if (event === 'SIGNED_IN' && ctxReady && S.user) return;
    invalidate(); screenCache.clear(); refresh();
  });
  wire();
  await refresh();
}

boot().catch((e) => {
  console.error(e);
  root().innerHTML = `<div class="center-screen"><h1 class="h1">Não foi possível abrir o Asa</h1><p class="sub">${esc(e.message)}</p></div>`;
});
