'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import WorkspaceShell, { PageIntro } from './components/workspace-shell';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
type Tier = 'EDUCATIONAL' | 'FILM' | 'AI_COMPANY';
type License = { id: string; tier: Tier; status: 'REQUESTED' | 'APPROVED' | 'REJECTED'; createdAt: string };
type Activity = { id: string; type: 'STORY_REGISTERED' | 'LICENSE_REQUESTED'; storyId: string; storyTitle: string; occurredAt: string; tier?: Tier; status?: License['status'] };
export type Story = { id: string; title: string; originalName: string; contentType: string; byteSize: number; sha256: string; aiConsent: 'NOT_ALLOWED' | 'ALLOWED' | 'COMPENSATION_REQUIRED'; commercialUse: boolean; culturalHeritage: boolean; createdAt: string; licenses: License[]; published: boolean };
const tierNames = { EDUCATIONAL: 'Educational', FILM: 'Film', AI_COMPANY: 'AI company' };
const licenseStatus = { REQUESTED: 'Request pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
const consent = { NOT_ALLOWED: 'AI training not allowed', ALLOWED: 'AI training allowed', COMPENSATION_REQUIRED: 'AI compensation required' };
const date = (value: string) => new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }).format(new Date(value));

export default function Dashboard({ displayName, onLogout }: { displayName: string; onLogout: () => Promise<void> }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [publishing, setPublishing] = useState('');
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [moreActivity, setMoreActivity] = useState(false);
  const latestActivity = useRef(0);
  const loadActivity = useCallback(async () => {
    const sequence = ++latestActivity.current;
    setActivityLoading(true); setActivityError('');
    try {
      const response = await fetch(`${api}/api/activity?limit=10`, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load your activity. Please retry.');
      const data = await response.json();
      if (sequence === latestActivity.current) { setActivity(data.events); setMoreActivity(data.hasMore); }
    } catch (e) { if (sequence === latestActivity.current) setActivityError(e instanceof Error ? e.message : 'Unable to load activity.'); }
    finally { if (sequence === latestActivity.current) setActivityLoading(false); }
  }, []);
  const latestRequest = useRef(0);
  const load = useCallback(async (offset = 0) => {
    const sequence = ++latestRequest.current;
    setLoading(true); setError('');
    try {
      const response = await fetch(`${api}/api/stories?limit=20&offset=${offset}`, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Sign in again.' : 'Unable to load your stories. Please retry.');
      const data = await response.json();
      if (sequence !== latestRequest.current) return;
      setStories(previous => offset ? [...previous, ...data.stories] : data.stories);
      setTotal(data.total); setHasMore(data.hasMore);
    } catch (e) { if (sequence === latestRequest.current) setError(e instanceof Error ? e.message : 'Unable to load stories.'); }
    finally { if (sequence === latestRequest.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); void loadActivity(); return () => { latestRequest.current++; latestActivity.current++; }; }, [load, loadActivity]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setNotice(''); setError('');
    try {
      const response = await fetch(`${api}/api/stories`, { method: 'POST', credentials: 'include', body: new FormData(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed. Please retry.');
      form.reset(); setRegister(false); setNotice('Your story is registered. Its digital fingerprint and permissions are saved.');
      await Promise.all([load(), loadActivity()]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to register your story.'); }
    finally { setBusy(false); }
  }

  async function setPublication(story: Story) {
    setPublishing(story.id); setError(''); setNotice('');
    try {
      const response = await fetch(`${api}/api/stories/${story.id}/publication`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !story.published }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to change catalog visibility.');
      setNotice(data.published ? 'The title and permissions are now public in the catalog. Your original file remains private.' : 'This story is no longer listed in the public catalog.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to change visibility.'); }
    finally { setPublishing(''); }
  }

  return <WorkspaceShell displayName={displayName} onLogout={() => void onLogout().catch(() => setError('Unable to sign out. Please try again.'))}>
      <PageIntro eyebrow="CREATOR WORKSPACE" title="Your stories belong to you." action={<button onClick={() => { setRegister(value => !value); setError(''); }} aria-expanded={register} aria-controls="registration" className="primary-button">{register ? 'Close registration' : '+ Register a story'}</button>}>Welcome back, {displayName.split(' ')[0]}. Protect what you create.</PageIntro>
      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error} <button className="ml-3 underline" onClick={() => void load()}>Refresh stories</button><a className="ml-3 underline" href={`${api}/auth/login`}>Sign in again</a></div>}
      {notice && <p role="status" className="mb-5 rounded-lg bg-green-100 p-4 text-sm">{notice}</p>}
      {register && <section id="registration" className="panel mb-8 scroll-mt-6"><h2 className="text-xl font-semibold">Register your story</h2><p className="mt-2 text-sm text-green-950/60">Choose how your work may be used. Your original file receives a SHA-256 digital fingerprint.</p>
        <form onSubmit={upload} className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="field-label">Story title<input name="title" required maxLength={200} className="field" placeholder="Give your story a name"/></label>
          <label className="field-label">Story file · text or PDF, up to 10 MiB<input name="file" type="file" accept=".txt,.pdf" required className="field file:mr-3 file:border-0 file:bg-transparent file:font-semibold"/></label>
          <label className="field-label">AI training consent<select name="aiConsent" required defaultValue="" className="field"><option value="" disabled>Choose your consent</option><option value="NOT_ALLOWED">Not allowed</option><option value="ALLOWED">Allowed</option><option value="COMPENSATION_REQUIRED">Compensation required</option></select></label>
          <label className="field-label">Commercial use<select name="commercialUse" required defaultValue="" className="field"><option value="" disabled>Choose permission</option><option value="false">Not permitted</option><option value="true">Permitted</option></select></label>
          <label className="field-label">Cultural heritage or community connection<select name="culturalHeritage" required defaultValue="" className="field"><option value="" disabled>Choose a designation</option><option value="true">Yes — community-connected heritage</option><option value="false">No</option></select></label>
          <div className="flex items-end"><button type="submit" disabled={busy} className="primary-button disabled:opacity-50">{busy ? 'Registering your story…' : 'Save story and permissions'}</button></div>
        </form></section>}
      <section className="mb-10 grid gap-4 sm:grid-cols-3" aria-label="Archive summary">
        <Stat label="REGISTERED STORIES" value={loading && !stories.length ? '…' : String(total)} note="Your protected creative archive"/>
        <Stat label="YOUR RIGHTS" value="Your choice" note="Explicit permissions on every story"/>
        <Stat label="DIGITAL FINGERPRINT" value="SHA-256" note="Calculated from your original file"/>
      </section>
      <section id="stories" className="scroll-mt-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-semibold tracking-tight">My stories <span className="ml-2 text-sm font-normal text-green-950/50">{total} registered</span></h2><button onClick={() => void load()} disabled={loading} className="text-sm underline underline-offset-4 disabled:opacity-40">Refresh</button></div>
        {loading && !stories.length ? <p role="status" className="panel">Loading your stories…</p> : !stories.length ? <div className="panel py-14 text-center"><span aria-hidden="true" className="font-serif text-5xl text-[#ad5b28]">❧</span><h3 className="mt-4 text-xl font-semibold">Make room for your first story.</h3><p className="mt-2 text-sm text-green-950/60">Register a text or PDF file to begin your protected archive.</p><button onClick={() => setRegister(true)} className="primary-button mt-6">Register your first story</button></div> : <div className="space-y-3">{stories.map(story => <article key={story.id} className="panel grid gap-5 md:grid-cols-[1fr_auto]">
          <div><div className="mb-2 flex flex-wrap items-center gap-3"><span className="text-[10px] font-semibold uppercase tracking-widest text-[#ad5b28]">{story.contentType.startsWith('application/pdf') ? 'PDF' : 'TEXT'} · {(story.byteSize / 1024).toFixed(1)} KB</span><span className="text-xs text-green-950/45">Registered <time dateTime={story.createdAt}>{date(story.createdAt)} SAST</time></span></div>
            <h3 className="text-lg font-semibold">{story.title}</h3><p className="mt-1 break-all text-xs text-green-950/55">{story.originalName}</p>
            <p className="mt-4 text-xs text-green-950/60">Commercial use: {story.commercialUse ? 'permitted' : 'not permitted'}{story.culturalHeritage && ' · Cultural heritage / community-connected'}</p>
            <details className="mt-3 text-xs text-green-950/60"><summary className="cursor-pointer">View digital fingerprint</summary><code className="mt-2 block break-all">{story.sha256}</code></details>
          </div><div className="flex flex-col items-start gap-3 md:items-end"><span className={`rounded-full px-3 py-2 text-xs font-semibold ${story.aiConsent === 'NOT_ALLOWED' ? 'bg-[#ece8e1] text-[#5c4b3c]' : story.aiConsent === 'ALLOWED' ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'}`}>{consent[story.aiConsent]}</span><span className="text-xs text-green-950/60">{story.licenses?.[0] ? `Legacy enquiry: ${tierNames[story.licenses[0].tier]} · ${licenseStatus[story.licenses[0].status]}` : 'No legacy enquiries'}</span><a href={`/licensing?story=${story.id}`} className="text-xs underline underline-offset-4">Prepare a term-sheet draft</a><p className="text-xs text-green-950/50">Catalog: {story.published ? 'public title and permissions' : 'not listed'}</p><button disabled={!!publishing} onClick={() => void setPublication(story)} className="text-xs underline underline-offset-4 disabled:opacity-40">{publishing === story.id ? 'Saving visibility…' : story.published ? 'Remove from public catalog' : 'Publish title and permissions'}</button></div>
        </article>)}</div>}
        {hasMore && <button disabled={loading} onClick={() => void load(stories.length)} className="mt-5 text-sm underline disabled:opacity-40">{loading ? 'Loading…' : 'Load more stories'}</button>}
      </section>
      <section id="licensing" className="panel mt-10 scroll-mt-6"><h2 className="text-2xl font-semibold tracking-tight">Structured licensing proposals</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-green-950/60">Prepare a term sheet covering scope, duration, territory, exclusivity and financial terms. Verified licensee and community authority checks are required before binding submission. Approved contract and signing arrangements are not connected yet.</p>
        <div className="my-7 grid gap-4 sm:grid-cols-3">
          <TierCard title="Educational" number="01" description="Noncommercial learning, teaching and research enquiries."/>
          <TierCard title="Film" number="02" description="Adaptation enquiries for stories that permit commercial use."/>
          <TierCard title="AI company" number="03" description="Training enquiries governed by your AI consent and compensation choice."/>
        </div>
        <a href="/licensing" className="primary-button">Open licensing workspace</a><p className="mt-4 text-xs text-green-950/60">Legacy mock enquiries remain visible as historical records. New proposals are unsigned, non-binding drafts; no rights or original files are released.</p>
      </section>
      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <section id="tracking" className="panel scroll-mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Story activity</h2><button onClick={() => void loadActivity()} disabled={activityLoading} className="text-xs underline underline-offset-4 disabled:opacity-40">Refresh activity</button></div><p className="mt-3 text-sm leading-relaxed text-green-950/60">Registrations and enquiries recorded in TaleSafe. External websites are not being monitored.</p>
          {activityLoading ? <p role="status" className="mt-6 text-sm">Loading recorded activity…</p> : activityError ? <p role="alert" className="mt-6 text-sm text-red-800">{activityError}</p> : activity.length ? <ul className="mt-6 space-y-5 text-sm">{activity.map(event => <li key={event.id} className="border-b border-green-950/10 pb-4 last:border-0 last:pb-0"><p className="font-semibold">{event.type === 'STORY_REGISTERED' ? 'Story registered' : `${event.tier ? tierNames[event.tier] : 'License'} enquiry recorded`}</p><p className="mt-1 text-green-950/65">{event.storyTitle}</p><p className="mt-2 text-xs text-green-950/50"><time dateTime={event.occurredAt}>{date(event.occurredAt)} SAST</time>{event.status && ` · ${licenseStatus[event.status]}`}</p></li>)}</ul> : <p className="mt-6 text-sm text-green-950/60">No recorded activity yet. Register a story to begin.</p>}
          {moreActivity && <p className="mt-4 text-xs text-green-950/50">Showing the 10 most recent events.</p>}
        </section>
        <section id="revenue" className="panel scroll-mt-6"><h2 className="text-xl font-semibold">Revenue dashboard</h2><p className="mt-6 text-2xl font-semibold tracking-tight">Payments not connected</p><p className="mt-3 text-sm leading-relaxed text-green-950/60">Earnings and payout data are unavailable until a payment provider is connected and verified transactions are recorded.</p><p className="mt-6 border-t border-green-950/10 pt-4 text-sm text-green-950/60">License enquiries do not collect money. No balance, royalties or payouts are reported here.</p></section>
      </div>
  </WorkspaceShell>;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="panel"><p className="eyebrow">{label}</p><p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-3 text-xs text-green-950/55">{note}</p></div>;
}

function TierCard({ title, number, description }: { title: string; number: string; description: string }) {
  return <div className="rounded-xl border border-green-950/15 bg-[#f5f2e9] p-5"><p className="mb-4 font-serif text-2xl text-[#ad5b28]">{number}</p><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-green-950/60">{description}</p></div>;
}
