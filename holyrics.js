// Asa — envio de escalas e músicas para o Holyrics.
// O Holyrics precisa estar aberto no computador da igreja, com o "API Server" ligado para acesso pela internet.
// Sem assinatura do Holyrics Plan dá para achar as músicas que já existem lá e montar a lista do culto;
// com o Plan, o Asa também cria as músicas que faltam, o culto na agenda e os membros e funções.
import { lyricsSlides } from './music.js?v=19';

// Permissões que o token precisa ter no Holyrics.
export const BASIC_ACTIONS = ['SearchLyrics', 'GetLyrics', 'GetLyricsPlaylist', 'AddLyricsToPlaylist', 'RemoveFromLyricsPlaylist', 'GetSchedules', 'GetHolyricsPlanInfo'];
export const PLAN_ACTIONS = ['CreateSong', 'CreateEvent', 'EditEvent', 'GetMembers', 'GetRoles', 'CreateMember', 'CreateRole'];

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function sendError(err) {
  const key = err && (err.key || err.code);
  if (key === 'device_disconnected' || key === 9) return 'O Holyrics não respondeu. Confira se ele está aberto no computador da igreja, com internet e com o “API Server” ligado.';
  if (key === 'invalid_api_key' || key === 403) return 'A API Key não confere. Copie de novo em Holyrics › Arquivo › Configurações › API Server.';
  if (typeof err === 'string') return err;
  return (err && err.message) || 'Não foi possível falar com o Holyrics.';
}

function responseError(err) {
  if (!err) return 'O Holyrics recusou o pedido.';
  if (typeof err === 'string') {
    if (/invalid token/i.test(err)) return 'O token não confere. Confira o token em Holyrics › API Server › Gerenciar permissões.';
    if (/plan/i.test(err)) return 'Essa parte precisa da assinatura Holyrics Plan.';
    if (/permission|not allowed|unauthorized/i.test(err)) return 'O token não tem permissão para isso. Libere em Holyrics › API Server › Gerenciar permissões.';
    return err;
  }
  if (err.unauthorized_actions) {
    return `Falta liberar no Holyrics: ${err.unauthorized_actions.split(',').join(', ')}.${err.request_status === 'pending' ? ' Apareceu um pedido de permissão na tela do Holyrics: é só aceitar.' : ''}`;
  }
  return err.message || 'O Holyrics recusou o pedido.';
}

export function holyricsClient(api, mid, creds) {
  async function call(action, data) {
    const res = await api.holyrics(mid, action, data, creds);
    if (!res || res.status !== 'ok') throw new Error(sendError(res && res.error));
    if (res.response_status === 'timeout') throw new Error('O Holyrics demorou para responder. Confira se ele está aberto no computador da igreja.');
    const r = res.response || res;
    if (r.status !== 'ok') {
      const e = new Error(responseError(r.error));
      e.raw = r.error;
      throw e;
    }
    return r.data;
  }

  async function planType() {
    try { return ((await call('GetHolyricsPlanInfo', {})) || {}).type || 'none'; } catch { return 'none'; }
  }

  // Confere a ligação e pede ao Holyrics as permissões que faltam (aparece um aviso na tela do programa).
  async function test() {
    const info = (await call('GetTokenInfo', {})) || {};
    const plan = await planType();
    const wanted = plan === 'none' ? BASIC_ACTIONS : [...BASIC_ACTIONS, ...PLAN_ACTIONS];
    let missing = [];
    try { await call('CheckPermissions', { actions: wanted.join(',') }); }
    catch (e) { missing = String((e.raw && e.raw.unauthorized_actions) || '').split(',').filter(Boolean); if (!missing.length) throw e; }
    return { version: info.version || '', plan, missing };
  }

  // Acha a música no Holyrics (mesmo nome; se houver mais de uma, a do mesmo artista).
  async function findSong(song) {
    if (song.holyrics_id) {
      try { const s = await call('GetLyrics', { id: song.holyrics_id }); if (s && s.id) return String(s.id); } catch { /* foi apagada lá */ }
    }
    const list = (await call('SearchLyrics', { text: song.title, title: true, artist: false, note: false, lyrics: false })) || [];
    const same = list.filter((x) => norm(x.title) === norm(song.title));
    const pick = same.find((x) => song.artist && norm(x.artist) && norm(song.artist).includes(norm(x.artist))) || same[0];
    return pick ? String(pick.id) : '';
  }

  function streaming(song) {
    const l = song.links || {};
    const audio = {};
    if (/spotify\.com/.test(l.audio || '')) audio.spotify = l.audio;
    if (/deezer\.com/.test(l.audio || '')) audio.deezer = l.audio;
    if (/youtu/.test(l.video || song.link || '')) audio.youtube = l.video || song.link;
    return Object.keys(audio).length ? { audio } : undefined;
  }

  async function createSong(song, key) {
    const slides = lyricsSlides(song.content);
    const item = {
      title: song.title, artist: song.artist || '', slides: slides.length ? slides : [{ text: song.title, slide_description: '' }],
      key: key || song.key || '', bpm: Number(song.bpm) || 0,
    };
    const st = streaming(song);
    if (st) item.streaming = st;
    const created = await call('CreateSong', item);
    return created && created.id ? String(created.id) : '';
  }

  function teamText(ev, nameOf) {
    const lines = [];
    if (ev.assignments.length) {
      lines.push('Equipe:');
      for (const a of ev.assignments.filter((x) => x.status !== 'declined')) lines.push(`${a.role_name}: ${nameOf(a.user_id)}`);
    }
    if (ev.notes) lines.push('', ev.notes);
    lines.push('', 'Enviado pelo Asa');
    return lines.join('\n');
  }

  // Leva o culto para o Holyrics: músicas (achando ou criando) e a lista do culto na ordem da escala.
  async function sendEvent(ev, { nameOf, onStep = () => {} }) {
    const plan = await planType();
    const canCreate = plan !== 'none';
    const out = { plan, found: [], created: [], missing: [], event: '', playlist: 0, target: '' };
    const ids = [];
    for (const x of ev.songs) {
      onStep(`Procurando “${x.song.title}”…`);
      let id = await findSong(x.song);
      if (id) out.found.push(x.song.title);
      else if (canCreate) {
        onStep(`Criando “${x.song.title}” no Holyrics…`);
        try { id = await createSong(x.song, x.key); if (id) out.created.push(x.song.title); }
        catch (e) { out.missing.push(`${x.song.title} (${e.message})`); }
      } else out.missing.push(x.song.title);
      if (id) {
        ids.push(id);
        if (x.song.holyrics_id !== id) await api.setHolyricsId('songs', x.song.id, id).catch(() => {});
      }
    }

    let eventId = '';
    let existing = 0;
    if (canCreate) {
      onStep('Marcando o culto na agenda do Holyrics…');
      const datetime = `${ev.date} ${ev.time || '19:00'}`;
      const [y, m] = ev.date.split('-').map(Number);
      const schedules = (await call('GetSchedules', { month: m, year: y }).catch(() => [])) || [];
      const sameTime = schedules.filter((s) => s.datetime === datetime);
      const sched = sameTime.find((s) => s.metadata && s.metadata.event && String(s.metadata.event.id) === ev.holyrics_id)
        || sameTime.find((s) => norm(s.name) === norm(ev.title)) || sameTime[0];
      eventId = sched && sched.metadata && sched.metadata.event ? String(sched.metadata.event.id || '') : '';
      existing = sched ? (sched.lyrics_playlist || []).length : 0;
      const fields = { name: ev.title, datetime, description: teamText(ev, nameOf) };
      if (eventId) await call('EditEvent', { id: eventId, name: fields.name, description: fields.description }).catch(() => {});
      else {
        const created = await call('CreateEvent', fields);
        eventId = created && created.id ? String(created.id) : '';
      }
      out.event = eventId ? (sched ? 'atualizado' : 'criado') : '';
    }

    onStep('Montando a lista de músicas…');
    if (eventId) {
      if (existing) await call('RemoveFromLyricsPlaylist', { indexes: [...Array(existing).keys()], event_id: eventId });
      if (ids.length) await call('AddLyricsToPlaylist', { ids, event_id: eventId });
      out.playlist = ids.length;
      out.target = 'culto';
    } else {
      const current = ((await call('GetLyricsPlaylist', {})) || []).map((s) => String(s.id));
      const toAdd = ids.filter((id) => !current.includes(id));
      if (toAdd.length) await call('AddLyricsToPlaylist', { ids: toAdd });
      out.playlist = toAdd.length;
      out.already = ids.length - toAdd.length;
      out.target = 'lista';
    }
    await api.setHolyricsId('events', ev.id, eventId, { holyrics_sent_at: new Date().toISOString() }).catch(() => {});
    return out;
  }

  // Leva funções e membros (com o que cada um faz) para o Holyrics. Precisa do Holyrics Plan.
  async function sendTeam(md, onStep = () => {}) {
    onStep('Conferindo funções…');
    const hRoles = (await call('GetRoles', { only_active: false })) || [];
    const roleId = new Map(hRoles.map((r) => [norm(r.name), String(r.id)]));
    let roles = 0; let members = 0;
    for (const r of md.roles) {
      let id = roleId.get(norm(r.name));
      if (!id) { const c = await call('CreateRole', { name: r.name }); id = c && c.id ? String(c.id) : ''; if (id) { roles++; roleId.set(norm(r.name), id); } }
      if (id && r.holyrics_id !== id) await api.setHolyricsId('roles', r.id, id).catch(() => {});
    }
    onStep('Conferindo membros…');
    const hMembers = (await call('GetMembers', { only_active: false })) || [];
    const memberId = new Map(hMembers.map((x) => [norm(x.name), String(x.id)]));
    for (const m of md.members) {
      let id = (m.holyrics_id && hMembers.some((x) => String(x.id) === m.holyrics_id)) ? m.holyrics_id : memberId.get(norm(m.profile.name));
      const myRoles = m.skills.map((s) => roleId.get(norm(s))).filter(Boolean).map((id2) => ({ id: id2 }));
      if (!id) {
        const c = await call('CreateMember', { name: m.profile.name, skills: m.skills.join(', '), roles: myRoles });
        id = c && c.id ? String(c.id) : '';
        if (id) members++;
      }
      if (id && m.holyrics_id !== id) await api.setHolyricsId('members', m.id, id).catch(() => {});
    }
    return { roles, members, totalMembers: md.members.length };
  }

  return { call, test, planType, sendEvent, sendTeam };
}
