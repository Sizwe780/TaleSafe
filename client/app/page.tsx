'use client';

import { useEffect, useState } from 'react';
import Dashboard from './dashboard';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
type User = { id: string; displayName: string; email: string | null };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${api}/api/me`, { credentials: 'include', signal: controller.signal })
      .then(async response => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('Unable to check your session. Please try again.');
        return response.json();
      }).then(setUser).catch(e => { if (e.name !== 'AbortError') setError('The service is unavailable. Please try again shortly.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  async function logout() {
    setError('');
    const response = await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
    if (!response.ok) throw new Error('Unable to sign out. Please try again.');
    setUser(null);
  }
  if (user) return <Dashboard displayName={user.displayName} onLogout={logout}/>;
  return <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-16">
    <header className="flex items-center justify-between border-b border-green-950/15 pb-6">
      <a href="/" className="text-xl font-bold tracking-tight">TaleSafe <span className="font-normal text-green-950/60">Africa</span></a>
      <a href="/catalog" className="text-sm underline underline-offset-4">Browse the story catalog</a>
    </header>
    <section className="grid flex-1 items-center gap-12 py-20 md:grid-cols-[1.3fr_1fr]">
      <div><p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#ad5b28]">A home for African storytellers</p>
        <h1 className="max-w-2xl text-5xl leading-[1.06] font-semibold tracking-tight md:text-7xl">Your story.<br/>Your legacy.<br/><span className="text-[#ad5b28]">Your say.</span></h1>
        <p className="mt-8 max-w-md text-lg leading-relaxed text-green-950/65">A place to protect your creative work and decide how your stories are shared with the world.</p>
      </div>
      <div className="rounded-2xl border border-green-950/15 bg-white/60 p-8 md:p-10">
        <p className="mb-8 text-xs uppercase tracking-[0.2em] text-green-950/55">Creator access</p>
        <h2 className="text-3xl font-semibold">Every story starts with you.</h2>
        <p className="mt-4 mb-8 leading-relaxed text-green-950/65">Sign in with your Microsoft account to enter your creator workspace.</p>
        {loading ? <p role="status">Checking your session…</p> :
          <a href={`${api}/auth/login`} className="inline-block rounded-lg bg-[#19382c] px-6 py-4 font-semibold text-white">Continue with Microsoft <span aria-hidden="true">↗</span></a>}
        {error && <p role="alert" className="mt-5 text-sm text-red-800">{error}</p>}
      </div>
    </section>
    <footer className="border-t border-green-950/15 pt-6 text-sm text-green-950/60">Preserving voices. Building possibilities.</footer>
  </main>;
}
