import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ID = 'web-app---tato';
const COLLECTION = 'contacts';

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function firebaseCliToken() {
  const candidates = [
    path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const tokens = cfg.tokens || {};
    if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 60_000) {
      return tokens.access_token;
    }
    if (tokens.refresh_token) return { refreshToken: tokens.refresh_token };
  }
  return null;
}

async function accessToken() {
  const found = firebaseCliToken();
  if (!found) throw new Error('No Firebase CLI login found.');
  if (typeof found === 'string') return found;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: found.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}).`);
  return data.access_token;
}

const token = await accessToken();
const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}?pageSize=100`;
const res = await fetch(base, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();
if (data.documents) {
  for (const doc of data.documents) {
    const name = doc.name.split('/').pop();
    console.log(name);
  }
} else {
  console.log(JSON.stringify(data));
}
