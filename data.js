// Asa — camada de dados.
// O app conversa só com esta camada. Ela funciona em dois modos:
//  - "demo": dados de exemplo guardados no próprio navegador (para testar sem conta nenhuma)
//  - "supabase": dados reais, compartilhados entre todos os membros

const uid = () =>
  (globalThis.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

const code6 = () =>
  Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

export function todayISO(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + n));
}

function nextWeekday(fromIso, weekday) {
  const [y, m, d] = fromIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const diff = (weekday - dt.getDay() + 7) % 7 || 7;
  return addDays(fromIso, diff);
}

export const DEFAULT_ROLES = ['Ministro(a)', 'Vocal', 'Teclado', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Som', 'Projeção'];

// ---------- Modo demonstração ----------

const DEMO_KEY = 'asa-demo-v1';

function seed() {
  const today = todayISO();
  const month = today.slice(5, 7);
  const sun = nextWeekday(today, 0);
  const wed = nextWeekday(today, 3);
  const people = [
    { id: 'me', name: 'Gui', birthday: null },
    { id: 'ana', name: 'Ana', birthday: null },
    { id: 'lucas', name: 'Lucas', birthday: `2001-${month}-23` },
    { id: 'gu', name: 'Gu', birthday: null },
    { id: 'eduardo', name: 'Eduardo', birthday: null },
    { id: 'pedro', name: 'Pedro', birthday: null },
  ];
  const m = 'min-1';
  const songs = [
    ['s1', '1000 Graus', 'Renascer Praise', 'C'],
    ['s2', 'A Boa Parte', 'fhop music', 'E'],
    ['s3', 'A Canção Não Mudou', 'ONE-Sounds', 'D'],
    ['s4', 'A Ele a Glória', 'Gabriela Rocha', 'G'],
    ['s5', 'Ao Que Está Assentado Sobre o Trono', 'Davi Fernandes & Cultura do Céu', 'A'],
    ['s6', 'Ao Único', 'Aline Barros', 'C'],
  ].map(([id, title, artist, key]) => ({ id, ministry_id: m, title, artist, key, link: '', content: '' }));
  const now = new Date().toISOString();
  return {
    session: null,
    profiles: people.map((p) => ({ ...p, created_at: now })),
    ministries: [{ id: m, name: 'Vida Renovada Louvor', invite_code: 'VIDA26', owner_id: 'ana', created_at: now }],
    members: people.map((p) => ({
      id: 'mem-' + p.id, ministry_id: m, user_id: p.id,
      role: p.id === 'me' || p.id === 'ana' ? 'admin' : 'member', created_at: now,
    })),
    roles: DEFAULT_ROLES.map((name, i) => ({ id: 'r' + i, ministry_id: m, name })),
    songs,
    events: [
      { id: 'e1', ministry_id: m, title: 'Culto de domingo', date: sun, time: '19:00', notes: 'Chegar às 18h para passar o som.', created_at: now },
      { id: 'e2', ministry_id: m, title: 'Culto de oração', date: wed, time: '20:00', notes: '', created_at: now },
      { id: 'e3', ministry_id: m, title: 'Santa ceia', date: addDays(sun, 7), time: '19:00', notes: '', created_at: now },
    ],
    assignments: [
      ['e1', 'ana', 'Ministro(a)', 'confirmed'],
      ['e1', 'lucas', 'Vocal', 'confirmed'],
      ['e1', 'me', 'Teclado', 'pending'],
      ['e1', 'gu', 'Violão', 'confirmed'],
      ['e1', 'eduardo', 'Bateria', 'declined'],
      ['e1', 'pedro', 'Som', 'confirmed'],
      ['e2', 'ana', 'Ministro(a)', 'confirmed'],
      ['e2', 'gu', 'Violão', 'confirmed'],
      ['e3', 'me', 'Teclado', 'pending'],
      ['e3', 'lucas', 'Vocal', 'confirmed'],
    ].map(([event_id, user_id, role_name, status], i) => ({
      id: 'a' + i, ministry_id: m, event_id, user_id, role_name, status, created_at: now,
    })),
    event_songs: [
      ['e1', 's4', 'G', 1], ['e1', 's2', 'E', 2], ['e1', 's6', 'C', 3],
      ['e2', 's3', 'D', 1],
    ].map(([event_id, song_id, key, position], i) => ({
      id: 'es' + i, ministry_id: m, event_id, song_id, key, position,
    })),
    notices: [{ id: 'n1', ministry_id: m, author_id: 'ana', text: 'Ensaio no sábado, às 16h.', created_at: now }],
  };
}

const CASCADE = {
  events: [['assignments', 'event_id'], ['event_songs', 'event_id']],
  songs: [['event_songs', 'song_id']],
  ministries: [['members', 'ministry_id'], ['roles', 'ministry_id'], ['songs', 'ministry_id'], ['events', 'ministry_id'], ['assignments', 'ministry_id'], ['event_songs', 'ministry_id'], ['notices', 'ministry_id']],
};

export function demoAdapter(storage = globalThis.localStorage) {
  const load = () => {
    try { const raw = storage && storage.getItem(DEMO_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  let db = load() || seed();
  const save = () => { try { storage && storage.setItem(DEMO_KEY, JSON.stringify(db)); } catch { /* sem armazenamento: segue só na memória */ } };
  const match = (row, m) => Object.entries(m || {}).every(([k, v]) => row[k] === v);
  const table = (t) => (db[t] ||= []);
  const clone = (r) => JSON.parse(JSON.stringify(r));
  const listeners = [];
  const me = () => { if (!db.session) throw new Error('Entre na sua conta primeiro.'); return db.session; };
  const removeDeep = (t, id) => {
    for (const [child, col] of CASCADE[t] || []) {
      for (const r of table(child).filter((x) => x[col] === id)) removeDeep(child, r.id);
    }
    db[t] = table(t).filter((x) => x.id !== id);
  };

  return {
    mode: 'demo',
    async list(t, m) { return table(t).filter((r) => match(r, m)).map(clone); },
    async listIn(t, col, values) { return table(t).filter((r) => values.includes(r[col])).map(clone); },
    async insert(t, row) {
      const r = { id: uid(), created_at: new Date().toISOString(), ...row };
      table(t).push(r); save(); return clone(r);
    },
    async update(t, id, patch) {
      const r = table(t).find((x) => x.id === id);
      if (!r) throw new Error('Registro não encontrado.');
      Object.assign(r, patch); save(); return clone(r);
    },
    async remove(t, id) { removeDeep(t, id); save(); },
    async rpc(name, args) {
      const user = me();
      if (name === 'create_ministry') {
        const id = uid();
        table('ministries').push({ id, name: args.p_name, invite_code: code6(), owner_id: user, created_at: new Date().toISOString() });
        table('members').push({ id: uid(), ministry_id: id, user_id: user, role: 'admin', created_at: new Date().toISOString() });
        DEFAULT_ROLES.forEach((n) => table('roles').push({ id: uid(), ministry_id: id, name: n }));
        save(); return id;
      }
      if (name === 'join_ministry') {
        const min = table('ministries').find((x) => x.invite_code === args.p_code);
        if (!min) throw new Error('Código de convite não encontrado.');
        if (!table('members').some((x) => x.ministry_id === min.id && x.user_id === user)) {
          table('members').push({ id: uid(), ministry_id: min.id, user_id: user, role: 'member', created_at: new Date().toISOString() });
          save();
        }
        return min.id;
      }
      if (name === 'set_my_status') {
        const a = table('assignments').find((x) => x.id === args.p_id);
        if (!a || a.user_id !== user) throw new Error('Esta escala não é sua.');
        a.status = args.p_status; save(); return null;
      }
      throw new Error('Função desconhecida: ' + name);
    },
    auth: {
      async user() { return db.session ? { id: db.session } : null; },
      async signIn() { db.session = 'me'; save(); listeners.forEach((f) => f()); return { instant: true }; },
      async signOut() { db.session = null; save(); listeners.forEach((f) => f()); },
      onChange(cb) { listeners.push(cb); },
    },
    reset() { db = seed(); db.session = 'me'; save(); },
    storage: {
      upload: (path, blob) => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        r.readAsDataURL(blob);
      }),
      async remove() { /* no modo demonstração a imagem some junto com o evento */ },
    },
  };
}

// ---------- Modo Supabase (dados reais) ----------

export async function supabaseAdapter(cfg) {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  // O login fica guardado no aparelho e é renovado sozinho: a pessoa entra uma vez e pronto.
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const ok = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  return {
    mode: 'supabase',
    async list(t, m) {
      let q = sb.from(t).select('*');
      if (m && Object.keys(m).length) q = q.match(m);
      return ok(await q);
    },
    async listIn(t, col, values) {
      if (!values.length) return [];
      return ok(await sb.from(t).select('*').in(col, values));
    },
    async insert(t, row) { return ok(await sb.from(t).insert(row).select().single()); },
    async update(t, id, patch) { return ok(await sb.from(t).update(patch).eq('id', id).select().single()); },
    async remove(t, id) { ok(await sb.from(t).delete().eq('id', id)); },
    async rpc(name, args) { return ok(await sb.rpc(name, args)); },
    auth: {
      async user() {
        const { data } = await sb.auth.getSession();
        return data.session ? { id: data.session.user.id, email: data.session.user.email } : null;
      },
      async signIn(email) {
        ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }));
        return { instant: false };
      },
      // Entrar digitando o código que veio no e-mail (funciona até no app instalado na tela de início).
      async verifyCode(email, token) {
        ok(await sb.auth.verifyOtp({ email, token: token.replace(/\D/g, ''), type: 'email' }));
      },
      async signOut() { await sb.auth.signOut(); },
      onChange(cb) { sb.auth.onAuthStateChange(() => cb()); },
    },
    reset: null,
    storage: {
      async upload(path, blob) {
        ok(await sb.storage.from('banners').upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' }));
        return sb.storage.from('banners').getPublicUrl(path).data.publicUrl;
      },
      async remove(paths) {
        if (paths.length) ok(await sb.storage.from('banners').remove(paths));
      },
    },
  };
}

// ---------- Operações do app (iguais nos dois modos) ----------

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR');

// "https://…/object/public/banners/<ministério>/<arquivo>.jpg" -> "<ministério>/<arquivo>.jpg"
export function bannerPath(url) {
  const i = String(url || '').indexOf('/banners/');
  if (i < 0 || String(url).startsWith('data:')) return null;
  return decodeURIComponent(url.slice(i + 9).split('?')[0]);
}

// Ajustes das artes do evento: { escala: {...}, capa: {...} } (aceita o formato antigo, de uma arte só).
export function artsOf(art) {
  if (!art) return {};
  if (art.style || art.theme) return { [art.style === 'lista' ? 'escala' : 'capa']: art };
  return { ...art };
}
const artPhotos = (art) => Object.values(artsOf(art)).map((x) => x && x.photo).filter(Boolean);
const withoutPhotos = (art) => Object.fromEntries(Object.entries(artsOf(art)).map(([k, v]) => [k, { ...v, photo: '' }]));

export function createApi(a) {
  // Apagar a imagem nunca deve travar o resto (se falhar, a faxina tenta de novo outro dia).
  const removeBanners = async (urls) => {
    try { await a.storage.remove(urls.map(bannerPath).filter(Boolean)); } catch (e) { console.warn('banner', e); }
  };
  const api = {
    mode: a.mode,
    auth: a.auth,
    reset: a.reset,

    async profile(id) { return (await a.list('profiles', { id }))[0] || null; },
    async saveProfile(id, patch) {
      const cur = await api.profile(id);
      return cur ? a.update('profiles', id, patch) : a.insert('profiles', { id, ...patch });
    },

    async myMinistries(userId) {
      const ms = await a.list('members', { user_id: userId });
      const mins = await a.listIn('ministries', 'id', ms.map((m) => m.ministry_id));
      return mins
        .map((x) => ({ ...x, myRole: ms.find((m) => m.ministry_id === x.id).role }))
        .sort(byName);
    },
    createMinistry: (name) => a.rpc('create_ministry', { p_name: name.trim() }),
    joinMinistry: (code) => a.rpc('join_ministry', { p_code: code.trim().toUpperCase() }),

    async ministryData(mid) {
      const [ministry] = await a.list('ministries', { id: mid });
      const members = await a.list('members', { ministry_id: mid });
      const profiles = await a.listIn('profiles', 'id', members.map((m) => m.user_id));
      const roles = await a.list('roles', { ministry_id: mid });
      return {
        ministry,
        members: members
          .map((m) => ({ ...m, profile: profiles.find((p) => p.id === m.user_id) || { id: m.user_id, name: 'Sem nome' } }))
          .sort((x, y) => byName(x.profile, y.profile)),
        roles: roles.sort((x, y) => {
          // funções padrão na ordem de um culto (ministro primeiro, som e projeção no fim); as novas, depois, em ordem alfabética
          const ix = DEFAULT_ROLES.indexOf(x.name); const iy = DEFAULT_ROLES.indexOf(y.name);
          return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) || byName(x, y);
        }),
      };
    },
    updateMinistry: (id, patch) => a.update('ministries', id, patch),
    setMemberRole: (memberId, role) => a.update('members', memberId, { role }),
    removeMember: (memberId) => a.remove('members', memberId),
    addRole: (mid, name) => a.insert('roles', { ministry_id: mid, name: name.trim() }),
    removeRole: (id) => a.remove('roles', id),

    events: (mid) => a.list('events', { ministry_id: mid }),
    allAssignments: (mid) => a.list('assignments', { ministry_id: mid }),
    async eventDetail(id) {
      const [ev] = await a.list('events', { id });
      if (!ev) return null;
      const assignments = await a.list('assignments', { event_id: id });
      const es = await a.list('event_songs', { event_id: id });
      const songs = await a.listIn('songs', 'id', es.map((x) => x.song_id));
      return {
        ...ev,
        assignments,
        songs: es
          .map((x) => ({ ...x, song: songs.find((s) => s.id === x.song_id) }))
          .filter((x) => x.song)
          .sort((p, q) => p.position - q.position),
      };
    },
    saveEvent(ev) {
      const fields = { title: ev.title.trim(), date: ev.date, time: ev.time, notes: (ev.notes || '').trim() };
      return ev.id ? a.update('events', ev.id, fields) : a.insert('events', { ministry_id: ev.ministry_id, ...fields });
    },
    async deleteEvent(id) {
      const [ev] = await a.list('events', { id });
      await a.remove('events', id);
      if (ev) await removeBanners([ev.banner, ...artPhotos(ev.art)].filter(Boolean));
    },

    // Banner do evento: guarda a imagem e o endereço; ao trocar, apaga a antiga.
    async setEventBanner(ev, blob) {
      const path = `${ev.ministry_id}/${ev.id}-${Date.now()}.jpg`;
      const url = await a.storage.upload(path, blob);
      await a.update('events', ev.id, { banner: url });
      if (ev.banner) await removeBanners([ev.banner]);
      return url;
    },
    async removeEventBanner(ev) {
      await a.update('events', ev.id, { banner: '' });
      await removeBanners([ev.banner]);
    },
    // Arte da escala: guarda os ajustes; a foto de fundo vai para a mesma pasta dos banners.
    async saveEventArt(ev, kind, art, photoBlob) {
      const all = artsOf(ev.art);
      const next = { ...art };
      const oldPhoto = all[kind] && all[kind].photo;
      if (photoBlob) next.photo = await a.storage.upload(`${ev.ministry_id}/${ev.id}-${kind}-${Date.now()}.jpg`, photoBlob);
      await a.update('events', ev.id, { art: { ...all, [kind]: next } });
      if (oldPhoto && oldPhoto !== next.photo) await removeBanners([oldPhoto]);
      return next;
    },
    async resetEventArt(ev, kind) {
      const all = artsOf(ev.art);
      const old = all[kind];
      delete all[kind];
      await a.update('events', ev.id, { art: Object.keys(all).length ? all : null });
      if (old && old.photo) await removeBanners([old.photo]);
    },
    // Faxina: apaga os banners de eventos que já passaram (antes da data informada).
    async cleanupBanners(mid, beforeIso) {
      const old = (await a.list('events', { ministry_id: mid }))
        .filter((e) => (e.banner || artPhotos(e.art).length) && e.date < beforeIso);
      for (const e of old) await a.update('events', e.id, e.art ? { banner: '', art: withoutPhotos(e.art) } : { banner: '' });
      await removeBanners(old.flatMap((e) => [e.banner, ...artPhotos(e.art)]).filter(Boolean));
      return old.length;
    },
    assign: (row) => a.insert('assignments', { status: 'pending', ...row }),
    unassign: (id) => a.remove('assignments', id),
    setMyStatus: (id, status) => a.rpc('set_my_status', { p_id: id, p_status: status }),

    songs: (mid) => a.list('songs', { ministry_id: mid }),
    async song(id) { return (await a.list('songs', { id }))[0] || null; },
    async saveSong(s) {
      const base = {
        title: s.title.trim(), artist: (s.artist || '').trim(), key: s.key || '',
        link: (s.link || '').trim(), content: s.content || '',
      };
      const extra = { artwork: s.artwork || '', duration: Number(s.duration) || 0, bpm: Number(s.bpm) || 0, links: s.links || {} };
      const save = (fields) => (s.id ? a.update('songs', s.id, fields) : a.insert('songs', { ministry_id: s.ministry_id, ...fields }));
      try {
        return await save({ ...base, ...extra });
      } catch (e) {
        // Banco ainda sem as colunas novas (capa, duração, BPM): salva o essencial mesmo assim.
        if (/artwork|duration|bpm|links/i.test(e.message || '')) return save(base);
        throw e;
      }
    },
    // Só a cifra e o tom (usado ao salvar a música num tom novo).
    saveSongKey: (id, key, content) => a.update('songs', id, { key, content }),
    updateEventSong: (id, patch) => a.update('event_songs', id, patch),
    deleteSong: (id) => a.remove('songs', id),
    addEventSong: (row) => a.insert('event_songs', row),
    removeEventSong: (id) => a.remove('event_songs', id),

    notices: (mid) => a.list('notices', { ministry_id: mid }),
    addNotice: (row) => a.insert('notices', row),
    removeNotice: (id) => a.remove('notices', id),
  };
  return api;
}
