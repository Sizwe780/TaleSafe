'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
type Tier = 'EDUCATIONAL' | 'FILM' | 'AI_COMPANY';
type License = { id: string; tier: Tier; status: 'REQUESTED' | 'APPROVED' | 'REJECTED'; createdAt: string };
type Activity = { id: string; type: 'STORY_REGISTERED' | 'LICENSE_REQUESTED'; storyId: string; storyTitle: string; occurredAt: string; tier?: Tier; status?: License['status'] };
export type Story = { id: string; title: string; originalName: string; contentType: string; byteSize: number; sha256: string; aiConsent: 'NOT_ALLOWED' | 'ALLOWED' | 'COMPENSATION_REQUIRED'; commercialUse: boolean; culturalHeritage: boolean; createdAt: string; licenses: License[] };
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
  const [licenseStoryId, setLicenseStoryId] = useState('');
  const [licenseTier, setLicenseTier] = useState<Tier>('EDUCATIONAL');
  const [licensing, setLicensing] = useState(false);
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
  const selectedStory = stories.find(story => story.id === licenseStoryId);
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

  async function requestLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLicensing(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${api}/api/stories/${licenseStoryId}/licenses`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: licenseTier }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit the request.');
      setNotice(`${tierNames[data.tier as Tier]} mock request recorded. No rights granted or payment processed.`);
      await Promise.all([load(), loadActivity()]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit the request.'); }
    finally { setLicensing(false); }
  }

  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="flex flex-col gap-8 bg-[#19382c] px-6 py-7 text-[#f5f2e9] lg:sticky lg:top-0 lg:h-screen lg:px-8">
      <a href="/" className="text-2xl font-bold tracking-tight">TaleSafe<span className="mt-1 block text-[10px] font-normal tracking-[0.4em] text-white/60">AFRICA</span></a>
      <nav aria-label="Creator navigation" className="flex gap-5 text-sm lg:flex-col">
        <a href="#stories" className="font-semibold">My stories</a><a href="#licensing" className="text-white/70">Smart licensing</a><a href="#tracking" className="text-white/70">Story activity</a><a href="#revenue" className="text-white/70">Revenue</a>
      </nav>
      <div className="hidden flex-1 lg:block"/>
      <p className="hidden font-serif text-2xl leading-snug text-white/70 lg:block">Every voice<br/>leaves a legacy.</p>
      <div className="flex items-center justify-between gap-2 border-t border-white/15 pt-5 text-sm"><span className="truncate">{displayName}</span><button onClick={() => onLogout().catch(() => setError('Unable to sign out. Please try again.'))} className="shrink-0 text-white/70 underline underline-offset-4">Sign out</button></div>
    </aside>
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-9 lg:px-12 lg:py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div><p className="eyebrow">CREATOR WORKSPACE</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your stories belong to you.</h1><p className="mt-3 text-sm text-green-950/60">Welcome back, {displayName.split(' ')[0]}. Protect what you create.</p></div>
        <button onClick={() => { setRegister(value => !value); setError(''); }} aria-expanded={register} aria-controls="registration" className="primary-button">{register ? 'Close registration' : '+ Register a story'}</button>
      </header>
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
          </div><div className="flex flex-col items-start gap-3 md:items-end"><span className={`rounded-full px-3 py-2 text-xs font-semibold ${story.aiConsent === 'NOT_ALLOWED' ? 'bg-[#ece8e1] text-[#5c4b3c]' : story.aiConsent === 'ALLOWED' ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'}`}>{consent[story.aiConsent]}</span><span className="text-xs text-green-950/60">{story.licenses?.[0] ? `${tierNames[story.licenses[0].tier]} · ${licenseStatus[story.licenses[0].status]}` : 'No license requests yet'}</span><a href="#licensing" onClick={() => { setLicenseStoryId(story.id); setLicenseTier('EDUCATIONAL'); }} className="text-xs underline underline-offset-4">Request a mock license</a></div>
        </article>)}</div>}
        {hasMore && <button disabled={loading} onClick={() => void load(stories.length)} className="mt-5 text-sm underline disabled:opacity-40">{loading ? 'Loading…' : 'Load more stories'}</button>}
      </section>
      <section id="licensing" className="panel mt-10 scroll-mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold tracking-tight">Smart licensing</h2><span className="demo-label">MOCK REQUESTS</span></div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-green-950/60">Explore how your stories could be licensed. Requests respect your recorded permissions. This demo records an enquiry; it grants no rights and processes no payment.</p>
        <div className="my-7 grid gap-4 sm:grid-cols-3">
          <TierCard title="Educational" number="01" description="Noncommercial learning, teaching and research enquiries."/>
          <TierCard title="Film" number="02" description="Adaptation enquiries for stories that permit commercial use."/>
          <TierCard title="AI company" number="03" description="Training enquiries governed by your AI consent and compensation choice."/>
        </div>
        <form onSubmit={requestLicense} className="grid items-end gap-5 md:grid-cols-[1fr_1fr_auto]">
          <label className="field-label">Story to license<select name="storyId" required value={licenseStoryId} onChange={event => { setLicenseStoryId(event.target.value); setLicenseTier('EDUCATIONAL'); }} className="field"><option value="" disabled>Choose a registered story</option>{stories.map(story => <option key={story.id} value={story.id}>{story.title}</option>)}</select></label>
          <label className="field-label">License tier<select name="tier" value={licenseTier} onChange={event => setLicenseTier(event.target.value as Tier)} className="field"><option value="EDUCATIONAL">Educational</option><option value="FILM" disabled={!!selectedStory && !selectedStory.commercialUse}>Film{selectedStory && !selectedStory.commercialUse ? ' — commercial use not permitted' : ''}</option><option value="AI_COMPANY" disabled={selectedStory?.aiConsent === 'NOT_ALLOWED'}>AI company{selectedStory?.aiConsent === 'NOT_ALLOWED' ? ' — AI training not allowed' : ''}</option></select></label>
          <button type="submit" disabled={licensing || !selectedStory} className="primary-button disabled:opacity-50">{licensing ? 'Recording request…' : 'Submit mock request'}</button>
        </form>
        {selectedStory && <p className="mt-4 text-xs leading-relaxed text-green-950/60">{consent[selectedStory.aiConsent]}. Commercial use {selectedStory.commercialUse ? 'permitted' : 'not permitted'}.{selectedStory.culturalHeritage && ' Community-connected heritage: additional community approval may be needed.'}</p>}
        {!stories.length && <p className="mt-4 text-sm text-green-950/60">Register a story to try a licensing request.</p>}
        {hasMore && <p className="mt-4 text-xs text-green-950/60">Load more stories above to select older registrations.</p>}
      </section>
      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <section id="tracking" className="panel scroll-mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Story activity</h2><button onClick={() => void loadActivity()} disabled={activityLoading} className="text-xs underline underline-offset-4 disabled:opacity-40">Refresh activity</button></div><p className="mt-3 text-sm leading-relaxed text-green-950/60">Registrations and enquiries recorded in TaleSafe. External websites are not being monitored.</p>
          {activityLoading ? <p role="status" className="mt-6 text-sm">Loading recorded activity…</p> : activityError ? <p role="alert" className="mt-6 text-sm text-red-800">{activityError}</p> : activity.length ? <ul className="mt-6 space-y-5 text-sm">{activity.map(event => <li key={event.id} className="border-b border-green-950/10 pb-4 last:border-0 last:pb-0"><p className="font-semibold">{event.type === 'STORY_REGISTERED' ? 'Story registered' : `${event.tier ? tierNames[event.tier] : 'License'} enquiry recorded`}</p><p className="mt-1 text-green-950/65">{event.storyTitle}</p><p className="mt-2 text-xs text-green-950/50"><time dateTime={event.occurredAt}>{date(event.occurredAt)} SAST</time>{event.status && ` · ${licenseStatus[event.status]}`}</p></li>)}</ul> : <p className="mt-6 text-sm text-green-950/60">No recorded activity yet. Register a story to begin.</p>}
          {moreActivity && <p className="mt-4 text-xs text-green-950/50">Showing the 10 most recent events.</p>}
        </section>
        <section id="revenue" className="panel scroll-mt-6"><h2 className="text-xl font-semibold">Revenue dashboard</h2><p className="mt-6 text-2xl font-semibold tracking-tight">Payments not connected</p><p className="mt-3 text-sm leading-relaxed text-green-950/60">Earnings and payout data are unavailable until a payment provider is connected and verified transactions are recorded.</p><p className="mt-6 border-t border-green-950/10 pt-4 text-sm text-green-950/60">License enquiries do not collect money. No balance, royalties or payouts are reported here.</p></section>
      </div>
      <footer className="mt-10 border-t border-green-950/15 pt-5 text-xs text-green-950/50">TaleSafe Africa · Preserving voices. Building possibilities.</footer>
    </main>
  </div>;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="panel"><p className="eyebrow">{label}</p><p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-3 text-xs text-green-950/55">{note}</p></div>;
}

function TierCard({ title, number, description }: { title: string; number: string; description: string }) {
  return <div className="rounded-xl border border-green-950/15 bg-[#f5f2e9] p-5"><p className="mb-4 font-serif text-2xl text-[#ad5b28]">{number}</p><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-green-950/60">{description}</p></div>;
}
