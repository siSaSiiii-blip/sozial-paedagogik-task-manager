import { useState } from 'react';
import { pruefeZugang, setConfig } from './lib/storage';

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!token.trim() || !repo.trim() || !branch.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await pruefeZugang(token.trim(), repo.trim());
      setConfig({ token: token.trim(), repo: repo.trim(), branch: branch.trim() });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Zugriff fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Management der Aufgaben für den Ausbau der sozialpädagogischen Lernplattform
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Zugang zum privaten Daten-Repository auf GitHub eingeben.
        </p>

        <label className="block text-xs font-medium text-slate-600 mb-1">Access-Token</label>
        <input
          type="password"
          value={token}
          autoFocus
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="github_pat_…"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mb-4"
        />

        <label className="block text-xs font-medium text-slate-600 mb-1">Repository (owner/repo)</label>
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="dein-nutzername/aufgaben-daten"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mb-4"
        />

        <label className="block text-xs font-medium text-slate-600 mb-1">Branch</label>
        <input
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="main"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <button
          onClick={submit}
          disabled={busy || !token.trim() || !repo.trim() || !branch.trim()}
          className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Wird geprüft…' : 'Verbinden'}
        </button>
      </div>
    </div>
  );
}
