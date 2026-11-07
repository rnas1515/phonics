// Supabase Edge Function: delete the signed-in user's account and everything stored for it.
// Removes their photos, then the account itself (the database rows are removed with it, because every table
// references the account with "on delete cascade"). It can only ever delete the caller's own account.
const cors = {
  'Access-Control-Allow-Origin': '*', // needs a signed-in user token, so this is safe
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const BUCKET = 'assessment-photos';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };

  const who = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: req.headers.get('Authorization') || '', apikey: service } });
  if (!who.ok) return json({ error: 'Please sign in again.' }, 401);
  const uid = (await who.json()).id;
  if (!uid) return json({ error: 'Please sign in again.' }, 401);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  if (body?.confirm !== 'DELETE') return json({ error: 'Confirmation missing.' }, 400);

  // 1. photos: walk the user's folder (two levels deep: <uid>/<child>/<file>)
  const listDir = async (prefix) => {
    const r = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: admin, body: JSON.stringify({ prefix, limit: 1000, offset: 0 }) });
    return r.ok ? await r.json() : [];
  };
  const files = [];
  const walk = async (prefix, depth) => {
    for (const e of await listDir(prefix)) {
      const path = `${prefix}${e.name}`;
      if (e.id === null && depth < 4) await walk(`${path}/`, depth + 1); else files.push(path);
    }
  };
  await walk(`${uid}/`, 0);
  for (let i = 0; i < files.length; i += 100) {
    await fetch(`${url}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: admin, body: JSON.stringify({ prefixes: files.slice(i, i + 100) }) });
  }

  // 2. the account (rows cascade)
  const del = await fetch(`${url}/auth/v1/admin/users/${uid}`, { method: 'DELETE', headers: admin });
  if (!del.ok) return json({ error: 'Could not delete the account. Please try again.' }, 502);
  return json({ ok: true, photosDeleted: files.length });
});
