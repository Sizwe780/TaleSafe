'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import WorkspaceShell, { PageIntro } from '../components/workspace-shell';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const scopes = { PRINT_PUBLICATION: 'Print publication', DIGITAL_PUBLICATION: 'Digital or ebook publication', AUDIO_ADAPTATION: 'Audio adaptation', FILM_TV_ADAPTATION: 'Film or TV adaptation', EDUCATIONAL_MATERIAL: 'Classroom educational material', AI_MODEL_TRAINING: 'AI model training', AI_RAG_INDEXING: 'AI RAG indexing' };
type Profile = { kind: string; legalName: string; contactName: string; contactEmail: string; businessDomain: string | null; registrationNumber: string | null; verificationState: string };
type Draft = { id: string; storyId: string; story: { title: string }; terms: { scope: keyof typeof scopes; durationKind: string; durationMonths?: number; territory: string; exclusivity: string; financialKind: string }; createdAt: string };
type Community = { id: string; name: string; kind: string; verificationState: string; mandateApproved: boolean };
type Story = { id: string; title: string };
const read = async (path: string) => {
  const response = await fetch(`${api}${path}`, { credentials: 'include', cache: 'no-store' });
  if (response.status === 401) throw new Error('SIGN_IN');
  if (!response.ok) throw new Error('Unable to load the workspace. Please retry.');
  return response.json();
};
function hundredths(value: FormDataEntryValue | null) {
  const raw = String(value || '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error('Use a positive amount with at most two decimal places.');
  const [whole, decimals = ''] = raw.split('.');
  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
}

export default function LicensingWorkspace() {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [kind, setKind] = useState('INDIVIDUAL');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyId, setStoryId] = useState('');
  const [duration, setDuration] = useState('');
  const [territory, setTerritory] = useState('');
  const [financial, setFinancial] = useState('');
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const [preview, setPreview] = useState('');
  const [initialName, setInitialName] = useState('');
  const [initialEmail, setInitialEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const me = await read('/api/me'); setSignedIn(true); setInitialName(me.displayName); setInitialEmail(me.email || '');
      const [p, d, c, s, catalog, status] = await Promise.all([read('/api/licensee-profile'), read('/api/license-drafts'), read('/api/community-applications'), read('/api/stories?limit=50'), read('/api/catalog?limit=50'), read('/api/licensing/status')]);
      setProfile(p.profile); setKind(p.profile?.kind || 'INDIVIDUAL'); setDrafts(d.drafts); setCommunities(c.applications); setPreviewAvailable(status.signingPreviewAvailable);
      const choices = new Map<string, Story>([...catalog.stories, ...s.stories].map((entry: Story) => [entry.id, entry]));
      const requested = new URLSearchParams(window.location.search).get('story');
      if (requested && !choices.has(requested)) {
        try { const entry = await read(`/api/stories/${encodeURIComponent(requested)}/permissions`); choices.set(entry.id, entry); } catch { /* Private or unavailable stories are not added. */ }
      }
      setStories([...choices.values()]);
      if (requested && choices.has(requested)) setStoryId(requested);
    } catch (e) { if (e instanceof Error && e.message === 'SIGN_IN') setSignedIn(false); else setError(e instanceof Error ? e.message : 'Workspace unavailable.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function send(path: string, method: string, body: unknown) {
    const response = await fetch(`${api}${path}`, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to save. Please retry.');
    return data;
  }
  async function submit(event: FormEvent<HTMLFormElement>, action: (form: FormData) => Promise<string>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const message = await action(new FormData(event.currentTarget)); await load(); setNotice(message); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }

  return <WorkspaceShell displayName={signedIn ? initialName : undefined}><PageIntro eyebrow="PERMISSIONS AND AUTHORITY" title="Licensing workspace">Prepare a structured proposal and manage verification details. Drafts are non-binding. Trusted identity and authority checks, an approved contract and an external signing provider are required before binding submission or asset delivery.</PageIntro>
    {loading && <p role="status" className="my-8">Loading your licensing workspace…</p>}
    {error && <p role="alert" className="my-6 rounded-lg bg-red-50 p-4 text-red-800">{error} <button onClick={() => void load()} className="ml-3 underline">Retry</button></p>}
    {notice && <p role="status" className="my-6 rounded-lg bg-green-100 p-4">{notice}</p>}
    {!loading && !signedIn ? <section className="panel mt-8"><h2 className="text-xl font-semibold">Sign in to prepare a proposal</h2><p className="my-4 text-sm text-green-950/65">Anyone can browse creator-published metadata. Drafts and verification profiles require an account.</p><a href={`${api}/auth/login`} className="primary-button">Continue with Microsoft</a></section> : signedIn && <>
      <section className="panel mt-9"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Licensee profile</h2><span className="text-sm">{profile?.verificationState || 'UNVERIFIED'}</span></div><p className="mt-3 text-sm text-green-950/65">Saving details does not verify identity, business registration, directors or domain ownership. Provider verification is not connected yet. Do not enter identity numbers or upload selfies here.</p>
        <form key={profile ? `${profile.kind}-${profile.contactEmail}` : 'new-profile'} onSubmit={event => void submit(event, async form => {
          const body = { kind, legalName: String(form.get('legalName')), contactName: String(form.get('contactName')), contactEmail: String(form.get('contactEmail')), ...(kind === 'ORGANIZATION' ? { businessDomain: String(form.get('businessDomain')), registrationNumber: String(form.get('registrationNumber')) } : {}) };
          const data = await send('/api/licensee-profile', 'PUT', body); return data.message;
        })} className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Licensee type"><select className="field" value={kind} onChange={e => setKind(e.target.value)}><option value="INDIVIDUAL">Individual</option><option value="ORGANIZATION">Organization</option></select></Field>
          <Field label="Legal name"><input className="field" name="legalName" required minLength={2} maxLength={200} defaultValue={profile?.legalName || initialName}/></Field>
          <Field label="Named contact"><input className="field" name="contactName" required minLength={2} maxLength={150} defaultValue={profile?.contactName || initialName}/></Field>
          <Field label={kind === 'ORGANIZATION' ? 'Business email' : 'Contact email'}><input className="field" name="contactEmail" type="email" required defaultValue={profile?.contactEmail || initialEmail}/></Field>
          {kind === 'ORGANIZATION' && <><Field label="Business email domain"><input className="field" name="businessDomain" required maxLength={253} placeholder="example.org" defaultValue={profile?.businessDomain || ''}/></Field><Field label="Company registration number"><input className="field" name="registrationNumber" required minLength={3} maxLength={80} defaultValue={profile?.registrationNumber || ''}/></Field></>}
          <div><button disabled={busy} className="primary-button disabled:opacity-50">Save verification profile</button></div><p className="self-center text-xs text-green-950/60">Changes reset verification. Trusted checks are required for the revised details.</p>
        </form>
      </section>
      <section className="panel mt-7"><h2 className="text-2xl font-semibold">Prepare a term sheet</h2><p className="mt-3 text-sm text-green-950/65">Select the proposed rights and terms. ZAR is the current proposal currency for the South African workflow. All values remain proposals until the approved contract process is available.</p>
        <form onSubmit={event => void submit(event, async form => {
          const terms = { scope: form.get('scope'), durationKind: duration, ...(duration === 'FIXED' ? { durationMonths: Number(form.get('durationMonths')) } : {}), territory, ...(territory === 'COUNTRY' ? { countryCode: String(form.get('countryCode')).trim().toUpperCase() } : {}), exclusivity: form.get('exclusivity'), commercialUse: form.get('commercialUse') === 'true', financialKind: financial, currency: 'ZAR', ...(financial === 'FLAT_FEE' ? { flatFeeCents: hundredths(form.get('amount')) } : {}), ...(financial === 'ROYALTY' ? { royaltyBasisPoints: hundredths(form.get('royalty')), royaltyBasis: form.get('royaltyBasis') } : {}) };
          const data = await send('/api/license-drafts', 'POST', { storyId, terms }); return data.message;
        })} className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Story"><select className="field" value={storyId} onChange={e => setStoryId(e.target.value)} required><option value="" disabled>Select a published or owned story</option>{stories.map(story => <option key={story.id} value={story.id}>{story.title}</option>)}</select></Field>
          <Field label="Scope of use"><select className="field" name="scope" required defaultValue=""><option value="" disabled>Choose the proposed right</option>{Object.entries(scopes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Duration"><select className="field" value={duration} onChange={e => setDuration(e.target.value)} required><option value="" disabled>Choose a term</option><option value="FIXED">Fixed term</option><option value="PERPETUAL">Perpetual</option></select></Field>
          {duration === 'FIXED' && <Field label="Duration in months"><input className="field" name="durationMonths" type="number" min={1} max={1200} required placeholder="12"/></Field>}
          <Field label="Territory"><select className="field" value={territory} onChange={e => setTerritory(e.target.value)} required><option value="" disabled>Choose a territory</option><option value="WORLDWIDE">Worldwide</option><option value="PAN_AFRICA">Pan-Africa</option><option value="COUNTRY">Specific country</option></select></Field>
          {territory === 'COUNTRY' && <Field label="Two letter country code"><input className="field uppercase" name="countryCode" required pattern="[A-Za-z]{2}" maxLength={2} placeholder="ZA"/></Field>}
          <Field label="Exclusivity"><select className="field" name="exclusivity" required defaultValue=""><option value="" disabled>Choose exclusivity</option><option value="EXCLUSIVE">Exclusive</option><option value="NON_EXCLUSIVE">Non-exclusive</option></select></Field>
          <Field label="Commercial exploitation requested"><select className="field" name="commercialUse" required defaultValue=""><option value="" disabled>Choose the intended use</option><option value="false">No</option><option value="true">Yes</option></select></Field>
          <Field label="Financial proposal"><select className="field" value={financial} onChange={e => setFinancial(e.target.value)} required><option value="" disabled>Choose compensation</option><option value="FLAT_FEE">Flat fee</option><option value="ROYALTY">Revenue share or royalty</option><option value="FREE">Free or pro-bono</option></select></Field>
          {financial === 'FLAT_FEE' && <Field label="Proposed flat fee in ZAR"><input className="field" name="amount" type="number" min="0.01" max="20000000" step="0.01" required/></Field>}
          {financial === 'ROYALTY' && <><Field label="Proposed percentage"><input className="field" name="royalty" type="number" min="0.01" max="100" step="0.01" required/></Field><Field label="Royalty basis"><select className="field" name="royaltyBasis" required defaultValue=""><option value="" disabled>Choose a basis for the proposal</option><option value="GROSS_SALES">Gross sales</option><option value="NET_SALES">Net sales</option><option value="NET_RECEIPTS">Net receipts</option></select></Field></>}
          <div className="sm:col-span-2"><button disabled={busy || !stories.length} className="primary-button disabled:opacity-50">Save non-binding draft</button><p className="mt-3 text-xs text-green-950/60">Free requests still require verified educational or NGO eligibility before submission. Heritage stories need verified community authority. Saving this draft grants neither.</p></div>
        </form>
      </section>
      <section className="mt-8"><h2 className="text-2xl font-semibold">Your recent drafts</h2><div className="mt-5 space-y-4">{drafts.map(draft => <article key={draft.id} className="panel"><h3 className="text-lg font-semibold">{draft.story.title}</h3><p className="mt-2 text-sm">{scopes[draft.terms.scope]} · {draft.terms.durationKind === 'FIXED' ? `${draft.terms.durationMonths} months` : 'Perpetual'} · {draft.terms.territory.replaceAll('_', ' ')}</p><p className="mt-3 text-sm font-semibold">Draft only · Not signed · No rights granted</p><div className="mt-4 flex flex-wrap gap-4">{previewAvailable && <button className="text-sm underline" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const result = await send(`/api/license-drafts/${draft.id}/signing-preview`, 'POST', {}); setPreview(result.documentText); } catch (e) { setError(e instanceof Error ? e.message : 'Preview unavailable.'); } finally { setBusy(false); } }}>Preview unsigned terms</button>}<button disabled className="text-sm text-green-950/40">Binding submission unavailable</button></div></article>)}{!drafts.length && <p className="panel text-sm text-green-950/60">No saved drafts yet. A draft records your proposal without executing a contract.</p>}</div></section>
      {preview && <section className="panel mt-7"><h2 className="text-xl font-semibold">Development signing preview</h2><p className="mt-2 text-sm font-semibold">Not signed and not a contract</p><pre className="mt-5 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{preview}</pre><button onClick={() => setPreview('')} className="mt-5 text-sm underline">Close preview</button></section>}
      <section className="panel mt-8"><h2 className="text-2xl font-semibold">Community entity application</h2><p className="mt-3 text-sm text-green-950/65">Record an NPC, NPO or trust application. Activation requires trusted identity and entity checks plus human review of a signed mandate. The applicant does not become an authorized administrator by saving this form.</p>
        <form onSubmit={event => void submit(event, async form => { const data = await send('/api/community-applications', 'POST', { name: form.get('name'), kind: form.get('kind'), registrationNumber: form.get('registrationNumber') }); return data.message; })} className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Community entity name"><input className="field" name="name" required minLength={2} maxLength={200}/></Field><Field label="Entity type"><select className="field" name="kind" required defaultValue=""><option value="" disabled>Choose a registered entity type</option><option value="NPC">Non-profit company</option><option value="NPO">Non-profit organization</option><option value="TRUST">Trust</option></select></Field><Field label="Entity registration number"><input className="field" name="registrationNumber" required minLength={3} maxLength={80}/></Field><div className="self-end"><button className="primary-button disabled:opacity-50" disabled={busy}>Save unverified application</button></div>
        </form><p className="mt-5 text-xs text-green-950/60">Mandate document submission and review are unavailable until the trusted verification and authorized review workflow are configured.</p>
        {communities.length > 0 && <ul className="mt-6 space-y-3 text-sm">{communities.map(entity => <li key={entity.id} className="border-t border-green-950/10 pt-3">{entity.name} · {entity.kind} · {entity.verificationState} · {entity.mandateApproved ? 'Mandate approved' : 'Mandate not approved'}</li>)}</ul>}
      </section>
    </>}
  </WorkspaceShell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field-label">{label}{children}</label>; }
