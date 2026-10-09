/**
 * Minimal ambient types for `react-dom/client`.
 *
 * `@types/react-dom` is not present in this offline workspace, so the entry point
 * declares only what `main.tsx` uses. Delete this file once the dependency is
 * installed with `npm install`.
 */
declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}