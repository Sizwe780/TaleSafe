'use client';

import { useEffect, useState } from 'react';
import WorkspaceShell, { PageIntro } from '../components/workspace-shell';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
type Entry = { id: string; title: string; aiConsent: string; commercialUse: boolean; culturalHeritage: boolean };
export default function Catalog() {
  const [stories, setStories] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load(offset = 0) {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${api}/api/catalog?limit=20&offset=${offset}`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setStories(previous => offset ? [...previous, ...data.stories] : data.stories); setTotal(data.total); setMore(data.hasMore);
    } catch { setError('Unable to load the catalog. Please retry.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <WorkspaceShell><PageIntro eyebrow="CREATOR AUTHORIZED LISTINGS" title="Story catalog">Browse titles and permissions that creators have chosen to publish. Original files remain private. Saving a term-sheet draft grants no rights.</PageIntro>
    {error && <p role="alert" className="mt-6 text-red-800">{error} <button onClick={() => void load()} className="underline">Retry</button></p>}
    <p className="my-7 text-sm text-green-950/50">{total} published {total === 1 ? 'story' : 'stories'}</p>
    <div className="grid gap-5 sm:grid-cols-2">{stories.map(story => <article key={story.id} className="panel"><h2 className="text-xl font-semibold">{story.title}</h2><p className="mt-4 text-sm text-green-950/65">AI use: {story.aiConsent === 'NOT_ALLOWED' ? 'not allowed' : story.aiConsent === 'ALLOWED' ? 'allowed' : 'compensation required'}</p><p className="mt-2 text-sm text-green-950/65">Commercial use: {story.commercialUse ? 'permitted' : 'not permitted'}{story.culturalHeritage && ' · Cultural heritage authority required'}</p><a href={`/licensing?story=${story.id}`} className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">Prepare a term-sheet draft</a></article>)}</div>
    {loading && <p role="status" className="mt-8">Loading published stories…</p>}
    {!loading && !stories.length && !error && <p className="panel mt-4">No stories have been published to the catalog yet. Creators control each listing from their dashboard.</p>}
    {more && <button className="primary-button mt-7 disabled:opacity-50" disabled={loading} onClick={() => void load(stories.length)}>Load more titles</button>}
  </WorkspaceShell>;
}
