import type { ReactNode } from 'react';

export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Editor-scoped stylesheet — declared server-side to prevent FOUC */}
      <link rel="stylesheet" href="/editor/style.css" />
      {children}
    </>
  );
}
