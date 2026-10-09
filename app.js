// Asa — telas e navegação do app.
import { createApi, demoAdapter, supabaseAdapter, todayISO, addDays } from './data.js';
import {
  MAJOR_KEYS, MINOR_KEYS, parseKey, shiftKey, semitonesBetween, transposeText, detectKey,
  renderCifra, songLinks, fmtDuration, searchSongs, cifraClubLinks, findAudio,
} from './music.js';

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

function ask(message) {
  const label = message.startsWith('Sair') ? 'Sair' : message.startsWith('Remover') ? 'Remover' : 'Apagar';
  return new Promise((resolve) => {
    const wrap = modal(`<p class="modal-text">${esc(message)}</p>
      <div class="modal-actions"><button class="btn outline grow" data-r="0">Cancelar</button>
      <button class="btn danger grow" data-r="1">${label}</button></div>`);
    const close = (v) => { wrap.remove(); resolve(v); };
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) close(b.dataset.r === '1'); else if (e.target === wrap) close(false);
    });
    wrap.querySelector('[data-r="0"]').focus();
  });
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

async function refresh({ keepScroll = false } = {}) {
  stopAudio();
  const scroller = root().querySelector('.scroll');
  const top = keepScroll && scroller ? scroller.scrollTop : 0;
  try {
    S.user = await S.api.auth.user();
    if (!S.user) { S.view = { screen: 'login' }; return paint(top); }
    S.profile = await S.api.profile(S.user.id);
    if (!S.profile || !S.profile.name) { S.view = { screen: 'nome' }; return paint(top); }
    if (S.pendingInvite) {
      const code = S.pendingInvite;
      S.pendingInvite = null;
      store.set('asa-convite', null);
      try { S.mid = await S.api.joinMinistry(code); store.set('asa-mid', S.mid); toast('Você entrou no ministério!'); }
      catch (e) { toast(e.message); }
    }
    S.ministries = await S.api.myMinistries(S.user.id);
    if (!S.ministries.length) { S.view = { screen: 'semMinisterio' }; return paint(top); }
    if (!S.ministries.some((m) => m.id === S.mid)) { S.mid = S.ministries[0].id; store.set('asa-mid', S.mid); }
    S.md = await S.api.ministryData(S.mid);
    const cur = current();
    const screen = SCREENS[cur.name];
    const data = screen.load ? await screen.load(cur.params || {}) : {};
    S.view = { screen: cur.name, params: cur.params || {}, data };
  } catch (e) {
    console.error(e);
    S.view = { screen: 'erro', data: { message: e.message } };
  }
  paint(top);
}

function paint(scrollTop = 0) {
  const { screen, params = {}, data = {} } = S.view;
  const def = SCREENS[screen];
  const tabScreen = ['inicio', 'escalas', 'repertorio', 'ministerio'].includes(screen) && !S.stack.length;
  root().innerHTML = `<div class="shell">${def.view(data, params)}${tabScreen ? navBar(screen) : ''}</div>`;
  const scroller = root().querySelector('.scroll');
  if (scroller) scroller.scrollTop = scrollTop;
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
          <div class="banner"><strong>Digite o código de 6 números.</strong> Não toque no link do e-mail: ele abre o navegador, e você continuaria sem entrar ${installed() ? 'neste app' : 'aqui'}.</div>
          <form class="form" data-form="codigo">
            <label class="field"><span>Código de acesso</span>
              <input class="input" name="code" required inputmode="numeric" autocomplete="one-time-code" maxlength="10"
                placeholder="000000" style="font-size:24px;letter-spacing:0.3em;text-align:center" autofocus></label>
            <button class="btn primary block">Entrar</button></form>
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
      const lastNotices = notices.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
      const multi = S.ministries.length > 1;
      return `<div class="scroll">
        <div class="topbar">${logo(36)}
          <button class="grow" data-act="${multi ? 'open' : 'tab'}" data-screen="ministerios" data-tab="ministerio" style="border:0;background:none;text-align:left;padding:0;cursor:pointer;display:flex;flex-direction:column">
            <span class="item-sub">Ministério</span><span style="font-size:16px;font-weight:700">${esc(S.md.ministry.name)}${multi ? ' ▾' : ''}</span></button>
          <button class="avatar lg me" data-act="open" data-screen="perfil" aria-label="Meu perfil" style="border:0;cursor:pointer">${initial(S.profile.name)}</button>
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
        <div class="section"><div class="section-head"><h2 class="h2">Avisos</h2>
          ${isAdmin() ? `<button class="btn link small" data-act="open" data-screen="aviso">${icon('plus', 18)}Novo aviso</button>` : ''}</div>
          ${lastNotices.length ? `<div class="list">${lastNotices.map((n) => `<div class="item static">
            <span style="color:var(--blue)">${icon('mega')}</span>
            <div class="item-main"><span class="item-title" style="white-space:pre-wrap;font-weight:600">${esc(n.text)}</span>
            <span class="item-sub">${esc(firstName(nameOf(n.author_id)))} · ${fmtAgo(n.created_at)}</span></div>
            ${isAdmin() ? `<button class="icon-btn" data-act="delNotice" data-id="${n.id}" aria-label="Apagar aviso">${icon('x', 18)}</button>` : ''}</div>`).join('')}</div>`
            : '<div class="empty">Nenhum aviso por enquanto.</div>'}</div>
        <div class="section"><h2 class="h2">Aniversariantes de ${MONL[Number(month) - 1]}</h2>
          ${bdays.length ? `<div class="list">${bdays.map((m) => `<div class="item static"><span class="avatar gold">${initial(m.profile.name)}</span>
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
        ${ev.notes ? `<div class="card notes">${esc(ev.notes)}</div>` : ''}
        <div class="section"><div class="section-head"><h2 class="h2">Equipe</h2><span class="item-sub">${ev.assignments.length ? `${ok} de ${ev.assignments.length} confirmados` : ''}</span></div>
          ${team.length ? `<div class="list">${team.map((a) => `<div class="item static">
            <span class="avatar ${a.user_id === S.user.id ? 'me' : ''}">${initial(nameOf(a.user_id))}</span>
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

  escalar: {
    load: async ({ id }) => ({ ev: await S.api.eventDetail(id) }),
    view: ({ ev }) => `<div class="scroll">${backBtn()}${header('Escalar pessoa', `${ev.title} · ${fmtShort(ev.date, ev.time)}`)}
      <form class="form" data-form="escalar" data-id="${ev.id}">
        <label class="field"><span>Função</span>
          <select class="input" name="role" required><option value="">Escolha a função</option>
          ${S.md.roles.map((r) => `<option>${esc(r.name)}</option>`).join('')}</select>
          ${S.md.roles.length ? '' : '<small>Cadastre funções em Ministério › Funções.</small>'}</label>
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-size:14px;font-weight:700;margin-bottom:6px">Pessoa</legend>
          <div class="list">${S.md.members.map((m) => {
            const already = ev.assignments.filter((a) => a.user_id === m.user_id).map((a) => a.role_name);
            return `<label class="item"><input type="radio" name="user" value="${m.user_id}" required style="width:20px;height:20px;accent-color:var(--blue)">
              <span class="avatar">${initial(m.profile.name)}</span>
              <span class="item-main"><span class="item-title">${esc(m.profile.name)}${m.user_id === S.user.id ? ' (você)' : ''}</span>
              ${already.length ? `<span class="item-sub">Já escalado: ${esc(already.join(', '))}</span>` : ''}</span></label>`;
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
      const list = songs.slice().sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      const artists = new Set(songs.map((s) => s.artist).filter(Boolean)).size;
      return `<div class="scroll">${header('Repertório', `${songs.length} ${songs.length === 1 ? 'música' : 'músicas'} · ${artists} ${artists === 1 ? 'artista' : 'artistas'}`)}
        <label class="search">${icon('search', 20)}<span class="sr-only">Buscar no repertório</span>
          <input type="search" data-filter="songs" placeholder="Buscar no repertório"></label>
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
      const admins = S.md.members.filter((x) => x.role === 'admin').length;
      return `<div class="scroll">${header('Ministério')}
        <div class="hero" style="cursor:default">
          <div style="display:flex;align-items:center;gap:14px">
            <span class="avatar" style="width:60px;height:60px;border-radius:16px;background:#fff;font-size:20px;font-weight:800">${initial(m.name)}</span>
            <div style="display:flex;flex-direction:column;gap:2px"><span class="big" style="font-size:19px">${esc(m.name)}</span>
            <span class="small">${S.md.members.length} ${S.md.members.length === 1 ? 'membro' : 'membros'} · ${S.md.roles.length} funções</span></div></div>
          <div class="code-box"><div style="display:flex;flex-direction:column;gap:2px"><span class="small" style="font-size:13px">Código de convite</span><strong>${esc(m.invite_code)}</strong></div>
            <button class="btn white small" data-act="invite">${icon('share', 18)}Convidar</button></div>
        </div>
        <div class="list">
          <button class="item" data-act="open" data-screen="membros"><span style="color:var(--blue)">${icon('people')}</span>
            <span class="item-main"><span class="item-title" style="font-weight:600">Membros</span></span><span class="item-sub">${S.md.members.length}</span>${icon('chev', 18)}</button>
          <button class="item" data-act="open" data-screen="funcoes"><span style="color:var(--blue)">${icon('tag')}</span>
            <span class="item-main"><span class="item-title" style="font-weight:600">Funções</span></span><span class="item-sub">${S.md.roles.length}</span>${icon('chev', 18)}</button>
          <div class="item static"><span style="color:var(--blue)">${icon('shield')}</span>
            <span class="item-main"><span class="item-title" style="font-weight:600">Administradores</span><span class="item-sub">${esc(S.md.members.filter((x) => x.role === 'admin').map((x) => firstName(x.profile.name)).join(', '))}</span></span><span class="item-sub">${admins}</span></div>
        </div>
        <div class="list">
          <button class="item" data-act="open" data-screen="perfil"><span class="avatar me" style="width:28px;height:28px;font-size:12px">${initial(S.profile.name)}</span>
            <span class="item-main"><span class="item-title" style="font-weight:600">Meu perfil</span></span>${icon('chev', 18)}</button>
          <button class="item" data-act="open" data-screen="ministerios"><span style="color:var(--blue)">${icon('swap')}</span>
            <span class="item-main"><span class="item-title" style="font-weight:600">Trocar ou entrar em outro ministério</span></span>${icon('chev', 18)}</button>
          ${S.api.mode === 'demo' ? `<button class="item" data-act="resetDemo"><span style="color:var(--blue)">${icon('swap')}</span>
            <span class="item-main"><span class="item-title" style="font-weight:600">Recomeçar a demonstração</span></span></button>` : ''}
          <button class="item" data-act="signOut"><span style="color:var(--bad)">${icon('out')}</span>
            <span class="item-main"><span class="item-title" style="font-weight:600;color:var(--bad)">Sair da conta</span></span></button>
        </div>
        ${demoBanner()}
      </div>`;
    },
  },

  membros: {
    view: () => `<div class="scroll">${backBtn('Ministério')}${header('Membros', `${S.md.members.length} no ministério`)}
      <div class="list">${S.md.members.map((m) => {
        const self = m.user_id === S.user.id;
        return `<div class="item static"><span class="avatar ${self ? 'me' : ''}">${initial(m.profile.name)}</span>
          <div class="item-main"><span class="item-title">${esc(m.profile.name)}${self ? ' (você)' : ''}</span>
          ${m.profile.birthday ? `<span class="item-sub">Aniversário: ${Number(m.profile.birthday.slice(8))}/${m.profile.birthday.slice(5, 7)}</span>` : ''}</div>
          ${m.role === 'admin' ? '<span class="tag admin">Admin</span>' : ''}
          ${isAdmin() && !self ? `<button class="btn link small" data-act="toggleAdmin" data-id="${m.id}" data-role="${m.role}">${m.role === 'admin' ? 'Tirar admin' : 'Tornar admin'}</button>
            <button class="icon-btn" data-act="removeMember" data-id="${m.id}" data-name="${esc(m.profile.name)}" aria-label="Remover ${esc(m.profile.name)}">${icon('x', 18)}</button>` : ''}</div>`;
      }).join('')}</div>
      <button class="btn primary block" data-act="invite">${icon('share', 18)}Convidar membros</button></div>`,
  },

  funcoes: {
    view: () => `<div class="scroll">${backBtn('Ministério')}${header('Funções', 'O que cada pessoa pode fazer numa escala')}
      ${S.md.roles.length ? `<div class="list">${S.md.roles.map((r) => `<div class="item static"><span class="item-main"><span class="item-title" style="font-weight:600">${esc(r.name)}</span></span>
        ${isAdmin() ? `<button class="icon-btn" data-act="delRole" data-id="${r.id}" aria-label="Apagar ${esc(r.name)}">${icon('x', 18)}</button>` : ''}</div>`).join('')}</div>`
        : '<div class="empty">Nenhuma função cadastrada.</div>'}
      ${isAdmin() ? `<form class="form card" data-form="funcao"><label class="field"><span>Nova função</span>
        <input class="input" name="name" required maxlength="40" placeholder="Ex.: Backing vocal"></label>
        <button class="btn primary block">Adicionar função</button></form>` : ''}</div>`,
  },

  aviso: {
    view: () => `<div class="scroll">${backBtn()}${header('Novo aviso', 'Aparece na tela inicial de todos os membros')}
      <form class="form" data-form="aviso"><label class="field"><span class="sr-only">Aviso</span>
        <textarea class="input" name="text" required maxlength="500" placeholder="Ex.: Ensaio no sábado, às 16h." autofocus></textarea></label>
        <button class="btn primary block">Publicar aviso</button></form></div>`,
  },

  perfil: {
    view: () => `<div class="scroll">${backBtn()}${header('Meu perfil')}
      <form class="form" data-form="perfil" data-stay="1">
        <label class="field"><span>Nome</span><input class="input" name="name" required maxlength="40" value="${esc(S.profile.name)}"></label>
        <label class="field"><span>Aniversário <small>(aparece para o ministério)</small></span>
          <input class="input" name="birthday" type="date" value="${esc(S.profile.birthday || '')}"></label>
        ${S.user.email ? `<p class="sub">Conta: ${esc(S.user.email)}</p>` : ''}
        <button class="btn primary block">Salvar</button></form></div>`,
  },

  ministerios: {
    view: () => `<div class="scroll">${backBtn()}${header('Seus ministérios')}
      <div class="list">${S.ministries.map((m) => `<button class="item" data-act="switchMin" data-id="${m.id}">
        <span class="avatar">${initial(m.name)}</span>
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
  open: (d) => push(d.screen, { id: d.id, key: d.key, es: d.es }),
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

  demoLogin: async () => { await S.api.auth.signIn(); refresh(); },
  loginAgain: () => { setLoginSent(null); refresh(); },
  signOut: async () => {
    if (!(await ask('Sair da sua conta neste aparelho?'))) return;
    await S.api.auth.signOut();
    S.stack = []; S.tab = 'inicio'; S.md = null;
    refresh();
  },
  resetDemo: async () => {
    if (!(await ask('Apagar as mudanças e voltar aos dados de exemplo?'))) return;
    S.api.reset(); S.stack = []; S.tab = 'inicio'; S.mid = null; refresh();
  },
  switchMin: (d) => { S.mid = d.id; store.set('asa-mid', d.id); S.stack = []; S.tab = 'inicio'; refresh(); },

  status: async (d) => {
    const msg = { confirmed: 'Presença confirmada!', declined: 'O líder vai ver que você não pode.', pending: 'Resposta desfeita.' }[d.status];
    if (await run(() => S.api.setMyStatus(d.id, d.status), msg)) refresh({ keepScroll: true });
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
  delRole: async (d) => { if (await run(() => S.api.removeRole(d.id), 'Função apagada.')) refresh({ keepScroll: true }); },
  toggleAdmin: async (d) => {
    const role = d.role === 'admin' ? 'member' : 'admin';
    if (await run(() => S.api.setMemberRole(d.id, role), role === 'admin' ? 'Agora é administrador.' : 'Deixou de ser administrador.')) refresh({ keepScroll: true });
  },
  removeMember: async (d) => {
    if (!(await ask(`Remover ${d.name} do ministério?`))) return;
    if (await run(() => S.api.removeMember(d.id), 'Membro removido.')) refresh({ keepScroll: true });
  },
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
    if (await run(() => S.api.auth.verifyCode(S.loginSent, f.get('code')))) { setLoginSent(null); refresh(); }
  },
  perfil: async (f, el) => {
    const patch = { name: f.get('name').trim(), birthday: f.get('birthday') || null };
    if (!patch.name) return toast('Escreva seu nome.');
    if (await run(() => S.api.saveProfile(S.user.id, patch), el.dataset.stay ? 'Perfil salvo.' : null)) {
      if (el.dataset.stay) back(); else refresh();
    }
  },
  entrar: async (f) => {
    let id;
    if (await run(async () => { id = await S.api.joinMinistry(f.get('code')); }, 'Você entrou no ministério!')) {
      S.mid = id; store.set('asa-mid', id); S.stack = []; S.tab = 'inicio'; refresh();
    }
  },
  criarMinisterio: async (f) => {
    let id;
    if (await run(async () => { id = await S.api.createMinistry(f.get('name')); }, 'Ministério criado! Agora convide a equipe.')) {
      S.mid = id; store.set('asa-mid', id); S.stack = []; S.tab = 'ministerio'; refresh();
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
  funcao: async (f) => { if (await run(() => S.api.addRole(S.mid, f.get('name')), 'Função adicionada.')) refresh({ keepScroll: true }); },
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
    if (el.name === 'key' && el.dataset.auto) el.dataset.auto = el.value ? '0' : '1';
  });
  document.addEventListener('input', (e) => {
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
  S.api.auth.onChange(() => refresh());
  wire();
  await refresh();
}

boot().catch((e) => {
  console.error(e);
  root().innerHTML = `<div class="center-screen"><h1 class="h1">Não foi possível abrir o Asa</h1><p class="sub">${esc(e.message)}</p></div>`;
});
