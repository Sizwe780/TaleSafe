'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const links = [
  { href: '/', label: 'Creator workspace' },
  { href: '/catalog', label: 'Public catalog' },
  { href: '/licensing', label: 'Licensing workspace' },
];

export default function WorkspaceShell({ children, displayName, onLogout }: { children: ReactNode; displayName?: string; onLogout?: () => void }) {
  const pathname = usePathname();
  return <div className="workspace-layout">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="workspace-sidebar">
      <a href="/" className="text-2xl font-bold tracking-tight">TaleSafe<span className="mt-1 block text-[10px] font-normal tracking-[0.4em] text-white/60">AFRICA</span></a>
      <nav aria-label="Workspace navigation" className="workspace-nav">{links.map(link => <a key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</a>)}</nav>
      <p className="hidden flex-1 lg:block" aria-hidden="true"/>
      <p className="hidden font-serif text-2xl leading-snug text-white/70 lg:block">Every voice<br/>leaves a legacy.</p>
      <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-5 text-sm"><span className="truncate">{displayName || 'Creator rights and permissions'}</span>{onLogout && <button onClick={onLogout} className="shrink-0 text-white/75 underline underline-offset-4">Sign out</button>}</div>
    </aside>
    <main id="main-content" className="workspace-content">{children}<footer className="mt-10 border-t border-green-950/15 pt-5 text-xs text-green-950/50">TaleSafe Africa · Preserving voices. Building possibilities.</footer></main>
  </div>;
}

export function PageIntro({ eyebrow, title, children, action }: { eyebrow: string; title: string; children: ReactNode; action?: ReactNode }) {
  return <header className="mb-9 flex flex-wrap items-end justify-between gap-5"><div className="max-w-3xl"><p className="eyebrow">{eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><div className="mt-4 text-sm leading-relaxed text-green-950/65">{children}</div></div>{action}</header>;
}
