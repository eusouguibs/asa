// Asa — ponte com o Holyrics.
// O navegador não pode falar direto com api.holyrics.com.br (o Holyrics não libera CORS),
// então o app chama esta função, que confere se a pessoa é administradora do ministério,
// pega as chaves guardadas e repassa o pedido ao Holyrics aberto no computador da igreja.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Só estas ações podem passar por aqui.
const ALLOWED = new Set([
  'GetTokenInfo', 'CheckPermissions', 'GetHolyricsPlanInfo', 'GetAPIServerInfo',
  'SearchLyrics', 'GetLyrics', 'GetLyricsPlaylist', 'AddLyricsToPlaylist', 'RemoveFromLyricsPlaylist',
  'GetSchedules', 'GetEvents', 'GetMembers', 'GetRoles', 'GetTeams',
  'CreateSong', 'EditSong', 'CreateEvent', 'EditEvent', 'CreateMember', 'EditMember', 'CreateRole', 'CreateTeam',
  'SetCurrentSchedule',
]);

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { ministry_id, action, data, api_key, token } = await req.json();
    if (!ministry_id || !ALLOWED.has(action)) return reply({ status: 'error', error: 'Ação não permitida.' }, 400);
    const anon = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, anon, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    });
    // Precisa ser administrador do ministério (as regras do banco conferem isso).
    const { data: isAdmin, error: adminErr } = await sb.rpc('is_admin', { mid: ministry_id });
    if (adminErr || !isAdmin) return reply({ status: 'error', error: 'Só administradores do ministério podem usar o Holyrics.' }, 403);
    let key = api_key, tok = token;
    if (!key || !tok) {
      const { data: row } = await sb.from('holyrics').select('api_key, token').eq('ministry_id', ministry_id).maybeSingle();
      if (!row) return reply({ status: 'error', error: 'O Holyrics ainda não foi conectado neste ministério.' }, 404);
      key = row.api_key; tok = row.token;
    }
    const r = await fetch(`https://api.holyrics.com.br/request/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', api_key: key, token: tok },
      body: JSON.stringify(data ?? {}),
    });
    const text = await r.text();
    try { return reply(JSON.parse(text)); } catch { return reply({ status: 'error', error: `Resposta inesperada do Holyrics (${r.status}).` }, 502); }
  } catch (e) {
    return reply({ status: 'error', error: String((e as Error)?.message ?? e) }, 500);
  }
});
