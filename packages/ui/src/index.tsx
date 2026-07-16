import type { ReactNode } from 'react';

export function FoundationShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="shell">
      <p className="eyebrow">Project Atlas · Phase 1</p>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
