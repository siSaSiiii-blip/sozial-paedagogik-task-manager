import { Task } from '../types';

const CONFIG_KEY = 'task_tree_github_config';
const DATA_PATH = 'tasks.json';

export interface GithubConfig {
  token: string;
  repo: string; // "owner/repo"
  branch: string;
}

export class ConflictError extends Error {}

// --- Konfiguration (nur lokal im Browser, verlaesst diese Datei nie ausser
// im Authorization-Header der Requests unten) --------------------------------
export function getConfig(): GithubConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setConfig(config: GithubConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

export function hasConfig(): boolean {
  return getConfig() !== null;
}

// --- UTF-8-sichere Base64-Kodierung (atob/btoa zerstoeren Umlaute/Sonderzeichen) ---
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// --- Zentraler Request-Helfer gegen die GitHub API ---------------------------
async function githubRequest(path: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  return fetch(`https://api.github.com${path}`, { ...options, headers });
}

// Prueft Token + Zugriff auf das Repo. Wirft bei Fehlern eine sprechende
// deutsche Fehlermeldung (fuer den Zugangsdialog).
export async function pruefeZugang(token: string, repo: string): Promise<{ private: boolean }> {
  const res = await githubRequest(`/repos/${repo}`, token);
  if (res.status === 401) throw new Error('Token ungültig oder abgelaufen.');
  if (res.status === 404) throw new Error('Repository nicht gefunden oder Token hat keinen Zugriff darauf.');
  if (!res.ok) throw new Error('Zugriff fehlgeschlagen (HTTP ' + res.status + ').');
  const data = await res.json();
  return { private: Boolean(data.private) };
}

export async function pruefeRepoPrivat(): Promise<boolean | null> {
  const config = getConfig();
  if (!config) return null;
  try {
    const res = await githubRequest(`/repos/${config.repo}`, config.token);
    if (!res.ok) return null;
    const data = await res.json();
    return Boolean(data.private);
  } catch {
    return null;
  }
}

export async function laden(): Promise<{ tasks: Task[]; sha: string | null }> {
  const config = getConfig();
  if (!config) throw new Error('Nicht angemeldet');

  const res = await githubRequest(
    `/repos/${config.repo}/contents/${DATA_PATH}?ref=${encodeURIComponent(config.branch)}`,
    config.token
  );

  if (res.status === 404) {
    const body = await res.json().catch(() => ({}));
    if (typeof body.message === 'string' && /no commit found for the ref/i.test(body.message)) {
      throw new Error(`Branch "${config.branch}" existiert nicht im Repository.`);
    }
    // Datei existiert einfach noch nicht - mit leerer Liste starten.
    return { tasks: [], sha: null };
  }

  if (!res.ok) {
    throw new Error('Laden fehlgeschlagen (HTTP ' + res.status + ').');
  }

  const data = await res.json();
  const json = base64ToUtf8(data.content || '');
  const tasks = json.trim() ? JSON.parse(json) : [];
  return { tasks, sha: data.sha };
}

export async function speichern(tasks: Task[], sha: string | null): Promise<{ sha: string }> {
  const config = getConfig();
  if (!config) throw new Error('Nicht angemeldet');

  const content = utf8ToBase64(JSON.stringify(tasks, null, 2));
  const res = await githubRequest(`/repos/${config.repo}/contents/${DATA_PATH}`, config.token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Aufgaben aktualisiert',
      content,
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (res.status === 409) {
    throw new ConflictError('Die Datei wurde inzwischen von jemand anderem geändert.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 422 && typeof body.message === 'string' && /sha/i.test(body.message)) {
      throw new ConflictError(body.message);
    }
    throw new Error(body.message || 'Speichern fehlgeschlagen (HTTP ' + res.status + ').');
  }

  const data = await res.json();
  return { sha: data.content.sha };
}
